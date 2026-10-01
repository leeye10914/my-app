export interface RentalApplication {
  id: string;
  createdAt: string;       // 신청일시 (YYYY-MM-DD HH:mm:ss)
  name: string;            // 이름
  studentId: string;       // 학번
  department: string;      // 학과
  phone: string;           // 연락처
  item: string;            // 대여 물품
  quantity: number;        // 수량
  rentDate: string;        // 대여 날짜 (YYYY-MM-DD)
  returnDate: string;      // 반납 예정 날짜 (YYYY-MM-DD)
  location: string;        // 사용 장소 ("과방 내부" | "교내" | "외부 반출")
  purpose: string;         // 사용 목적
  notes: string;           // 기타 요청사항
  agreeTerms: boolean;     // 대여 규정 동의 여부
  status: string;          // 상태 (기본값: "대여 신청")
}

export interface InventoryItem {
  name: string;
  category: string;
  available: boolean;
  stockCount: number;
}
