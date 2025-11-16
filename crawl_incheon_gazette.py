#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
인천시보 크롤링 스크립트
https://www.incheon.go.kr/IC010303 페이지에서 1~5페이지의 시보 정보를 수집하고
Google Sheets에 저장합니다.
"""

import requests
from bs4 import BeautifulSoup
import gspread
from google.oauth2.service_account import Credentials
import json
import os
import time
from datetime import datetime
import re

# Google Sheets 설정
SCOPES = ['https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive']

class IncheonGazetteCrawler:
    def __init__(self, credentials_path=None):
        """
        크롤러 초기화

        Args:
            credentials_path: Google Sheets API 인증 JSON 파일 경로
        """
        self.base_url = "https://www.incheon.go.kr"
        self.list_url = f"{self.base_url}/IC010303"
        self.session = requests.Session()
        self.credentials_path = credentials_path

        # User-Agent 설정 (일부 웹사이트는 봇 차단)
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def fetch_page(self, page_num=1):
        """
        특정 페이지의 목록을 가져옵니다.

        Args:
            page_num: 페이지 번호 (1~5)

        Returns:
            BeautifulSoup 객체
        """
        try:
            # 페이지 번호에 따라 URL 파라미터 추가
            params = {
                'page': page_num
            }

            print(f"페이지 {page_num} 요청 중...")
            response = self.session.get(self.list_url, params=params, timeout=30, verify=False)
            response.raise_for_status()
            response.encoding = 'utf-8'

            return BeautifulSoup(response.text, 'html.parser')

        except Exception as e:
            print(f"페이지 {page_num} 가져오기 실패: {e}")
            return None

    def parse_list_page(self, soup):
        """
        목록 페이지를 파싱하여 시보 항목들을 추출합니다.

        Args:
            soup: BeautifulSoup 객체

        Returns:
            시보 항목 리스트 (각 항목은 딕셔너리)
        """
        items = []

        try:
            # 테이블에서 행 추출 (실제 HTML 구조에 따라 수정 필요)
            # 일반적으로 게시판은 <table>, <tbody>, <tr> 구조
            table = soup.find('table') or soup.find('div', class_='board-list')

            if not table:
                print("테이블을 찾을 수 없습니다.")
                return items

            rows = table.find_all('tr')[1:]  # 첫 번째 행(헤더) 제외

            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 3:
                    continue

                # 번호, 제목, 일자 등 추출
                item = {}

                # 번호
                item['번호'] = cols[0].get_text(strip=True)

                # 제목과 링크
                title_col = cols[1]
                link = title_col.find('a')
                if link:
                    item['제목'] = link.get_text(strip=True)
                    # 상대 경로를 절대 경로로 변환
                    href = link.get('href', '')
                    if href.startswith('/'):
                        item['상세URL'] = self.base_url + href
                    elif href.startswith('http'):
                        item['상세URL'] = href
                    else:
                        item['상세URL'] = self.base_url + '/' + href
                else:
                    item['제목'] = title_col.get_text(strip=True)
                    item['상세URL'] = ''

                # 일자
                if len(cols) > 2:
                    item['일자'] = cols[2].get_text(strip=True)

                # 조회수 등 추가 정보
                if len(cols) > 3:
                    item['조회수'] = cols[3].get_text(strip=True)

                items.append(item)

        except Exception as e:
            print(f"목록 파싱 오류: {e}")

        return items

    def fetch_detail_page(self, url):
        """
        상세 페이지를 가져옵니다.

        Args:
            url: 상세 페이지 URL

        Returns:
            BeautifulSoup 객체
        """
        try:
            print(f"상세 페이지 요청 중: {url}")
            response = self.session.get(url, timeout=30, verify=False)
            response.raise_for_status()
            response.encoding = 'utf-8'

            return BeautifulSoup(response.text, 'html.parser')

        except Exception as e:
            print(f"상세 페이지 가져오기 실패: {e}")
            return None

    def parse_detail_page(self, soup):
        """
        상세 페이지에서 시보 번호, 조례/공고/기타 내용, PDF 링크를 추출합니다.

        Args:
            soup: BeautifulSoup 객체

        Returns:
            상세 정보 딕셔너리
        """
        detail = {
            '시보번호': '',
            '조례': [],
            '공고': [],
            '기타': [],
            'PDF링크': []
        }

        try:
            # 본문 내용 추출
            content = soup.find('div', class_='view-content') or soup.find('div', class_='board-view')

            if content:
                text = content.get_text()

                # 시보 번호 추출 (예: "시보 제1234호")
                match = re.search(r'시보\s*제(\d+)호', text)
                if match:
                    detail['시보번호'] = f"제{match.group(1)}호"

                # 조례, 공고, 기타 섹션 추출
                lines = text.split('\n')
                current_section = None

                for line in lines:
                    line = line.strip()
                    if not line:
                        continue

                    # 섹션 제목 확인
                    if '<조례>' in line or '조례' in line and line.startswith('<'):
                        current_section = '조례'
                        continue
                    elif '<공고>' in line or '공고' in line and line.startswith('<'):
                        current_section = '공고'
                        continue
                    elif '<기타>' in line or '기타' in line and line.startswith('<'):
                        current_section = '기타'
                        continue

                    # 현재 섹션에 내용 추가 (최대 5줄)
                    if current_section:
                        if len(detail[current_section]) < 5:
                            detail[current_section].append(line)

            # PDF 첨부파일 링크 추출
            attachments = soup.find_all('a', href=re.compile(r'\.pdf$', re.I))
            for attach in attachments:
                href = attach.get('href', '')
                if href.startswith('/'):
                    pdf_url = self.base_url + href
                elif href.startswith('http'):
                    pdf_url = href
                else:
                    pdf_url = self.base_url + '/' + href

                detail['PDF링크'].append(pdf_url)

        except Exception as e:
            print(f"상세 페이지 파싱 오류: {e}")

        return detail

    def download_pdf(self, url, save_dir='downloads'):
        """
        PDF 파일을 다운로드합니다.

        Args:
            url: PDF URL
            save_dir: 저장 디렉토리

        Returns:
            저장된 파일 경로 또는 None
        """
        try:
            os.makedirs(save_dir, exist_ok=True)

            # 파일명 추출
            filename = url.split('/')[-1]
            filepath = os.path.join(save_dir, filename)

            # 이미 다운로드된 파일이면 스킵
            if os.path.exists(filepath):
                print(f"이미 존재함: {filename}")
                return filepath

            print(f"PDF 다운로드 중: {filename}")
            response = self.session.get(url, timeout=60, verify=False)
            response.raise_for_status()

            with open(filepath, 'wb') as f:
                f.write(response.content)

            print(f"다운로드 완료: {filepath}")
            return filepath

        except Exception as e:
            print(f"PDF 다운로드 실패 ({url}): {e}")
            return None

    def crawl_pages(self, start_page=1, end_page=5):
        """
        지정된 페이지 범위의 시보 정보를 크롤링합니다.

        Args:
            start_page: 시작 페이지
            end_page: 끝 페이지

        Returns:
            수집된 데이터 리스트
        """
        all_data = []

        for page_num in range(start_page, end_page + 1):
            soup = self.fetch_page(page_num)

            if not soup:
                continue

            items = self.parse_list_page(soup)
            print(f"페이지 {page_num}: {len(items)}개 항목 발견")

            # 각 항목의 상세 페이지 크롤링
            for item in items:
                if item.get('상세URL'):
                    detail_soup = self.fetch_detail_page(item['상세URL'])

                    if detail_soup:
                        detail = self.parse_detail_page(detail_soup)
                        item.update(detail)

                        # PDF 다운로드
                        pdf_files = []
                        for pdf_url in detail.get('PDF링크', []):
                            pdf_path = self.download_pdf(pdf_url)
                            if pdf_path:
                                pdf_files.append(pdf_path)

                        item['PDF파일'] = pdf_files

                        # 서버 부하 방지를 위한 딜레이
                        time.sleep(1)

                all_data.append(item)

            # 페이지 간 딜레이
            time.sleep(2)

        return all_data

    def save_to_google_sheets(self, data, spreadsheet_name='인천시보'):
        """
        수집된 데이터를 Google Sheets에 저장합니다.

        Args:
            data: 저장할 데이터 리스트
            spreadsheet_name: 스프레드시트 이름
        """
        if not self.credentials_path or not os.path.exists(self.credentials_path):
            print("Google Sheets 인증 파일이 없습니다.")
            print("credentials.json 파일을 생성하고 경로를 지정해주세요.")
            return

        try:
            # Google Sheets 인증
            creds = Credentials.from_service_account_file(
                self.credentials_path, scopes=SCOPES)
            client = gspread.authorize(creds)

            # 스프레드시트 열기 또는 생성
            try:
                spreadsheet = client.open(spreadsheet_name)
            except gspread.SpreadsheetNotFound:
                spreadsheet = client.create(spreadsheet_name)
                print(f"새 스프레드시트 생성: {spreadsheet_name}")

            # 워크시트 준비
            try:
                worksheet = spreadsheet.worksheet('시보목록')
            except gspread.WorksheetNotFound:
                worksheet = spreadsheet.add_worksheet(title='시보목록', rows=1000, cols=20)

            # 헤더 작성
            headers = ['번호', '제목', '일자', '조회수', '상세URL', '시보번호',
                      '조례1', '조례2', '조례3', '조례4', '조례5',
                      '공고1', '공고2', '공고3', '공고4', '공고5',
                      '기타1', '기타2', '기타3', '기타4', '기타5',
                      'PDF링크', 'PDF파일경로']

            worksheet.clear()
            worksheet.append_row(headers)

            # 데이터 작성
            for item in data:
                row = [
                    item.get('번호', ''),
                    item.get('제목', ''),
                    item.get('일자', ''),
                    item.get('조회수', ''),
                    item.get('상세URL', ''),
                    item.get('시보번호', ''),
                ]

                # 조례 5줄
                조례 = item.get('조례', [])
                for i in range(5):
                    row.append(조례[i] if i < len(조례) else '')

                # 공고 5줄
                공고 = item.get('공고', [])
                for i in range(5):
                    row.append(공고[i] if i < len(공고) else '')

                # 기타 5줄
                기타 = item.get('기타', [])
                for i in range(5):
                    row.append(기타[i] if i < len(기타) else '')

                # PDF 링크와 파일 경로
                row.append(', '.join(item.get('PDF링크', [])))
                row.append(', '.join(item.get('PDF파일', [])))

                worksheet.append_row(row)
                time.sleep(1)  # API 제한 방지

            print(f"Google Sheets 저장 완료: {spreadsheet.url}")

        except Exception as e:
            print(f"Google Sheets 저장 오류: {e}")

    def save_to_json(self, data, filename='incheon_gazette.json'):
        """
        수집된 데이터를 JSON 파일로 저장합니다.

        Args:
            data: 저장할 데이터
            filename: 파일명
        """
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"JSON 파일 저장 완료: {filename}")
        except Exception as e:
            print(f"JSON 저장 오류: {e}")


def main():
    """메인 함수"""
    import warnings
    warnings.filterwarnings('ignore', message='Unverified HTTPS request')

    print("=" * 60)
    print("인천시보 크롤링 시작")
    print("=" * 60)

    # 크롤러 초기화 (Google Sheets 인증 파일 경로 지정)
    credentials_file = 'credentials.json'

    if os.path.exists(credentials_file):
        crawler = IncheonGazetteCrawler(credentials_path=credentials_file)
    else:
        print("⚠️  credentials.json 파일이 없습니다.")
        print("Google Sheets API를 사용하려면 인증 파일이 필요합니다.")
        print("일단 JSON 파일로만 저장합니다.\n")
        crawler = IncheonGazetteCrawler()

    # 1~5페이지 크롤링
    data = crawler.crawl_pages(start_page=1, end_page=5)

    print(f"\n총 {len(data)}개 항목 수집 완료")

    # JSON으로 저장
    crawler.save_to_json(data)

    # Google Sheets에 저장 (인증 파일이 있는 경우)
    if os.path.exists(credentials_file):
        crawler.save_to_google_sheets(data)

    print("\n" + "=" * 60)
    print("크롤링 완료!")
    print("=" * 60)


if __name__ == '__main__':
    main()
