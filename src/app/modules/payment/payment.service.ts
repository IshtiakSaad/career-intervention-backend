import { Payment, PaymentStatus } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { IPaymentCreatePayload, IPaymentUpdatePayload } from './payment.interface';
import { AppError } from '../../errorHelpers/app-error';
import httpStatus from 'http-status';

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

  const result = await prisma.payment.update({
    where: { sessionId },
    data: payload as any
  });

  return result;
};

export const PaymentService = {
  initiatePayment,
  getPaymentBySessionId,
  updatePaymentStatus
};
