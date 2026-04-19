import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "../config/env.js";

const algorithm = "aes-256-gcm";
const key = createHash("sha256").update(env.ENCRYPTION_KEY).digest();

export function encryptText(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptText(value: string): string {
  const [ivB64, authTagB64, encryptedB64] = value.split(":");
  const decipher = createDecipheriv(algorithm, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, "base64")),
    decipher.final()
  ]).toString("utf8");
}
