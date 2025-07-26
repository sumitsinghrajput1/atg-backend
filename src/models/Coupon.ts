import { Schema, model, Document } from "mongoose";

export type CouponType = "percentage" | "fixed";

export interface ICoupon extends Document {
  code: string;
  type: CouponType;
  discountValue: number;
  discountPercent?: number;
  minPurchase: number;
  maxDiscount?: number;
  validFrom: Date;
  validTill: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, unique: true, required: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    discountPercent: { type: Number },
    minPurchase: { type: Number, required: true },
    maxDiscount: { type: Number }, // only for percentage
    validFrom: { type: Date, required: true },
    validTill: { type: Date, required: true },
    usageLimit: { type: Number, required: true },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Coupon = model<ICoupon>("Coupon", couponSchema);
