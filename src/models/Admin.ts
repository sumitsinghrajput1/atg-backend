import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdmin extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: "super_admin" | "admin" | "moderator";
  isActive: boolean;
  lastLogin?: Date;
  createdBy?: Types.ObjectId;
  otp?: {
    code?: string;
    expires?: Date;
    attempts: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["super_admin", "admin", "moderator"],
    default: "admin"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "Admin"
  },
  otp: {
    code: String,
    expires: Date,
    attempts: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Hash password before save
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

export const Admin = model<IAdmin>("Admin", adminSchema);
