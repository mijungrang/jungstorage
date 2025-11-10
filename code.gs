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

    // 인천시 Open API 엔드포인트 (XML 응답)
    const apiBaseUrl = 'http://www.incheon.go.kr/dp/openapi/data';
    const newsUrl = `${apiBaseUrl}?apicode=11&key=${newsApiKey}&page=1`;
    const jobsUrl = `${apiBaseUrl}?apicode=13&key=${jobsApiKey}&page=1`;

    Logger.log(`새소식 URL 호출: ${newsUrl}`);
    Logger.log(`일자리 URL 호출: ${jobsUrl}`);

    const responses = UrlFetchApp.fetchAll([
      { url: newsUrl, muteHttpExceptions: true },
      { url: jobsUrl, muteHttpExceptions: true }
    ]);

    const newsResponse = responses[0];
    const jobsResponse = responses[1];

    const newsData = processXmlResponse(newsResponse, 'news');
    const jobsData = processXmlResponse(jobsResponse, 'jobs');

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
 * UrlFetchApp 응답을 처리하고 XML을 파싱하는 도우미 함수입니다.
 * @param {UrlFetchApp.HTTPResponse} response - API 응답 객체
 * @param {string} apiType - API 타입 ('news' 또는 'jobs')
 * @returns {Array|object} - 파싱된 데이터 배열 또는 오류 객체
 */
function processXmlResponse(response, apiType) {
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  Logger.log(`[${apiType}] API 응답 코드: ${responseCode}`);
  Logger.log(`[${apiType}] API 원본 응답 (처음 500자): ${responseText.substring(0, 500)}`);

  if (responseCode !== 200) {
    Logger.log(`${apiType} API 요청 실패. 코드: ${responseCode}`);
    return { error: `[${apiType}] API 요청 실패 (HTTP ${responseCode})` };
  }

  try {
    // XML 파싱
    const document = XmlService.parse(responseText);
    const root = document.getRootElement();

    // 에러 체크
    const errorElement = root.getChild('error');
    if (errorElement) {
      const errorCode = errorElement.getChildText('code');
      const errorMessage = errorElement.getChildText('message');
      Logger.log(`${apiType} API 오류: ${errorCode} - ${errorMessage}`);
      return { error: `[${apiType}] API 오류: ${errorMessage} (코드: ${errorCode})` };
    }

    // item 요소들 가져오기
    const items = root.getChildren('item');

    if (!items || items.length === 0) {
      Logger.log(`${apiType} 데이터가 비어있습니다.`);
      return [];
    }

    Logger.log(`${apiType} ${items.length}개의 항목을 찾았습니다.`);

    // 타입에 따라 다르게 파싱
    if (apiType === 'news') {
      return parseNewsItems(items);
    } else if (apiType === 'jobs') {
      return parseJobItems(items);
    } else {
      return [];
    }

  } catch (e) {
    Logger.log(`${apiType} XML 파싱 오류: ${e.message}`);
    return { error: `[${apiType}] 응답 파싱 실패: ${e.message}` };
  }
}

/**
 * 새소식 XML 아이템을 파싱합니다.
 * @param {Array} items - XML item 요소 배열
 * @returns {Array} - 파싱된 새소식 데이터 배열
 */
function parseNewsItems(items) {
  return items.map(function(item) {
    return {
      title: getChildText(item, 'sj') || '제목 없음',
      content: getChildText(item, 'cn') || '',
      summary: getChildText(item, 'summary') || '',
      date: getChildText(item, 'writngDe') || '',
      category: getChildText(item, 'realm') || '일반',
      department: getChildText(item, 'nttDept') || '',
      listNum: getChildText(item, 'listNum') || ''
    };
  });
}

/**
 * 일자리 XML 아이템을 파싱합니다.
 * @param {Array} items - XML item 요소 배열
 * @returns {Array} - 파싱된 일자리 데이터 배열
 */
function parseJobItems(items) {
  return items.map(function(item) {
    const rceptBegin = getChildText(item, 'rceptBeginDte') || '';
    const rceptEnd = getChildText(item, 'rceptEndDte') || '';
    const period = (rceptBegin && rceptEnd) ? `${rceptBegin} ~ ${rceptEnd}` : '';

    return {
      title: getChildText(item, 'sj') || '제목 없음',
      position: getChildText(item, 'rcritJssfc') || '',
      numOfRecruits: getChildText(item, 'rcritNmpr') || '',
      duties: getChildText(item, 'dtyCn') || '',
      employmentType: getChildText(item, 'emplymStle') || '',
      wage: getChildText(item, 'wageCnd') || '',
      career: getChildText(item, 'careerCnd') || '',
      education: getChildText(item, 'acdmcr') || '',
      receptionMethod: getChildText(item, 'rceptMth') || '',
      period: period,
      startDate: rceptBegin,
      endDate: rceptEnd,
      date: getChildText(item, 'writngDe') || '',
      notice: getChildText(item, 'noticeAt') || 'N',
      listNum: getChildText(item, 'listNum') || ''
    };
  });
}

/**
 * XML 요소에서 자식 텍스트를 안전하게 가져옵니다.
 * @param {Element} element - XML 요소
 * @param {string} childName - 자식 요소 이름
 * @returns {string} - 텍스트 값 또는 빈 문자열
 */
function getChildText(element, childName) {
  try {
    const child = element.getChild(childName);
    return child ? child.getText().trim() : '';
  } catch (e) {
    return '';
  }
}
