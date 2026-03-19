import crypto from "crypto";
import { envVars } from "../../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce is recommended for GCM
const AUTH_TAG_LENGTH = 16;
const DEFAULT_KEY_ID = "v1";

/**
 * CipherService provides military-grade encryption using AES-256-GCM.
 * It follows the envelope format: keyId:iv:authTag:ciphertext
 */
class CipherService {
  /**
   * Encrypts a plain-text string.
   * @param text The text to encrypt
   * @returns The formatted encrypted string (keyId:iv:authTag:ciphertext)
   */
  public static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.getKey(DEFAULT_KEY_ID);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    // Format: kid:base64(iv):base64(authTag):base64(ciphertext)
    return [
      DEFAULT_KEY_ID,
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted,
    ].join(":");
  }

  /**
   * Decrypts an envelope-formatted string.
   * @param envelope The formatted string (keyId:base64(iv):base64(authTag):base64(ciphertext))
   * @returns The decrypted plain-text string
   */
  public static decrypt(envelope: string): string {
    const parts = envelope.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid encryption envelope format");
    }

    const [kid, ivBase64, authTagBase64, ciphertextBase64] = parts;

    const key = this.getKey(kid);
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");

    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length. Expected ${IV_LENGTH} bytes.`);
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid Auth Tag length. Expected ${AUTH_TAG_LENGTH} bytes.`);
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextBase64, "base64", "utf8");
    
    try {
      decrypted += decipher.final("utf8");
    } catch (err) {
      throw new Error("Decryption failed. Authentication tag mismatch or corrupted data.");
    }

    return decrypted;
  }

  /**
   * Internal Key Provider. Supports versioning.
   * Hard fails if key not found or invalid.
   */
  private static getKey(kid: string): Buffer {
    let keyHex: string | undefined;

    if (kid === "v1") {
      keyHex = envVars.ENCRYPTION_KEY_V1;
    }

    if (!keyHex) {
      throw new Error(`Encryption Key with ID '${kid}' not found in environment configuration.`);
    }

    const key = Buffer.from(keyHex, "hex");

    if (key.length !== 32) {
      throw new Error(`AES-256 requires exactly a 32-byte key. Detected length: ${key.length} bytes.`);
    }

    return key;
  }
}

export default CipherService;
