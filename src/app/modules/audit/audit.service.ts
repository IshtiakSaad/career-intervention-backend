import { AuditAction, AuditEventType } from "../../../generated/prisma";
import prisma from "../../utils/prisma";
import Sanitizer from "../../utils/sanitizer";
import crypto from "crypto";

interface IAuditLogPayload {
  actorId?: string;
  sessionId?: string;
  eventType: AuditEventType;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  stateBefore?: any;
  stateAfter?: any;
  ipAddress?: string;
  userAgent?: string;
  riskScore?: number;
  reason?: string;
}

class AuditService {
  /**
   * Primary entry point for logging an action.
   * Supports transactional consistency.
   */
  public static async log(payload: IAuditLogPayload, tx?: any) {
    const db = tx || prisma;

    // 1. Sanitize Snapshots
    const sanitizedBefore = Sanitizer.sanitize(payload.stateBefore);
    const sanitizedAfter = Sanitizer.sanitize(payload.stateAfter);

    // 2. Compute Integrity Hash (Tamper-Evidence)
    const latestLog = await db.auditLog.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    const previousHash = latestLog?.currentHash || null;
    
    // Create current hash based on prevHash + current payload string
    const hashData = JSON.stringify({
        previousHash,
        actorId: payload.actorId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        timestamp: new Date().toISOString()
    });

    const currentHash = crypto.createHash("sha256").update(hashData).digest("hex");

    // 3. Write record
    return await db.auditLog.create({
      data: {
        actorId: payload.actorId,
        sessionId: payload.sessionId,
        eventType: payload.eventType,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        stateBefore: sanitizedBefore || undefined,
        stateAfter: sanitizedAfter || undefined,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        riskScore: payload.riskScore || 0,
        reason: payload.reason,
        previousHash,
        currentHash
      },
    });
  }
}

export default AuditService;
