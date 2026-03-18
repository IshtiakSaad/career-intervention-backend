import { Payment, PaymentStatus, SessionStatus } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { IPaymentCreatePayload, IPaymentUpdatePayload } from './payment.interface';
import { AppError } from '../../errorHelpers/app-error';
import httpStatus from 'http-status';
import { sendEmail } from '../../utils/sendEmail';

const initiatePayment = async (
  payload: IPaymentCreatePayload
): Promise<Payment> => {
  const { sessionId, amount, currency } = payload;

  const session = await prisma.session.findUnique({
    where: { id: sessionId }
  });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Session not found");
  }

  // Check if payment already exists for this session
  const existingPayment = await prisma.payment.findUnique({
    where: { sessionId }
  });

  if (existingPayment) {
      return existingPayment;
  }

  const result = await prisma.payment.create({
    data: {
      sessionId,
      amount,
      currency: currency || 'USD',
      status: PaymentStatus.PENDING
    }
  });

  return result;
};

const getPaymentBySessionId = async (sessionId: string) => {
  return await prisma.payment.findUnique({
    where: { sessionId },
    include: { session: true }
  });
};

const updatePaymentStatus = async (
  sessionId: string,
  payload: IPaymentUpdatePayload
): Promise<Payment> => {
  const isExist = await prisma.payment.findUnique({
    where: { sessionId }
  });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { sessionId },
      data: payload as any
    });

    // If payment is completed, update session status to CONFIRMED
    if (payload.status === PaymentStatus.COMPLETED) {
        await tx.session.update({
            where: { id: sessionId },
            data: { status: SessionStatus.CONFIRMED }
        });
    }
    
    // If payment failed, we might want to cancel the session or leave it pending
    // For now, let's just log it or handle it in a separated cron job.

    return payment;
  });

  if (payload.status === PaymentStatus.COMPLETED) {
    try {
      const sessionDetails = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          mentor: { include: { user: true } },
          mentee: { include: { user: true } },
          service: true,
          availabilitySlot: true
        }
      });

      if (sessionDetails) {
        const mentorEmail = sessionDetails.mentor.user.email;
        const menteeEmail = sessionDetails.mentee.user.email;
        const startTime = new Date(sessionDetails.availabilitySlot.startTime).toLocaleString();

        const htmlContent = `
          <h2>Session Confirmed</h2>
          <p>The session for <b>${sessionDetails.service.title}</b> has been successfully confirmed.</p>
          <p><strong>Scheduled Time:</strong> ${startTime}</p>
          <p>Please refer to your dashboard for the video link and further details.</p>
        `;

        sendEmail({
          to: menteeEmail,
          subject: "Booking Confirmed - Career Platform",
          html: htmlContent
        }).catch(console.error);

        sendEmail({
          to: mentorEmail,
          subject: "New Booking Confirmed - Career Platform",
          html: htmlContent
        }).catch(console.error);
      }
    } catch (err) {
      console.error("Failed to send confirmation emails:", err);
    }
  }

  return result;
};

export const PaymentService = {
  initiatePayment,
  getPaymentBySessionId,
  updatePaymentStatus
};
