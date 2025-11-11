# 웹 스크래핑 실패 시 대안 방법

인천시보 웹 스크래핑이 차단되거나 실패할 경우 시도할 수 있는 여러 대안 방법입니다.

## 🔍 문제 진단

먼저 어떤 문제인지 확인하세요:

```javascript
// Apps Script에서 실행하여 오류 확인
function testScraping() {
  const result = scrapeIncheonGazette();
  Logger.log(result);
}
```

**일반적인 오류:**
- `403 Forbidden`: 접근 차단
- `Timeout`: 응답 시간 초과
- `파싱 오류`: HTML 구조 변경

---

## ✅ 해결 방법 (우선순위 순)

### 1️⃣ **인천시 공식 Open API 확인** ⭐ (가장 권장)

#### 방법:
1. [공공데이터포털](https://www.data.go.kr) 접속
2. "인천시보" 또는 "인천 시보" 검색
3. API 제공 여부 확인

#### 장점:
- ✅ 공식적이고 안정적
- ✅ 구조화된 JSON 데이터
- ✅ 법적 문제 없음

#### 단점:
- ❌ API가 없을 수 있음
- ❌ 신청 및 승인 필요

---

### 2️⃣ **RSS 피드 확인**

인천시 웹사이트에서 RSS 피드를 제공하는지 확인:

```javascript
function checkRSS() {
  const rssUrls = [
    'https://www.incheon.go.kr/rss/IC010303.xml',
    'https://www.incheon.go.kr/IC010303/rss',
    'https://www.incheon.go.kr/rss/sibo.xml'
  ];

  rssUrls.forEach(function(url) {
    try {
      const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
      Logger.log(url + ': ' + response.getResponseCode());
      if (response.getResponseCode() === 200) {
        Logger.log('RSS 발견: ' + url);
        Logger.log(response.getContentText().substring(0, 500));
      }
    } catch(e) {
      Logger.log(url + ' 오류: ' + e.message);
    }
  });
}
```

#### RSS가 있다면:
- XML 파싱으로 쉽게 데이터 추출 가능
- 더 안정적이고 빠름

---

### 3️⃣ **외부 백엔드 서버 사용** ⭐ (강력 추천)

Google Apps Script의 제약을 피하기 위해 별도 서버 구축:

#### A. Node.js + Puppeteer (헤드리스 브라우저)

```javascript
// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/api/gazette', async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://www.incheon.go.kr/IC010303');

  const data = await page.evaluate(() => {
    const items = [];
    const rows = document.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 3) {
        items.push({
          number: cells[0].innerText.trim(),
          title: cells[1].innerText.trim(),
          date: cells[2].innerText.trim(),
          link: cells[1].querySelector('a')?.href || ''
        });
      }
    });

    return items;
  });

  await browser.close();
  res.json(data);
});

app.listen(3000);
```

**배포 옵션:**
- **Vercel** (무료, 추천)
- **Heroku** (무료 티어)
- **Railway** (무료 티어)
- **AWS Lambda** (무료 티어)

#### B. Python + BeautifulSoup + Flask

```python
# app.py
from flask import Flask, jsonify
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

@app.route('/api/gazette')
def get_gazette():
    url = 'https://www.incheon.go.kr/IC010303'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')

    items = []
    tbody = soup.find('tbody')

    if tbody:
        for row in tbody.find_all('tr'):
            cells = row.find_all('td')
            if len(cells) >= 3:
                link_tag = cells[1].find('a')
                items.append({
                    'number': cells[0].get_text(strip=True),
                    'title': cells[1].get_text(strip=True),
                    'date': cells[2].get_text(strip=True),
                    'link': link_tag['href'] if link_tag else ''
                })

    return jsonify(items)

if __name__ == '__main__':
    app.run()
```

**배포:** Vercel, Render, PythonAnywhere

#### C. Google Apps Script에서 외부 서버 호출

```javascript
function fetchGazetteData() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'INCHEON_GAZETTE_CACHE';

  const cachedData = cache.get(cacheKey);
  if (cachedData != null) {
    return JSON.parse(cachedData);
  }

  // 외부 서버 호출
  const apiUrl = 'https://your-server.vercel.app/api/gazette';
  const response = UrlFetchApp.fetch(apiUrl);
  const data = JSON.parse(response.getContentText());

  cache.put(cacheKey, JSON.stringify(data), 3600);
  return data;
}
```

---

### 4️⃣ **User-Agent 및 헤더 변경**

현재 코드 개선:

```javascript
function scrapeIncheonGazette() {
  const url = 'https://www.incheon.go.kr/IC010303';

  // 다양한 User-Agent 시도
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'curl/7.68.0' // 간단한 User-Agent
  ];

  for (let i = 0; i < userAgents.length; i++) {
    const options = {
      'headers': {
        'User-Agent': userAgents[i],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Referer': 'https://www.incheon.go.kr/',
        'Cache-Control': 'max-age=0'
      },
      'muteHttpExceptions': true,
      'followRedirects': true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);

      if (response.getResponseCode() === 200) {
        Logger.log('성공한 User-Agent: ' + userAgents[i]);
        const html = response.getContentText('UTF-8');
        return parseGazetteList(html);
      }
    } catch (e) {
      Logger.log('User-Agent ' + i + ' 실패: ' + e.message);
    }

    // 다음 시도 전 잠시 대기 (rate limiting 방지)
    Utilities.sleep(1000);
  }

  return { error: '모든 User-Agent 시도 실패' };
}
```

---

### 5️⃣ **프록시 서비스 활용**

스크래핑 전용 프록시 서비스 사용:

#### ScraperAPI (유료/무료 티어)

```javascript
function scrapeWithProxy() {
  const scraperApiKey = 'YOUR_API_KEY';
  const targetUrl = encodeURIComponent('https://www.incheon.go.kr/IC010303');
  const apiUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${targetUrl}`;

  const response = UrlFetchApp.fetch(apiUrl);
  const html = response.getContentText();

  return parseGazetteList(html);
}
```

**대안 서비스:**
- Bright Data (구 Luminati)
- Oxylabs
- Zyte (구 Scrapinghub)

---

### 6️⃣ **직접 인천시에 문의**

#### 공식 채널 문의:
1. **인천시청 정보화담당관실** 연락
2. 시보 RSS/API 제공 요청
3. 데이터 활용 목적 설명

**문의처:**
- 인천시청 대표전화: 032-120
- 정보공개 청구 시스템 활용

---

### 7️⃣ **수동 데이터 입력 + 알림**

최후의 수단:

```javascript
// Google Sheets에 수동으로 데이터 입력
function getGazetteFromSheets() {
  const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getSheetByName('시보');
  const data = sheet.getDataRange().getValues();

  const items = [];
  for (let i = 1; i < data.length; i++) {
    items.push({
      number: data[i][0],
      title: data[i][1],
      date: data[i][2],
      link: data[i][3]
    });
  }

  return items;
}
```

---

## 🎯 추천 순서

1. **공공데이터포털에서 API 확인** (5분)
2. **RSS 피드 확인** (5분)
3. **User-Agent 변경 시도** (10분)
4. **외부 Node.js/Python 서버 구축** (1-2시간) ⭐
5. **프록시 서비스 사용** (유료)
6. **인천시에 공식 문의** (며칠 소요)

---

## 💡 가장 현실적인 해결책

### ✅ **Vercel + Puppeteer 서버 구축** (추천)

1. Node.js 프로젝트 생성
2. Puppeteer로 스크래핑
3. Vercel에 무료 배포
4. GAS에서 해당 API 호출

**장점:**
- 완전 무료
- 헤드리스 브라우저로 JavaScript 렌더링 가능
- GAS 제약 없음
- 안정적

이 방법을 원하시면 전체 코드를 작성해드리겠습니다!

---

## 📞 도움이 필요하면

어떤 방법을 시도하고 싶으신지 말씀해주세요:
- "외부 서버 코드 작성해줘"
- "공공데이터 API 찾는 방법 알려줘"
- "RSS 파싱 코드 작성해줘"
