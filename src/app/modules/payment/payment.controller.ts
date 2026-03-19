import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import { PaymentService } from "./payment.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { envVars } from "../../config/env";

/**
 * POST /payments/initiate
 * Authenticated. Creates PaymentIntent & returns SSLCommerz redirect URL.
 */
const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { sessionId } = req.body;

  const result = await PaymentService.initiatePayment(
    user.id,
    sessionId,
    { ip: req.ip || "unknown", ua: req.headers["user-agent"] || "unknown" }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment initiated. Redirect user to gateway.",
    data: result,
  });
});

/**
 * POST /payments/success (SSLCommerz redirect)
 * DO NOT TRUST. Show "Processing..." page to user.
 */
const handleSuccess = catchAsync(async (req: Request, res: Response) => {
  // Redirect user to frontend with processing state
  const clientUrl = envVars.CLIENT_URL;
  const tranId = req.body.tran_id || req.query.tran_id;
  res.redirect(`${clientUrl}/payment/processing?tran_id=${tranId}`);
});

/**
 * POST /payments/fail (SSLCommerz redirect)
 */
const handleFail = catchAsync(async (req: Request, res: Response) => {
  const tranId = req.body.tran_id || req.query.tran_id;
  
  if (tranId) {
    await PaymentService.handleRedirectFail(tranId);
  }

  const clientUrl = envVars.CLIENT_URL;
  res.redirect(`${clientUrl}/payment/failed?tran_id=${tranId}`);
});

/**
 * POST /payments/cancel (SSLCommerz redirect)
 */
const handleCancel = catchAsync(async (req: Request, res: Response) => {
  const tranId = req.body.tran_id || req.query.tran_id;

  if (tranId) {
    await PaymentService.handleRedirectCancel(tranId);
  }

  const clientUrl = envVars.CLIENT_URL;
  res.redirect(`${clientUrl}/payment/cancelled?tran_id=${tranId}`);
});

/**
 * POST /payments/ipn (Server-to-Server callback)
 * SOURCE OF TRUTH. Validates with SSLCommerz API.
 */
const handleIPN = catchAsync(async (req: Request, res: Response) => {
  await PaymentService.handleIPN(req.body);

  // SSLCommerz expects a 200 response
  res.status(httpStatus.OK).json({ message: "IPN received" });
});

/**
 * GET /payments/:sessionId
 * Fetch payment details by session.
 */
const getPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPaymentBySessionId(req.params.sessionId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment details fetched successfully",
    data: result,
  });
});

export const PaymentController = {
  initiatePayment,
  handleSuccess,
  handleFail,
  handleCancel,
  handleIPN,
  getPayment,
};
