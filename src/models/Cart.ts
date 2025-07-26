import { Schema, model, Document, Types } from "mongoose";

export interface BundleItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface CartItem {
  productId: Types.ObjectId;
  quantity: number;
  isBundle?: boolean;
  bundleItems?: BundleItem[];
}

export interface ICart extends Document {
  userId?: Types.ObjectId;
  sessionId?: string;
  items: CartItem[];
}

const bundleItemSchema = new Schema<BundleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const cartItemSchema = new Schema<CartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    bundleItems: [bundleItemSchema]
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    sessionId: { type: String, required: false },
    items: [cartItemSchema]
  },
  { timestamps: true }
);

// ✅ Optional: Ensure only 1 cart per user or session
cartSchema.index({ userId: 1 }, { unique: true, sparse: true });
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });

export const Cart = model<ICart>("Cart", cartSchema);
