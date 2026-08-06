import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const SUPPORTED_ALGORITHMS = [-7, -257];
const DEVICE_TYPES = new Set(["singleDevice", "multiDevice"]);

function webAuthnError(message, code = "WEBAUTHN_INVALID") {
  const error = new Error(message);
  error.code = code;
  error.status = 400;
  return error;
}

export function bufferToBase64Url(value) {
  return Buffer.from(value || []).toString("base64url");
}

export function base64UrlToBuffer(value, label = "dato WebAuthn", maxLength = 16_384) {
  const normalized = String(value || "").trim().replace(/=+$/g, "");
  if (!normalized || normalized.length > maxLength || !BASE64URL_PATTERN.test(normalized)) {
    throw webAuthnError(`${label} non valido.`);
  }
  const decoded = Buffer.from(normalized, "base64url");
  if (!decoded.length || bufferToBase64Url(decoded) !== normalized) {
    throw webAuthnError(`${label} non valido.`);
  }
  return decoded;
}

function safeEqual(left, right) {
  const first = Buffer.from(left || []);
  const second = Buffer.from(right || []);
  return first.length === second.length && timingSafeEqual(first, second);
}

function normalizedCredentialId(value) {
  return bufferToBase64Url(base64UrlToBuffer(value, "credential ID", 4096));
}

function normalizedCounter(value) {
  const counter = Number(value || 0);
  if (!Number.isSafeInteger(counter) || counter < 0 || counter > 0xffff_ffff) {
    throw webAuthnError("Contatore WebAuthn non valido.");
  }
  return counter;
}

function normalizedTransports(values) {
  const allowed = new Set(["ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb"]);
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter((value) => allowed.has(value)))]
    .slice(0, 8);
}

function assertCredentialEnvelope(response, ceremony) {
  const credential = response && typeof response === "object" ? response : {};
  const payload = credential.response && typeof credential.response === "object" ? credential.response : {};
  if (credential.type !== "public-key") {
    throw webAuthnError(ceremony === "registration"
      ? "Credenziale WebAuthn non valida."
      : "Assertion WebAuthn non valida.");
  }
  const credentialId = normalizedCredentialId(credential.id || credential.rawId);
  if (normalizedCredentialId(credential.rawId || credential.id) !== credentialId) {
    throw webAuthnError("Identificativi credenziale WebAuthn incoerenti.");
  }
  base64UrlToBuffer(payload.clientDataJSON, "clientDataJSON", 16_384);
  if (ceremony === "registration") {
    base64UrlToBuffer(payload.attestationObject, "attestationObject", 1_048_576);
  } else {
    base64UrlToBuffer(payload.authenticatorData, "authenticatorData", 65_536);
    base64UrlToBuffer(payload.signature, "firma WebAuthn", 16_384);
  }
  if (credential.clientExtensionResults !== undefined
    && (!credential.clientExtensionResults || typeof credential.clientExtensionResults !== "object" || Array.isArray(credential.clientExtensionResults))) {
    throw webAuthnError("Estensioni WebAuthn non valide.");
  }
  return { credential, payload, credentialId };
}

function assertNotCrossOrigin(clientDataJSON) {
  const raw = base64UrlToBuffer(clientDataJSON, "clientDataJSON", 16_384);
  let clientData;
  try {
    clientData = JSON.parse(raw.toString("utf8"));
  } catch {
    throw webAuthnError("Risposta WebAuthn non leggibile.");
  }
  if (!clientData || typeof clientData !== "object" || clientData.crossOrigin === true) {
    throw webAuthnError("Autenticazione WebAuthn cross-origin non consentita.");
  }
}

function normalizeVerificationFailure(error, fallback, code = "WEBAUTHN_INVALID") {
  if (error?.status && error?.code) return error;
  const normalized = webAuthnError(fallback, code);
  normalized.cause = error;
  return normalized;
}

export function generateWebAuthnChallenge(size = 32) {
  const bytes = Math.max(32, Math.min(64, Number(size) || 32));
  return bufferToBase64Url(randomBytes(bytes));
}

export function webAuthnUserHandle(userId) {
  const value = String(userId ?? "").trim();
  if (!value) throw webAuthnError("Identificativo utente WebAuthn non valido.");
  return bufferToBase64Url(Buffer.from(value, "utf8"));
}

export function verifyWebAuthnUserHandle(response, userId, { required = true } = {}) {
  const supplied = response?.response?.userHandle;
  if (!supplied) {
    if (required) throw webAuthnError("Identità utente WebAuthn mancante.", "WEBAUTHN_USER_HANDLE_REQUIRED");
    return false;
  }
  const actual = base64UrlToBuffer(supplied, "identità utente WebAuthn", 1024);
  const expected = base64UrlToBuffer(webAuthnUserHandle(userId), "identità utente WebAuthn attesa", 1024);
  if (!safeEqual(actual, expected)) {
    throw webAuthnError("La passkey non appartiene all'utente atteso.", "WEBAUTHN_USER_HANDLE_MISMATCH");
  }
  return true;
}

export async function validateWebAuthnRegistration({
  response,
  expectedChallenge,
  expectedOrigin,
  expectedRpId
} = {}) {
  const { credential, payload } = assertCredentialEnvelope(response, "registration");
  assertNotCrossOrigin(payload.clientDataJSON);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: String(expectedChallenge || ""),
      expectedOrigin,
      expectedRPID: String(expectedRpId || ""),
      requireUserPresence: true,
      requireUserVerification: true,
      supportedAlgorithmIDs: SUPPORTED_ALGORITHMS
    });
  } catch (error) {
    throw normalizeVerificationFailure(error, "Attestazione WebAuthn non valida.", "WEBAUTHN_ATTESTATION_INVALID");
  }
  if (!verification.verified || !verification.registrationInfo) {
    throw webAuthnError("Attestazione WebAuthn non verificata.", "WEBAUTHN_ATTESTATION_INVALID");
  }

  const info = verification.registrationInfo;
  const credentialId = normalizedCredentialId(info.credential.id);
  if (credentialId !== normalizedCredentialId(credential.id)) {
    throw webAuthnError("La credenziale attestata non corrisponde alla risposta WebAuthn.");
  }
  if (!DEVICE_TYPES.has(info.credentialDeviceType)) {
    throw webAuthnError("Tipo dispositivo WebAuthn non valido.");
  }
  return {
    credentialId,
    publicKeyCose: bufferToBase64Url(info.credential.publicKey),
    signCount: normalizedCounter(info.credential.counter),
    transports: normalizedTransports(info.credential.transports || payload.transports),
    deviceType: info.credentialDeviceType,
    backedUp: Boolean(info.credentialBackedUp),
    aaguid: String(info.aaguid || ""),
    attestationFormat: String(info.fmt || "")
  };
}

export async function verifyWebAuthnAssertion({
  response,
  credential,
  expectedChallenge,
  expectedOrigin,
  expectedRpId
} = {}) {
  const { credential: assertion, payload, credentialId } = assertCredentialEnvelope(response, "authentication");
  assertNotCrossOrigin(payload.clientDataJSON);
  const storedId = normalizedCredentialId(credential?.credentialId);
  if (credentialId !== storedId) throw webAuthnError("Credenziale WebAuthn non riconosciuta.");
  const storedDeviceType = String(credential?.deviceType || "");
  if (!DEVICE_TYPES.has(storedDeviceType)) throw webAuthnError("Tipo dispositivo WebAuthn memorizzato non valido.");

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: String(expectedChallenge || ""),
      expectedOrigin,
      expectedRPID: String(expectedRpId || ""),
      credential: {
        id: storedId,
        publicKey: new Uint8Array(base64UrlToBuffer(credential?.publicKeyCose, "chiave pubblica COSE", 16_384)),
        counter: normalizedCounter(credential?.signCount),
        transports: normalizedTransports(credential?.transports)
      },
      requireUserVerification: true,
      advancedFIDOConfig: { userVerification: "required" }
    });
  } catch (error) {
    throw normalizeVerificationFailure(error, "Assertion WebAuthn non valida.", "WEBAUTHN_ASSERTION_INVALID");
  }
  if (!verification.verified) {
    throw webAuthnError("Firma WebAuthn non valida.", "WEBAUTHN_SIGNATURE_INVALID");
  }

  const info = verification.authenticationInfo;
  if (info.credentialDeviceType !== storedDeviceType) {
    throw webAuthnError("Le proprietà di backup della passkey sono cambiate in modo inatteso.", "WEBAUTHN_DEVICE_TYPE_CHANGED");
  }
  return {
    verified: true,
    signCount: normalizedCounter(info.newCounter),
    deviceType: info.credentialDeviceType,
    backedUp: Boolean(info.credentialBackedUp)
  };
}

export function buildWebAuthnRegistrationOptions({
  challenge,
  rpId,
  rpName = "OroActive Gestionale",
  userId,
  username,
  displayName,
  excludeCredentialIds = []
} = {}) {
  return {
    challenge,
    rp: { id: rpId, name: rpName },
    user: {
      id: webAuthnUserHandle(userId),
      name: String(username || ""),
      displayName: String(displayName || username || "")
    },
    pubKeyCredParams: SUPPORTED_ALGORITHMS.map((alg) => ({ type: "public-key", alg })),
    timeout: 60_000,
    attestation: "none",
    excludeCredentials: excludeCredentialIds.map((id) => ({ id, type: "public-key" })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      requireResidentKey: true,
      userVerification: "required"
    }
  };
}

export function buildWebAuthnAuthenticationOptions({ challenge, rpId, credentialIds = [] } = {}) {
  const options = {
    challenge,
    rpId,
    timeout: 60_000,
    userVerification: "required"
  };
  if (credentialIds.length) {
    options.allowCredentials = credentialIds.map((id) => ({ id, type: "public-key" }));
  }
  return options;
}
