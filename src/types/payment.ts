export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  deliveryFee: number;
}
