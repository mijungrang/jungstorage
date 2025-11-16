/**
 * 인천시보 크롤링 및 Google Sheets 저장 스크립트 (개선 버전)
 *
 * 사용 방법:
 * 1. Google Sheets에서 확장 프로그램 > Apps Script로 이동
 * 2. 이 코드를 복사하여 붙여넣기
 * 3. testConnection() 함수로 먼저 연결 테스트
 * 4. crawlIncheonGazette() 함수 실행
 */

/**
 * 연결 테스트 함수 - 먼저 이것을 실행하세요!
 */
function testConnection() {
  Logger.log('=== 연결 테스트 시작 ===');

  const testUrls = [
    'https://www.incheon.go.kr/IC010303',
    'https://www.incheon.go.kr/IC010303?page=1',
    'http://www.incheon.go.kr/IC010303'  // HTTP로도 시도
  ];

  for (let url of testUrls) {
    Logger.log(`\n테스트 URL: ${url}`);

    try {
      const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: false,  // SSL 인증서 검증 비활성화
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Connection': 'keep-alive',
        }
      });

      const code = response.getResponseCode();
      Logger.log(`응답 코드: ${code}`);
      Logger.log(`최종 URL: ${response.getHeaders()['Location'] || url}`);

      if (code === 200) {
        const content = response.getContentText();
        Logger.log(`내용 길이: ${content.length} 문자`);
        Logger.log(`처음 500자:\n${content.substring(0, 500)}`);

        // 시트에 HTML 저장 (디버깅용)
        saveDebugHtml(content);

        SpreadsheetApp.getUi().alert(
          '연결 성공!',
          `URL에 성공적으로 연결되었습니다.\n응답 코드: ${code}\n내용 길이: ${content.length} 문자\n\n"디버그_HTML" 시트에 내용을 저장했습니다.`,
          SpreadsheetApp.getUi().ButtonSet.OK
        );
        return;
      } else {
        Logger.log(`실패: HTTP ${code}`);
        Logger.log(`응답 내용: ${response.getContentText().substring(0, 200)}`);
      }

    } catch (error) {
      Logger.log(`오류 발생: ${error.message}`);
      Logger.log(`오류 스택: ${error.stack}`);
    }
  }

  SpreadsheetApp.getUi().alert(
    '연결 실패',
    '모든 URL 시도가 실패했습니다.\n실행 로그를 확인하세요.\n\n가능한 원인:\n1. 웹사이트가 Google 서버 차단\n2. 네트워크 문제\n3. URL 변경\n\n대체 방법을 사용하세요.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * HTML을 디버그 시트에 저장
 */
function saveDebugHtml(html) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('디버그_HTML');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('디버그_HTML');
  } else {
    sheet.clear();
  }

  // HTML을 텍스트로 저장
  sheet.getRange('A1').setValue('HTML 내용:');
  sheet.getRange('A2').setValue(html.substring(0, 50000)); // 최대 50,000자

  Logger.log('HTML을 "디버그_HTML" 시트에 저장했습니다.');
}

/**
 * 인천시보 페이지를 크롤링하여 Google Sheets에 저장합니다.
 * @param {number} startPage - 시작 페이지 (기본값: 1)
 * @param {number} endPage - 끝 페이지 (기본값: 5)
 */
function crawlIncheonGazette(startPage = 1, endPage = 5) {
  Logger.log('인천시보 크롤링 시작...');

  // 활성 스프레드시트 가져오기
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // 새 시트 생성 또는 기존 시트 가져오기
  let sheet = spreadsheet.getSheetByName('인천시보');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('인천시보');
  } else {
    sheet.clear();
  }

  // 헤더 작성
  const headers = [
    '번호', '제목', '일자', '조회수', '상세URL', '시보번호',
    '조례1', '조례2', '조례3', '조례4', '조례5',
    '공고1', '공고2', '공고3', '공고4', '공고5',
    '기타1', '기타2', '기타3', '기타4', '기타5',
    'PDF링크'
  ];
  sheet.appendRow(headers);

  // 헤더 스타일 설정
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4CAF50');
  headerRange.setFontColor('#FFFFFF');

  let totalItems = 0;
  let errorCount = 0;

  // 각 페이지 크롤링
  for (let page = startPage; page <= endPage; page++) {
    Logger.log(`페이지 ${page} 크롤링 중...`);

    try {
      const items = fetchListPage(page);
      Logger.log(`페이지 ${page}: ${items.length}개 항목 발견`);

      if (items.length === 0) {
        errorCount++;
        if (errorCount >= 2) {
          Logger.log('연속 2회 실패. 크롤링 중단.');
          break;
        }
        continue;
      }

      // 각 항목의 상세 정보 가져오기
      for (let i = 0; i < items.length; i++) {
        let item = items[i];

        try {
          Logger.log(`  항목 ${i+1}/${items.length}: ${item.title}`);

          // 상세 페이지 가져오기 (선택적)
          if (item.detailUrl) {
            const detail = fetchDetailPage(item.detailUrl);
            Object.assign(item, detail);
          }

          // 시트에 데이터 추가
          addItemToSheet(sheet, item);
          totalItems++;

          // API 제한 방지를 위한 딜레이 (짧게 조정)
          Utilities.sleep(500);

        } catch (error) {
          Logger.log(`  항목 처리 오류: ${error.message}`);
        }
      }

      // 페이지 간 딜레이
      Utilities.sleep(1000);

    } catch (error) {
      Logger.log(`페이지 ${page} 오류: ${error.message}`);
      errorCount++;
    }
  }

  // 열 너비 자동 조정
  try {
    sheet.autoResizeColumns(1, Math.min(headers.length, 10));
  } catch (e) {
    Logger.log('열 너비 조정 실패 (무시)');
  }

  Logger.log(`크롤링 완료! 총 ${totalItems}개 항목 수집`);

  // 완료 메시지
  if (totalItems > 0) {
    SpreadsheetApp.getUi().alert(
      '크롤링 완료',
      `총 ${totalItems}개의 인천시보 항목을 수집했습니다.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getUi().alert(
      '크롤링 실패',
      '항목을 수집하지 못했습니다.\n\n먼저 testConnection() 함수를 실행하여\n웹사이트 연결을 테스트하세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * 목록 페이지를 가져옵니다.
 * @param {number} page - 페이지 번호
 * @returns {Array} 시보 항목 배열
 */
function fetchListPage(page) {
  // 여러 URL 형식 시도
  const urls = [
    `https://www.incheon.go.kr/IC010303?page=${page}`,
    `https://www.incheon.go.kr/IC010303?Page=${page}`,
    `https://www.incheon.go.kr/IC010303?pageIndex=${page}`,
    `http://www.incheon.go.kr/IC010303?page=${page}`
  ];

  for (let url of urls) {
    try {
      Logger.log(`  시도: ${url}`);

      const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const code = response.getResponseCode();

      if (code === 200) {
        const html = response.getContentText('UTF-8');

        if (html.length < 100) {
          Logger.log(`  내용이 너무 짧음: ${html.length}자`);
          continue;
        }

        Logger.log(`  성공! 내용: ${html.length}자`);
        return parseListPage(html);
      } else {
        Logger.log(`  HTTP ${code}`);
      }

    } catch (error) {
      Logger.log(`  오류: ${error.message}`);
    }
  }

  Logger.log('  모든 URL 시도 실패');
  return [];
}

/**
 * HTML에서 목록 항목들을 파싱합니다.
 * @param {string} html - HTML 문자열
 * @returns {Array} 파싱된 항목 배열
 */
function parseListPage(html) {
  const items = [];

  try {
    // <tbody> 내의 <tr> 태그 찾기
    const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);

    if (!tbodyMatch) {
      Logger.log('  <tbody> 태그를 찾을 수 없음');

      // 대체: 모든 <tr> 태그 찾기
      const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const trMatches = html.match(trPattern);

      if (!trMatches || trMatches.length === 0) {
        Logger.log('  <tr> 태그도 찾을 수 없음');
        return items;
      }

      Logger.log(`  전체 <tr> 개수: ${trMatches.length}`);

      // 첫 번째는 보통 헤더이므로 건너뜀
      for (let i = 1; i < trMatches.length; i++) {
        const item = parseTableRow(trMatches[i]);
        if (item) {
          items.push(item);
        }
      }

    } else {
      const tbody = tbodyMatch[1];
      const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const trMatches = tbody.match(trPattern);

      if (trMatches) {
        Logger.log(`  <tbody> 내 <tr> 개수: ${trMatches.length}`);

        for (let tr of trMatches) {
          const item = parseTableRow(tr);
          if (item) {
            items.push(item);
          }
        }
      }
    }

  } catch (error) {
    Logger.log(`  목록 파싱 오류: ${error.message}`);
  }

  return items;
}

/**
 * 테이블 행을 파싱합니다.
 * @param {string} tr - <tr> HTML 문자열
 * @returns {Object} 파싱된 항목 또는 null
 */
function parseTableRow(tr) {
  try {
    // <td> 태그 추출
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tdMatches = tr.match(tdPattern);

    if (!tdMatches || tdMatches.length < 2) {
      return null;
    }

    const item = {};

    // 번호 (첫 번째 td)
    if (tdMatches[0]) {
      item.number = extractText(tdMatches[0]);
    }

    // 제목과 링크 (두 번째 td 또는 적절한 위치)
    for (let i = 1; i < tdMatches.length; i++) {
      const td = tdMatches[i];

      // 링크가 있는 td 찾기
      const linkMatch = td.match(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);

      if (linkMatch) {
        let href = linkMatch[1];
        item.title = extractText(linkMatch[2]);

        // 상대 경로를 절대 경로로 변환
        if (href.startsWith('/')) {
          item.detailUrl = 'https://www.incheon.go.kr' + href;
        } else if (href.startsWith('http')) {
          item.detailUrl = href;
        } else if (href.startsWith('javascript') || href === '#') {
          item.detailUrl = '';
        } else {
          item.detailUrl = 'https://www.incheon.go.kr/' + href;
        }
        break;
      }
    }

    // 제목이 없으면 무시
    if (!item.title) {
      return null;
    }

    // 일자 및 조회수 (위치에 따라 다름)
    if (tdMatches.length >= 3) {
      item.date = extractText(tdMatches[2]);
    }

    if (tdMatches.length >= 4) {
      item.views = extractText(tdMatches[3]);
    }

    return item;

  } catch (error) {
    Logger.log(`  행 파싱 오류: ${error.message}`);
    return null;
  }
}

/**
 * 상세 페이지를 가져옵니다.
 * @param {string} url - 상세 페이지 URL
 * @returns {Object} 상세 정보
 */
function fetchDetailPage(url) {
  const detail = {
    gazetteNumber: '',
    ordinances: [],
    announcements: [],
    others: [],
    pdfLinks: []
  };

  if (!url || url === '') {
    return detail;
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (response.getResponseCode() !== 200) {
      return detail;
    }

    const html = response.getContentText('UTF-8');
    return parseDetailPage(html);

  } catch (error) {
    Logger.log(`  상세 페이지 오류: ${error.message}`);
    return detail;
  }
}

/**
 * 상세 페이지 HTML을 파싱합니다.
 * @param {string} html - HTML 문자열
 * @returns {Object} 파싱된 상세 정보
 */
function parseDetailPage(html) {
  const detail = {
    gazetteNumber: '',
    ordinances: [],
    announcements: [],
    others: [],
    pdfLinks: []
  };

  try {
    // 시보 번호 추출
    const numberMatch = html.match(/시보\s*제(\d+)호/);
    if (numberMatch) {
      detail.gazetteNumber = `제${numberMatch[1]}호`;
    }

    // 본문 내용 추출
    let content = html;

    // view-content 클래스 찾기
    const contentMatch = html.match(/<div[^>]*class=["'][^"']*view-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (contentMatch) {
      content = contentMatch[1];
    }

    // HTML 태그 제거하고 텍스트만 추출
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    content = content.replace(/<br\s*\/?>/gi, '\n');
    content = content.replace(/<\/p>/gi, '\n');
    content = content.replace(/<\/div>/gi, '\n');
    content = content.replace(/<[^>]+>/g, ' ');
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&amp;/g, '&');

    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // 섹션별로 내용 분류
    let currentSection = null;

    for (let line of lines) {
      // 섹션 제목 확인
      if (line.match(/<\s*조례\s*>/) || (line.includes('조례') && line.startsWith('<'))) {
        currentSection = 'ordinances';
        continue;
      } else if (line.match(/<\s*공고\s*>/) || (line.includes('공고') && line.startsWith('<'))) {
        currentSection = 'announcements';
        continue;
      } else if (line.match(/<\s*기타\s*>/) || (line.includes('기타') && line.startsWith('<'))) {
        currentSection = 'others';
        continue;
      }

      // 현재 섹션에 내용 추가 (최대 5줄)
      if (currentSection && detail[currentSection].length < 5) {
        if (line.length > 5) {  // 너무 짧은 줄은 제외
          detail[currentSection].push(line);
        }
      }
    }

    // PDF 링크 추출
    const pdfPattern = /<a[^>]*href=["']([^"']*\.pdf[^"']*)["'][^>]*>/gi;
    let pdfMatch;

    while ((pdfMatch = pdfPattern.exec(html)) !== null) {
      let pdfUrl = pdfMatch[1];

      // 상대 경로를 절대 경로로 변환
      if (pdfUrl.startsWith('/')) {
        pdfUrl = 'https://www.incheon.go.kr' + pdfUrl;
      } else if (!pdfUrl.startsWith('http')) {
        pdfUrl = 'https://www.incheon.go.kr/' + pdfUrl;
      }

      detail.pdfLinks.push(pdfUrl);
    }

  } catch (error) {
    Logger.log(`  상세 페이지 파싱 오류: ${error.message}`);
  }

  return detail;
}

/**
 * HTML에서 텍스트만 추출합니다.
 * @param {string} html - HTML 문자열
 * @returns {string} 텍스트
 */
function extractText(html) {
  let text = html.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  return text.trim();
}

/**
 * 항목을 시트에 추가합니다.
 * @param {Sheet} sheet - Google Sheets 시트
 * @param {Object} item - 항목 데이터
 */
function addItemToSheet(sheet, item) {
  const row = [
    item.number || '',
    item.title || '',
    item.date || '',
    item.views || '',
    item.detailUrl || '',
    item.gazetteNumber || '',
  ];

  // 조례 5줄
  const ordinances = item.ordinances || [];
  for (let i = 0; i < 5; i++) {
    row.push(ordinances[i] || '');
  }

  // 공고 5줄
  const announcements = item.announcements || [];
  for (let i = 0; i < 5; i++) {
    row.push(announcements[i] || '');
  }

  // 기타 5줄
  const others = item.others || [];
  for (let i = 0; i < 5; i++) {
    row.push(others[i] || '');
  }

  // PDF 링크
  const pdfLinks = item.pdfLinks || [];
  row.push(pdfLinks.join(', '));

  sheet.appendRow(row);
}

/**
 * 메뉴에 커스텀 메뉴 추가
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('인천시보 크롤링')
    .addItem('🔍 연결 테스트 (먼저 실행)', 'testConnection')
    .addSeparator()
    .addItem('📥 1~5페이지 크롤링', 'crawlIncheonGazette')
    .addItem('📥 1~3페이지 크롤링 (테스트)', 'testCrawl')
    .addItem('📥 전체 페이지 크롤링 (1~10페이지)', 'crawlAll')
    .addToUi();
}

/**
 * 전체 페이지 크롤링 (1~10페이지)
 */
function crawlAll() {
  crawlIncheonGazette(1, 10);
}

/**
 * 테스트 함수 - 1~3페이지만 크롤링
 */
function testCrawl() {
  crawlIncheonGazette(1, 3);
}
