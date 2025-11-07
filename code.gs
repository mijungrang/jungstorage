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
