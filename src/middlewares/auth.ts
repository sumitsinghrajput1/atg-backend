import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

interface DecodedToken extends JwtPayload {
  userId: string;
}

export const isLoggedIn = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new ApiError(401, "Token missing");

  console.log("token", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    console.log("decoded data", decoded);

    if (!decoded.userId) {
      throw new ApiError(401, "Invalid token payload");
    }

    req.user = {
      userId: decoded.userId
    };

    next();
  } catch {
    throw new ApiError(401, "Invalid token");
  }
};
