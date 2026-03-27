import crypto from "crypto";
import { envVars } from "../../config/env";

/**
 * MeetingService generates deterministic, tamper-resistant Jitsi Meet room links.
 *
 * Why Jitsi:
 * - Zero API keys, zero cost, zero user accounts required.
 * - Deterministic: same sessionId always produces the same link.
 * - HMAC-based short hash prevents URL enumeration attacks.
 * - Strategy pattern ready for Zoom/Google Meet upgrade later.
 */
class MeetingService {
  private static PLATFORM_SLUG = "careermentor";

  /**
   * Generate a deterministic, secure Jitsi meeting link for a session.
   * Format: https://meet.jit.si/{platform}-{sessionId}-{hmacShortHash}
   *
   * The HMAC ensures that even if someone knows the sessionId (a UUID),
   * they cannot construct a valid meeting link without the server secret.
   */
  public static generateMeetingLink(sessionId: string): string {
    const secret = envVars.MEETING_ROOM_SECRET || envVars.ENCRYPTION_KEY_V1;

    const hmac = crypto
      .createHmac("sha256", secret)
      .update(sessionId)
      .digest("hex")
      .substring(0, 8);

    const roomName = `${this.PLATFORM_SLUG}-${sessionId}-${hmac}`;
    return `https://meet.jit.si/${roomName}`;
  }
}

export default MeetingService;
