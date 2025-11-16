/**
 * 인천시보 크롤링 및 Google Sheets 저장 스크립트
 *
 * 사용 방법:
 * 1. Google Sheets에서 도구 > 스크립트 편집기로 이동
 * 2. 이 코드를 복사하여 붙여넣기
 * 3. crawlIncheonGazette() 함수 실행
 */

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
    sheet.clear(); // 기존 데이터 삭제
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

  // 각 페이지 크롤링
  for (let page = startPage; page <= endPage; page++) {
    Logger.log(`페이지 ${page} 크롤링 중...`);

    try {
      const items = fetchListPage(page);
      Logger.log(`페이지 ${page}: ${items.length}개 항목 발견`);

      // 각 항목의 상세 정보 가져오기
      for (let item of items) {
        try {
          // 상세 페이지 가져오기
          if (item.detailUrl) {
            const detail = fetchDetailPage(item.detailUrl);
            Object.assign(item, detail);
          }

          // 시트에 데이터 추가
          addItemToSheet(sheet, item);
          totalItems++;

          // API 제한 방지를 위한 딜레이
          Utilities.sleep(1000);

        } catch (error) {
          Logger.log(`항목 처리 오류: ${error}`);
        }
      }

      // 페이지 간 딜레이
      Utilities.sleep(2000);

    } catch (error) {
      Logger.log(`페이지 ${page} 오류: ${error}`);
    }
  }

  // 열 너비 자동 조정
  sheet.autoResizeColumns(1, headers.length);

  Logger.log(`크롤링 완료! 총 ${totalItems}개 항목 수집`);

  // 완료 메시지
  SpreadsheetApp.getUi().alert(
    '크롤링 완료',
    `총 ${totalItems}개의 인천시보 항목을 수집했습니다.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 목록 페이지를 가져옵니다.
 * @param {number} page - 페이지 번호
 * @returns {Array} 시보 항목 배열
 */
function fetchListPage(page) {
  const baseUrl = 'https://www.incheon.go.kr/IC010303';
  const url = `${baseUrl}?page=${page}`;

  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      }
    });

    if (response.getResponseCode() !== 200) {
      Logger.log(`HTTP ${response.getResponseCode()}: ${url}`);
      return [];
    }

    const html = response.getContentText('UTF-8');
    return parseListPage(html);

  } catch (error) {
    Logger.log(`페이지 가져오기 실패: ${error}`);
    return [];
  }
}

/**
 * HTML에서 목록 항목들을 파싱합니다.
 * @param {string} html - HTML 문자열
 * @returns {Array} 파싱된 항목 배열
 */
function parseListPage(html) {
  const items = [];

  try {
    // 테이블 행 추출 (정규식 사용)
    // 실제 HTML 구조에 따라 수정 필요

    // <tr> 태그 찾기
    const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const trMatches = html.match(trPattern);

    if (!trMatches) {
      Logger.log('테이블 행을 찾을 수 없습니다.');
      return items;
    }

    // 첫 번째 행(헤더)은 건너뛰고 데이터 행만 처리
    for (let i = 1; i < trMatches.length; i++) {
      const tr = trMatches[i];

      // <td> 태그 추출
      const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const tdMatches = tr.match(tdPattern);

      if (!tdMatches || tdMatches.length < 3) {
        continue;
      }

      const item = {};

      // 번호 (첫 번째 td)
      item.number = extractText(tdMatches[0]);

      // 제목과 링크 (두 번째 td)
      const titleTd = tdMatches[1];
      const linkMatch = titleTd.match(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);

      if (linkMatch) {
        let href = linkMatch[1];
        item.title = extractText(linkMatch[2]);

        // 상대 경로를 절대 경로로 변환
        if (href.startsWith('/')) {
          item.detailUrl = 'https://www.incheon.go.kr' + href;
        } else if (href.startsWith('http')) {
          item.detailUrl = href;
        } else {
          item.detailUrl = 'https://www.incheon.go.kr/' + href;
        }
      } else {
        item.title = extractText(titleTd);
        item.detailUrl = '';
      }

      // 일자 (세 번째 td)
      if (tdMatches[2]) {
        item.date = extractText(tdMatches[2]);
      }

      // 조회수 (네 번째 td, 있는 경우)
      if (tdMatches[3]) {
        item.views = extractText(tdMatches[3]);
      }

      items.push(item);
    }

  } catch (error) {
    Logger.log(`목록 파싱 오류: ${error}`);
  }

  return items;
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

  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
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
    Logger.log(`상세 페이지 오류 (${url}): ${error}`);
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
    // 시보 번호 추출 (예: "시보 제1234호")
    const numberMatch = html.match(/시보\s*제(\d+)호/);
    if (numberMatch) {
      detail.gazetteNumber = `제${numberMatch[1]}호`;
    }

    // 본문 내용 추출
    const contentMatch = html.match(/<div[^>]*class=["'][^"']*view-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    let content = contentMatch ? contentMatch[1] : html;

    // HTML 태그 제거하고 텍스트만 추출
    content = content.replace(/<[^>]+>/g, '\n');
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
      if (line.includes('<조례>') || (line.includes('조례') && line.startsWith('<'))) {
        currentSection = 'ordinances';
        continue;
      } else if (line.includes('<공고>') || (line.includes('공고') && line.startsWith('<'))) {
        currentSection = 'announcements';
        continue;
      } else if (line.includes('<기타>') || (line.includes('기타') && line.startsWith('<'))) {
        currentSection = 'others';
        continue;
      }

      // 현재 섹션에 내용 추가 (최대 5줄)
      if (currentSection) {
        if (detail[currentSection].length < 5) {
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
    Logger.log(`상세 페이지 파싱 오류: ${error}`);
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
    .addItem('1~5페이지 크롤링', 'crawlIncheonGazette')
    .addItem('전체 페이지 크롤링 (1~10페이지)', 'crawlAll')
    .addToUi();
}

/**
 * 전체 페이지 크롤링 (1~10페이지)
 */
function crawlAll() {
  crawlIncheonGazette(1, 10);
}

/**
 * 테스트 함수 - 첫 페이지만 크롤링
 */
function testCrawl() {
  crawlIncheonGazette(1, 1);
}
