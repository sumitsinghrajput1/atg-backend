import { Request, Response } from "express";
import { User } from "../models/User";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import {  loginSchema } from "../validators/user.schema";
import { ParsedQs } from "qs";


import { sendOtpEmail } from '../services/email/sendOtpEmail';
import { Otp } from '../models/Otp';

export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, name } = req.body;
  if (!email || !name) throw new ApiError(400, "Email and name are required");

  // ❌ Already registered?
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, "Email is already registered. Please login.");

  const existingOtp = await Otp.findOne({ email });

  // ✅ Throttle logic: Max 3 sends/hour
  if (existingOtp) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (existingOtp.attempts >= 3 && existingOtp.lastSentAt > oneHourAgo) {
      throw new ApiError(429, "Too many OTP requests. Try again after an hour.");
    }

    // ✅ If allowed, update count + resend
    existingOtp.otp = Math.floor(100000 + Math.random() * 900000).toString();
    existingOtp.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    existingOtp.attempts += 1;
    existingOtp.lastSentAt = new Date();
    await existingOtp.save();

    await sendOtpEmail({ toEmail: email, toName: name, otp: existingOtp.otp });
    return res.status(200).json(new ApiResponse(200, {}, "OTP resent"));
  }

  // ✅ First time: create OTP entry
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await Otp.create({
    email,
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 1,
    lastSentAt: new Date(),
  });

  await sendOtpEmail({ toEmail: email, toName: name, otp });
  return res.status(200).json(new ApiResponse(200, {}, "OTP sent to email"));
});


export const verifyOtpAndRegister = asyncHandler(async (req: Request, res: Response) => {
  const { email, name, password, otp } = req.body;

  if (!email || !name || !password || !otp) {
    throw new ApiError(400, "All fields are required");
  }

  const otpDoc = await Otp.findOne({ email });
  if (!otpDoc || otpDoc.otp !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  if (otpDoc.expiresAt < new Date()) {
    throw new ApiError(400, "OTP expired");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, "User already exists");

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    isVerified: true, // ✅ Mark verified
  });

  await Otp.deleteOne({ email });

  const token = generateToken(user._id.toString());
  return res.status(201).json(new ApiResponse(201, { token, user }, "User registered"));
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, "Email is already registered. Please login.");

  const existingOtp = await Otp.findOne({ email });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (existingOtp) {
    if (existingOtp.attempts >= 3 && existingOtp.lastSentAt > oneHourAgo) {
      throw new ApiError(429, "OTP resend limit reached. Try again later.");
    }

    existingOtp.otp = Math.floor(100000 + Math.random() * 900000).toString();
    existingOtp.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    existingOtp.lastSentAt = new Date();
    existingOtp.attempts += 1;
    await existingOtp.save();

    await sendOtpEmail({ toEmail: email, toName: "User", otp: existingOtp.otp });

    return res.status(200).json(new ApiResponse(200, {}, "OTP resent successfully"));
  }

  // No prior OTP, treat as first time
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await Otp.create({
    email,
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 1,
    lastSentAt: new Date(),
  });

  await sendOtpEmail({ toEmail: email, toName: "User", otp });

  return res.status(200).json(new ApiResponse(200, {}, "OTP sent successfully"));
});


// Login
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Invalid input", parsed.error.errors);

  const { email, password } = parsed.data;

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new ApiError(401, "Invalid credentials");

  // ✅ Check verification status
  if (!user.isVerified) {
    throw new ApiError(403, "Please verify your email before logging in.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  const token = generateToken(user._id.toString());
  return res.status(200).json(new ApiResponse(200, { token, user }, "Login successful"));
});


// Update user's profile (phone, addresses)

export const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  
  const { phone, addresses } = req.body;

  console.log("userid" , userId)

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (phone) user.phone = phone;
  if (Array.isArray(addresses)) user.addresses = addresses;

  await user.save();

  return res.status(200).json(new ApiResponse(200, { user }, "Profile updated"));
});


// Helper functions for type safety
const parseQueryString = (value: string | ParsedQs | (string | ParsedQs)[] | undefined, defaultValue: string): string => {
  if (Array.isArray(value)) return value[0] as string || defaultValue;
  return (value as string) || defaultValue;
};

const parseQueryNumber = (value: string | ParsedQs | (string | ParsedQs)[] | undefined, defaultValue: number): number => {
  const stringValue = parseQueryString(value, defaultValue.toString());
  const parsed = parseInt(stringValue);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Admin: Get all users
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  // ✅ Extract and parse query parameters safely
  const page = parseQueryNumber(req.query.page, 1);
  const limit = parseQueryNumber(req.query.limit, 10);
  const search = parseQueryString(req.query.search, '');
  const isVerified = parseQueryString(req.query.isVerified, '');
  const sortBy = parseQueryString(req.query.sortBy, 'createdAt');
  const order = parseQueryString(req.query.order, 'desc');

  // ✅ Build search query with proper interface
  interface SearchQuery {
    $or?: Array<{
      name?: { $regex: string; $options: string };
      email?: { $regex: string; $options: string };
      phone?: { $regex: string; $options: string };
    }>;
    isVerified?: boolean;
  }

  const searchQuery: SearchQuery = {};
  
  // Search in name, email, phone
  if (search) {
    searchQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  // Verification status filter
  if (isVerified && isVerified !== 'all') {
    searchQuery.isVerified = isVerified === 'true';
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort object
  const sortObject: Record<string, 1 | -1> = {
    [sortBy]: order === 'desc' ? -1 : 1
  };

  try {
    // ... rest of your aggregation pipeline remains the same
    const pipeline = [
      { $match: searchQuery },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "userId",
          as: "orders"
        }
      },
      {
        $addFields: {
          totalOrders: { $size: "$orders" },
          totalSpent: {
            $sum: {
              $map: {
                input: "$orders",
                as: "order",
                in: "$$order.finalAmount"
              }
            }
          }
        }
      },
      {
        $project: {
          password: 0,
          orders: 0
        }
      },
      { $sort: sortObject },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          count: [
            { $count: "total" }
          ]
        }
      }
    ];

    const result = await User.aggregate(pipeline);
    const users = result[0].data;
    const totalCount = result[0].count[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json(
      new ApiResponse(200, {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      })
    );
  } catch (error) {
    throw new ApiError(500, "Error fetching users");
  }
});



// Admin: Get user by ID
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");;
  if (!user) throw new ApiError(404, "User not found");

  return res.status(200).json(new ApiResponse(200, { user }));
});

// Admin: Block user
export const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isVerified: false }, { new: true });
  if (!user) throw new ApiError(404, "User not found");

  return res.status(200).json(new ApiResponse(200, { user }, "User blocked"));
});
