// controllers/adminAuth.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { Admin } from "../models/Admin"
import { sendAdminOtpEmail } from "../services/email/sendOtpEmail";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError";
import { AuthenticatedAdminRequest } from "../middlewares/adminAuth"; 


export const loginWithEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const admin = await Admin.findOne({ email, isActive: true });
  
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  admin.otp = {
    code: otp,
    expires: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0
  };
  await admin.save();

  await sendAdminOtpEmail({ 
    toEmail: admin.email, 
    toName: admin.name,
    otp: otp 
  });

  res.json({ message: "OTP sent to email", adminId: admin._id });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { adminId, otp } = req.body;

  if (!adminId || !otp) {
    throw new ApiError(400, "Admin ID and OTP are required");
  }

  const admin = await Admin.findById(adminId);

  if (!admin || !admin.otp || admin.otp.attempts >= 5) {
    throw new ApiError(400, "OTP expired or too many attempts");
  }

  if (!admin.otp.expires || new Date() > admin.otp.expires) {
    throw new ApiError(400, "OTP expired");
  }

  if (!admin.otp.code) {
    throw new ApiError(400, "OTP not found");
  }

  if (otp !== admin.otp.code) {
    admin.otp.attempts += 1;
    await admin.save();
    throw new ApiError(400, "Invalid OTP");
  }

  // OTP verified → generate tokens
  const accessToken = generateAccessToken(admin.id);
  const refreshToken = generateRefreshToken(admin.id);

  // Set cookies
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "none",
    secure: process.env.NODE_ENV === "development",
   // maxAge: 150 * 60 * 1000
     maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "none", 
    secure: process.env.NODE_ENV === "development",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  // Clear OTP and update login time
  admin.otp = undefined;
  admin.lastLogin = new Date();
  await admin.save();

  res.json({ 
    message: "Login successful",
    accessToken, // Also return in response for Redux
    admin: { 
      id: admin._id,
      name: admin.name, 
      email: admin.email,
      role: admin.role 
    } 
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.cookies;

  if (!token) {
    throw new ApiError(401, "Refresh token not provided");
  }

  try {
    const decoded = verifyRefreshToken(token);
    
    // Verify admin still exists and is active
    const admin = await Admin.findById(decoded.userId);
    if (!admin || !admin.isActive) {
      throw new ApiError(401, "Admin not found or inactive");
    }

    // Generate new access token
    const accessToken = generateAccessToken(admin.id);

    // Update access token cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000
    });

    res.json({ 
      message: "Token refreshed successfully",
      accessToken 
    });
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { adminId } = req.body;

  if (!adminId) {
    throw new ApiError(400, "Admin ID is required");
  }

  const admin = await Admin.findById(adminId);

  if (!admin || !admin.isActive) {
    throw new ApiError(404, "Admin not found or inactive");
  }

  // Check if too many attempts
  if (admin.otp?.attempts && admin.otp.attempts >= 5) {
    throw new ApiError(429, "Too many OTP attempts. Please try again later");
  }

  // Generate new 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  admin.otp = {
    code: otp,
    expires: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0
  };
  await admin.save();

  await sendAdminOtpEmail({ 
    toEmail: admin.email, 
    toName: admin.name,
    otp: otp 
  });

  res.json({ message: "New OTP sent to email" });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Clear cookies
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });

  res.json({ message: "Logged out successfully" });
});

export const getAdminProfile = asyncHandler(async (
  req: AuthenticatedAdminRequest, // ✅ Use custom interface instead of Request
  res: Response
) => {
  const admin = req.admin; // ✅ TypeScript now knows about admin property

  if (!admin) {
    throw new ApiError(401, "Admin not authenticated");
  }

  res.json({
    message: "Admin profile fetched successfully",
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt
    }
  });
});