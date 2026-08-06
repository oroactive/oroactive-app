import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign as signPayload
} from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { encodeCBOR } from "@levischuck/tiny-cbor";
import bcrypt from "bcrypt";

import {
  bufferToBase64Url,
  buildWebAuthnAuthenticationOptions,
  buildWebAuthnRegistrationOptions,
  generateWebAuthnChallenge,
  validateWebAuthnRegistration,
  verifyWebAuthnAssertion,
  verifyWebAuthnUserHandle,
  webAuthnUserHandle
} from "../services/auth/webauthn.js";
import { createWebAuthnStore } from "../services/auth/webauthnStore.js";

const rpId = "app.oroactive.it";
const origin = "https://app.oroactive.it";
const root = new URL("../", import.meta.url);

function base64UrlToBuffer(value) {
  return Buffer.from(value, "base64url");
}

function makeClientData(type, challenge, suppliedOrigin = origin, extra = {}) {
  return bufferToBase64Url(Buffer.from(JSON.stringify({
    type,
    challenge,
    origin: suppliedOrigin,
    crossOrigin: false,
    ...extra
  })));
}

function keyFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" });
  const publicKeyCose = Buffer.from(encodeCBOR(new Map([
    [1, 2],
    [3, -7],
    [-1, 1],
    [-2, base64UrlToBuffer(jwk.x)],
    [-3, base64UrlToBuffer(jwk.y)]
  ])));
  return { privateKey, publicKeyCose };
}

function makeAuthenticatorData({
  counter = 1,
  flags = 0x05,
  suppliedRpId = rpId,
  attestedCredential
} = {}) {
  const header = Buffer.alloc(37);
  createHash("sha256").update(suppliedRpId).digest().copy(header, 0);
  header[32] = flags;
  header.writeUInt32BE(counter, 33);
  if (!attestedCredential) return header;

  const credentialId = Buffer.from(attestedCredential.credentialId);
  const credentialLength = Buffer.alloc(2);
  credentialLength.writeUInt16BE(credentialId.length);
  return Buffer.concat([
    header,
    Buffer.alloc(16),
    credentialLength,
    credentialId,
    Buffer.from(attestedCredential.publicKeyCose)
  ]);
}

function makeRegistrationFixture({
  challenge = generateWebAuthnChallenge(),
  counter = 0,
  flags = 0x45,
  suppliedOrigin = origin,
  suppliedRpId = rpId
} = {}) {
  const key = keyFixture();
  const credentialIdBytes = Buffer.from("oroactive-test-credential");
  const credentialId = bufferToBase64Url(credentialIdBytes);
  const authData = makeAuthenticatorData({
    counter,
    flags,
    suppliedRpId,
    attestedCredential: {
      credentialId: credentialIdBytes,
      publicKeyCose: key.publicKeyCose
    }
  });
  const attestationObject = encodeCBOR(new Map([
    ["fmt", "none"],
    ["attStmt", new Map()],
    ["authData", authData]
  ]));
  return {
    ...key,
    challenge,
    credentialId,
    response: {
      id: credentialId,
      rawId: credentialId,
      type: "public-key",
      authenticatorAttachment: "platform",
      clientExtensionResults: {},
      response: {
        clientDataJSON: makeClientData("webauthn.create", challenge, suppliedOrigin),
        attestationObject: bufferToBase64Url(attestationObject),
        transports: ["internal"]
      }
    }
  };
}

function makeAssertionFixture({
  key = keyFixture(),
  credentialId = bufferToBase64Url(Buffer.from("oroactive-test-credential")),
  challenge = generateWebAuthnChallenge(),
  counter = 1,
  flags = 0x05,
  suppliedOrigin = origin,
  suppliedRpId = rpId,
  userId = "42"
} = {}) {
  const clientDataJSON = makeClientData("webauthn.get", challenge, suppliedOrigin);
  const authenticatorData = makeAuthenticatorData({ counter, flags, suppliedRpId });
  const clientHash = createHash("sha256")
    .update(base64UrlToBuffer(clientDataJSON))
    .digest();
  const signature = signPayload("sha256", Buffer.concat([authenticatorData, clientHash]), key.privateKey);
  return {
    challenge,
    credential: {
      credentialId,
      publicKeyCose: bufferToBase64Url(key.publicKeyCose),
      signCount: 0,
      transports: ["internal"],
      deviceType: flags & 0x08 ? "multiDevice" : "singleDevice"
    },
    response: {
      id: credentialId,
      rawId: credentialId,
      type: "public-key",
      authenticatorAttachment: "platform",
      clientExtensionResults: {},
      response: {
        clientDataJSON,
        authenticatorData: bufferToBase64Url(authenticatorData),
        signature: bufferToBase64Url(signature),
        userHandle: webAuthnUserHandle(userId)
      }
    }
  };
}

test("registrazione WebAuthn verifica attestationObject e deriva la chiave COSE", async () => {
  const fixture = makeRegistrationFixture();
  const result = await validateWebAuthnRegistration({
    response: fixture.response,
    expectedChallenge: fixture.challenge,
    expectedOrigin: origin,
    expectedRpId: rpId
  });

  assert.equal(result.credentialId, fixture.credentialId);
  assert.equal(result.publicKeyCose, bufferToBase64Url(fixture.publicKeyCose));
  assert.equal(result.deviceType, "singleDevice");
  assert.equal(result.backedUp, false);
  assert.deepEqual(result.transports, ["internal"]);
  assert.equal(result.attestationFormat, "none");
});

test("registrazione respinge payload legacy non attestato e vincoli alterati", async () => {
  const fixture = makeRegistrationFixture();
  const withoutAttestation = structuredClone(fixture.response);
  delete withoutAttestation.response.attestationObject;
  await assert.rejects(validateWebAuthnRegistration({
    response: withoutAttestation,
    expectedChallenge: fixture.challenge,
    expectedOrigin: origin,
    expectedRpId: rpId
  }), /attestationObject/);

  await assert.rejects(validateWebAuthnRegistration({
    response: fixture.response,
    expectedChallenge: generateWebAuthnChallenge(),
    expectedOrigin: origin,
    expectedRpId: rpId
  }), /Attestazione WebAuthn non valida/);

  const crossOrigin = makeRegistrationFixture();
  crossOrigin.response.response.clientDataJSON = makeClientData(
    "webauthn.create",
    crossOrigin.challenge,
    origin,
    { crossOrigin: true }
  );
  await assert.rejects(validateWebAuthnRegistration({
    response: crossOrigin.response,
    expectedChallenge: crossOrigin.challenge,
    expectedOrigin: origin,
    expectedRpId: rpId
  }), /cross-origin/);
});

test("assertion verifica challenge, RP, origine, UV, firma e contatore", async () => {
  const fixture = makeAssertionFixture({ counter: 7 });
  const result = await verifyWebAuthnAssertion({
    response: fixture.response,
    credential: fixture.credential,
    expectedChallenge: fixture.challenge,
    expectedOrigin: origin,
    expectedRpId: rpId
  });
  assert.deepEqual(result, {
    verified: true,
    signCount: 7,
    deviceType: "singleDevice",
    backedUp: false
  });

  for (const overrides of [
    { expectedChallenge: generateWebAuthnChallenge() },
    { expectedOrigin: "https://evil.example" },
    { expectedRpId: "evil.example" }
  ]) {
    await assert.rejects(verifyWebAuthnAssertion({
      response: fixture.response,
      credential: fixture.credential,
      expectedChallenge: fixture.challenge,
      expectedOrigin: origin,
      expectedRpId: rpId,
      ...overrides
    }), /Assertion WebAuthn non valida/);
  }
});

test("assertion respinge firma alterata, assenza UV, 9→0 e cambio Backup Eligibility", async () => {
  const signed = makeAssertionFixture({ counter: 9 });
  const tampered = structuredClone(signed.response);
  const signature = base64UrlToBuffer(tampered.response.signature);
  signature[0] ^= 0x01;
  tampered.response.signature = bufferToBase64Url(signature);
  await assert.rejects(verifyWebAuthnAssertion({
    response: tampered,
    credential: signed.credential,
    expectedChallenge: signed.challenge,
    expectedOrigin: origin,
    expectedRpId: rpId
  }), /Assertion WebAuthn non valida/);

  const noUv = makeAssertionFixture({ flags: 0x01 });
  await assert.rejects(verifyWebAuthnAssertion({
    response: noUv.response,
    credential: noUv.credential,
    expectedChallenge: noUv.challenge,
    expectedOrigin: origin,
    expectedRpId: rpId
  }), /Assertion WebAuthn non valida/);

  const resetCounter = makeAssertionFixture({ counter: 0 });
  await assert.rejects(verifyWebAuthnAssertion({
    response: resetCounter.response,
    credential: { ...resetCounter.credential, signCount: 9 },
    expectedChallenge: resetCounter.challenge,
    expectedOrigin: origin,
    expectedRpId: rpId
  }), /Assertion WebAuthn non valida/);

  const backupEligible = makeAssertionFixture({ flags: 0x0d });
  await assert.rejects(verifyWebAuthnAssertion({
    response: backupEligible.response,
    credential: { ...backupEligible.credential, deviceType: "singleDevice" },
    expectedChallenge: backupEligible.challenge,
    expectedOrigin: origin,
    expectedRpId: rpId
  }), /proprietà di backup/);
});

test("login discoverable richiede userHandle uguale all'utente della credenziale", () => {
  const fixture = makeAssertionFixture({ userId: "42" });
  assert.equal(verifyWebAuthnUserHandle(fixture.response, 42), true);
  assert.throws(() => verifyWebAuthnUserHandle(fixture.response, 43), /non appartiene/);

  const missing = structuredClone(fixture.response);
  delete missing.response.userHandle;
  assert.throws(() => verifyWebAuthnUserHandle(missing, 42), /mancante/);
  assert.equal(verifyWebAuthnUserHandle(missing, 42, { required: false }), false);
});

test("opzioni WebAuthn impongono piattaforma, verifica utente e challenge server", () => {
  const challenge = generateWebAuthnChallenge();
  const registration = buildWebAuthnRegistrationOptions({
    challenge,
    rpId,
    userId: 42,
    username: "founder",
    displayName: "Founder"
  });
  assert.equal(registration.challenge, challenge);
  assert.equal(registration.user.id, webAuthnUserHandle(42));
  assert.equal(registration.authenticatorSelection.authenticatorAttachment, "platform");
  assert.equal(registration.authenticatorSelection.residentKey, "required");
  assert.equal(registration.authenticatorSelection.requireResidentKey, true);
  assert.equal(registration.authenticatorSelection.userVerification, "required");
  assert.deepEqual(registration.pubKeyCredParams.map(({ alg }) => alg), [-7, -257]);

  const authentication = buildWebAuthnAuthenticationOptions({
    challenge,
    rpId,
    credentialIds: [bufferToBase64Url(Buffer.from("credential"))]
  });
  assert.equal(authentication.challenge, challenge);
  assert.equal(authentication.userVerification, "required");
  assert.equal(authentication.allowCredentials.length, 1);

  const discoverable = buildWebAuthnAuthenticationOptions({ challenge, rpId });
  assert.equal("allowCredentials" in discoverable, false);
});

test("le opzioni di registrazione richiedono la password corrente prima di creare la challenge", async () => {
  const passwordHash = await bcrypt.hash("Password-corrente-42", 4);
  const issuedChallenges = [];
  const pool = {
    async query(text, values = []) {
      if (/SELECT password_hash/.test(text)) {
        return { rowCount: 1, rows: [{ password_hash: passwordHash }] };
      }
      if (/SELECT credential_id/.test(text)) return { rowCount: 0, rows: [] };
      if (/INSERT INTO webauthn_challenges/.test(text)) {
        issuedChallenges.push(values[0]);
        return { rowCount: 1, rows: [] };
      }
      if (/DELETE FROM webauthn_challenges/.test(text)) return { rowCount: 0, rows: [] };
      throw new Error(`Query inattesa nel test: ${text}`);
    }
  };
  const store = createWebAuthnStore({ pool, rpId, origins: [origin] });
  const user = { id: 42, username: "founder", nome: "Oro", cognome: "Active" };

  await assert.rejects(store.registrationOptions(user, "password-errata"), /Password corrente non valida/);
  assert.equal(issuedChallenges.length, 0);

  const options = await store.registrationOptions(user, "Password-corrente-42");
  assert.equal(issuedChallenges.length, 1);
  assert.equal(options.challenge, issuedChallenges[0]);
  assert.equal(options.user.id, webAuthnUserHandle(user.id));
});

test("integrazione Face ID usa attestazione server, password corrente e chiavi COSE", async () => {
  const [server, schema, app, store] = await Promise.all([
    readFile(new URL("server.js", root), "utf8"),
    readFile(new URL("schema.sql", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("services/auth/webauthnStore.js", root), "utf8")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS webauthn_credentials/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS webauthn_challenges/);
  assert.match(schema, /public_key_cose TEXT NOT NULL/);
  assert.match(schema, /device_type TEXT NOT NULL CHECK/);
  assert.doesNotMatch(schema, /public_key_spki|algorithm INTEGER/);
  assert.match(store, /bcrypt\.compare\(password, passwordResult\.rows\[0\]\.password_hash\)/);
  assert.match(store, /verifyWebAuthnUserHandle\(response, row\.id, \{ required: true \}\)/);
  assert.match(server, /createWebAuthnStore/);
  assert.match(server, /app\.post\("\/api\/auth\/webauthn\/login\/options"/);
  assert.match(server, /app\.post\("\/api\/auth\/webauthn\/login\/verify"/);
  assert.match(server, /app\.post\("\/api\/auth\/webauthn\/register\/options"/);
  assert.match(server, /registrationOptions\(request\.user, request\.body\?\.password\)/);
  assert.match(server, /app\.post\("\/api\/auth\/webauthn\/register\/verify"/);
  assert.match(server, /app\.post\("\/api\/auth\/webauthn\/register\/activate"/);

  assert.match(app, /attestationObject: bytesToBase64Url\(registrationResponse\.attestationObject\)/);
  assert.match(app, /clientExtensionResults: credential\.getClientExtensionResults/);
  assert.match(app, /requestCurrentPasswordForFaceId/);
  assert.match(app, /JSON\.stringify\(\{ password: currentPassword \}\)/);
  assert.match(app, /\/auth\/webauthn\/register\/activate/);
  assert.match(app, /\/auth\/webauthn\/login\/verify/);
  assert.doesNotMatch(app, /randomChallenge|apiRequest\("\/auth\/faceid/);
});
