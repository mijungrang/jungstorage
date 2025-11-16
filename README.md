# 인천시보 크롤링 프로젝트

인천광역시 공식 웹사이트(https://www.incheon.go.kr/IC010303)의 인천시보 페이지를 크롤링하여 Google Sheets에 자동으로 정리하는 프로젝트입니다.

## 📋 기능

- 인천시보 1~5페이지 자동 크롤링
- 각 시보의 상세 정보 수집:
  - 번호, 제목, 일자, 조회수
  - 상세 페이지 URL
  - 시보 제호 (예: "제1234호")
  - 조례 내용 (최대 5줄)
  - 공고 내용 (최대 5줄)
  - 기타 내용 (최대 5줄)
  - PDF 첨부파일 링크
- Google Sheets에 자동 저장 및 정리

## 🚀 사용 방법

### 방법 1: Google Apps Script (추천)

인천시 웹사이트가 봇 차단을 하고 있어, Google Apps Script를 사용하는 것이 가장 안정적입니다.

#### 설정 단계:

1. **Google Sheets 열기**
   - 새 Google Sheets 문서 생성: https://sheets.google.com

2. **Apps Script 편집기 열기**
   - 메뉴: `확장 프로그램` > `Apps Script`

3. **코드 복사**
   - `인천시보크롤링.gs` 파일의 내용을 전체 복사
   - Apps Script 편집기에 붙여넣기

4. **저장 및 권한 부여**
   - 저장 아이콘 클릭 (Ctrl+S)
   - 프로젝트 이름 입력 (예: "인천시보 크롤러")

5. **⚠️ 먼저 연결 테스트 실행 (중요!)**
   - 함수 선택: `testConnection`
   - 실행 버튼 클릭
   - 처음 실행 시 권한 승인:
     - "권한 검토" 클릭
     - Google 계정 선택
     - "고급" > "프로젝트 이름(안전하지 않음)으로 이동" 클릭
     - "허용" 클릭
   - 실행 로그 확인 (`보기` > `로그`)
   - **성공 시**: 다음 단계 진행
   - **실패 시**: `대체방법.md` 참조

6. **크롤링 실행**
   - 함수 선택: `crawlIncheonGazette`
   - 실행 버튼 클릭

7. **결과 확인**
   - Google Sheets로 돌아가기
   - "인천시보" 시트에서 크롤링된 데이터 확인

#### 사용 팁:

- **커스텀 메뉴 사용**
  - 스프레드시트를 새로고침하면 상단에 "인천시보 크롤링" 메뉴가 나타납니다
  - 메뉴에서 바로 크롤링 실행 가능

- **페이지 범위 조정**
  ```javascript
  // 1~3페이지만 크롤링
  crawlIncheonGazette(1, 3);

  // 5~10페이지 크롤링
  crawlIncheonGazette(5, 10);
  ```

- **테스트 실행**
  - `testCrawl()` 함수로 첫 페이지만 테스트 가능

### 방법 2: Python 스크립트 (로컬 환경)

> ⚠️ 주의: 인천시 웹사이트의 봇 차단으로 인해 Python 스크립트는 403 Forbidden 오류가 발생할 수 있습니다.

#### 필요 사항:

- Python 3.7 이상
- pip (Python 패키지 관리자)

#### 설치:

```bash
# 패키지 설치
pip install -r requirements.txt

# Playwright 브라우저 설치
playwright install chromium
```

#### Google Sheets API 설정:

1. **Google Cloud Console**에서 프로젝트 생성
2. **Google Sheets API** 및 **Google Drive API** 활성화
3. **서비스 계정** 생성 및 키 다운로드
4. 다운로드한 JSON 파일을 `credentials.json`으로 저장
5. Google Sheets를 서비스 계정 이메일과 공유

자세한 가이드: https://developers.google.com/sheets/api/quickstart/python

#### 실행:

```bash
# 기본 크롤링 (1~5페이지)
python3 crawl_incheon_gazette.py

# 결과는 incheon_gazette.json 파일과 Google Sheets에 저장됨
```

## 📁 파일 구조

```
jungstorage/
├── README.md                    # 프로젝트 개요 (이 파일)
├── 사용가이드.md                # 초보자용 상세 가이드
├── 대체방법.md                  # 크롤링 실패 시 대체 방법
├── 인천시보크롤링.gs            # Google Apps Script 코드 (추천)
├── crawl_incheon_gazette.py    # Python 크롤링 스크립트 (참고)
├── requirements.txt            # Python 패키지 목록
├── code.gs                     # 기존 인천시 API 코드
└── downloads/                  # PDF 다운로드 폴더 (자동 생성)
```

## 📊 결과 데이터 형식

Google Sheets에는 다음 컬럼으로 데이터가 저장됩니다:

| 컬럼명 | 설명 |
|--------|------|
| 번호 | 게시글 번호 |
| 제목 | 시보 제목 |
| 일자 | 게시 일자 |
| 조회수 | 조회수 |
| 상세URL | 상세 페이지 링크 |
| 시보번호 | 시보 제호 (예: 제1234호) |
| 조례1~5 | 조례 내용 (최대 5줄) |
| 공고1~5 | 공고 내용 (최대 5줄) |
| 기타1~5 | 기타 내용 (최대 5줄) |
| PDF링크 | PDF 파일 다운로드 링크 |

## ⚠️ 주요 주의사항

### 1. 연결 테스트 필수!

크롤링 전에 **반드시** `testConnection()` 함수를 먼저 실행하세요.

```javascript
// Apps Script에서 실행 순서:
1. testConnection()  // 먼저!
2. crawlIncheonGazette()  // 연결 성공 후
```

**실패하는 경우**:
- "Address unavailable" 오류
- "Exceeded maximum execution time" 오류
- 빈 데이터 수집

→ **해결책**: `대체방법.md` 파일 참조

### 2. 봇 차단 가능성

인천시 웹사이트는 강력한 봇 차단을 사용할 수 있습니다.

**대체 방법** (차단 시):
- 브라우저 확장 프로그램 (Web Scraper)
- Google Sheets IMPORTHTML 함수
- 수동 복사 + 붙여넣기
- 공공데이터포털 API

자세한 내용: [`대체방법.md`](대체방법.md)

### 3. 크롤링 속도

서버 부하 방지를 위한 딜레이:
- 각 항목 간: 0.5초
- 각 페이지 간: 1초

### 4. Google Apps Script 제한

- 최대 실행 시간: 6분
- 한 번에 많은 페이지 크롤링 시 타임아웃 가능
- 권장: 1~5페이지씩 나누어 실행

## 🔧 문제 해결

### Google Apps Script 실행 오류

**오류: "Address unavailable"**
- 원인: 웹사이트가 Google Apps Script 차단
- 해결: `testConnection()` 함수 실행 후 로그 확인
- 대체: `대체방법.md` 참조

**오류: "권한이 없습니다"**
- 해결: Apps Script 실행 시 권한을 승인해야 합니다
- "권한 검토" > "고급" > "허용" 클릭

**오류: "Exceeded maximum execution time"**
- 해결: 한 번에 크롤링하는 페이지 수를 줄이세요
- 예: `crawlIncheonGazette(1, 2)`
- 딜레이 줄이기: 코드의 `Utilities.sleep()` 값 감소

**오류: "데이터가 수집되지 않음"**
- 해결: 먼저 `testConnection()` 실행
- "디버그_HTML" 시트에서 HTML 구조 확인
- 웹사이트 구조가 변경되었을 수 있음

### Python 스크립트 오류

**오류: "403 Forbidden"**
- 원인: 웹사이트의 봇 차단
- 해결: Google Apps Script 사용 권장

**오류: "credentials.json을 찾을 수 없습니다"**
- 해결: Google Cloud Console에서 서비스 계정 키 생성 및 다운로드

## 📝 라이선스

이 프로젝트는 교육 및 개인 용도로 사용할 수 있습니다.

## 🤝 기여

이슈 및 개선 제안은 환영합니다!

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

---

**마지막 업데이트: 2025-11-16**
