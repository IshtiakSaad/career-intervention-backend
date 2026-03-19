import { PaymentStatus, SessionStatus, AuditAction, AuditEventType } from "../../../generated/prisma";
import prisma from "../../utils/prisma";
import { envVars } from "../../config/env";
import { AppError } from "../../errorHelpers/app-error";
import httpStatus from "http-status";
import SSLCommerzGateway from "./sslcommerz.gateway";
import AuditService from "../audit/audit.service";
import { IIPNPayload } from "./payment.interface";

const PLATFORM_FEE_PERCENTAGE = 15; // 15% platform cut

/**
 * Step 1: Initiate Payment
 * Creates a PaymentIntent and redirects user to SSLCommerz.
 */
const initiatePayment = async (
  userId: string,
  sessionId: string,
  context: { ip: string; ua: string }
) => {
  // 1. Validate session exists and belongs to this user
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      mentee: { include: { user: true } },
      mentor: { include: { user: true } },
      service: true,
      paymentIntent: true,
    },
  });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Session not found");
  }

  if (session.mentee.user.id !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only pay for your own sessions");
  }

  if (session.status !== SessionStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, "Session is not in a payable state");
  }

  // 2. Check idempotency — don't create duplicate intents
  if (session.paymentIntent && session.paymentIntent.status === PaymentStatus.SUCCESS) {
    throw new AppError(httpStatus.CONFLICT, "Payment already completed for this session");
  }

  // 3. Create or reuse PaymentIntent
  let paymentIntent = session.paymentIntent;

  if (!paymentIntent || paymentIntent.status === PaymentStatus.FAILED || paymentIntent.status === PaymentStatus.CANCELLED) {
    paymentIntent = await prisma.paymentIntent.create({
      data: {
        sessionId,
        userId,
        amount: session.priceAtBooking,
        currency: "BDT",
        status: PaymentStatus.INITIATED,
        gateway: "SSLCOMMERZ",
      },
    });
  }

  // 4. Build SSLCommerz URLs
  const baseUrl = `${envVars.SSL_BASE_URL ? envVars.CLIENT_URL : "http://localhost:3000"}`;
  const serverBase = `http://localhost:${envVars.PORT}`;

  const sslPayload = {
    total_amount: Number(session.priceAtBooking),
    currency: "BDT" as const,
    tran_id: paymentIntent.id,
    success_url: `${serverBase}/api/v1/payments/success`,
    fail_url: `${serverBase}/api/v1/payments/fail`,
    cancel_url: `${serverBase}/api/v1/payments/cancel`,
    ipn_url: `${serverBase}/api/v1/payments/ipn`,
    product_name: session.service.title,
    product_category: "Mentoring Service",
    cus_name: session.mentee.user.name || "Customer",
    cus_email: session.mentee.user.email,
    cus_phone: session.mentee.user.phoneNumber || "N/A",
    shipping_method: "NO" as const,
    num_of_item: 1,
    product_profile: "non-physical-goods" as const,
  };

  // 5. Call SSLCommerz
  const gatewayResponse = await SSLCommerzGateway.initiate(sslPayload);

  // 6. Mark as PENDING (user redirected)
  await prisma.paymentIntent.update({
    where: { id: paymentIntent.id },
    data: { status: PaymentStatus.PENDING },
  });

  // 7. Audit
  await AuditService.log({
    actorId: userId,
    eventType: AuditEventType.FINANCIAL_EVENT,
    action: AuditAction.CREATE,
    entityType: "PaymentIntent",
    entityId: paymentIntent.id,
    stateAfter: { amount: Number(session.priceAtBooking), gateway: "SSLCOMMERZ" },
    ipAddress: context.ip,
    userAgent: context.ua,
    reason: "Payment initiated via SSLCommerz",
  });

  return {
    paymentIntentId: paymentIntent.id,
    redirectUrl: gatewayResponse.GatewayPageURL,
  };
};

/**
 * Step 4: IPN Handler — SOURCE OF TRUTH
 * This is server-to-server. Never trust redirects.
 */
const handleIPN = async (ipnData: IIPNPayload) => {
  const { tran_id, val_id, amount, status, bank_tran_id } = ipnData;

  // 1. Find PaymentIntent
  const paymentIntent = await prisma.paymentIntent.findUnique({
    where: { id: tran_id },
    include: { session: true },
  });

  if (!paymentIntent) {
    console.error(`[IPN] Unknown tran_id: ${tran_id}`);
    return;
  }

  // 2. Idempotency — reject if already processed
  if (paymentIntent.status === PaymentStatus.SUCCESS) {
    console.warn(`[IPN] Duplicate IPN for tran_id: ${tran_id}. Ignoring.`);
    return;
  }

  // 3. Check IPN status
  if (status !== "VALID") {
    await prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { id: tran_id },
        data: { status: PaymentStatus.FAILED },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentIntentId: tran_id,
          gatewayTranId: bank_tran_id || null,
          gatewayValId: val_id || null,
          bankTranId: bank_tran_id || null,
          status: PaymentStatus.FAILED,
          rawResponseBody: ipnData as any,
          isIPNValidated: false,
        },
      });

      await AuditService.log({
        eventType: AuditEventType.FINANCIAL_EVENT,
        action: AuditAction.UPDATE,
        entityType: "PaymentIntent",
        entityId: tran_id,
        riskScore: 90,
        reason: `IPN reported non-VALID status: ${status}`,
      }, tx);
    });
    return;
  }

  // 4. Validate via SSLCommerz Validation API (CRITICAL)
  const validation = await SSLCommerzGateway.validate(val_id);

  // 5. Amount tampering check (NON-NEGOTIABLE)
  const expectedAmount = Number(paymentIntent.amount);
  const paidAmount = parseFloat(validation.amount);

  if (Math.abs(paidAmount - expectedAmount) > 0.01) {
    await prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { id: tran_id },
        data: { status: PaymentStatus.FAILED },
      });

      await AuditService.log({
        eventType: AuditEventType.FINANCIAL_EVENT,
        action: AuditAction.UPDATE,
        entityType: "PaymentIntent",
        entityId: tran_id,
        riskScore: 100,
        reason: `AMOUNT TAMPERING DETECTED. Expected: ${expectedAmount}, Paid: ${paidAmount}`,
      }, tx);
    });
    throw new AppError(httpStatus.BAD_REQUEST, "Amount mismatch detected");
  }

  // 6. SUCCESS — Atomic update
  await prisma.$transaction(async (tx) => {
    // 6a. Mark PaymentIntent as SUCCESS
    await tx.paymentIntent.update({
      where: { id: tran_id },
      data: { status: PaymentStatus.SUCCESS },
    });

    // 6b. Create PaymentTransaction (forensic record)
    await tx.paymentTransaction.create({
      data: {
        paymentIntentId: tran_id,
        gatewayTranId: validation.bank_tran_id,
        gatewayValId: validation.val_id,
        bankTranId: validation.bank_tran_id,
        status: PaymentStatus.SUCCESS,
        rawResponseBody: ipnData as any,
        isIPNValidated: true,
        validatedAt: new Date(),
      },
    });

    // 6c. Confirm Session
    await tx.session.update({
      where: { id: paymentIntent.sessionId },
      data: { status: SessionStatus.CONFIRMED },
    });

    // 6d. Create Payout record (Custodial Ledger)
    const totalPrice = Number(paymentIntent.amount);
    const platformFee = parseFloat(((totalPrice * PLATFORM_FEE_PERCENTAGE) / 100).toFixed(2));
    const mentorShare = parseFloat((totalPrice - platformFee).toFixed(2));

    await tx.payout.create({
      data: {
        mentorId: paymentIntent.session.mentorId,
        sessionId: paymentIntent.sessionId,
        totalPrice: totalPrice,
        mentorShare: mentorShare,
        platformFee: platformFee,
        status: "UNEARNED",
      },
    });

    // 6e. Audit
    await AuditService.log({
      actorId: paymentIntent.userId,
      eventType: AuditEventType.FINANCIAL_EVENT,
      action: AuditAction.UPDATE,
      entityType: "PaymentIntent",
      entityId: tran_id,
      stateAfter: {
        amount: totalPrice,
        mentorShare,
        platformFee,
        gateway: "SSLCOMMERZ",
        bankTranId: validation.bank_tran_id,
      },
      riskScore: 80,
      reason: "Payment validated and confirmed via IPN",
    }, tx);
  });
};

/**
 * Handle redirect-based status updates (UNTRUSTED)
 * These only update UI state, never business logic.
 */
const handleRedirectFail = async (tran_id: string) => {
  const pi = await prisma.paymentIntent.findUnique({ where: { id: tran_id } });
  if (pi && pi.status !== PaymentStatus.SUCCESS) {
    await prisma.paymentIntent.update({
      where: { id: tran_id },
      data: { status: PaymentStatus.FAILED },
    });
  }
};

const handleRedirectCancel = async (tran_id: string) => {
  const pi = await prisma.paymentIntent.findUnique({ where: { id: tran_id } });
  if (pi && pi.status !== PaymentStatus.SUCCESS) {
    await prisma.paymentIntent.update({
      where: { id: tran_id },
      data: { status: PaymentStatus.CANCELLED },
    });
  }
};

/**
 * Query helpers
 */
const getPaymentBySessionId = async (sessionId: string) => {
  return await prisma.paymentIntent.findUnique({
    where: { sessionId },
    include: {
      transactions: { orderBy: { createdAt: "desc" } },
      session: true,
    },
  });
};

export const PaymentService = {
  initiatePayment,
  handleIPN,
  handleRedirectFail,
  handleRedirectCancel,
  getPaymentBySessionId,
};
