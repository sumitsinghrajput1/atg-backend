import { Types } from "mongoose";

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
    variant?: {
      color?: string;
      size?: string;
    };
    bundleItems?: {
      productId: string;
      quantity: number;
      variant?: {
        color?: string;
        size?: string;
      };
    }[];
  }[];
  address: {
    name: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    zipCode: string;
  };
  couponCode?: string;
  deliveryFee?: number;
}

export interface VerifyOrderRequest extends CreateOrderRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface ValidatedOrderItem {
  productId: Types.ObjectId;
  quantity: number;
  price: number;
  discountPrice?:number,
  variant?: {
    color?: string;
    size?: string;
  };
  isBundle?: boolean;
  bundleItems?: {
    productId: Types.ObjectId;
    quantity: number;
    variant?: {
      color?: string;
      size?: string;
    };
  }[];
}

export interface ValidationResult {
  validatedItems: ValidatedOrderItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  appliedCoupon: any;
}
