import { Request, Response } from "express";
import {
  getRemainingTime,
  TestGetRemainingTime,
  drawBox,
} from "../services/random-box.service";

// 랜던박스 상태 조회 요청
export const status = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;

  try {
    const result = await getRemainingTime(userId);
    res.status(200).json(result);
    return;
  } catch (err: any) {
    console.error("Status error:", err);
    res.status(500).json({ error: "서버 에러 발생" });
    return;
  }
};

// 박스 선택 요청 컨트롤러
export const openBox = async (req: Request, res: Response): Promise<void> => {
  const userBox = req.body.boxNumber;
  const userId = req.user.id;
  const { canDraw, remainingSeconds } = await getRemainingTime(userId);

  // 유효성 검사
  if (![1, 2, 3].includes(userBox)) {
    res.status(400).json({ error: "잘못된 박스 번호입니다." });
    return;
  }

  if (!canDraw) {
    const minutes = Math.ceil(remainingSeconds / 60);
    res.status(400).json({ error: `박스 오픈 까지 남은 시간 ${minutes}분` });
    return;
  }
  try {
    // 서비스 호출 → 박스 로직 실행
    const result = await drawBox(userId, userBox);

    // 성공 응답
    res.status(200).json(result);
  } catch (error) {
    // 예외 처리
    res.status(500).json({ error: "서버 오류 발생" });
  }
};

// 테스트용 코드 ( 시간 제한 X )
export const testOpenBox = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userBox = req.body.boxNumber;
  const userId = req.user.id;
  const { lastDrawTime } = await TestGetRemainingTime(userId);

  console.log("lastDrawTime:", lastDrawTime);

  // 유효성 검사
  if (![1, 2, 3].includes(userBox)) {
    res.status(400).json({ error: "잘못된 박스 번호입니다." });
    return;
  }

  try {
    // 서비스 호출 → 박스 로직 실행
    const result = await drawBox(userId, userBox);

    // 성공 응답
    res.status(200).json(result);
  } catch (error) {
    // 예외 처리
    res.status(500).json({ error: "서버 오류 발생" });
  }
};
