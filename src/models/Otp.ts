import mongoose, { Document, Schema } from "mongoose";

export interface IOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  attempts: number;        // ✅ NEW
  lastSentAt: Date;        // ✅ NEW
}

const otpSchema = new Schema<IOtp>({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 1 },        // ✅
  lastSentAt: { type: Date, default: Date.now }, // ✅
});

export const Otp = mongoose.model<IOtp>("Otp", otpSchema);
