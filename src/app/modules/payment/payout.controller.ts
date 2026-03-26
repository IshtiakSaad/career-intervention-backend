import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import { PayoutService } from "./payout.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

// ─────────────────────────────────────────────
// PAYOUT ENDPOINTS (Admin)
// ─────────────────────────────────────────────

const getAllPayouts = catchAsync(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const result = await PayoutService.getAllPayouts(status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payouts fetched successfully",
    data: result,
  });
});

const processPayout = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await PayoutService.processPayout(
    req.params.id as string,
    user.id,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payout processed successfully",
    data: result,
  });
});

// ─────────────────────────────────────────────
// DISPUTE ENDPOINTS
// ─────────────────────────────────────────────

const fileDispute = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await PayoutService.fileDispute(user.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Dispute filed successfully",
    data: result,
  });
});

const resolveDispute = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await PayoutService.resolveDispute(
    req.params.id as string,
    user.id,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dispute resolved successfully",
    data: result,
  });
});

const getAllDisputes = catchAsync(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const result = await PayoutService.getAllDisputes(status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Disputes fetched successfully",
    data: result,
  });
});

export const PayoutController = {
  getAllPayouts,
  processPayout,
  fileDispute,
  resolveDispute,
  getAllDisputes,
};
