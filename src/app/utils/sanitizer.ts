/**
 * Sanitizer provides rules to scrub sensitive data from objects before logging.
 */
class Sanitizer {
  private static FORBIDDEN_KEYS = [
    "password",
    "passwordHash",
    "refreshToken",
    "refreshTokenHash",
    "twoFactorSecret",
    "backupCodes",
    "secret",
    "token",
    "key",
  ];

  /**
   * Deeply sanitizes an object by removing or masking forbidden keys.
   */
  public static sanitize(data: any): any {
    if (!data || typeof data !== "object") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sanitized: any = {};

    for (const key in data) {
      if (this.FORBIDDEN_KEYS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof data[key] === "object" && data[key] !== null) {
        sanitized[key] = this.sanitize(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }

    return sanitized;
  }
}

export default Sanitizer;
