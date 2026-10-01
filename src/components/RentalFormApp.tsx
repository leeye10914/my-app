import React, { useState, useEffect } from 'react';
import { RentalApplication, InventoryItem } from '../types';
import {
  getSavedApplications,
  saveApplications,
  exportToExcel,
  getCurrentFormattedDateTime,
} from '../utils/excelService';

// 과방 주요 비치 물품 대여 가능 여부 데이터
const INVENTORY_ITEMS: InventoryItem[] = [
  { name: 'C타입 충전기', category: '전자기기', available: true, stockCount: 5 },
  { name: '보조배터리', category: '전자기기', available: true, stockCount: 3 },
  { name: '우산', category: '생활용품', available: true, stockCount: 8 },
  { name: '돗자리', category: '야외용품', available: true, stockCount: 4 },
  { name: '보드게임', category: '여가', available: true, stockCount: 6 },
  { name: '공구 세트', category: '공구', available: true, stockCount: 2 },
  { name: '기타', category: '기타용품', available: true, stockCount: 5 },
];

export const RentalFormApp: React.FC = () => {
  // 1. 신청서 입력 필드 상태 관리
  const [applicantName, setApplicantName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [rentalItem, setRentalItem] = useState('');
  const [quantity, setQuantity] = useState<number>(1);

  // 대여/반납 날짜 기본값: 오늘 날짜
  const getTodayString = () => new Date().toISOString().slice(0, 10);
  const [rentDate, setRentDate] = useState(getTodayString());
  const [returnDate, setReturnDate] = useState(getTodayString());

  // 사용 장소 라디오 버튼 (기본값: "과방 내부")
  const [location, setLocation] = useState<'과방 내부' | '교내' | '외부 반출'>('과방 내부');

  // 사용 목적 및 기타 요청사항
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // 대여 규정 동의 체크박스
  const [agreeTerms, setAgreeTerms] = useState(false);

  // 신청 완료 메시지 상태
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 누적된 신청 내역 목록 (localStorage 연동)
  const [applications, setApplications] = useState<RentalApplication[]>([]);

  // 초기 로딩 시 localStorage에서 데이터 복원
  useEffect(() => {
    const saved = getSavedApplications();
    // 초기 접속 시 사용자 경험을 위한 기본 예시 데이터 1건 (비어있을 경우)
    if (saved.length === 0) {
      const initialSeed: RentalApplication = {
        id: 'seed-20261001-01',
        createdAt: '2026-10-01 10:30:00',
        name: '이예현',
        studentId: '20261234',
        department: '컴퓨터공학과',
        phone: '010-1234-5678',
        item: 'C타입 충전기',
        quantity: 1,
        rentDate: '2026-10-01',
        returnDate: '2026-10-03',
        location: '과방 내부',
        purpose: '전공 과제 및 시험 공부 중 노트북/휴대폰 충전',
        notes: '과방 책상 2번 자리에서 사용',
        agreeTerms: true,
        status: '대여 신청',
      };
      setApplications([initialSeed]);
      saveApplications([initialSeed]);
    } else {
      setApplications(saved);
    }
  }, []);

  // 2. [다시 작성] 버튼 핸들러: 모든 입력값 및 완료 메시지 초기화
  const handleReset = () => {
    setApplicantName('');
    setStudentId('');
    setDepartment('');
    setPhone('');
    setRentalItem('');
    setQuantity(1);
    setRentDate(getTodayString());
    setReturnDate(getTodayString());
    setLocation('과방 내부');
    setPurpose('');
    setNotes('');
    setAgreeTerms(false);
    setSuccessMessage(null); // 신청 완료 메시지도 함께 사라짐
  };

  // 3. [신청하기] 폼 제출 핸들러 (프롬프트에 정의된 필수 유효성 검사 alert 포함)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1) 이름이 비어있으면 "이름을 입력해주세요."
    if (!applicantName.trim()) {
      alert('이름을 입력해주세요.');
      document.getElementById('applicantName')?.focus();
      return;
    }

    // 2) 학번이 비어있으면 "학번을 입력해주세요."
    if (!studentId.trim()) {
      alert('학번을 입력해주세요.');
      document.getElementById('studentId')?.focus();
      return;
    }

    // 3) 학과가 비어있으면 "학과를 입력해주세요."
    if (!department.trim()) {
      alert('학과를 입력해주세요.');
      document.getElementById('department')?.focus();
      return;
    }

    // 4) 대여 물품을 선택하지 않았으면 "대여할 물품을 선택해주세요."
    if (!rentalItem) {
      alert('대여할 물품을 선택해주세요.');
      document.getElementById('rentalItem')?.focus();
      return;
    }

    // 5) 대여 날짜를 선택하지 않았으면 "대여 날짜를 선택해주세요."
    if (!rentDate) {
      alert('대여 날짜를 선택해주세요.');
      document.getElementById('rentDate')?.focus();
      return;
    }

    // 6) 반납 날짜를 선택하지 않았으면 "반납 예정 날짜를 선택해주세요."
    if (!returnDate) {
      alert('반납 예정 날짜를 선택해주세요.');
      document.getElementById('returnDate')?.focus();
      return;
    }

    // 7) 반납 날짜가 대여 날짜보다 빠르면 "반납 예정 날짜를 확인해주세요."
    if (new Date(returnDate) < new Date(rentDate)) {
      alert('반납 예정 날짜를 확인해주세요.');
      document.getElementById('returnDate')?.focus();
      return;
    }

    // 8) 대여 규정에 동의하지 않았으면 "대여 규정을 확인하고 동의해주세요."
    if (!agreeTerms) {
      alert('대여 규정을 확인하고 동의해주세요.');
      document.getElementById('agreeTerms')?.focus();
      return;
    }

    // 정상적으로 입력된 경우 새 신청 레코드 생성
    const newApplication: RentalApplication = {
      id: `rent-${Date.now()}`,
      createdAt: getCurrentFormattedDateTime(),
      name: applicantName.trim(),
      studentId: studentId.trim(),
      department: department.trim(),
      phone: phone.trim(),
      item: rentalItem,
      quantity: Number(quantity) || 1,
      rentDate,
      returnDate,
      location,
      purpose: purpose.trim(),
      notes: notes.trim(),
      agreeTerms,
      status: '대여 신청', // 상태 기본값
    };

    // 최신 신청이 가장 위에 오도록 누적 배열 업데이트
    const updatedList = [newApplication, ...applications];
    setApplications(updatedList);
    saveApplications(updatedList); // localStorage에 영구 보관

    // 신청 완료 메시지 생성 및 표시
    // 예시: "이예현님, C타입 충전기 1개 대여 신청이 완료되었습니다. 대여일: 2026-10-01 / 반납 예정일: 2026-10-03"
    const message = `${applicantName.trim()}님, ${rentalItem} ${quantity}개 대여 신청이 완료되었습니다. 대여일: ${rentDate} / 반납 예정일: ${returnDate}`;
    setSuccessMessage(message);

    // 폼 입력 내용 리셋 (완료 메시지는 유지)
    setApplicantName('');
    setStudentId('');
    setDepartment('');
    setPhone('');
    setRentalItem('');
    setQuantity(1);
    setRentDate(getTodayString());
    setReturnDate(getTodayString());
    setLocation('과방 내부');
    setPurpose('');
    setNotes('');
    setAgreeTerms(false);
  };

  // 4. [📊 신청 목록 Excel 다운로드] 버튼 핸들러
  const handleExcelDownload = () => {
    exportToExcel(applications);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] py-8 px-4 sm:px-6">
      {/* 최대 너비 520px 및 화면 가운데 정렬 컨테이너 */}
      <div className="max-w-[520px] mx-auto space-y-6">

        {/* 상단 엑셀 다운로드 바로가기 버튼 */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleExcelDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#4F6D8A]/30 hover:border-[#243B55] text-xs font-semibold text-[#243B55] rounded-lg shadow-2xs transition-all cursor-pointer hover:bg-neutral-50"
          >
            <span>📊 신청 목록 Excel 다운로드</span>
          </button>
        </div>

        {/* 메인 폼 카드: 흰색 배경, 둥근 모서리, 부드러운 그림자 */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/80 p-6 sm:p-8">
          
          {/* ============================================================== */}
          {/* 페이지 상단: 📦 이모지, 제목, 부제 */}
          {/* ============================================================== */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-2 select-none" role="img" aria-label="과방 물품">
              📦
            </div>
            <h1 className="text-2xl font-bold text-[#243B55] tracking-tight">
              과방 물품 대여
            </h1>
            <p className="text-sm text-[#4F6D8A] mt-1 font-normal">
              필요한 물품을 간편하게 빌려보세요
            </p>
          </div>

          {/* 대여 가능 여부 배지 안내 */}
          <div className="mb-6 p-3.5 bg-[#F6F7F9] rounded-xl border border-neutral-200/70">
            <div className="text-xs font-bold text-[#243B55] mb-2 flex items-center justify-between">
              <span>과방 주요 물품 대여 가능 현황</span>
              <span className="text-2xs text-[#4F6D8A]">실시간 비치 기준</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INVENTORY_ITEMS.map((inv) => (
                <span
                  key={inv.name}
                  className={inv.available ? 'badge-available' : 'badge-rented'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1 inline-block" />
                  {inv.name}: 대여 가능 ({inv.stockCount}개)
                </span>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* 신청서 폼 시작 */}
          {/* ============================================================== */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            
            {/* 1. 이름 (필수 입력, text) */}
            <div>
              <label htmlFor="applicantName" className="block text-xs font-bold text-[#243B55] mb-1.5">
                이름 <span className="text-rose-500">*</span>
              </label>
              <input
                id="applicantName"
                type="text"
                required
                placeholder="이름을 입력하세요"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="form-control"
              />
            </div>

            {/* 2. 학번 (필수 입력, text, placeholder: "20261234") */}
            <div>
              <label htmlFor="studentId" className="block text-xs font-bold text-[#243B55] mb-1.5">
                학번 <span className="text-rose-500">*</span>
              </label>
              <input
                id="studentId"
                type="text"
                required
                placeholder="20261234"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="form-control"
              />
            </div>

            {/* 3. 학과 (필수 입력, text) */}
            <div>
              <label htmlFor="department" className="block text-xs font-bold text-[#243B55] mb-1.5">
                학과 <span className="text-rose-500">*</span>
              </label>
              <input
                id="department"
                type="text"
                required
                placeholder="소속 학과를 입력하세요"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="form-control"
              />
            </div>

            {/* 4. 연락처 (선택 입력, tel, placeholder: "010-0000-0000") */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-[#243B55] mb-1.5">
                연락처
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-control"
              />
            </div>

            {/* 5. 대여 물품 선택 (필수 입력, 드롭다운 select) */}
            <div>
              <label htmlFor="rentalItem" className="block text-xs font-bold text-[#243B55] mb-1.5">
                대여 물품 선택 <span className="text-rose-500">*</span>
              </label>
              <select
                id="rentalItem"
                required
                value={rentalItem}
                onChange={(e) => setRentalItem(e.target.value)}
                className="form-control cursor-pointer"
              >
                <option value="">대여할 물품을 선택해주세요</option>
                <option value="C타입 충전기">C타입 충전기</option>
                <option value="보조배터리">보조배터리</option>
                <option value="우산">우산</option>
                <option value="돗자리">돗자리</option>
                <option value="보드게임">보드게임</option>
                <option value="공구 세트">공구 세트</option>
                <option value="기타">기타</option>
              </select>
            </div>

            {/* 6. 수량 (input type="number", 최소 1, 최대 5, 기본값 1) */}
            <div>
              <label htmlFor="quantity" className="block text-xs font-bold text-[#243B55] mb-1.5">
                수량
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={5}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                className="form-control"
              />
              <span className="text-2xs text-[#4F6D8A] mt-1 block">
                최소 1개에서 최대 5개까지 대여 가능합니다.
              </span>
            </div>

            {/* 7. 대여 날짜 & 8. 반납 예정 날짜 (date, 필수 입력) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="rentDate" className="block text-xs font-bold text-[#243B55] mb-1.5">
                  대여 날짜 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="rentDate"
                  type="date"
                  required
                  value={rentDate}
                  onChange={(e) => setRentDate(e.target.value)}
                  className="form-control cursor-pointer"
                />
              </div>

              <div>
                <label htmlFor="returnDate" className="block text-xs font-bold text-[#243B55] mb-1.5">
                  반납 예정 날짜 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="returnDate"
                  type="date"
                  required
                  min={rentDate} // HTML5 속성 유효성 검사
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="form-control cursor-pointer"
                />
              </div>
            </div>

            {/* 9. 사용 장소 (라디오 버튼: "과방 내부" 기본값, "교내", "외부 반출") */}
            <div>
              <span className="block text-xs font-bold text-[#243B55] mb-2">
                사용 장소
              </span>
              <div className="flex items-center gap-5 text-xs text-neutral-800">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="location"
                    value="과방 내부"
                    checked={location === '과방 내부'}
                    onChange={() => setLocation('과방 내부')}
                    className="accent-[#243B55] cursor-pointer"
                  />
                  <span>과방 내부</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="location"
                    value="교내"
                    checked={location === '교내'}
                    onChange={() => setLocation('교내')}
                    className="accent-[#243B55] cursor-pointer"
                  />
                  <span>교내</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="location"
                    value="외부 반출"
                    checked={location === '외부 반출'}
                    onChange={() => setLocation('외부 반출')}
                    className="accent-[#243B55] cursor-pointer"
                  />
                  <span>외부 반출</span>
                </label>
              </div>
            </div>

            {/* 10. 사용 목적 (textarea, placeholder) */}
            <div>
              <label htmlFor="purpose" className="block text-xs font-bold text-[#243B55] mb-1.5">
                사용 목적
              </label>
              <textarea
                id="purpose"
                rows={2}
                placeholder="물품을 어디에 사용할 예정인지 간단히 작성해주세요."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="form-control resize-y"
              />
            </div>

            {/* 11. 기타 요청사항 (textarea, 선택 입력) */}
            <div>
              <label htmlFor="notes" className="block text-xs font-bold text-[#243B55] mb-1.5">
                기타 요청사항
              </label>
              <textarea
                id="notes"
                rows={2}
                placeholder="특이사항이나 추가 요청이 있다면 작성해주세요."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-control resize-y"
              />
            </div>

            {/* 12. 대여 규정 동의 (필수 체크박스) */}
            <div className="pt-2">
              <label
                htmlFor="agreeTerms"
                className="flex items-start gap-2.5 p-3 rounded-lg border border-neutral-200 bg-[#F6F7F9] text-xs text-neutral-800 cursor-pointer hover:border-neutral-300 transition-colors"
              >
                <input
                  id="agreeTerms"
                  type="checkbox"
                  required
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 accent-[#243B55] w-4 h-4 cursor-pointer"
                />
                <span className="leading-relaxed">
                  <strong className="text-rose-600 mr-1">[필수]</strong>
                  대여 물품의 분실 및 파손 시 관련 규정에 따라 책임질 수 있음을 확인했습니다.
                </span>
              </label>
            </div>

            {/* 13. 신청하기 버튼 & 14. 다시 작성 버튼 */}
            <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                className="btn-primary flex-1"
              >
                신청하기
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary sm:w-36"
              >
                다시 작성
              </button>
            </div>
          </form>

          {/* ============================================================== */}
          {/* 신청 완료 메시지: 연두색 배경, 초록색 글씨, 둥근 모서리 */}
          {/* ============================================================== */}
          {successMessage && (
            <div className="mt-6 success-message-box animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none" role="img" aria-label="완료">
                  ✅
                </span>
                <div className="font-semibold text-sm leading-relaxed">
                  {successMessage}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 최근 신청 내역 영역 (가장 최근 신청이 위에 표시됨) */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-[#243B55] flex items-center gap-1.5">
              <span>최근 신청 내역</span>
              <span className="text-xs font-normal text-[#4F6D8A]">
                ({applications.length}건)
              </span>
            </h2>

            <button
              type="button"
              onClick={handleExcelDownload}
              className="text-2xs font-semibold text-[#243B55] hover:text-[#314F73] underline underline-offset-2 cursor-pointer"
            >
              Excel 파일로 다운로드
            </button>
          </div>

          {applications.length > 0 ? (
            <div className="space-y-2.5">
              {applications.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-neutral-200/80 p-4 shadow-2xs hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#243B55]">
                          {item.name}
                        </span>
                        <span className="text-2xs text-[#4F6D8A]">
                          ({item.studentId} · {item.department})
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-neutral-800 mt-0.5">
                        {item.item}{' '}
                        <span className="font-normal text-neutral-500">
                          {item.quantity}개
                        </span>
                      </div>
                    </div>

                    <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {item.status || '대여 신청'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-y-1 text-2xs text-[#4F6D8A] pt-2 border-t border-neutral-100">
                    <div>
                      대여일: <strong className="text-neutral-700">{item.rentDate}</strong> ~ 반납 예정:{' '}
                      <strong className="text-neutral-700">{item.returnDate}</strong>
                    </div>

                    <div className="text-neutral-400">
                      {item.createdAt}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-xl border border-neutral-200/80 text-xs text-[#4F6D8A]">
              저장된 신청 내역이 없습니다.
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="text-center text-xs text-[#4F6D8A] pb-6">
          <p>공과대학 학생회 과방 물품 대여 서비스</p>
          <p className="text-2xs text-neutral-400 mt-1">
            위치: 공학관 304호 | 운영시간: 평일 09:00 ~ 21:00
          </p>
        </div>

      </div>
    </div>
  );
};
