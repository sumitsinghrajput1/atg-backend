import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }
  next();
};
