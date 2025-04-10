// 교환 제안 정보 인터페이스
export interface Offer {
  id: string;
  creatorNickname: string;
  name: string;
  description: string;
  imageUrl: string;
  grade: string;
  genre: string;
  price: number;
  createdAt: string;
}

// 교환 상세 정보 인터페이스
export interface ExchangeDetail {
  grade: string;
  genre: string;
  description: string;
}

// 기본 상세 정보 인터페이스
export interface BasicDetail {
  id: string;
  creatorNickname: string;
  imageUrl: string;
  name: string;
  grade: string;
  genre: string;
  description: string;
  price: number;
  availableAmount: number;
  totalAmount: number;
  totalOwnAmount: number;
  createdAt: string;
  isMine: boolean;
  exchangeDetail: ExchangeDetail;
}

// 교환 제안 정보 인터페이스
export interface ExchangeInfo {
  saleId: string;
  isMine: boolean;
  receivedOffers: Offer[] | null;
  myOffers: Offer[] | null;
}

// 마켓 전체 상세 응답 인터페이스 (기본 정보 + 교환 제안 정보)
export interface DetailResponse extends BasicDetail {
  receivedOffers: Offer[];
  myOffers: Offer[];
}
