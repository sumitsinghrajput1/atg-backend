import { Schema, model, Document, Types } from "mongoose";
import { OrderItem, Address } from "../models/Order";

export interface IPaymentIntent extends Document {
  razorpayOrderId: string;
  userId?: Types.ObjectId;
  items: OrderItem[];
  totalAmount: number;
  discount: number;
  deliveryFee: number;
  finalAmount: number;
  address: Address;
  couponCode?: string;
  appliedCouponId?: Types.ObjectId;
  status: "pending" | "completed" | "failed" | "expired";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the OrderItem schema for the PaymentIntent
const orderItemSchema = new Schema({
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

const paymentIntentSchema = new Schema<IPaymentIntent>({
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  items: [orderItemSchema], // ✅ Fix: Use proper schema definition instead of Array
  totalAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  deliveryFee: { type: Number, default: 0, min: 0 },
  finalAmount: { type: Number, required: true, min: 0 },
  address: { 
    name: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true }
  }, // ✅ Better to define address structure explicitly
  couponCode: String,
  appliedCouponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "expired"],
    default: "pending"
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    index: { expireAfterSeconds: 0 }
  }
}, { timestamps: true });

export const PaymentIntent = model<IPaymentIntent>("PaymentIntent", paymentIntentSchema);
