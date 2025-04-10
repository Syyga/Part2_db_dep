/**
 * 포토카드 필터링 설정
 */
export const PHOTOCARD_FILTER_CONFIG = {
  filter: {
    grade: {
      label: "등급",
      options: {
        default: "ALL",
        COMMON: "COMMON",
        RARE: "RARE",
        SUPER_RARE: "SUPER RARE",
        LEGENDARY: "LEGENDARY",
      },
    },
    genre: {
      label: "장르",
      options: {
        default: "ALL",
        TRAVEL: "여행",
        LANDSCAPE: "풍경",
        PORTRAIT: "인물",
        OBJECT: "사물",
      },
    },
  },
};

/**
 * 필터링 기본값
 */
export const DEFAULT_FILTER_VALUES = {
  grade: "default",
  genre: "default",
};

/**
 * 포토카드 등급 목록
 */
export const PHOTOCARD_GRADES = ["COMMON", "RARE", "SUPER_RARE", "LEGENDARY"];

/**
 * 포토카드 장르 목록
 */
export const PHOTOCARD_GENRES = ["TRAVEL", "LANDSCAPE", "PORTRAIT", "OBJECT"];
