import * as XLSX from 'xlsx';
import { RentalApplication } from '../types';

export const LOCAL_STORAGE_KEY = 'lounge_rental_applications_v2';

/**
 * 로컬 스토리지에서 전체 신청 내역 불러오기
 */
export function getSavedApplications(): RentalApplication[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('로컬스토리지 불러오기 실패:', err);
    return [];
  }
}

/**
 * 로컬 스토리지에 신청 내역 저장
 */
export function saveApplications(applications: RentalApplication[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(applications));
  } catch (err) {
    console.error('로컬스토리지 저장 실패:', err);
  }
}

/**
 * SheetJS(xlsx)를 사용한 .xlsx 파일 다운로드 기능
 * - 파일명: "과방_물품대여_신청목록.xlsx"
 * - 시트명: "대여 신청 목록"
 * - 열 순서: 신청일시, 이름, 학번, 학과, 연락처, 대여 물품, 수량, 대여 날짜, 반납 예정 날짜, 사용 장소, 사용 목적, 기타 요청사항, 대여 규정 동의 여부, 상태
 */
export function exportToExcel(applications: RentalApplication[]): boolean {
  if (!applications || applications.length === 0) {
    alert('저장된 신청 내역이 없습니다.');
    return false;
  }

  // 1. 엑셀 헤더 순서 및 데이터 매핑
  const excelData = applications.map((item) => ({
    '신청일시': item.createdAt,
    '이름': item.name,
    '학번': item.studentId,
    '학과': item.department,
    '연락처': item.phone || '-',
    '대여 물품': item.item,
    '수량': item.quantity,
    '대여 날짜': item.rentDate,
    '반납 예정 날짜': item.returnDate,
    '사용 장소': item.location,
    '사용 목적': item.purpose || '-',
    '기타 요청사항': item.notes || '-',
    '대여 규정 동의 여부': item.agreeTerms ? '동의함' : '미동의',
    '상태': item.status || '대여 신청',
  }));

  // 2. 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // 3. 열 너비 자동 최적화 (한글 가독성 보장)
  worksheet['!cols'] = [
    { wch: 20 }, // 신청일시
    { wch: 12 }, // 이름
    { wch: 14 }, // 학번
    { wch: 18 }, // 학과
    { wch: 16 }, // 연락처
    { wch: 15 }, // 대여 물품
    { wch: 8 },  // 수량
    { wch: 14 }, // 대여 날짜
    { wch: 14 }, // 반납 예정 날짜
    { wch: 12 }, // 사용 장소
    { wch: 30 }, // 사용 목적
    { wch: 24 }, // 기타 요청사항
    { wch: 20 }, // 대여 규정 동의 여부
    { wch: 12 }, // 상태
  ];

  // 4. 워크북 생성 및 시트 추가
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '대여 신청 목록');

  // 5. 엑셀 파일 다운로드 실행
  XLSX.writeFile(workbook, '과방_물품대여_신청목록.xlsx');
  return true;
}

/**
 * 현재 날짜와 시간을 "YYYY-MM-DD HH:mm:ss" 형식으로 반환하는 헬퍼
 */
export function getCurrentFormattedDateTime(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}
