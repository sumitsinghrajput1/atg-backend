import { Schema, model, Document, Types } from "mongoose";

export interface Variant {
  color?: string;
  size?: string;
  stock: number;
}

export interface BundleItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  banner: String;
  images: string[];
  categoryId: Types.ObjectId;
  tags: string[];
  price: number;
  discountPrice?: number;
  stock: number;
  isAvailable: boolean;
  variants?: Variant[];
  isGiftBox: boolean;
  isReturnGift: boolean;
  isTrending: boolean;
  isBundle: boolean;
  bundleItems?: BundleItem[];
  isFeatured?:boolean;
}

const variantSchema = new Schema<Variant>({
  color: String,
  size: String,
  stock: Number
}, { _id: false });

const bundleItemSchema = new Schema<BundleItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product" },
  quantity: Number
}, { _id: false });

const productSchema = new Schema<IProduct>({
  name: String,
  description: String,
  banner: String,
  images: [String],
  categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
  tags: [String],
  price: Number,
  discountPrice: Number,
  stock: Number,
  isAvailable: { type: Boolean, default: true },
  variants: [variantSchema],
  isGiftBox: { type: Boolean, default: false },
  isReturnGift: { type: Boolean, default: false },
  isTrending: { type: Boolean, default: false },
  isBundle: { type: Boolean, default: false },
  bundleItems: [bundleItemSchema],
  isFeatured: {
  type: Boolean,
  default: false
}
}, { timestamps: true });

export const Product = model<IProduct>("Product", productSchema);
