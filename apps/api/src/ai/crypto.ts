import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const SECRET_PREFIX = "enc:v1:";
const SECRET_ALGORITHM = "aes-256-gcm";
const SECRET_IV_BYTES = 12;

// Mirrors notification-preferences/secrets.ts but keyed independently so AI
// provider credentials can be rotated without touching notification secrets.
// AUTH_SECRET fallback: it is already mandatory (Better Auth), so self-hosters
// get encrypted-at-rest keys with zero extra configuration.
function getSecretEncryptionKey() {
  const rawKey = (
    process.env.AI_SECRET_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    ""
  ).trim();
  if (!rawKey) {
    return null;
  }

  return createHash("sha256").update(rawKey).digest();
}

function encodePart(value: Buffer) {
  return value.toString("base64url");
}

function decodePart(value: string) {
  return Buffer.from(value, "base64url");
}

export function encryptAiSecret(value: string | null | undefined) {
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }

  const key = getSecretEncryptionKey();
  if (!key) {
    throw new Error(
      "AI_SECRET_ENCRYPTION_KEY or AUTH_SECRET is required to store AI provider credentials",
    );
  }

  const iv = randomBytes(SECRET_IV_BYTES);
  const cipher = createCipheriv(SECRET_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${SECRET_PREFIX}${encodePart(iv)}.${encodePart(authTag)}.${encodePart(encrypted)}`;
}

export function decryptAiSecret(value: string | null | undefined) {
  if (
    value === undefined ||
    value === null ||
    !value.startsWith(SECRET_PREFIX)
  ) {
    return null;
  }

  const key = getSecretEncryptionKey();
  if (!key) {
    throw new Error(
      "AI_SECRET_ENCRYPTION_KEY or AUTH_SECRET is required to read AI provider credentials",
    );
  }

  const payload = value.slice(SECRET_PREFIX.length);
  const [iv, authTag, encrypted] = payload.split(".");
  if (!iv || !authTag || !encrypted) {
    throw new Error("Invalid encrypted AI secret payload");
  }

  const decipher = createDecipheriv(SECRET_ALGORITHM, key, decodePart(iv));
  decipher.setAuthTag(decodePart(authTag));

  return Buffer.concat([
    decipher.update(decodePart(encrypted)),
    decipher.final(),
  ]).toString("utf8");
}
