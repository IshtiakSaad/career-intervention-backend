import bcrypt from "bcryptjs";
import crypto from "crypto";
import { envVars } from "../../config/env";

class HashService {
  /**
   * Password/Backup Code Hashing (Slow, high iterations)
   * Uses Bcrypt by default.
   */
  public static async hashBcrypt(text: string): Promise<string> {
    const saltRounds = parseInt(envVars.BCRYPT_SALT_ROUNDS) || 12;
    return await bcrypt.hash(text, saltRounds);
  }

  public static async verifyBcrypt(text: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(text, hash);
  }

  /**
   * Token Hashing (Fast, assumes high entropy)
   * Uses SHA-256. Perfect for high-entropy Refresh Tokens.
   */
  public static hashSHA256(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  /**
   * Constant-time comparison for token verification.
   * Prevents timing attacks.
   * @param hashA The stored hash
   * @param unhashedToken The raw token to verify
   */
  public static verifySHA256(hashA: string, unhashedToken: string): boolean {
    const hashB = this.hashSHA256(unhashedToken);
    
    const bufferA = Buffer.from(hashA, "hex");
    const bufferB = Buffer.from(hashB, "hex");

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Cryptographically secure random token generation.
   * @param bytes Number of bytes (e.g., 32 for 256 bits)
   */
  public static generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString("hex");
  }
}

export default HashService;
