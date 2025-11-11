/**
 * 웹 앱의 기본 GET 요청을 처리하여 index.html을 사용자에게 보여줍니다.
 *
 * 이 버전은 외부 API 서버를 사용합니다.
 * Google Apps Script에서 직접 스크래핑이 실패할 경우 이 코드를 사용하세요.
 *
 * @param {object} e - 이벤트 객체
 * @returns {HtmlOutput} - 렌더링된 HTML 페이지
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('인천시보')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * 외부 API 서버에서 인천시보 데이터를 가져옵니다.
 *
 * 설정 방법:
 * 1. external-server 폴더를 Vercel에 배포
 * 2. 아래 API_URL을 배포된 URL로 변경
 *
 * @returns {Array} - 시보 데이터 배열 또는 오류 객체
 */
function fetchGazetteData() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'INCHEON_GAZETTE_CACHE';

  // ⚠️ 중요: 여기에 Vercel 배포 URL을 입력하세요
  const API_URL = 'https://your-project.vercel.app/api/gazette';

  try {
    // 캐시에서 데이터 조회
    const cachedData = cache.get(cacheKey);

    if (cachedData != null) {
      Logger.log('캐시에서 데이터를 반환합니다.');
      return JSON.parse(cachedData);
    }

    Logger.log('외부 API 호출: ' + API_URL);

    // 외부 API 서버 호출
    const response = UrlFetchApp.fetch(API_URL, {
      method: 'GET',
      muteHttpExceptions: true,
      headers: {
        'Accept': 'application/json'
      }
    });

    const responseCode = response.getResponseCode();
    Logger.log('API 응답 코드: ' + responseCode);

    if (responseCode !== 200) {
      throw new Error('API 요청 실패: HTTP ' + responseCode);
    }

    const result = JSON.parse(response.getContentText());
    Logger.log('API 응답: ' + JSON.stringify(result));

    if (!result.success) {
      throw new Error(result.error || 'API 오류');
    }

    const gazetteData = result.data;

    // 데이터가 정상적으로 수집된 경우에만 캐시에 저장 (1시간)
    if (Array.isArray(gazetteData) && gazetteData.length > 0) {
      cache.put(cacheKey, JSON.stringify(gazetteData), 3600);
      Logger.log('새로운 데이터를 캐시에 저장했습니다. (항목 수: ' + gazetteData.length + ')');
    } else {
      Logger.log('경고: 데이터가 비어있습니다.');
    }

    return gazetteData;

  } catch (error) {
    Logger.log('데이터를 가져오는 중 오류 발생: ' + error.message);
    return { error: 'API 서버 오류: ' + error.message };
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

/**
 * API 연결 테스트 함수
 *
 * 실행 방법:
 * 1. Apps Script 편집기에서 이 함수 선택
 * 2. 실행 버튼 클릭
 * 3. 실행 로그 확인
 */
function testAPIConnection() {
  Logger.log('=== API 연결 테스트 시작 ===');

  // 캐시 삭제
  clearCache();

  // 데이터 가져오기
  const data = fetchGazetteData();

  if (data && data.error) {
    Logger.log('❌ 오류: ' + data.error);
    Logger.log('해결 방법:');
    Logger.log('1. code-external-api.gs 파일의 API_URL을 확인하세요');
    Logger.log('2. Vercel 서버가 정상 배포되었는지 확인하세요');
    Logger.log('3. 브라우저에서 API URL을 직접 열어 응답을 확인하세요');
  } else if (Array.isArray(data) && data.length > 0) {
    Logger.log('✅ 성공! 데이터 수신됨');
    Logger.log('항목 수: ' + data.length);
    Logger.log('첫 번째 항목:');
    Logger.log(JSON.stringify(data[0], null, 2));
  } else {
    Logger.log('⚠️ 데이터가 비어있습니다.');
  }

  Logger.log('=== 테스트 완료 ===');
}
