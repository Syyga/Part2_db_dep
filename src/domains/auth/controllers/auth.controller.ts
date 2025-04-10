import { Request, Response } from "express";
import {
  loginService,
  signupService,
  logoutService,
  refreshTokenService,
  getMeService,
} from "../services/auth.service";
import { signupSchema, loginSchema } from "../../../zod/auth.schema";
import { CustomError } from "../../../utils/errors";

/// 회원가입
export const signup = async (req: Request, res: Response): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body); //바디 데이터 검증
  if (!parsed.success) {
    throw new CustomError("유효하지 않은 요청", 400);
  }
  const result = await signupService(parsed.data);
  res.status(result.status).json(result.body);
};

// 로그인 컨트롤러
export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body); //바디 데이터 검증
  if (!parsed.success) {
    throw new CustomError("유효하지 않은 요청", 400);
  }
  const result = await loginService(parsed.data);
  if (result.cookie) {
    res.cookie("token", result.cookie.token, result.cookie.options);
    res.cookie("refreshToken", result.cookie.refreshToken, {
      ...result.cookie.options,
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7일
      httpOnly: true,
    });
    res.status(result.status).json(result.body);
  }
};

/// 로그아웃 컨트롤러
export const logout = (req: Request, res: Response) => {
  logoutService(res);
  res.status(200).json({ message: "로그아웃 성공" });
};

/// 리프레시 토큰 컨트롤러
export const refreshAccessToken = async (req: Request, res: Response) => {
  await refreshTokenService(req, res);
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;

  const response = await getMeService(userId);

  res.status(200).send(response);
};
