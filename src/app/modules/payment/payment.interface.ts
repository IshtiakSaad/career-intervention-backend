import { PaymentStatus } from "../../../generated/prisma";

export interface IPaymentCreatePayload {
  sessionId: string;
  amount: number;
  currency?: string;
}

export interface IPaymentUpdatePayload {
  status?: PaymentStatus;
  transactionId?: string;
  gatewayMetadata?: any;
}
