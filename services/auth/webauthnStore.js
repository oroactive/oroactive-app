import bcrypt from "bcrypt";
import {
  base64UrlToBuffer,
  bufferToBase64Url,
  buildWebAuthnAuthenticationOptions,
  buildWebAuthnRegistrationOptions,
  generateWebAuthnChallenge,
  validateWebAuthnRegistration,
  verifyWebAuthnAssertion,
  verifyWebAuthnUserHandle
} from "./webauthn.js";

const CHALLENGE_TTL_SECONDS = 300;

function serviceError(message, status = 400, code = "WEBAUTHN_INVALID") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeCredentialId(value) {
  return bufferToBase64Url(base64UrlToBuffer(value, "credential ID", 4096));
}

function challengeFromClientData(response) {
  const encoded = response?.response?.clientDataJSON;
  const raw = base64UrlToBuffer(encoded, "clientDataJSON", 16_384);
  let clientData;
  try {
    clientData = JSON.parse(raw.toString("utf8"));
  } catch {
    throw serviceError("Risposta WebAuthn non leggibile.");
  }
  return String(clientData?.challenge || "").trim();
}

function credentialFromRow(row) {
  return {
    credentialId: row.credential_id,
    publicKeyCose: row.public_key_cose,
    signCount: row.sign_count,
    transports: Array.isArray(row.transports) ? row.transports : [],
    deviceType: row.device_type
  };
}

export function createWebAuthnStore({ pool, rpId, origins, rpName = "OroActive Gestionale" } = {}) {
  if (!pool || typeof pool.query !== "function") throw new Error("Pool database WebAuthn non configurato.");
  if (!String(rpId || "").trim()) throw new Error("WEBAUTHN_RP_ID non configurato.");
  const expectedRpId = String(rpId).trim().toLowerCase();
  const expectedOrigins = [...new Set((Array.isArray(origins) ? origins : [origins])
    .map((origin) => String(origin || "").trim())
    .filter(Boolean))];
  if (!expectedOrigins.length) throw new Error("Origine WebAuthn non configurata.");

  async function cleanupChallenges() {
    await pool.query(
      `DELETE FROM webauthn_challenges
       WHERE expires_at <= NOW() OR created_at < NOW() - INTERVAL '1 day'`
    );
  }

  async function issueChallenge({ ceremony, userId = null, credentialId = null } = {}) {
    const challenge = generateWebAuthnChallenge();
    await pool.query(
      `INSERT INTO webauthn_challenges (challenge, user_id, ceremony, credential_id, expires_at)
       VALUES ($1, $2::bigint, $3, $4, NOW() + ($5::int * INTERVAL '1 second'))`,
      [challenge, userId || null, ceremony, credentialId || null, CHALLENGE_TTL_SECONDS]
    );
    void cleanupChallenges().catch(() => {});
    return challenge;
  }

  async function consumeChallenge(response, ceremony, userId = null) {
    const challenge = challengeFromClientData(response);
    if (!challenge) throw serviceError("Challenge WebAuthn mancante.");
    const result = await pool.query(
      `DELETE FROM webauthn_challenges
       WHERE challenge = $1
         AND ceremony = $2
         AND expires_at > NOW()
         AND ($3::bigint IS NULL OR user_id = $3::bigint)
       RETURNING challenge, user_id, credential_id`,
      [challenge, ceremony, userId || null]
    );
    if (!result.rowCount) {
      throw serviceError("Challenge WebAuthn scaduta o già utilizzata.", 400, "WEBAUTHN_CHALLENGE_EXPIRED");
    }
    return result.rows[0];
  }

  async function registrationOptions(user, currentPassword) {
    if (!user?.id) throw serviceError("Sessione utente non valida.", 401);
    const password = String(currentPassword ?? "");
    const passwordResult = await pool.query(
      `SELECT password_hash
       FROM utenti
       WHERE id = $1::bigint AND COALESCE(attivo, TRUE) = TRUE
       LIMIT 1`,
      [user.id]
    );
    let passwordVerified = false;
    if (password && password.length <= 512 && passwordResult.rowCount) {
      try {
        passwordVerified = await bcrypt.compare(password, passwordResult.rows[0].password_hash);
      } catch {
        passwordVerified = false;
      }
    }
    if (!passwordVerified) {
      throw serviceError("Password corrente non valida.", 403, "WEBAUTHN_REAUTH_REQUIRED");
    }
    const existing = await pool.query(
      `SELECT credential_id
       FROM webauthn_credentials
       WHERE user_id = $1::bigint AND active = TRUE
       ORDER BY created_at DESC`,
      [user.id]
    );
    const challenge = await issueChallenge({ ceremony: "registration", userId: user.id });
    return buildWebAuthnRegistrationOptions({
      challenge,
      rpId: expectedRpId,
      rpName,
      userId: user.id,
      username: user.username || user.email,
      displayName: [user.nome, user.cognome].filter(Boolean).join(" ") || user.username || user.email,
      excludeCredentialIds: existing.rows.map((row) => row.credential_id)
    });
  }

  async function verifyRegistration(user, response) {
    if (!user?.id) throw serviceError("Sessione utente non valida.", 401);
    const consumed = await consumeChallenge(response, "registration", user.id);
    const registration = await validateWebAuthnRegistration({
      response,
      expectedChallenge: consumed.challenge,
      expectedOrigin: expectedOrigins,
      expectedRpId
    });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM webauthn_credentials
         WHERE user_id = $1::bigint AND active = FALSE`,
        [user.id]
      );
      await client.query(
        `INSERT INTO webauthn_credentials
          (user_id, credential_id, public_key_cose, sign_count, transports,
           device_type, backed_up, active)
         VALUES ($1::bigint, $2, $3, $4::bigint, $5::jsonb, $6, $7, FALSE)`,
        [
          user.id,
          registration.credentialId,
          registration.publicKeyCose,
          registration.signCount,
          JSON.stringify(registration.transports),
          registration.deviceType,
          registration.backedUp
        ]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error?.code === "23505") {
        throw serviceError("Questa passkey risulta già registrata.", 409, "WEBAUTHN_DUPLICATE");
      }
      throw error;
    } finally {
      client.release();
    }

    const challenge = await issueChallenge({
      ceremony: "activation",
      userId: user.id,
      credentialId: registration.credentialId
    });
    return {
      credentialId: registration.credentialId,
      proofOptions: buildWebAuthnAuthenticationOptions({
        challenge,
        rpId: expectedRpId,
        credentialIds: [registration.credentialId]
      })
    };
  }

  async function activateRegistration(user, response) {
    if (!user?.id) throw serviceError("Sessione utente non valida.", 401);
    const assertionId = normalizeCredentialId(response?.id || response?.rawId);
    const consumed = await consumeChallenge(response, "activation", user.id);
    if (normalizeCredentialId(consumed.credential_id) !== assertionId) {
      throw serviceError("La passkey non corrisponde alla registrazione in corso.");
    }
    verifyWebAuthnUserHandle(response, user.id, { required: false });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT id, credential_id, public_key_cose, sign_count, transports, device_type
         FROM webauthn_credentials
         WHERE user_id = $1::bigint AND credential_id = $2 AND active = FALSE
         FOR UPDATE`,
        [user.id, assertionId]
      );
      if (!result.rowCount) throw serviceError("Registrazione passkey non trovata o già conclusa.", 404);
      const verification = await verifyWebAuthnAssertion({
        response,
        credential: credentialFromRow(result.rows[0]),
        expectedChallenge: consumed.challenge,
        expectedOrigin: expectedOrigins,
        expectedRpId
      });
      await client.query(
        `UPDATE webauthn_credentials
         SET active = TRUE,
             sign_count = $2::bigint,
             backed_up = $3,
             activated_at = NOW(),
             last_used_at = NOW()
         WHERE id = $1::bigint`,
        [result.rows[0].id, verification.signCount, verification.backedUp]
      );
      await client.query(
        `UPDATE utenti SET face_id_credential = 'webauthn', updated_at = NOW() WHERE id = $1::bigint`,
        [user.id]
      );
      await client.query("COMMIT");
      return { active: true, credentialId: assertionId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function authenticationOptions() {
    const challenge = await issueChallenge({ ceremony: "authentication" });
    return buildWebAuthnAuthenticationOptions({ challenge, rpId: expectedRpId });
  }

  async function verifyAuthentication(response) {
    const assertionId = normalizeCredentialId(response?.id || response?.rawId);
    const consumed = await consumeChallenge(response, "authentication");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT u.*,
                c.id AS webauthn_id,
                c.credential_id,
                c.public_key_cose,
                c.sign_count,
                c.transports,
                c.device_type
         FROM webauthn_credentials c
         INNER JOIN utenti u ON u.id = c.user_id
         WHERE c.credential_id = $1 AND c.active = TRUE AND COALESCE(u.attivo, TRUE) = TRUE
         FOR UPDATE OF c`,
        [assertionId]
      );
      if (!result.rowCount) throw serviceError("Passkey non riconosciuta.", 401, "WEBAUTHN_UNKNOWN_CREDENTIAL");
      const row = result.rows[0];
      verifyWebAuthnUserHandle(response, row.id, { required: true });
      const verification = await verifyWebAuthnAssertion({
        response,
        credential: credentialFromRow(row),
        expectedChallenge: consumed.challenge,
        expectedOrigin: expectedOrigins,
        expectedRpId
      });
      await client.query(
        `UPDATE webauthn_credentials
         SET sign_count = $2::bigint,
             backed_up = $3,
             last_used_at = NOW()
         WHERE id = $1::bigint`,
        [row.webauthn_id, verification.signCount, verification.backedUp]
      );
      await client.query("COMMIT");
      return row;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    authenticationOptions,
    registrationOptions,
    verifyAuthentication,
    verifyRegistration,
    activateRegistration
  };
}
