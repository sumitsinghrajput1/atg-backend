// middlewares/adminAuth.ts
import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";
import { Admin, IAdmin } from "../models/Admin";

// Extend Express Request interface
export interface AuthenticatedAdminRequest extends Request {
  admin?: IAdmin;
}

export const requireAdmin = asyncHandler(async (
  req: AuthenticatedAdminRequest, //  Use custom interface
  res: Response,
  next: NextFunction
) => {
  const { accessToken } = req.cookies;

  console.log("zccess token " , accessToken)

  if (!accessToken) {
    throw new ApiError(401, "Access token not provided");
  }

  try {
    const decoded = verifyAccessToken(accessToken);
    
    const admin = await Admin.findById(decoded.userId);
    if (!admin || !admin.isActive) {
      throw new ApiError(401, "Admin not found or inactive");
    }

    req.admin = admin; // ✅ Now TypeScript knows about admin property
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token");
  }
});
