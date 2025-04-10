import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthResponse } from "../interfaces/auth.interface";
import { Request, Response } from "express";
import { SignupInput, LoginInput } from "../../../zod/auth.schema";
import { CustomError } from "../../../utils/errors";
import prisma from "../../../utils/prismaClient";

const JWT_SECRET = process.env.JWT_SECRET || "secret-key";
const JWT_EXPIRES_IN = "1h";
const ACCESS_EXPIRES_IN = "1h";
const isProd = process.env.NODE_ENV === "production";

// 회원가입 서비스
export const signupService = async (
  data: SignupInput
): Promise<AuthResponse> => {
  const { email, password, nickname } = data;
  const existUser = await prisma.user.findUnique({ where: { email } });
  const existNickname = await prisma.user.findUnique({
    where: { nickname },
  });
  const isComplexPassword = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{9,}$/.test(
    password
  );

  if (existUser) {
    throw new CustomError("이미 존재하는 이메일입니다.", 409);
  }
  if (existNickname) {
    throw new CustomError("이미 존재하는 닉네임입니다.", 409);
  }
  if (!isComplexPassword) {
    throw new CustomError(
      "비밀번호는 영어, 숫자, 특수문자를 포함한 9자 이상이어야 합니다.",
      400
    );
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, nickname, role: "USER" },
  });

  // 포인트 정보 생성
  const point = await prisma.point.create({
    data: { userId: user.id, points: 1000 },
  });
  await prisma.pointHistory.create({
    data: {
      pointId: point.id,
      amount: 1000,
      resourceType: "SIGNUP",
      resourceId: "SIGNUP",
    },
  });

  return {
    status: 201,
    body: { message: "회원가입 성공", userId: user.id },
  };
};

/// 로그인 서비스
export const loginService = async (data: LoginInput): Promise<AuthResponse> => {
  const { email, password } = data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new CustomError("이메일 또는 비밀번호가 잘못되었습니다.", 401);
  }

  // accessToken 생성
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  // refreshToken 생성
  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // refreshToken DB에 저장
  await prisma.auth.upsert({
    where: { userId: user.id },
    update: { refreshToken, expiresAt: refreshExpiresAt },
    create: {
      userId: user.id,
      refreshToken,
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    status: 200,
    body: {
      message: "로그인 성공",
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    },
    cookie: {
      token: accessToken,
      refreshToken: refreshToken,
      options: {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        secure: true,
        sameSite: "none",
        maxAge: 60 * 60 * 1000,
      },
    },
  };
};

/// 로그아웃 서비스
export const logoutService = (res: Response): void => {
  res.clearCookie("token, refreshToken");
  res.status(200).json({ message: "로그아웃 성공" });
};

/// 리프레시 토큰 서비스
export const refreshTokenService = async (
  req: Request,
  res: Response
): Promise<void> => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    throw new CustomError("refreshToken 없음", 401);
  }

  const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
    userId: string;
    role: string;
  };
  const authRecord = await prisma.auth.findUnique({
    where: { userId: decoded.userId },
  });
  if (!authRecord || authRecord.refreshToken !== refreshToken) {
    throw new CustomError("유효하지 않은 refreshToken", 403);
  }
  const newAccessToken = jwt.sign(
    { userId: decoded.userId, role: decoded.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
  res.cookie("token", newAccessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
  });
  res.status(200).json({ message: "accessToken 재발급 완료" });
};

export const getMeService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      points: true,
    },
  });
  if (!user) {
    throw new CustomError("유저를 찾을 수 없습니다.", 400);
  }
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    points: user.points?.points,
  };
};
