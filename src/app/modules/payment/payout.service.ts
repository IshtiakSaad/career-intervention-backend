import { AuditAction, AuditEventType, PayoutStatus, NotificationType } from "../../../generated/prisma";
import prisma from "../../utils/prisma";
import { AppError } from "../../errorHelpers/app-error";
import httpStatus from "http-status";
import AuditService from "../audit/audit.service";
import NotificationService from "../notification/notification.service";
import { IProcessPayoutPayload, IFileDisputePayload, IResolveDisputePayload } from "./payment.interface";

// ─────────────────────────────────────────────
// PAYOUT ENGINE (Admin)
// ─────────────────────────────────────────────

/**
 * List all payouts (Admin dashboard).
 * Supports filtering by status.
 */
const getAllPayouts = async (statusFilter?: string) => {
  const where: any = {};
  if (statusFilter) {
    where.status = statusFilter;
  }

  return await prisma.payout.findMany({
    where,
    include: {
      mentor: { include: { user: { select: { id: true, name: true, email: true } } } },
      session: { include: { service: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Mark payout as PROCESSING → PAID.
 * Admin manually sends money via bKash/Bank, then records it here.
 */
const processPayout = async (
  payoutId: string,
  adminId: string,
  payload: IProcessPayoutPayload
) => {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { session: true },
  });

  if (!payout) {
    throw new AppError(httpStatus.NOT_FOUND, "Payout not found");
  }

  // Only allow processing of PENDING_PAYOUT status
  if (payout.status !== PayoutStatus.PENDING_PAYOUT) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot process payout in "${payout.status}" status. Must be PENDING_PAYOUT.`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.PAID,
        payoutMethod: payload.payoutMethod,
        payoutRef: payload.payoutRef,
        paidAt: new Date(),
      },
    });

    await AuditService.log(
      {
        actorId: adminId,
        eventType: AuditEventType.FINANCIAL_EVENT,
        action: AuditAction.PAYOUT_PROCESSED,
        entityType: "Payout",
        entityId: payoutId,
        stateBefore: { status: PayoutStatus.PENDING_PAYOUT },
        stateAfter: {
          status: PayoutStatus.PAID,
          payoutMethod: payload.payoutMethod,
          payoutRef: payload.payoutRef,
          mentorShare: Number(payout.mentorShare),
        },
        reason: `Admin processed payout via ${payload.payoutMethod}`,
      },
      tx
    );

    // Notify mentor that payout has been processed
    const mentorProfile = await tx.mentorProfile.findUnique({
      where: { id: payout.mentorId },
      include: { user: true },
    });

    if (mentorProfile) {
      await NotificationService.dispatch({
        userId: mentorProfile.user.id,
        type: NotificationType.PAYOUT_PROCESSED,
        title: "Payout Processed",
        body: `Your payout of ${Number(payout.mentorShare)} BDT has been processed via ${payload.payoutMethod}.`,
        entityType: "Payout",
        entityId: payoutId,
      }, tx);
    }

    return updated;
  });

  return result;
};

/**
 * Mark UNEARNED → PENDING_PAYOUT when session is completed.
 * This should be called when a session status transitions to COMPLETED.
 */
const markPayoutPending = async (sessionId: string) => {
  const payout = await prisma.payout.findUnique({
    where: { sessionId },
  });

  if (payout && payout.status === PayoutStatus.UNEARNED) {
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: PayoutStatus.PENDING_PAYOUT },
    });
  }
};

// ─────────────────────────────────────────────
// DISPUTE RESOLUTION
// ─────────────────────────────────────────────

/**
 * Mentee files a dispute against a session.
 */
const fileDispute = async (userId: string, payload: IFileDisputePayload) => {
  const { sessionId, reason } = payload;

  // Verify session exists
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { mentee: { include: { user: true } } },
  });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Session not found");
  }

  if (session.mentee.user.id !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only file disputes for your own sessions");
  }

  // Check for existing open dispute
  const existing = await prisma.dispute.findFirst({
    where: {
      sessionId,
      status: { in: ["OPEN", "UNDER_REVIEW"] },
    },
  });

  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "An active dispute already exists for this session");
  }

  const dispute = await prisma.$transaction(async (tx) => {
    const created = await tx.dispute.create({
      data: {
        sessionId,
        filedById: userId,
        reason,
        status: "OPEN",
      },
    });

    // Hold the payout if one exists
    const payout = await tx.payout.findUnique({ where: { sessionId } });
    if (payout && payout.status !== "PAID") {
      await tx.payout.update({
        where: { id: payout.id },
        data: { status: "HELD" },
      });
    }

    await AuditService.log(
      {
        actorId: userId,
        eventType: AuditEventType.DISPUTE_EVENT,
        action: AuditAction.DISPUTE_OPENED,
        entityType: "Dispute",
        entityId: created.id,
        stateAfter: { sessionId, reason },
        riskScore: 70,
        reason: `Mentee filed dispute: ${reason.substring(0, 100)}`,
      },
      tx
    );

    // Notify mentor about the dispute
    const mentorProfile = await tx.mentorProfile.findUnique({
      where: { id: session.mentorId },
      include: { user: true },
    });

    if (mentorProfile) {
      await NotificationService.dispatch({
        userId: mentorProfile.user.id,
        type: NotificationType.DISPUTE_OPENED,
        title: "Dispute Filed",
        body: `A dispute has been filed against one of your sessions.`,
        entityType: "Dispute",
        entityId: created.id,
      }, tx);
    }

    return created;
  });

  return dispute;
};

/**
 * Admin resolves a dispute (Refund or Deny).
 */
const resolveDispute = async (
  disputeId: string,
  adminId: string,
  payload: IResolveDisputePayload
) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { session: true },
  });

  if (!dispute) {
    throw new AppError(httpStatus.NOT_FOUND, "Dispute not found");
  }

  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
    throw new AppError(httpStatus.BAD_REQUEST, "Dispute is already resolved");
  }

  const resolvedStatus =
    payload.outcome === "REFUND" ? "RESOLVED_REFUND" : "RESOLVED_DENIED";

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: resolvedStatus,
        resolution: payload.resolution,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    });

    // Handle payout based on outcome
    const payout = await tx.payout.findUnique({
      where: { sessionId: dispute.sessionId },
    });

    if (payout) {
      if (payload.outcome === "REFUND") {
        // Refund: reject the mentor payout
        await tx.payout.update({
          where: { id: payout.id },
          data: { status: "REJECTED" },
        });

        // Mark the payment as REFUNDED
        await tx.paymentIntent.updateMany({
          where: { sessionId: dispute.sessionId },
          data: { status: "REFUNDED" },
        });
      } else {
        // Deny dispute: release the payout back to normal flow
        await tx.payout.update({
          where: { id: payout.id },
          data: { status: "PENDING_PAYOUT" },
        });
      }
    }

    await AuditService.log(
      {
        actorId: adminId,
        eventType: AuditEventType.DISPUTE_EVENT,
        action: AuditAction.DISPUTE_RESOLVED,
        entityType: "Dispute",
        entityId: disputeId,
        stateBefore: { status: dispute.status },
        stateAfter: {
          status: resolvedStatus,
          outcome: payload.outcome,
          resolution: payload.resolution,
        },
        riskScore: 85,
        reason: `Admin resolved dispute: ${payload.outcome}`,
      },
      tx
    );

    // Notify both the filer and the mentor
    const session = await tx.session.findUnique({
      where: { id: dispute.sessionId },
      include: { mentor: { include: { user: true } } },
    });

    const outcomeText = payload.outcome === "REFUND" ? "Refund approved" : "Dispute denied";

    const notificationTargets: string[] = [dispute.filedById];
    if (session?.mentor?.user?.id && session.mentor.user.id !== dispute.filedById) {
      notificationTargets.push(session.mentor.user.id);
    }

    await NotificationService.dispatchBulk(
      notificationTargets.map((uid) => ({
        userId: uid,
        type: NotificationType.DISPUTE_RESOLVED,
        title: "Dispute Resolved",
        body: `A dispute has been resolved: ${outcomeText}.`,
        entityType: "Dispute",
        entityId: disputeId,
      })),
      tx
    );

    return updated;
  });

  return result;
};

/**
 * Get all disputes (Admin dashboard).
 */
const getAllDisputes = async (statusFilter?: string) => {
  const where: any = {};
  if (statusFilter) {
    where.status = statusFilter;
  }

  return await prisma.dispute.findMany({
    where,
    include: {
      session: { include: { service: true } },
      filedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const PayoutService = {
  getAllPayouts,
  processPayout,
  markPayoutPending,
  fileDispute,
  resolveDispute,
  getAllDisputes,
};
