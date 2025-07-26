import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

// ✅ Add the full signature to clarify it's an error-handling middleware
export const errorHandler: (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void = (err, req, res, _next) => {
  const customError = err instanceof ApiError ? err : new ApiError(500, err.message);

  res.status(customError.statusCode).json({
    success: false,
    message: customError.message,
    errors: customError.errors || [],
    stack: process.env.NODE_ENV === "development" ? customError.stack : undefined,
  });
};
