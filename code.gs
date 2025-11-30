/**
 * 웹 앱의 기본 GET 요청을 처리하여 index.html을 사용자에게 보여줍니다.
 * @param {object} e - 이벤트 객체 (사용하지 않음)
 * @returns {HtmlOutput} - 렌더링된 HTML 페이지
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('인천시 새소식 & 일자리')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * 인천시 새소식 및 일자리 API에서 데이터를 가져오는 서버 측 함수입니다.
 * 1. 캐시에서 데이터를 먼저 확인합니다.
 * 2. 캐시에 데이터가 없거나 만료된 경우에만 API를 호출합니다.
 * 3. API에서 가져온 데이터를 1시간 동안 캐시에 저장합니다.
 * @returns {object} - 새소식과 일자리 데이터를 담은 객체
 */
function fetchIncheonData() {
  // 1. CacheService 사용
  const cache = CacheService.getScriptCache();
  const cacheKey = 'INCHEON_DATA_CACHE';

  try {
    // 2. 캐시에서 데이터 조회
    const cachedData = cache.get(cacheKey);

    if (cachedData != null) {
      Logger.log('캐시에서 데이터를 반환합니다.');
      // 캐시된 데이터가 있으면 파싱하여 즉시 반환
      return JSON.parse(cachedData);
    }

    Logger.log('캐시가 비어있습니다. API에서 데이터를 가져옵니다.');

    // 3. 캐시에 데이터가 없는 경우, API 호출
    const newsApiKey = 'A4249378b3d64bfbac72cae96be3fe'; // 새소식 API 키
    const jobsApiKey = 'Fb7cf8993c5b4d8cb042d608ed3b6f'; // 일자리 API 키

    // --- (수정됨) ---
    // 인천시 Open API의 올바른 엔드포인트와 파라미터 형식 사용
    const newsUrl = `https://www.incheon.go.kr/ICDP/API/getNewIncheonList?KEY=${newsApiKey}&Type=json&Page=1&Rows=10`;
    const jobsUrl = `https://www.incheon.go.kr/ICDP/API/getIncheonJobList?KEY=${jobsApiKey}&Type=json&Page=1&Rows=10`;
    // -------------------

    Logger.log(`뉴스 URL 호출: ${newsUrl}`);
    Logger.log(`일자리 URL 호출: ${jobsUrl}`);

    const responses = UrlFetchApp.fetchAll([
      { url: newsUrl, muteHttpExceptions: true },
      { url: jobsUrl, muteHttpExceptions: true }
    ]);

    const newsResponse = responses[0];
    const jobsResponse = responses[1];

    const newsData = processResponse(newsResponse, 'newIncheon');
    const jobsData = processResponse(jobsResponse, 'incheonJob');

    const resultData = {
      news: newsData,
      jobs: jobsData
    };

    // 4. API 결과를 캐시에 저장 (1시간 = 3600초)
    // API 호출이 성공적인 경우에만 캐시에 저장합니다.
    if ((Array.isArray(newsData) && newsData.length > 0) || (Array.isArray(jobsData) && jobsData.length > 0)) {
       cache.put(cacheKey, JSON.stringify(resultData), 3600); // 3600 seconds = 1 hour
       Logger.log('새로운 데이터를 캐시에 저장했습니다.');
    } else {
       Logger.log('API 데이터에 오류가 있거나 비어있어 캐시에 저장하지 않습니다.');
    }

    return resultData;

  } catch (error) {
    Logger.log('데이터를 가져오는 중 오류 발생: ' + error.message);
    return {
      news: { error: '새소식 데이터를 가져오지 못했습니다: ' + error.message },
      jobs: { error: '일자리 데이터를 가져오지 못했습니다: ' + error.message }
    };
  }
}

/**
 * UrlFetchApp 응답을 처리하고 파싱하는 도우미 함수입니다.
 * (수정됨) API 응답 텍스트와 파싱된 JSON 객체를 상세히 로깅합니다.
 * @param {UrlFetchApp.HTTPResponse} response - API 응답 객체
 * @param {string} apiName - API 이름 (예: 'newIncheon', 'incheonJob')
 * @returns {object} - 파싱된 JSON 데이터 또는 오류 객체
 */
function processResponse(response, apiName) {
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  // --- (디버깅 로그 1) ---
  // API가 반환한 원본 텍스트를 그대로 로그에 남깁니다.
  // JSON 파싱 전에 오류가 있는지 (예: HTML 오류 페이지가 반환되는지) 확인할 수 있습니다.
  Logger.log(`[${apiName}] API 원본 응답 (코드: ${responseCode}): ${responseText}`);
  // -------------------------

  if (responseCode === 200) {
    try {
      // JSON 응답을 파싱합니다.
      const json = JSON.parse(responseText);

      // --- (디버깅 로그 2) ---
      // 파싱된 JSON 객체 전체를 로그에 남깁니다.
      // 이 로그를 보면 데이터 구조(예: 'newIncheon[1].row')가 올바른지 알 수 있습니다.
      Logger.log(`[${apiName}] 파싱된 JSON 객체: ${JSON.stringify(json)}`);
      // -------------------------

      // (수정됨) 인천 API는 'newIncheon' 또는 'incheonJob'을 키로 사용합니다.
      const dataKey = apiName; // "newIncheon" 또는 "incheonJob"

      // 데이터가 정상적으로 존재하는지 확인
      if (json[dataKey] && json[dataKey][1] && json[dataKey][1].row) {
        return json[dataKey][1].row; // 실제 데이터 배열 반환

      // 데이터가 없거나 API가 오류 메시지를 반환하는지 확인
      } else if (json[dataKey] && json[dataKey][0] && json[dataKey][0].RESULT) {
        const apiError = json[dataKey][0].RESULT;
        Logger.log(`${dataKey} API 오류: ${apiError.MESSAGE}`);
        return { error: `[${dataKey}] API 오류: ${apiError.MESSAGE}` };

      // 예상치 못한 구조일 경우
      } else {
        Logger.log(`${dataKey} 데이터 형식이 예상과 다릅니다. (json[dataKey][1].row 없음)`);
        return { error: `[${dataKey}] 데이터 형식이 올바르지 않습니다.` };
      }
    } catch (e) {
      Logger.log(`${apiName} JSON 파싱 오류: ${e.message}. (원본: ${responseText.substring(0, 200)}...)`);
      // API가 HTML 오류 페이지를 반환하면 여기서 오류가 납니다.
      return { error: `[${apiName}] 응답 파싱 실패: ${e.message}` };
    }
  } else {
    Logger.log(`${apiName} API 요청 실패. 코드: ${responseCode}.`);
    return { error: `[${apiName}] API 요청 실패 (HTTP ${responseCode})` };
  }
}

/**
 * ========================================
 * Excel 파일 처리 함수들
 * ========================================
 */

/**
 * Excel 파일(.xlsx)을 Google Drive에서 불러와 데이터를 읽습니다.
 * @param {string} fileId - Google Drive의 파일 ID
 * @returns {Array<Array>} - 시트의 데이터를 2차원 배열로 반환
 */
function readExcelFile(fileId) {
  try {
    // Google Drive에서 파일 가져오기
    const file = DriveApp.getFileById(fileId);

    // Excel 파일을 Google Sheets로 변환
    const blob = file.getBlob();
    const resource = {
      title: file.getName(),
      mimeType: MimeType.GOOGLE_SHEETS
    };

    // Drive API를 사용하여 변환된 스프레드시트 생성
    const spreadsheet = Drive.Files.insert(resource, blob, {convert: true});
    const sheet = SpreadsheetApp.openById(spreadsheet.id).getActiveSheet();

    // 데이터 읽기
    const data = sheet.getDataRange().getValues();

    Logger.log('Excel 파일 읽기 완료: ' + data.length + '행');
    return data;

  } catch (error) {
    Logger.log('Excel 파일 읽기 오류: ' + error.message);
    throw new Error('Excel 파일을 읽을 수 없습니다: ' + error.message);
  }
}

/**
 * 파일 이름으로 Google Drive에서 Excel 파일을 검색하여 읽습니다.
 * @param {string} fileName - 검색할 파일 이름
 * @returns {Array<Array>} - 시트의 데이터를 2차원 배열로 반환
 */
function readExcelFileByName(fileName) {
  try {
    const files = DriveApp.getFilesByName(fileName);

    if (files.hasNext()) {
      const file = files.next();
      return readExcelFile(file.getId());
    } else {
      throw new Error('파일을 찾을 수 없습니다: ' + fileName);
    }
  } catch (error) {
    Logger.log('파일 검색 오류: ' + error.message);
    throw error;
  }
}

/**
 * Google Sheets 파일의 데이터를 수정합니다.
 * @param {string} fileId - Google Sheets 파일 ID
 * @param {Array<Array>} newData - 새로운 데이터 (2차원 배열)
 * @param {string} sheetName - (선택사항) 시트 이름. 미지정시 첫 번째 시트 사용
 * @returns {boolean} - 성공 여부
 */
function modifyExcelFile(fileId, newData, sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.openById(fileId);
    let sheet;

    if (sheetName) {
      sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
      }
    } else {
      sheet = spreadsheet.getActiveSheet();
    }

    // 기존 데이터 지우기
    sheet.clear();

    // 새 데이터 쓰기
    if (newData && newData.length > 0) {
      const range = sheet.getRange(1, 1, newData.length, newData[0].length);
      range.setValues(newData);
    }

    Logger.log('Excel 파일 수정 완료');
    return true;

  } catch (error) {
    Logger.log('Excel 파일 수정 오류: ' + error.message);
    throw new Error('Excel 파일을 수정할 수 없습니다: ' + error.message);
  }
}

/**
 * 새로운 Excel 파일(Google Sheets)을 생성하고 데이터를 저장합니다.
 * @param {string} fileName - 새 파일 이름
 * @param {Array<Array>} data - 저장할 데이터 (2차원 배열)
 * @param {string} folderId - (선택사항) 저장할 폴더 ID
 * @returns {string} - 생성된 파일의 ID
 */
function createExcelFile(fileName, data, folderId) {
  try {
    // 새 스프레드시트 생성
    const spreadsheet = SpreadsheetApp.create(fileName);
    const sheet = spreadsheet.getActiveSheet();

    // 데이터 쓰기
    if (data && data.length > 0) {
      const range = sheet.getRange(1, 1, data.length, data[0].length);
      range.setValues(data);
    }

    // 폴더로 이동 (지정된 경우)
    if (folderId) {
      const file = DriveApp.getFileById(spreadsheet.getId());
      const folder = DriveApp.getFolderById(folderId);
      file.moveTo(folder);
    }

    Logger.log('새 Excel 파일 생성 완료: ' + spreadsheet.getId());
    return spreadsheet.getId();

  } catch (error) {
    Logger.log('Excel 파일 생성 오류: ' + error.message);
    throw new Error('Excel 파일을 생성할 수 없습니다: ' + error.message);
  }
}

/**
 * Google Sheets를 Excel 형식(.xlsx)으로 내보냅니다.
 * @param {string} fileId - Google Sheets 파일 ID
 * @param {string} folderId - (선택사항) 저장할 폴더 ID
 * @returns {string} - 내보낸 Excel 파일의 ID
 */
function exportToExcel(fileId, folderId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(fileId);
    const blob = spreadsheet.getAs(MimeType.MICROSOFT_EXCEL);

    const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    const file = folder.createFile(blob);

    Logger.log('Excel로 내보내기 완료: ' + file.getId());
    return file.getId();

  } catch (error) {
    Logger.log('Excel 내보내기 오류: ' + error.message);
    throw new Error('Excel로 내보낼 수 없습니다: ' + error.message);
  }
}

/**
 * ========================================
 * HWP 파일 처리 함수들
 * ========================================
 * 참고: Google Apps Script는 HWP 형식을 직접 지원하지 않습니다.
 * 대안으로 Google Docs를 사용하거나, HWP를 다른 형식으로 변환해야 합니다.
 */

/**
 * HWP 파일을 Google Drive에서 불러와 텍스트 내용을 읽습니다.
 * HWP 파일을 Google Docs로 변환하여 내용을 읽습니다.
 * @param {string} fileId - Google Drive의 HWP 파일 ID
 * @returns {string} - 파일의 텍스트 내용
 */
function readHwpFile(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);

    // HWP 파일을 Google Docs로 변환 시도
    const blob = file.getBlob();
    const resource = {
      title: file.getName(),
      mimeType: MimeType.GOOGLE_DOCS
    };

    // Google Docs로 변환
    const doc = Drive.Files.insert(resource, blob, {convert: true});
    const document = DocumentApp.openById(doc.id);
    const text = document.getBody().getText();

    Logger.log('HWP 파일 읽기 완료');
    return text;

  } catch (error) {
    Logger.log('HWP 파일 읽기 오류: ' + error.message);
    // HWP 변환이 실패하면 원본 바이너리를 텍스트로 읽기 시도
    try {
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();
      return blob.getDataAsString();
    } catch (e) {
      throw new Error('HWP 파일을 읽을 수 없습니다: ' + error.message);
    }
  }
}

/**
 * HWP 파일 이름으로 검색하여 읽습니다.
 * @param {string} fileName - 검색할 HWP 파일 이름
 * @returns {string} - 파일의 텍스트 내용
 */
function readHwpFileByName(fileName) {
  try {
    const files = DriveApp.getFilesByName(fileName);

    if (files.hasNext()) {
      const file = files.next();
      return readHwpFile(file.getId());
    } else {
      throw new Error('파일을 찾을 수 없습니다: ' + fileName);
    }
  } catch (error) {
    Logger.log('파일 검색 오류: ' + error.message);
    throw error;
  }
}

/**
 * Google Docs 문서의 내용을 수정합니다.
 * (HWP 대신 Google Docs 사용)
 * @param {string} fileId - Google Docs 파일 ID
 * @param {string} newContent - 새로운 텍스트 내용
 * @returns {boolean} - 성공 여부
 */
function modifyHwpFile(fileId, newContent) {
  try {
    const document = DocumentApp.openById(fileId);
    const body = document.getBody();

    // 기존 내용 지우기
    body.clear();

    // 새 내용 쓰기
    body.appendParagraph(newContent);

    Logger.log('문서 수정 완료');
    return true;

  } catch (error) {
    Logger.log('문서 수정 오류: ' + error.message);
    throw new Error('문서를 수정할 수 없습니다: ' + error.message);
  }
}

/**
 * 새로운 Google Docs 문서를 생성합니다.
 * (HWP 대신 Google Docs 사용)
 * @param {string} fileName - 새 파일 이름
 * @param {string} content - 파일 내용
 * @param {string} folderId - (선택사항) 저장할 폴더 ID
 * @returns {string} - 생성된 문서의 ID
 */
function createHwpFile(fileName, content, folderId) {
  try {
    // 새 Google Docs 생성
    const document = DocumentApp.create(fileName);
    const body = document.getBody();
    body.appendParagraph(content);

    // 폴더로 이동 (지정된 경우)
    if (folderId) {
      const file = DriveApp.getFileById(document.getId());
      const folder = DriveApp.getFolderById(folderId);
      file.moveTo(folder);
    }

    Logger.log('새 문서 생성 완료: ' + document.getId());
    return document.getId();

  } catch (error) {
    Logger.log('문서 생성 오류: ' + error.message);
    throw new Error('문서를 생성할 수 없습니다: ' + error.message);
  }
}

/**
 * Google Docs를 HWP와 유사한 형식으로 내보냅니다.
 * (PDF, DOCX 등으로 변환 가능)
 * @param {string} fileId - Google Docs 파일 ID
 * @param {string} format - 'pdf', 'docx', 'txt' 중 선택
 * @param {string} folderId - (선택사항) 저장할 폴더 ID
 * @returns {string} - 내보낸 파일의 ID
 */
function exportDocument(fileId, format, folderId) {
  try {
    const document = DocumentApp.openById(fileId);
    let mimeType;

    switch(format.toLowerCase()) {
      case 'pdf':
        mimeType = MimeType.PDF;
        break;
      case 'docx':
        mimeType = MimeType.MICROSOFT_WORD;
        break;
      case 'txt':
        mimeType = MimeType.PLAIN_TEXT;
        break;
      default:
        mimeType = MimeType.PDF;
    }

    const blob = document.getAs(mimeType);
    const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    const file = folder.createFile(blob);

    Logger.log('문서 내보내기 완료: ' + file.getId());
    return file.getId();

  } catch (error) {
    Logger.log('문서 내보내기 오류: ' + error.message);
    throw new Error('문서를 내보낼 수 없습니다: ' + error.message);
  }
}

/**
 * ========================================
 * 사용 예제 함수들
 * ========================================
 */

/**
 * Excel 파일 처리 예제
 */
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

/**
 * HWP 파일(Google Docs) 처리 예제
 */
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
