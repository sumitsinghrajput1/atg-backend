// utils/insertAdmin.ts
import mongoose from "mongoose";
import { Admin } from "../models/Admin";
import { config } from "dotenv";
import connectDB from "../config/db";

config();

export const insertAdmin = async ({
  email,
  password,
  name,
  role = "admin",
  createdBy,
}: {
  email: string;
  password: string;
  name: string;
  role?: "super_admin" | "admin" | "moderator";
  createdBy?: string;
}) => {
  try {
    await connectDB();

    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log("❌ Admin already exists with this email:", email);
      return { success: false, message: "Admin already exists" };
    }

    // ✅ Don't hash password here - the schema middleware will do it automatically
    const admin = await Admin.create({
      email,
      password, // Plain password - will be hashed by pre("save") middleware
      name,
      role,
      ...(createdBy && { createdBy })
    });

    console.log("✅ Admin created successfully:", {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });

    return { 
      success: true, 
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    };

  } catch (err) {
    console.error("❌ Error inserting admin:", err);
    return { success: false, message: "Failed to create admin", error: err };
  } finally {
    await mongoose.disconnect();
  }
};
