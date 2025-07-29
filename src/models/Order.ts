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
  finalAmount: number;
  paymentStatus: "pending" | "success" | "failed";
  paymentId?: string;
  address: Address;
  couponCode?: string;
  status: "processing" | "shipped" | "delivered" | "cancelled";
}

const orderItemSchema = new Schema<OrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product" },
  quantity: Number,
  price: Number,
  isBundle: Boolean,
  variant: {
    color: String,
    size: String
  },

  bundleItems: [{
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    quantity: Number,
    variant: {
      color: String,
      size: String
    }

  }]
}, { _id: false });

const addressSchema = new Schema<Address>({
  name: String,
  phone: String,
  addressLine: String,
  city: String,
  state: String,
  zipCode: String
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  items: [orderItemSchema],
  totalAmount: Number,
  discount: Number,
  finalAmount: Number,
  paymentStatus: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending"
  },
  paymentId: String,
  address: addressSchema,
  couponCode: String,
  status: {
    type: String,
    enum: ["processing", "shipped", "delivered", "cancelled"],
    default: "processing"
  }
}, { timestamps: true });

export const Order = model<IOrder>("Order", orderSchema);
