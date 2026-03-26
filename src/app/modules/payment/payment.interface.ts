export interface IPaymentInitiatePayload {
  sessionId: string;
}

export interface IIPNPayload {
  tran_id: string;
  val_id: string;
  amount: string;
  card_type: string;
  store_amount: string;
  bank_tran_id: string;
  status: string;
  currency: string;
  [key: string]: any;
}

export interface IProcessPayoutPayload {
  payoutMethod: string;  // "bKash", "Bank NPSB", etc.
  payoutRef: string;     // External transaction reference
}

export interface IFileDisputePayload {
  sessionId: string;
  reason: string;
}

export interface IResolveDisputePayload {
  resolution: string;
  outcome: "REFUND" | "DENY";
}
