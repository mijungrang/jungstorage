# 실행 가이드

## 1. Google Apps Script 설정

### 1단계: Google Apps Script 프로젝트 생성
1. [Google Apps Script](https://script.google.com) 접속
2. 좌측 상단 "새 프로젝트" 클릭
3. 프로젝트 이름 설정 (예: "파일 처리 도구")

### 2단계: 코드 복사
1. 기본으로 생성된 `코드.gs` 파일 열기
2. `/home/user/jungstorage/code.gs` 파일의 내용을 모두 복사
3. Google Apps Script 편집기에 붙여넣기

### 3단계: Drive API 활성화
1. 왼쪽 메뉴에서 "서비스" (⚙️) 클릭
2. "Google Drive API" 찾기
3. "추가" 버튼 클릭
4. 버전은 "v2" 선택

## 2. 실행 방법

### 방법 1: 스크립트 편집기에서 직접 실행

#### Excel 파일 읽기 예제
```javascript
function myExcelTest() {
  // 방법 1: 파일 ID로 읽기
  const fileId = '여기에_파일_ID_입력';  // Google Drive의 파일 ID
  const data = readExcelFile(fileId);
  Logger.log('읽은 데이터:', data);

  // 방법 2: 파일 이름으로 읽기
  const data2 = readExcelFileByName('내파일.xlsx');
  Logger.log('파일 이름으로 읽은 데이터:', data2);
}
```

**실행 방법:**
1. 위 코드를 Apps Script 편집기에 추가
2. 함수 선택 드롭다운에서 `myExcelTest` 선택
3. 재생 버튼(▶️) 클릭
4. 권한 승인 (처음 한 번만)
5. `Ctrl + Enter` 또는 메뉴: 보기 > 로그 로 결과 확인

#### Excel 파일 수정 예제
```javascript
function modifyExcelExample() {
  // 1. 기존 파일 읽기
  const data = readExcelFileByName('원본파일.xlsx');

  // 2. 데이터 수정
  // 예: 모든 숫자에 100 더하기
  const modifiedData = data.map(row => {
    return row.map(cell => {
      if (typeof cell === 'number') {
        return cell + 100;
      }
      return cell;
    });
  });

  // 3. 새 파일로 저장
  const newFileId = createExcelFile('수정된파일.xlsx', modifiedData);
  Logger.log('새 파일 생성됨! ID:', newFileId);
  Logger.log('링크: https://docs.google.com/spreadsheets/d/' + newFileId);
}
```

#### Excel 데이터 생성 예제
```javascript
function createNewExcelExample() {
  // 데이터 준비
  const data = [
    ['이름', '나이', '직업', '급여'],
    ['홍길동', 30, '개발자', 5000000],
    ['김철수', 25, '디자이너', 4500000],
    ['이영희', 28, '기획자', 4800000],
    ['박민수', 32, '팀장', 6000000]
  ];

  // 파일 생성
  const fileId = createExcelFile('직원명단.xlsx', data);
  Logger.log('파일 생성 완료!');
  Logger.log('파일 ID:', fileId);
  Logger.log('링크: https://docs.google.com/spreadsheets/d/' + fileId);

  // Excel 형식으로 내보내기
  const excelFileId = exportToExcel(fileId);
  Logger.log('Excel 파일 ID:', excelFileId);
}
```

#### HWP 파일 읽기 예제
```javascript
function readHwpExample() {
  // 방법 1: 파일 ID로 읽기
  const fileId = '여기에_HWP_파일_ID_입력';
  const content = readHwpFile(fileId);
  Logger.log('HWP 내용:', content);

  // 방법 2: 파일 이름으로 읽기
  const content2 = readHwpFileByName('계약서.hwp');
  Logger.log('파일 내용:', content2);
}
```

#### HWP 파일 생성 및 수정 예제
```javascript
function createAndModifyHwpExample() {
  // 1. 새 문서 생성
  const content = `
    [회의록]

    일시: 2025년 11월 30일
    참석자: 홍길동, 김철수, 이영희

    1. 프로젝트 진행 상황 논의
    2. 다음 스프린트 계획
    3. 기타 안건

    다음 회의: 2025년 12월 7일
  `;

  const docId = createHwpFile('회의록_2025_11_30', content);
  Logger.log('문서 생성됨! ID:', docId);
  Logger.log('링크: https://docs.google.com/document/d/' + docId);

  // 2. PDF로 내보내기
  const pdfId = exportDocument(docId, 'pdf');
  Logger.log('PDF 파일 ID:', pdfId);

  // 3. DOCX로 내보내기
  const docxId = exportDocument(docId, 'docx');
  Logger.log('DOCX 파일 ID:', docxId);
}
```

### 방법 2: Google Drive에서 파일 ID 찾기

**파일 ID를 찾는 방법:**
1. Google Drive에서 파일 열기
2. 주소창의 URL 확인:
   ```
   Excel/Sheets: https://docs.google.com/spreadsheets/d/[파일ID]/edit
   HWP/Docs:     https://docs.google.com/document/d/[파일ID]/edit
   Drive 파일:   https://drive.google.com/file/d/[파일ID]/view
   ```
3. `[파일ID]` 부분을 복사

**예시:**
```
URL: https://docs.google.com/spreadsheets/d/1ABc2DEf3GHi4JKl5MNo6PQr7STu8VWx9YZa/edit
파일 ID: 1ABc2DEf3GHi4JKl5MNo6PQr7STu8VWx9YZa
```

### 방법 3: 실전 예제 - 월별 보고서 생성

```javascript
function createMonthlyReport() {
  // 1. 기존 데이터 파일 읽기
  const salesData = readExcelFileByName('11월_매출데이터.xlsx');

  // 2. 데이터 분석
  let totalSales = 0;
  let totalItems = 0;

  // 헤더 제외하고 집계 (첫 번째 행은 헤더)
  for (let i = 1; i < salesData.length; i++) {
    totalSales += salesData[i][2]; // 3번째 열이 금액이라고 가정
    totalItems += salesData[i][1]; // 2번째 열이 수량이라고 가정
  }

  // 3. 보고서 데이터 생성
  const reportData = [
    ['항목', '값'],
    ['총 매출액', totalSales],
    ['총 판매량', totalItems],
    ['평균 단가', totalSales / totalItems],
    ['거래 건수', salesData.length - 1]
  ];

  // 4. 보고서 Excel 생성
  const reportId = createExcelFile('11월_매출보고서.xlsx', reportData);
  Logger.log('보고서 생성 완료:', reportId);

  // 5. 보고서 문서 생성
  const docContent = `
    [매출 보고서 - 2025년 11월]

    ■ 요약
    - 총 매출액: ${totalSales.toLocaleString()}원
    - 총 판매량: ${totalItems}개
    - 평균 단가: ${Math.round(totalSales / totalItems).toLocaleString()}원
    - 거래 건수: ${salesData.length - 1}건

    ■ 분석
    이번 달 매출은 전월 대비 양호한 편입니다.

    ■ 다음 달 계획
    1. 신규 제품 출시
    2. 마케팅 강화
    3. 고객 만족도 조사
  `;

  const docId = createHwpFile('11월_매출보고서', docContent);
  Logger.log('문서 생성 완료:', docId);

  // 6. PDF로 저장
  exportDocument(docId, 'pdf');
  Logger.log('PDF 내보내기 완료');
}
```

## 3. 디버깅 및 로그 확인

### 로그 확인 방법
1. **방법 1**: 메뉴 > 보기 > 로그
2. **방법 2**: `Ctrl + Enter`
3. **방법 3**: 왼쪽 메뉴 > 실행 > 최근 실행 내역 확인

### 오류 해결

#### "권한이 없습니다" 오류
```javascript
// 해결: 스크립트 승인
// 1. 실행 시 나타나는 승인 창에서 "권한 검토" 클릭
// 2. Google 계정 선택
// 3. "고급" > "안전하지 않은 페이지로 이동" 클릭
// 4. "허용" 클릭
```

#### "파일을 찾을 수 없습니다" 오류
```javascript
function checkFileExists() {
  const fileName = '내파일.xlsx';
  const files = DriveApp.getFilesByName(fileName);

  if (files.hasNext()) {
    Logger.log('파일 발견:', files.next().getId());
  } else {
    Logger.log('파일 없음! Drive에서 파일명 확인 필요');

    // 모든 파일 목록 보기
    const allFiles = DriveApp.getFiles();
    Logger.log('Drive의 파일 목록:');
    while (allFiles.hasNext()) {
      Logger.log('- ' + allFiles.next().getName());
    }
  }
}
```

#### "Drive API를 찾을 수 없습니다" 오류
```javascript
// 해결: Drive API 활성화
// 1. 왼쪽 메뉴 > 서비스 (⚙️)
// 2. Drive API 추가
// 3. 버전 v2 선택
```

## 4. 실용적인 활용 예제

### 예제 1: 여러 Excel 파일 합치기
```javascript
function mergeExcelFiles() {
  const file1 = readExcelFileByName('1분기_데이터.xlsx');
  const file2 = readExcelFileByName('2분기_데이터.xlsx');
  const file3 = readExcelFileByName('3분기_데이터.xlsx');

  // 헤더는 첫 번째 파일에서만, 나머지는 데이터만
  const mergedData = [
    ...file1,                    // 헤더 포함
    ...file2.slice(1),          // 헤더 제외
    ...file3.slice(1)           // 헤더 제외
  ];

  const resultId = createExcelFile('연간_통합데이터.xlsx', mergedData);
  Logger.log('통합 완료! ID:', resultId);
}
```

### 예제 2: Excel 데이터를 문서로 변환
```javascript
function convertExcelToDocument() {
  const data = readExcelFileByName('회원명단.xlsx');

  let docContent = '[회원 명단]\n\n';

  // 헤더 (첫 번째 행)
  const headers = data[0];

  // 각 행을 문서 형식으로 변환
  for (let i = 1; i < data.length; i++) {
    docContent += `${i}. `;
    for (let j = 0; j < headers.length; j++) {
      docContent += `${headers[j]}: ${data[i][j]}  `;
    }
    docContent += '\n';
  }

  const docId = createHwpFile('회원명단_문서', docContent);
  Logger.log('문서 변환 완료:', docId);

  // PDF로 저장
  exportDocument(docId, 'pdf');
}
```

### 예제 3: 자동 이메일 첨부용 파일 생성
```javascript
function createAndEmailReport() {
  // 1. 보고서 생성
  const reportData = [
    ['날짜', '방문자', '판매'],
    ['2025-11-28', 120, 50],
    ['2025-11-29', 135, 62],
    ['2025-11-30', 150, 71]
  ];

  const fileId = createExcelFile('일일보고서.xlsx', reportData);

  // 2. Excel로 내보내기
  const excelId = exportToExcel(fileId);
  const file = DriveApp.getFileById(excelId);

  // 3. 이메일 발송
  MailApp.sendEmail({
    to: 'manager@company.com',
    subject: '일일 보고서',
    body: '오늘의 보고서를 첨부합니다.',
    attachments: [file.getBlob()]
  });

  Logger.log('이메일 발송 완료!');
}
```

## 5. 트리거 설정 (자동 실행)

### 매일 자동으로 보고서 생성하기
1. 왼쪽 메뉴 > 트리거 (시계 아이콘)
2. 우측 하단 "트리거 추가" 클릭
3. 설정:
   - 실행할 함수: `createAndEmailReport`
   - 이벤트 소스: `시간 기반`
   - 시간 간격: `일 타이머`
   - 시간 선택: `오전 9시~10시`
4. 저장

## 6. 웹 앱으로 배포 (선택사항)

웹 인터페이스에서 파일을 처리하려면:

1. `index.html` 파일 생성 (왼쪽 메뉴 + 버튼)
2. 웹 UI 코드 작성
3. 메뉴 > 배포 > 새 배포
4. 유형: 웹 앱
5. 액세스 권한 설정
6. 배포

이제 웹 브라우저에서 파일 처리 가능!
