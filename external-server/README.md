# 인천시보 스크래핑 API 서버 (Vercel)

Google Apps Script에서 웹 스크래핑이 실패할 경우를 대비한 외부 API 서버입니다.

## 🚀 빠른 시작

### 1. 로컬 테스트

```bash
# 의존성 설치
npm install

# 로컬에서 테스트
node api/gazette.js
```

### 2. Vercel에 배포

#### A. Vercel CLI 사용

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

#### B. Vercel 웹 대시보드 사용

1. [Vercel](https://vercel.com) 가입 (GitHub 연동)
2. **New Project** 클릭
3. GitHub 저장소 연결
4. `external-server` 폴더를 Root Directory로 설정
5. **Deploy** 클릭

### 3. 배포된 API 사용

배포 후 받은 URL:
```
https://your-project.vercel.app/api/gazette
```

## 📡 API 사용법

### 엔드포인트

```
GET /api/gazette
```

### 응답 예시

```json
{
  "success": true,
  "cached": false,
  "data": [
    {
      "number": "3526",
      "title": "인천광역시 고시 제2024-123호",
      "date": "2024-01-15",
      "link": "https://www.incheon.go.kr/IC010303/view?id=12345"
    },
    {
      "number": "3525",
      "title": "인천광역시 공고 제2024-122호",
      "date": "2024-01-14",
      "link": "https://www.incheon.go.kr/IC010303/view?id=12344"
    }
  ]
}
```

### 오류 응답

```json
{
  "success": false,
  "error": "스크래핑 실패: HTTP 403"
}
```

## 🔧 Google Apps Script에서 사용

배포된 API를 GAS에서 호출:

```javascript
/**
 * 외부 API 서버에서 시보 데이터 가져오기
 */
function fetchGazetteData() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'INCHEON_GAZETTE_CACHE';

  try {
    // 캐시 확인
    const cachedData = cache.get(cacheKey);
    if (cachedData != null) {
      Logger.log('캐시에서 데이터 반환');
      return JSON.parse(cachedData);
    }

    // 외부 API 호출
    const apiUrl = 'https://your-project.vercel.app/api/gazette';
    const response = UrlFetchApp.fetch(apiUrl);
    const result = JSON.parse(response.getContentText());

    if (result.success) {
      const data = result.data;

      // 캐시 저장 (1시간)
      cache.put(cacheKey, JSON.stringify(data), 3600);

      return data;
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    Logger.log('API 호출 오류: ' + error.message);
    return { error: 'API 호출 실패: ' + error.message };
  }
}
```

## ⚙️ 기능

- ✅ Cheerio를 사용한 빠른 HTML 파싱
- ✅ 1시간 메모리 캐싱
- ✅ CORS 지원 (모든 도메인 허용)
- ✅ 에러 핸들링
- ✅ 로컬 테스트 가능

## 📂 파일 구조

```
external-server/
├── api/
│   └── gazette.js       # Vercel Serverless Function
├── package.json         # 의존성 설정
├── vercel.json         # Vercel 설정
└── README.md           # 사용 설명서
```

## 🌐 Vercel 무료 제한

- 월 100GB 대역폭
- 월 100시간 실행 시간
- 10초 최대 실행 시간 (Hobby 플랜)
- 충분히 개인 프로젝트에 사용 가능

## 🔍 디버깅

### Vercel 로그 확인

```bash
vercel logs
```

또는 Vercel 대시보드 > Deployments > Logs

### 로컬 디버깅

```bash
# API 테스트
node api/gazette.js

# 성공 시 JSON 데이터 출력
```

## 🚨 문제 해결

### 403 오류
- User-Agent 변경
- IP 차단 확인
- 프록시 서비스 고려

### 파싱 오류
- HTML 구조 변경 확인
- Cheerio 선택자 수정

### 타임아웃
- axios timeout 증가
- Vercel 최대 실행 시간 확인 (Pro 플랜 필요)

## 📝 대안: Puppeteer 사용

JavaScript로 렌더링되는 페이지의 경우:

```bash
npm install puppeteer-core chrome-aws-lambda
```

`api/gazette.js` 수정 필요 (별도 가이드 참조)

## 💡 팁

1. **캐싱 활용**: 불필요한 요청 최소화
2. **모니터링**: Vercel Analytics 활성화
3. **환경 변수**: API 키 등은 Vercel 환경 변수로 관리
4. **Rate Limiting**: 필요시 추가 구현

## 📞 도움말

문제가 있거나 개선 사항이 있으면 이슈를 등록해주세요.
