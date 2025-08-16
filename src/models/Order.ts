import { Schema, model, Document, Types } from "mongoose";

export interface OrderItem {
  productId: Types.ObjectId;
  quantity: number;
  price: number;
  isBundle?: boolean;
  variant?: {
    color?: string;
    size?: string;
  };
  bundleItems?: {
    productId: Types.ObjectId;
    quantity: number;
    variant?: {
      color?: string;
      size?: string;
    };
  }[];
}

export interface Address {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface IOrder extends Document {
  orderId: string;
  userId?: Types.ObjectId;
  items: OrderItem[];
  totalAmount: number;
  discount: number;
  deliveryFee: number;  // Added
  finalAmount: number;
  paymentStatus: "pending" | "success" | "failed";
  paymentId?: string;
  razorpayOrderId?: string;  // Added for Razorpay integration
  address: Address;
  couponCode?: string;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  isBundle: { type: Boolean, default: false },
  variant: {
    color: String,
    size: String
  },
  bundleItems: [{
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, min: 1 },
    variant: {
      color: String,
      size: String
    }
  }]
}, { _id: false });

const addressSchema = new Schema<Address>({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true }
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  items: { type: [orderItemSchema], required: true },
  totalAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  deliveryFee: { type: Number, default: 0, min: 0 },
  finalAmount: { type: Number, required: true, min: 0 },
  paymentStatus: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending"
  },
  paymentId: String,
  razorpayOrderId: String,
  address: { type: addressSchema, required: true },
  couponCode: String,
  status: {
    type: String,
    enum: ["processing", "shipped", "delivered", "cancelled"],
    default: "processing"
  }
}, { timestamps: true });

export const Order = model<IOrder>("Order", orderSchema);
