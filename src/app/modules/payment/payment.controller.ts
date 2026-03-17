import { Request, Response } from 'express';
import catchAsync from '../../middlewares/catchAsync';
import { PaymentService } from './payment.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.initiatePayment(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment initiated successfully",
    data: result
  });
});

const getPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPaymentBySessionId(req.params.sessionId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment details fetched successfully",
    data: result
  });
});

export const PaymentController = {
  initiatePayment,
  getPayment
};
