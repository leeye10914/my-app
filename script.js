/**
 * ==========================================================
 * 과방 물품 대여 신청서 자바스크립트 (script.js)
 * - SheetJS (xlsx) 연동 엑셀 저장 기능 포함
 * - iFrame 환경에서도 100% 작동하는 대화창 및 유효성 검사 제공
 * ==========================================================
 */

import * as XLSX from 'xlsx';

document.addEventListener('DOMContentLoaded', () => {
  // 1. DOM 요소 취득
  const rentalForm = document.getElementById('rentalForm');
  const nameInput = document.getElementById('name');
  const studentIdInput = document.getElementById('studentId');
  const phoneInput = document.getElementById('phone');
  const rentDateInput = document.getElementById('rentDate');
  const returnDateInput = document.getElementById('returnDate');
  const quantityInput = document.getElementById('quantity');
  const purposeInput = document.getElementById('purpose');

  // 체크박스 & 기타 물품 요소
  const itemCheckboxes = document.querySelectorAll('input[name="rentalItems"]');
  const etcCheckbox = document.getElementById('itemEtc');
  const customItemContainer = document.getElementById('customItemContainer');
  const customItemNameInput = document.getElementById('customItemName');
  const selectedCountDisplay = document.getElementById('selectedCountDisplay');

  // 주의사항 체크박스
  const noticeLoss = document.getElementById('noticeLoss');
  const noticeReturn = document.getElementById('noticeReturn');

  // 에러 알림 박스 (iframe 내 alert 차단 대비)
  const errorAlertBox = document.getElementById('errorAlertBox');
  const errorAlertText = document.getElementById('errorAlertText');

  // 확인 모달 요소 (iframe 내 confirm 차단 대비)
  const confirmModal = document.getElementById('confirmModal');
  const btnModalCancel = document.getElementById('btnModalCancel');
  const btnModalConfirm = document.getElementById('btnModalConfirm');

  // 버튼 및 결과 메시지 영역
  const btnReset = document.getElementById('btnReset');
  const btnExportExcel = document.getElementById('btnExportExcel');
  const confirmationBox = document.getElementById('confirmationBox');
  const confirmationContent = document.getElementById('confirmationContent');

  // localStorage 키 정의
  const STORAGE_KEY = 'lounge_rental_history_list';

  /**
   * 알림 메시지 안전 표시 (iframe sandboxing 호환)
   */
  const showAlert = (message, targetInput) => {
    // 1) 인라인 에러 박스 노출
    if (errorAlertBox && errorAlertText) {
      errorAlertText.textContent = message;
      errorAlertBox.classList.remove('hidden');
      errorAlertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 2) 브라우저 기본 alert 안전 호출
    try {
      window.alert(message);
    } catch (e) {
      console.warn('Browser blocked window.alert inside sandbox:', e);
    }

    // 3) 포커스 이동
    if (targetInput) {
      targetInput.focus();
    }
  };

  const hideAlert = () => {
    if (errorAlertBox) {
      errorAlertBox.classList.add('hidden');
      if (errorAlertText) errorAlertText.textContent = '';
    }
  };

  // 폼 입력 시 에러 알림 숨김
  rentalForm.addEventListener('input', hideAlert);
  rentalForm.addEventListener('change', hideAlert);

  /**
   * 저장된 신청 내역 불러오기 (localStorage)
   */
  const getStoredRentals = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('로컬스토리지 불러오기 실패:', e);
      return [];
    }
  };

  /**
   * 신청 내역 저장하기 (localStorage)
   */
  const saveRentalRecord = (record) => {
    try {
      const existing = getStoredRentals();
      const updated = [record, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('로컬스토리지 저장 실패:', e);
    }
  };

  /**
   * 2. 날짜 기본값 및 제약 조건 초기화
   * - 대여일 기본값: 오늘 날짜로 자동 설정
   * - 반납 예정일: 대여일보다 이전 날짜 선택 불가 (min 속성 지정)
   */
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const initDates = () => {
    const todayStr = getTodayDateString();
    rentDateInput.value = todayStr;
    rentDateInput.min = todayStr;

    returnDateInput.value = todayStr;
    returnDateInput.min = todayStr;
  };

  initDates();

  /**
   * 3. 대여일 변경 시 반납 예정일 검증 및 min 동기화
   */
  rentDateInput.addEventListener('change', () => {
    const selectedRentDate = rentDateInput.value;
    if (!selectedRentDate) return;

    returnDateInput.min = selectedRentDate;

    if (returnDateInput.value && returnDateInput.value < selectedRentDate) {
      showAlert('반납 예정일은 대여일 이후로 선택해주세요.', returnDateInput);
      returnDateInput.value = selectedRentDate;
    }
  });

  returnDateInput.addEventListener('change', () => {
    if (rentDateInput.value && returnDateInput.value < rentDateInput.value) {
      showAlert('반납 예정일은 대여일 이후로 선택해주세요.', returnDateInput);
      returnDateInput.value = rentDateInput.value;
    }
  });

  /**
   * 4. 대여 물품 선택 및 실시간 개수 표시 / 카드 스타일링
   */
  const updateSelectedItemsDisplay = () => {
    const checkedBoxes = Array.from(itemCheckboxes).filter(cb => cb.checked);
    const count = checkedBoxes.length;

    // 실시간 선택한 물품 개수 업데이트 (예: "선택한 물품: 3개")
    if (selectedCountDisplay) {
      selectedCountDisplay.textContent = `선택한 물품: ${count}개`;
    }

    // 각 카드의 활성(checked) 스타일 동기화
    itemCheckboxes.forEach(cb => {
      const card = cb.closest('.item-card');
      if (card) {
        if (cb.checked) {
          card.classList.add('checked');
        } else {
          card.classList.remove('checked');
        }
      }
    });

    // '기타' 선택 시에만 기타 물품명 입력칸 표시
    if (etcCheckbox && etcCheckbox.checked) {
      customItemContainer.classList.remove('hidden');
      customItemNameInput.required = true;
    } else {
      customItemContainer.classList.add('hidden');
      customItemNameInput.required = false;
      customItemNameInput.value = '';
    }
  };

  itemCheckboxes.forEach(cb => {
    cb.addEventListener('change', updateSelectedItemsDisplay);
  });

  updateSelectedItemsDisplay();

  /**
   * 5. 날짜 포맷팅 헬퍼 (예: 2026-10-01 -> "2026년 10월 1일")
   */
  const formatKoreanDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${year}년 ${month}월 ${day}일`;
  };

  /**
   * 6. SheetJS를 사용한 Excel(.xlsx) 내보내기 헬퍼
   */
  const downloadExcel = (dataList) => {
    if (!dataList || dataList.length === 0) {
      showAlert('저장된 신청 내역이 없습니다.');
      return;
    }

    // 엑셀 행 데이터 변환 (한글 헤더)
    const excelRows = dataList.map((item, index) => ({
      '번호': index + 1,
      '신청일시': item.createdAt,
      '이름': item.name,
      '학번': item.studentId,
      '연락처': item.phone,
      '대여 물품': item.items,
      '대여 수량': item.quantity,
      '대여일': item.rentDate,
      '반납 예정일': item.returnDate,
      '대여 목적': item.purpose || '-',
      '주의사항 확인': item.agreeNotes ? '동의함' : '미동의',
      '상태': '대여 신청'
    }));

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // 열 너비 자동 조정
    worksheet['!cols'] = [
      { wch: 6 },  // 번호
      { wch: 20 }, // 신청일시
      { wch: 12 }, // 이름
      { wch: 14 }, // 학번
      { wch: 16 }, // 연락처
      { wch: 24 }, // 대여 물품
      { wch: 10 }, // 대여 수량
      { wch: 14 }, // 대여일
      { wch: 14 }, // 반납 예정일
      { wch: 30 }, // 대여 목적
      { wch: 14 }, // 주의사항 확인
      { wch: 12 }, // 상태
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '대여 신청 목록');

    // 다운로드 실행
    XLSX.writeFile(workbook, '과방_물품대여_신청목록.xlsx');
  };

  /**
   * 7. [📊 엑셀로 저장하기] 버튼 클릭 핸들러
   */
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
      const stored = getStoredRentals();

      if (stored.length > 0) {
        downloadExcel(stored);
        return;
      }

      // 만약 아직 저장된 내역이 없지만 폼에 입력 중인 경우 안내
      const currentName = nameInput.value.trim();
      const selectedBoxes = Array.from(itemCheckboxes).filter(cb => cb.checked);

      if (currentName && selectedBoxes.length > 0) {
        const selectedItemNames = selectedBoxes.map(cb => {
          if (cb.value === '기타') {
            const customName = customItemNameInput.value.trim();
            return customName ? `기타(${customName})` : '기타';
          }
          return cb.value;
        }).join(', ');

        const tempRecord = {
          id: `temp-${Date.now()}`,
          createdAt: new Date().toLocaleString('ko-KR'),
          name: currentName,
          studentId: studentIdInput.value.trim() || '-',
          phone: phoneInput.value.trim() || '-',
          items: selectedItemNames,
          quantity: parseInt(quantityInput.value, 10) || 1,
          rentDate: rentDateInput.value,
          returnDate: returnDateInput.value,
          purpose: purposeInput.value.trim() || '-',
          agreeNotes: noticeLoss.checked && noticeReturn.checked,
        };

        downloadExcel([tempRecord]);
      } else {
        showAlert('저장된 신청 내역이 없습니다. 먼저 대여 신청서를 작성해주세요.');
      }
    });
  }

  /**
   * 8. 실제 대여 신청 완료 처리 로직
   */
  const finalizeSubmission = () => {
    hideAlert();

    const nameVal = nameInput.value.trim();
    const studentIdVal = studentIdInput.value.trim();
    const phoneVal = phoneInput.value.trim();
    const rentDateVal = rentDateInput.value;
    const returnDateVal = returnDateInput.value;
    const quantityVal = parseInt(quantityInput.value, 10) || 1;

    const selectedBoxes = Array.from(itemCheckboxes).filter(cb => cb.checked);
    const selectedItemNames = selectedBoxes.map(cb => {
      if (cb.value === '기타') {
        const customName = customItemNameInput.value.trim();
        return customName ? `기타(${customName})` : '기타';
      }
      return cb.value;
    });

    const formattedRentDate = formatKoreanDate(rentDateVal);
    const formattedReturnDate = formatKoreanDate(returnDateVal);
    const itemsListStr = selectedItemNames.join(', ');

    // 신청 레코드 생성 및 localStorage 영구 저장
    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newRecord = {
      id: `rent-${Date.now()}`,
      createdAt: formattedNow,
      name: nameVal,
      studentId: studentIdVal,
      phone: phoneVal,
      items: itemsListStr,
      quantity: quantityVal,
      rentDate: rentDateVal,
      returnDate: returnDateVal,
      purpose: purposeInput.value.trim() || '-',
      agreeNotes: true,
      status: '대여 신청'
    };

    saveRentalRecord(newRecord);

    // 신청 확인 메시지 구성 (연두색 배경 + 초록색 글씨)
    let messageHtml = '';
    if (selectedItemNames.length === 1) {
      const singleItem = selectedItemNames[0];
      messageHtml = `
        <div class="confirmation-title">
          <span>✅</span>
          <span>${nameVal}님의 ${singleItem} ${quantityVal}개 대여 신청이 완료되었습니다.</span>
        </div>
        <div class="confirmation-details">
          대여일: <strong>${formattedRentDate}</strong><br>
          반납 예정일: <strong>${formattedReturnDate}</strong>
        </div>
        <div>
          <button type="button" id="btnQuickExcel" class="btn-excel-outline">
            📥 방금 신청한 내역 엑셀(.xlsx)로 저장하기
          </button>
        </div>
      `;
    } else {
      messageHtml = `
        <div class="confirmation-title">
          <span>✅</span>
          <span>${nameVal}님의 ${itemsListStr} 대여 신청이 완료되었습니다.</span>
        </div>
        <div class="confirmation-details">
          대여 수량: 각 <strong>${quantityVal}개</strong><br>
          대여일: <strong>${formattedRentDate}</strong><br>
          반납 예정일: <strong>${formattedReturnDate}</strong>
        </div>
        <div>
          <button type="button" id="btnQuickExcel" class="btn-excel-outline">
            📥 방금 신청한 내역 엑셀(.xlsx)로 저장하기
          </button>
        </div>
      `;
    }

    confirmationContent.innerHTML = messageHtml;
    confirmationBox.classList.remove('hidden');

    // 방금 신청한 건 엑셀 바로받기 버튼 이벤트 연결
    const btnQuickExcel = document.getElementById('btnQuickExcel');
    if (btnQuickExcel) {
      btnQuickExcel.addEventListener('click', () => {
        downloadExcel([newRecord]);
      });
    }

    // 완료 박스로 스크롤
    confirmationBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  /**
   * 9. 신청서 제출 이벤트 처리 (필수 항목 검증 및 확인 모달 노출)
   */
  rentalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideAlert();

    // 1) 이름 검사
    const nameVal = nameInput.value.trim();
    if (!nameVal) {
      showAlert('이름을 입력해주세요.', nameInput);
      return;
    }

    // 2) 학번 검사
    const studentIdVal = studentIdInput.value.trim();
    if (!studentIdVal) {
      showAlert('학번을 입력해주세요.', studentIdInput);
      return;
    }

    // 3) 연락처 검사
    const phoneVal = phoneInput.value.trim();
    if (!phoneVal) {
      showAlert('연락처를 입력해주세요.', phoneInput);
      return;
    }

    // 4) 대여 물품 선택 검사 (최소 1개 이상)
    const selectedBoxes = Array.from(itemCheckboxes).filter(cb => cb.checked);
    if (selectedBoxes.length === 0) {
      showAlert('대여할 물품을 선택해주세요.', itemCheckboxes[0]);
      return;
    }

    // '기타' 선택 시 물품명 작성 여부 확인
    if (etcCheckbox.checked && !customItemNameInput.value.trim()) {
      showAlert('기타 물품명을 입력해주세요.', customItemNameInput);
      return;
    }

    // 5) 대여일 검사
    const rentDateVal = rentDateInput.value;
    if (!rentDateVal) {
      showAlert('대여일을 선택해주세요.', rentDateInput);
      return;
    }

    // 6) 반납 예정일 검사
    const returnDateVal = returnDateInput.value;
    if (!returnDateVal) {
      showAlert('반납 예정일을 선택해주세요.', returnDateInput);
      return;
    }

    // 대여일보다 반납 예정일이 이전인 경우 검사
    if (returnDateVal < rentDateVal) {
      showAlert('반납 예정일은 대여일 이후로 선택해주세요.', returnDateInput);
      return;
    }

    // 7) 주의사항 동의 검사 (2개 항목 모두 체크 필수)
    if (!noticeLoss.checked || !noticeReturn.checked) {
      showAlert('대여 및 반납 주의사항을 확인해주세요.', noticeLoss.checked ? noticeReturn : noticeLoss);
      return;
    }

    // 8) 브라우저 sandbox 환경에서도 절대 차단되지 않는 확인 모달 열기
    if (confirmModal) {
      confirmModal.classList.remove('hidden');
    } else {
      // 만약 모달 엘리먼트가 없으면 즉시 완료
      finalizeSubmission();
    }
  });

  // 모달 [확인] 버튼 클릭 시 최종 완료
  if (btnModalConfirm) {
    btnModalConfirm.addEventListener('click', () => {
      if (confirmModal) confirmModal.classList.add('hidden');
      finalizeSubmission();
    });
  }

  // 모달 [취소] 버튼 클릭 시 모달 닫기
  if (btnModalCancel) {
    btnModalCancel.addEventListener('click', () => {
      if (confirmModal) confirmModal.classList.add('hidden');
    });
  }

  // 모달 배경 클릭 시 닫기
  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        confirmModal.classList.add('hidden');
      }
    });
  }

  /**
   * 10. [다시 작성] 버튼 기능
   */
  btnReset.addEventListener('click', () => {
    rentalForm.reset();
    initDates();
    updateSelectedItemsDisplay();
    hideAlert();
    confirmationBox.classList.add('hidden');
    confirmationContent.innerHTML = '';
    nameInput.focus();
  });
});
