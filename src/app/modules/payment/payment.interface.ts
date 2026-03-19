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
  [key: string]: any; // SSLCommerz sends many extra fields
}
