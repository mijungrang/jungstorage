/**
 * Vercel Serverless Function
 * 인천시보 웹 스크래핑 API
 *
 * 엔드포인트: /api/gazette
 * 메서드: GET
 * 응답: JSON 배열 [{number, title, date, link}, ...]
 */

const axios = require('axios');
const cheerio = require('cheerio');

// 캐시 (간단한 메모리 캐시)
let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 60 * 60 * 1000; // 1시간

/**
 * Vercel Serverless Function 핸들러
 */
module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 캐시 확인
    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      console.log('캐시에서 데이터 반환');
      return res.status(200).json({
        success: true,
        cached: true,
        data: cache.data
      });
    }

    console.log('웹 스크래핑 시작');

    // 인천시보 페이지 스크래핑
    const data = await scrapeIncheonGazette();

    // 캐시 저장
    cache.data = data;
    cache.timestamp = now;

    return res.status(200).json({
      success: true,
      cached: false,
      data: data
    });

  } catch (error) {
    console.error('스크래핑 오류:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 인천시보 웹페이지를 스크래핑합니다.
 */
async function scrapeIncheonGazette() {
  const url = 'https://www.incheon.go.kr/IC010303';

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      'Referer': 'https://www.incheon.go.kr/',
      'Connection': 'keep-alive'
    },
    timeout: 10000 // 10초 타임아웃
  });

  const html = response.data;
  const $ = cheerio.load(html);

  const items = [];

  // tbody 내의 tr 태그들을 순회
  $('tbody tr').each((index, element) => {
    const $row = $(element);
    const $cells = $row.find('td');

    if ($cells.length >= 3) {
      const $link = $cells.eq(1).find('a');

      let link = $link.attr('href') || '';

      // 상대 경로를 절대 경로로 변환
      if (link && !link.startsWith('http')) {
        if (link.startsWith('/')) {
          link = 'https://www.incheon.go.kr' + link;
        } else {
          link = 'https://www.incheon.go.kr/' + link;
        }
      }

      const item = {
        number: $cells.eq(0).text().trim(),
        title: $cells.eq(1).text().trim(),
        date: $cells.eq(2).text().trim() || $cells.eq(3).text().trim(),
        link: link
      };

      // 제목이 있는 항목만 추가
      if (item.title && item.title.length > 0) {
        items.push(item);
      }
    }
  });

  console.log(`파싱된 항목 수: ${items.length}`);

  if (items.length === 0) {
    throw new Error('파싱된 데이터가 없습니다. HTML 구조를 확인해주세요.');
  }

  return items;
}

// 로컬 테스트용
if (require.main === module) {
  scrapeIncheonGazette()
    .then(data => {
      console.log('성공:', JSON.stringify(data, null, 2));
    })
    .catch(error => {
      console.error('오류:', error.message);
    });
}
