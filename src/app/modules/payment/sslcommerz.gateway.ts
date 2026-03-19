import SSLCommerzPayment from "sslcommerz-lts";
import { envVars } from "../../config/env";

const store_id = envVars.SSL_STORE_ID;
const store_passwd = envVars.SSL_STORE_PASSWORD;
const is_live = envVars.SSL_IS_SANDBOX !== "true"; // sandbox = false

interface ISSLInitPayload {
  total_amount: number;
  currency: string;
  tran_id: string;          // Our PaymentIntent ID
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  product_name: string;
  product_category: string;
  cus_name: string;
  cus_email: string;
  cus_phone: string;
  shipping_method: "NO";
  num_of_item: number;
  product_profile: "non-physical-goods";
}

interface IGatewayInitResponse {
  status: string;
  GatewayPageURL: string;
  sessionkey: string;
  failedreason?: string;
}

interface IValidationResponse {
  status: string;
  tran_id: string;
  val_id: string;
  amount: string;
  store_amount: string;
  currency: string;
  bank_tran_id: string;
  card_type: string;
  card_brand: string;
  risk_level: string;
  risk_title: string;
}

/**
 * SSLCommerzGateway: Low-level gateway adapter.
 * This class wraps the SDK and provides typed methods.
 * It should NEVER contain business logic — only gateway communication.
 */
class SSLCommerzGateway {
  /**
   * Initialize a payment session with SSLCommerz.
   * Returns the redirect URL for the user.
   */
  public static async initiate(payload: ISSLInitPayload): Promise<IGatewayInitResponse> {
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const response = await sslcz.init(payload);

    if (!response?.GatewayPageURL) {
      throw new Error(
        `SSLCommerz init failed: ${response?.failedreason || "No GatewayPageURL returned"}`
      );
    }

    return response as IGatewayInitResponse;
  }

  /**
   * Validate a transaction using SSLCommerz Validation API.
   * This is the ONLY trusted source of payment truth.
   */
  public static async validate(valId: string): Promise<IValidationResponse> {
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const response = await sslcz.validate({ val_id: valId });

    if (!response || response.status !== "VALID") {
      throw new Error(
        `SSLCommerz validation failed for val_id: ${valId}. Status: ${response?.status}`
      );
    }

    return response as IValidationResponse;
  }
}

export default SSLCommerzGateway;
export type { ISSLInitPayload, IGatewayInitResponse, IValidationResponse };
