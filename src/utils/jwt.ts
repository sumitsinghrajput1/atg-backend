import jwt from "jsonwebtoken";

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: "7d"
  });
};

export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: "access" }, 
    process.env.JWT_ACCESS_SECRET!, 
    { expiresIn: "1d" }
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: "refresh" }, 
    process.env.JWT_REFRESH_SECRET!, 
    { expiresIn: "7d" }
  );
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as jwt.JwtPayload & {
    userId: string;
    type: string;
  };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as jwt.JwtPayload & {
    userId: string;
    type: string;
  };
};
