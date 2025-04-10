import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret-key";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.cookies.token;
  const refreshToken = req.cookies.refreshToken;

  console.log(req.cookies);

  if (!token && !refreshToken) {
    res.status(401).json({ message: "인증되지 않은 사용자 입니다." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
      email?: string;
    };
    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };
    console.log("미들 웨어 검증 후 req.user 반환", req.user);
    next();
  } catch (err) {
    // 토큰 만료 됐을때
    if (refreshToken) {
      try {
        //리프레시 토큰 검증
        const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
          userId: string;
          role: string;
          email?: string;
        };

        //새 액세스 토큰 발급
        const newToken = jwt.sign(
          { userId: decoded.userId, role: decoded.role },
          JWT_SECRET,
          { expiresIn: "1h" }
        );
        res.cookie("token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 3600000,
        });
        req.user = {
          id: decoded.userId,
          role: decoded.role,
        };
        next();
        return;
      } catch (err) {
        // 리프레시 토큰 만료 됐을때
        res.status(401).json({ message: "유효하지 않은 refreshToken" });
        return;
      }
    }
    res.status(401).json({ message: "유효하지 않은 토큰입니다" });
    return;
  }
};
