import { z } from "zod";
import {
  PhotocardsQueryWithTransform,
  CreatePhotocardSchema,
  CreatePhotocardRequest,
} from "../validators/photocard.validator";
import {
  PHOTOCARD_GENRES,
  PHOTOCARD_GRADES,
} from "../constants/filter.constant";

/**
 * 사용자의 포토카드 조회 응답 인터페이스
 */
export interface MyPhotocards {
  userNickname: string;
  gradeCounts: GradeCounts;
  list: PhotocardInfo[] | null;
  nextCursor: Cursor | null;
  hasMore: boolean;
  filterInfo?: FilterPhotoCard; // 필터링 정보 추가
}

/**
 * 포토카드 등급별 개수 인터페이스
 */
export interface GradeCounts {
  COMMON: number;
  RARE: number;
  SUPER_RARE: number;
  LEGENDARY: number;
}

/**
 * 커서 기반 페이지네이션을 위한 인터페이스
 */
export interface Cursor {
  id: string;
  createdAt?: string;
}

/**
 * 포토카드 상세 정보 인터페이스
 */
export interface PhotocardInfo {
  id: string | null;
  name: string;
  imageUrl: string;
  grade: string;
  genre: string;
  description: string;
  price: number;
  amount: number;
  createdAt: string;
  creatorNickname: string;
}

/**
 * 필터링 정보 인터페이스
 */
export interface PhotoCardInfo {
  name: string;
  count: number;
}

export interface FilterPhotoCard {
  grade: PhotoCardInfo[] | null;
  genre: PhotoCardInfo[] | null;
}

export type GetMyPhotocards = (
  userId: string,
  queries: MyPhotocardsQuery
) => Promise<MyPhotocards>;

export type MyPhotocardsQuery = z.infer<typeof PhotocardsQueryWithTransform>;

// 이전 버전과의 호환성을 위한 타입 별칭 정의
export type MyPhotocardsResponse = MyPhotocards;
export type CursorType = Cursor;
export type PhotocardResponse = PhotocardInfo;

export type PhotocardDto = {
  id: string | null;
  name: string;
  imageUrl: string;
  grade: string;
  genre: string;
  description: string;
  price: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
};

/**
 * 포토카드 생성 요청 인터페이스
 */

/**
 * 포토카드 생성 응답 인터페이스
 */
export type CreatePhotocard = (
  body: CreatePhotocardRequest,
  imageUrl: string,
  publicId: string,
  userId: string
) => Promise<PhotocardDto & { amount: number }>;

export interface CreatePhotocardResponse {
  id: string;
  name: string;
  genre: string;
  grade: string;
  price: number;
  description: string;
  imageUrl: string;
  amount: number;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}
