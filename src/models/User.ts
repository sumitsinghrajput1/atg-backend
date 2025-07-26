import { Schema, model, Document , Types  } from "mongoose";

export interface Address {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone?: string;
  isVerified: boolean;
  addresses: Address[];
}

const addressSchema = new Schema<Address>({
  name: String,
  phone: String,
  addressLine: String,
  city: String,
  state: String,
  zipCode: String
}, { _id: false });

const userSchema = new Schema<IUser>({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  isVerified: { type: Boolean, default: false},
  addresses: [addressSchema],
}, { timestamps: true });

export const User = model<IUser>("User", userSchema);
