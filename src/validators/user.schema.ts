import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  otp: z.string().length(6, "OTP must be 6 digits")
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const sendOtpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email")
});

export const resendOtpSchema = z.object({
  email: z.string().email("Invalid email")
});
