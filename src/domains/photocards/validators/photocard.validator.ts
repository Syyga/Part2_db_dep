import { z } from "zod";
import {
  PHOTOCARD_GENRES,
  PHOTOCARD_GRADES,
} from "../constants/filter.constant";

// 에러 메시지 정의
const ERROR_MESSAGES = {
  grade:
    "유효하지 않은 등급입니다. 'ALL', 'COMMON', 'RARE', 'SUPER_RARE', 'LEGENDARY' 중 하나여야 합니다.",
  genre:
    "유효하지 않은 장르입니다. 'ALL', 'TRAVEL', 'LANDSCAPE', 'PORTRAIT', 'OBJECT' 중 하나여야 합니다.",
  limit: {
    min: "페이지 크기는 1 이상이어야 합니다.",
    max: "페이지 크기는 50 이하여야 합니다.",
  },
};

// 커서 스키마 정의
const CursorSchema = z.object({
  id: z.string(),
  createdAt: z.string().optional(),
});

// 커서 변환 함수
const transformCursor = (val: any) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch (error) {
      throw new Error("잘못된 커서 형식입니다: " + val);
    }
  }
  return val;
};

// 검증용 기본 스키마 (라우터에서 사용)
export const PhotocardsQuerySchema = z.object({
  keyword: z.string().optional(),
  grade: z
    .enum(["ALL", ...PHOTOCARD_GRADES] as [string, ...string[]], {
      errorMap: () => ({ message: ERROR_MESSAGES.grade }),
    })
    .optional(),
  genre: z
    .enum(["ALL", ...PHOTOCARD_GENRES] as [string, ...string[]], {
      errorMap: () => ({ message: ERROR_MESSAGES.genre }),
    })
    .optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 15))
    .pipe(
      z
        .number()
        .min(1, ERROR_MESSAGES.limit.min)
        .max(50, ERROR_MESSAGES.limit.max)
    ),
  cursor: z
    .any()
    .optional()
    .transform(transformCursor)
    .pipe(CursorSchema.optional()),
});

// 변환 로직이 포함된 전체 스키마 (서비스에서 사용)
export const PhotocardsQueryWithTransform = PhotocardsQuerySchema;

// 포토카드 생성 스키마
export const CreatePhotocardSchema = z.object({
  name: z.string().min(1, { message: "포토카드 이름은 필수입니다." }),
  genre: z.enum([...PHOTOCARD_GENRES] as [string, ...string[]], {
    message: `장르는 ${PHOTOCARD_GENRES.join(", ")} 중 하나여야 합니다.`,
  }),
  grade: z.enum([...PHOTOCARD_GRADES] as [string, ...string[]], {
    message: `등급은 ${PHOTOCARD_GRADES.join(", ")} 중 하나여야 합니다.`,
  }),
  price: z.preprocess(
    (val) => (typeof val === "string" ? parseInt(val, 10) : val),
    z.number().int().min(0, { message: "가격은 0 이상의 정수여야 합니다." })
  ),
  description: z.string().min(1, { message: "설명은 필수입니다." }),
  imageUrl: z.string().url({ message: "유효한 이미지 URL을 입력해주세요." }),
});

// 응답 타입
export type CreatePhotocardRequest = z.infer<typeof CreatePhotocardSchema>;
