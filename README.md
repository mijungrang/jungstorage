# 파일 처리 도구 (HWP & Excel)

Google Apps Script를 사용하여 HWP 파일과 Excel 파일을 읽고, 수정하고, 저장하는 기능을 제공합니다.

## 기능 개요

### ✅ Excel 파일 처리
- Excel 파일(.xlsx) 읽기
- 데이터 수정
- 새 Excel 파일 생성
- Excel 형식으로 내보내기

### ✅ HWP 파일 처리
- HWP 파일 읽기 (Google Docs로 변환)
- 문서 내용 수정
- 새 문서 생성
- PDF/DOCX 형식으로 내보내기

## 사용 방법

### 1. Excel 파일 처리

#### Excel 파일 읽기 (파일 ID로)
```javascript
const fileId = 'YOUR_FILE_ID_HERE';
const data = readExcelFile(fileId);
Logger.log(data); // 2차원 배열로 반환
```

#### Excel 파일 읽기 (파일 이름으로)
```javascript
const data = readExcelFileByName('샘플파일.xlsx');
Logger.log(data);
```

#### Excel 파일 수정
```javascript
const fileId = 'YOUR_SPREADSHEET_ID';
const newData = [
  ['이름', '나이', '직업'],
  ['홍길동', 30, '개발자'],
  ['김철수', 25, '디자이너']
];
modifyExcelFile(fileId, newData);
```

#### 새 Excel 파일 생성
```javascript
const data = [
  ['제목1', '제목2', '제목3'],
  ['데이터1', '데이터2', '데이터3']
];
const newFileId = createExcelFile('새파일.xlsx', data);
Logger.log('생성된 파일 ID:', newFileId);
```

#### Excel 형식으로 내보내기
```javascript
const sheetsFileId = 'YOUR_GOOGLE_SHEETS_ID';
const excelFileId = exportToExcel(sheetsFileId);
Logger.log('Excel 파일 ID:', excelFileId);
```

### 2. HWP 파일 처리

> **참고**: Google Apps Script는 HWP 형식을 직접 지원하지 않습니다.
> HWP 파일은 Google Docs로 변환되어 처리됩니다.

#### HWP 파일 읽기 (파일 ID로)
```javascript
const fileId = 'YOUR_HWP_FILE_ID';
const content = readHwpFile(fileId);
Logger.log(content);
```

#### HWP 파일 읽기 (파일 이름으로)
```javascript
const content = readHwpFileByName('문서.hwp');
Logger.log(content);
```

#### 문서 수정
```javascript
const docId = 'YOUR_GOOGLE_DOCS_ID';
const newContent = '이것은 수정된 내용입니다.\n새로운 단락이 추가되었습니다.';
modifyHwpFile(docId, newContent);
```

#### 새 문서 생성
```javascript
const content = '새로운 문서의 내용입니다.';
const newDocId = createHwpFile('새문서', content);
Logger.log('생성된 문서 ID:', newDocId);
```

#### 다양한 형식으로 내보내기
```javascript
const docId = 'YOUR_GOOGLE_DOCS_ID';

// PDF로 내보내기
const pdfFileId = exportDocument(docId, 'pdf');

// DOCX로 내보내기
const docxFileId = exportDocument(docId, 'docx');

// TXT로 내보내기
const txtFileId = exportDocument(docId, 'txt');
```

### 3. 완전한 사용 예제

#### Excel 파일 처리 예제
```javascript
function exampleExcelUsage() {
  // 1. 파일 이름으로 Excel 읽기
  const data = readExcelFileByName('샘플파일.xlsx');
  Logger.log('읽은 데이터:', data);

  // 2. 데이터 수정
  const modifiedData = data.map(row => {
    // 예: 모든 행의 첫 번째 열 값에 10 더하기
    if (typeof row[0] === 'number') {
      row[0] += 10;
    }
    return row;
  });

  // 3. 새 파일로 저장
  const newFileId = createExcelFile('수정된_파일.xlsx', modifiedData);
  Logger.log('새 파일 ID:', newFileId);

  // 4. Excel 형식으로 내보내기
  exportToExcel(newFileId);
}
```

#### HWP 파일 처리 예제
```javascript
function exampleHwpUsage() {
  // 1. 파일 이름으로 문서 읽기
  const content = readHwpFileByName('샘플문서.hwp');
  Logger.log('읽은 내용:', content);

  // 2. 내용 수정
  const modifiedContent = content + '\n\n추가된 내용입니다.';

  // 3. 새 문서로 저장
  const newDocId = createHwpFile('수정된_문서', modifiedContent);
  Logger.log('새 문서 ID:', newDocId);

  // 4. PDF로 내보내기
  exportDocument(newDocId, 'pdf');
}
```

## API 함수 목록

### Excel 관련 함수

| 함수명 | 설명 | 파라미터 | 반환값 |
|--------|------|----------|--------|
| `readExcelFile(fileId)` | Excel 파일 읽기 | fileId: 파일 ID | 2차원 배열 |
| `readExcelFileByName(fileName)` | 파일 이름으로 Excel 읽기 | fileName: 파일 이름 | 2차원 배열 |
| `modifyExcelFile(fileId, newData, sheetName)` | Excel 파일 수정 | fileId, newData, sheetName(선택) | boolean |
| `createExcelFile(fileName, data, folderId)` | 새 Excel 파일 생성 | fileName, data, folderId(선택) | 파일 ID |
| `exportToExcel(fileId, folderId)` | Excel 형식으로 내보내기 | fileId, folderId(선택) | 파일 ID |

### HWP 관련 함수

| 함수명 | 설명 | 파라미터 | 반환값 |
|--------|------|----------|--------|
| `readHwpFile(fileId)` | HWP 파일 읽기 | fileId: 파일 ID | 텍스트 내용 |
| `readHwpFileByName(fileName)` | 파일 이름으로 HWP 읽기 | fileName: 파일 이름 | 텍스트 내용 |
| `modifyHwpFile(fileId, newContent)` | 문서 수정 | fileId, newContent | boolean |
| `createHwpFile(fileName, content, folderId)` | 새 문서 생성 | fileName, content, folderId(선택) | 파일 ID |
| `exportDocument(fileId, format, folderId)` | 문서 내보내기 | fileId, format('pdf'/'docx'/'txt'), folderId(선택) | 파일 ID |

## 필요한 권한

이 스크립트를 사용하려면 다음 Google Apps Script 권한이 필요합니다:

- Google Drive API
- Google Sheets API
- Google Docs API

## 설치 방법

1. Google Apps Script 프로젝트를 엽니다
2. `code.gs` 파일의 내용을 복사하여 붙여넣습니다
3. Google Drive API를 활성화합니다:
   - 프로젝트 설정 > 서비스
   - Drive API 추가
4. 필요한 권한을 승인합니다

## 주의사항

- **HWP 파일**: Google Apps Script는 HWP를 직접 지원하지 않으므로 Google Docs로 변환됩니다. 일부 서식이 손실될 수 있습니다.
- **Excel 파일**: Excel 파일은 Google Sheets로 변환되어 처리됩니다.
- **파일 ID**: Google Drive의 파일 ID는 파일 URL에서 확인할 수 있습니다.
  - 예: `https://docs.google.com/spreadsheets/d/FILE_ID/edit`

## 문제 해결

### 파일을 찾을 수 없는 경우
- 파일 ID가 정확한지 확인하세요
- 파일에 대한 접근 권한이 있는지 확인하세요

### API 오류가 발생하는 경우
- Google Drive API가 활성화되어 있는지 확인하세요
- 필요한 권한을 모두 승인했는지 확인하세요

## 라이선스

이 프로젝트는 자유롭게 사용할 수 있습니다.
