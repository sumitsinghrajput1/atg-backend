import { Request, Response } from "express";
import { Coupon } from "../models/Coupon";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// Create Coupon
export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, type, discountValue, minPurchase, maxDiscount, validFrom, validTill, usageLimit } = req.body;

  const exists = await Coupon.findOne({ code });
  if (exists) throw new ApiError(409, "Coupon code already exists");

  if (type === "percentage" && typeof maxDiscount !== "number") {
    throw new ApiError(400, "maxDiscount is required for percentage coupons");
  }

  const coupon = await Coupon.create({
    code,
    type,
    discountValue,
    minPurchase,
    maxDiscount: type === "percentage" ? maxDiscount : undefined,
    validFrom,
    validTill,
    usageLimit
  });

  return res.status(201).json(new ApiResponse(201, { coupon }, "Coupon created successfully"));
});

// Update Coupon
export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return res.status(200).json(new ApiResponse(200, { coupon }, "Coupon updated successfully"));
});

// Delete Coupon
export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await Coupon.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, "Coupon not found");
  return res.status(200).json(new ApiResponse(200, {}, "Coupon deleted successfully"));
});

// Get All Coupons
export const getAllCoupons = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    type = '',
    isActive = '',
    status = '', // active, expired, upcoming
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const searchQuery: any = {};

  if (search) {
    searchQuery.code = { $regex: search, $options: 'i' };
  }

  if (type && type !== 'all') {
    searchQuery.type = type;
  }

  if (isActive && isActive !== 'all') {
    searchQuery.isActive = isActive === 'true';
  }

  const now = new Date();
  if (status && status !== 'all') {
    switch (status) {
      case 'active':
        searchQuery.validFrom = { $lte: now };
        searchQuery.validTill = { $gte: now };
        searchQuery.isActive = true;
        break;
      case 'expired':
        searchQuery.validTill = { $lt: now };
        break;
      case 'upcoming':
        searchQuery.validFrom = { $gt: now };
        break;
    }
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const sortObject: any = {};
  sortObject[sortBy as string] = order === 'desc' ? -1 : 1;

  const [coupons, totalCount] = await Promise.all([
    Coupon.find(searchQuery)
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum),
    Coupon.countDocuments(searchQuery)
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return res.status(200).json(
    new ApiResponse(200, {
      coupons,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    })
  );
});

// ✅ Get Single Coupon by ID
export const getCouponById = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return res.status(200).json(new ApiResponse(200, { coupon }));
});
