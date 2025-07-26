import { Schema, model, Document, Types } from "mongoose";

export interface IOffer extends Document {
  title: string;
  description: string;
  bannerImage?: string;
  activeFrom: Date;
  activeTill: Date;
  productIds: Types.ObjectId[];
  isActive: boolean;
}

const offerSchema = new Schema<IOffer>({
  title: String,
  description: String,
  bannerImage: String,
  activeFrom: Date,
  activeTill: Date,
  productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Offer = model<IOffer>("Offer", offerSchema);
