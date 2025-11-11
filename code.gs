/**
 * 웹 앱의 기본 GET 요청을 처리하여 index.html을 사용자에게 보여줍니다.
 * @param {object} e - 이벤트 객체
 * @returns {HtmlOutput} - 렌더링된 HTML 페이지
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('인천시보')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * 인천시보 데이터를 웹 스크래핑으로 가져오는 서버 측 함수입니다.
 * 1. 캐시에서 데이터를 먼저 확인합니다.
 * 2. 캐시에 데이터가 없거나 만료된 경우에만 웹 스크래핑을 수행합니다.
 * 3. 스크래핑한 데이터를 1시간 동안 캐시에 저장합니다.
 * @returns {Array} - 시보 데이터 배열 또는 오류 객체
 */
function fetchGazetteData() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'INCHEON_GAZETTE_CACHE';

  try {
    // 캐시에서 데이터 조회
    const cachedData = cache.get(cacheKey);

    if (cachedData != null) {
      Logger.log('캐시에서 데이터를 반환합니다.');
      return JSON.parse(cachedData);
    }

    Logger.log('캐시가 비어있습니다. 웹 스크래핑을 시작합니다.');

    // 웹 스크래핑 수행
    const gazetteData = scrapeIncheonGazette();

    // 데이터가 정상적으로 수집된 경우에만 캐시에 저장 (1시간)
    if (Array.isArray(gazetteData) && gazetteData.length > 0) {
      cache.put(cacheKey, JSON.stringify(gazetteData), 3600);
      Logger.log('새로운 데이터를 캐시에 저장했습니다.');
    } else {
      Logger.log('스크래핑 데이터가 비어있어 캐시에 저장하지 않습니다.');
    }

    return gazetteData;

  } catch (error) {
    Logger.log('데이터를 가져오는 중 오류 발생: ' + error.message);
    return { error: '시보 데이터를 가져오지 못했습니다: ' + error.message };
  }
}

/**
 * 인천시보 웹페이지를 스크래핑하여 시보 목록을 추출합니다.
 * @returns {Array} - 시보 항목 배열 [{title, date, link, number}, ...]
 */
function scrapeIncheonGazette() {
  const url = 'https://www.incheon.go.kr/IC010303';

  const options = {
    'headers': {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
    },
    'muteHttpExceptions': true,
    'followRedirects': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    Logger.log('응답 코드: ' + responseCode);

    if (responseCode !== 200) {
      Logger.log('HTTP 오류: ' + responseCode);
      return { error: 'HTTP 오류: ' + responseCode };
    }

    const html = response.getContentText('UTF-8');
    Logger.log('HTML 길이: ' + html.length);

    // HTML 파싱하여 시보 목록 추출
    const gazetteItems = parseGazetteList(html);

    return gazetteItems;

  } catch (error) {
    Logger.log('스크래핑 오류: ' + error.message);
    return { error: '스크래핑 실패: ' + error.message };
  }
}

/**
 * HTML에서 시보 목록을 파싱합니다.
 * 인천시 웹사이트의 게시판 구조에 맞춰 데이터를 추출합니다.
 * @param {string} html - HTML 문자열
 * @returns {Array} - 파싱된 시보 항목 배열
 */
function parseGazetteList(html) {
  const items = [];

  try {
    // 게시판 테이블에서 데이터 추출
    // 일반적인 게시판 구조: <tbody> 안의 <tr> 태그들

    // 방법 1: tbody 내의 tr 태그 추출
    const tbodyRegex = /<tbody[^>]*>([\s\S]*?)<\/tbody>/gi;
    const tbodyMatch = tbodyRegex.exec(html);

    if (tbodyMatch && tbodyMatch[1]) {
      const tbodyContent = tbodyMatch[1];

      // tr 태그들을 추출
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;

      while ((trMatch = trRegex.exec(tbodyContent)) !== null) {
        const trContent = trMatch[1];

        // td 태그들을 추출
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const tds = [];
        let tdMatch;

        while ((tdMatch = tdRegex.exec(trContent)) !== null) {
          tds.push(tdMatch[1]);
        }

        // 일반적으로 게시판 구조: [번호, 제목, 작성자, 날짜, 조회수]
        if (tds.length >= 3) {
          const item = {};

          // 번호 추출 (첫 번째 td)
          const numberText = tds[0].replace(/<[^>]+>/g, '').trim();
          item.number = numberText;

          // 제목과 링크 추출 (두 번째 td에 보통 제목과 링크가 있음)
          const titleTd = tds[1];
          const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i;
          const linkMatch = linkRegex.exec(titleTd);

          if (linkMatch) {
            let link = linkMatch[1];
            let title = linkMatch[2].replace(/<[^>]+>/g, '').trim();

            // 상대 경로를 절대 경로로 변환
            if (link.startsWith('/') || link.startsWith('./')) {
              link = 'https://www.incheon.go.kr' + link.replace('./', '/');
            } else if (!link.startsWith('http')) {
              link = 'https://www.incheon.go.kr/' + link;
            }

            item.title = title;
            item.link = link;
          } else {
            // 링크가 없는 경우 텍스트만 추출
            item.title = titleTd.replace(/<[^>]+>/g, '').trim();
            item.link = '';
          }

          // 날짜 추출 (보통 세 번째 또는 네 번째 td)
          // 날짜 형식 찾기: YYYY-MM-DD 또는 YYYY.MM.DD
          let dateFound = false;
          for (let i = 2; i < tds.length; i++) {
            const dateText = tds[i].replace(/<[^>]+>/g, '').trim();
            const dateRegex = /(\d{4}[-.\s]\d{1,2}[-.\s]\d{1,2})/;
            const dateMatch = dateRegex.exec(dateText);

            if (dateMatch) {
              item.date = dateMatch[1];
              dateFound = true;
              break;
            }
          }

          if (!dateFound) {
            item.date = '';
          }

          // 제목이 있는 경우만 추가
          if (item.title && item.title.length > 0) {
            items.push(item);
          }
        }
      }
    }

    Logger.log('파싱된 항목 수: ' + items.length);

    // 데이터가 없을 경우 샘플 데이터 반환 (디버깅용)
    if (items.length === 0) {
      Logger.log('경고: 파싱된 데이터가 없습니다. HTML 구조를 확인해주세요.');
      return [{
        number: '?',
        title: '데이터를 불러올 수 없습니다. 웹사이트 구조가 변경되었을 수 있습니다.',
        date: '',
        link: url
      }];
    }

    return items;

  } catch (error) {
    Logger.log('파싱 오류: ' + error.message);
    return [{
      number: '!',
      title: '파싱 오류: ' + error.message,
      date: '',
      link: ''
    }];
  }
}

/**
 * 캐시를 수동으로 삭제하는 함수 (테스트용)
 */
function clearCache() {
  const cache = CacheService.getScriptCache();
  cache.remove('INCHEON_GAZETTE_CACHE');
  Logger.log('캐시가 삭제되었습니다.');
}
