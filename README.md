# 인천시보 웹 스크래퍼

인천광역시 공식 시보(https://www.incheon.go.kr/IC010303)를 웹 스크래핑하여 보여주는 Google Apps Script 웹앱입니다.

## 기능

- ✅ 인천시보 자동 스크래핑
- ✅ 시보 번호, 제목, 날짜 표시
- ✅ 원본 링크로 바로가기
- ✅ 1시간 캐싱으로 빠른 로딩
- ✅ 모바일 반응형 디자인
- ✅ 실시간 새로고침 기능

## 설치 방법

### 1. Google Apps Script 프로젝트 생성

1. [Google Apps Script](https://script.google.com) 접속
2. **새 프로젝트** 클릭
3. 프로젝트 이름을 "인천시보 스크래퍼"로 변경

### 2. 코드 추가

#### code.gs 파일
- 기본으로 생성된 `Code.gs` 파일에 이 저장소의 `code.gs` 내용을 복사하여 붙여넣기

#### index.html 파일 추가
1. 좌측 메뉴에서 **파일 > HTML** 클릭
2. 파일명을 `index`로 입력
3. 이 저장소의 `index.html` 내용을 복사하여 붙여넣기

### 3. 웹앱 배포

1. 우측 상단의 **배포 > 새 배포** 클릭
2. **유형 선택 > 웹 앱** 선택
3. 설정:
   - **설명**: 인천시보 스크래퍼 v1
   - **다음 사용자로 실행**: 나
   - **액세스 권한**: 모든 사용자
4. **배포** 클릭
5. 권한 승인 (처음에만 필요)
6. 배포된 **웹앱 URL** 복사

### 4. 웹앱 접속

- 복사한 URL을 브라우저에서 열면 인천시보 목록이 표시됩니다!

## 사용 방법

### 웹앱 사용
- 웹앱 URL을 열면 자동으로 최신 시보 목록을 불러옵니다
- **🔄 새로고침** 버튼을 클릭하여 최신 데이터를 다시 가져올 수 있습니다
- 각 시보 항목을 클릭하면 원본 페이지로 이동합니다

### 캐시 관리
- 데이터는 1시간 동안 캐시됩니다 (빠른 로딩)
- 수동으로 캐시를 삭제하려면:
  1. Apps Script 편집기에서 `clearCache` 함수 선택
  2. 실행 버튼 클릭

### 로그 확인 (디버깅)
1. Apps Script 편집기에서 **실행 > 실행 로그** 확인
2. 스크래핑 결과, 캐시 상태, 오류 등을 확인할 수 있습니다

## 기술 스택

- **Google Apps Script**: 서버리스 백엔드
- **UrlFetchApp**: HTTP 요청 및 웹 스크래핑
- **CacheService**: 데이터 캐싱
- **HTML/CSS/JavaScript**: 프론트엔드 UI

## 파일 구조

```
jungstorage/
├── code.gs                    # 백엔드 로직 (직접 스크래핑)
├── code-external-api.gs       # 백엔드 로직 (외부 API 사용)
├── index.html                 # 프론트엔드 UI
├── README.md                  # 사용 설명서
├── ALTERNATIVES.md            # 대안 방법 가이드
└── external-server/           # Vercel 서버 (스크래핑 대안)
    ├── api/
    │   └── gazette.js         # Serverless Function
    ├── package.json           # 의존성
    ├── vercel.json           # Vercel 설정
    └── README.md             # 서버 배포 가이드
```

## 주요 함수

### code.gs

- `doGet(e)`: 웹앱 진입점, index.html 반환
- `fetchGazetteData()`: 시보 데이터를 가져오는 메인 함수 (캐싱 포함)
- `scrapeIncheonGazette()`: 인천시보 웹페이지 스크래핑
- `parseGazetteList(html)`: HTML에서 시보 목록 파싱
- `clearCache()`: 캐시 수동 삭제 (테스트용)

### index.html

- `loadGazetteData()`: 서버에서 데이터를 가져와 화면에 표시
- `displayGazetteList(data)`: 시보 목록 렌더링
- `displayError(message)`: 오류 메시지 표시

## 문제 해결

### 데이터가 표시되지 않는 경우

1. **HTML 구조 변경**: 인천시 웹사이트의 HTML 구조가 변경되었을 수 있습니다
   - Apps Script 편집기에서 `실행 로그`를 확인하세요
   - 로그에 "파싱된 항목 수: 0"이 표시되면 HTML 파싱 로직을 수정해야 합니다

2. **HTTP 403/차단**: 웹사이트에서 스크래핑을 차단한 경우
   - User-Agent를 다른 것으로 변경해보세요
   - 요청 간격을 늘려보세요

3. **캐시 문제**: 이전 오류 데이터가 캐시된 경우
   - `clearCache()` 함수를 실행하여 캐시를 삭제하세요

### HTTP 오류

- **403 Forbidden**: 웹사이트 접근 거부 → User-Agent 변경
- **500 Internal Server Error**: 서버 오류 → 나중에 다시 시도
- **Timeout**: 응답 시간 초과 → 네트워크 상태 확인

## 🚨 웹 스크래핑이 완전히 실패하는 경우

Google Apps Script에서 직접 스크래핑이 불가능한 경우 **외부 API 서버**를 사용하세요.

### 해결 방법: Vercel 서버 사용 (추천) ⭐

1. **`external-server` 폴더를 Vercel에 배포**
   ```bash
   cd external-server
   npm install
   vercel --prod
   ```

2. **`code.gs` 대신 `code-external-api.gs` 사용**
   - `code-external-api.gs`의 `API_URL`을 배포된 URL로 변경
   - Apps Script에서 `Code.gs` 내용을 `code-external-api.gs`로 교체

3. **테스트**
   - `testAPIConnection()` 함수 실행하여 연결 확인

### 자세한 대안 방법

더 많은 대안과 해결 방법은 다음 문서를 참조하세요:
- **[ALTERNATIVES.md](ALTERNATIVES.md)** - 7가지 대안 방법 상세 가이드
- **[external-server/README.md](external-server/README.md)** - Vercel 서버 배포 가이드

### 다른 대안들

1. **공공데이터포털 API** - 인천시보 공식 API 확인
2. **RSS 피드** - RSS 제공 여부 확인
3. **프록시 서비스** - ScraperAPI, Bright Data 등
4. **인천시에 직접 문의** - 공식 API/RSS 제공 요청

자세한 내용은 `ALTERNATIVES.md` 파일을 참고하세요.

## 업데이트 방법

1. 이 저장소의 최신 코드를 복사
2. Apps Script 편집기에서 해당 파일을 업데이트
3. **파일 > 저장** 클릭
4. 배포된 웹앱은 자동으로 업데이트됩니다

## 라이선스

이 프로젝트는 교육 및 개인적 용도로 자유롭게 사용할 수 있습니다.

## 주의사항

- 웹 스크래핑은 대상 웹사이트의 서비스 약관을 준수해야 합니다
- 과도한 요청은 IP 차단의 원인이 될 수 있습니다
- 인천시 웹사이트의 구조가 변경되면 파싱 로직을 수정해야 할 수 있습니다
- 데이터는 1시간마다 자동으로 새로고침됩니다 (캐싱)

## 문의

문제가 발생하거나 개선 사항이 있다면 이슈를 등록해주세요.
