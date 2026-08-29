-- ==============================================================================
-- 강서나눔돌봄센터 CS 티켓 관리 시스템 데이터베이스 스키마 및 RLS 정책
-- ==============================================================================

-- 1. cs_tickets 테이블 생성
CREATE TABLE IF NOT EXISTS cs_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_name text NOT NULL,
  contact text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT '대기중',
  memo text
);

-- 2. Row Level Security (RLS) 활성화
ALTER TABLE cs_tickets ENABLE ROW LEVEL SECURITY;

-- 3. 익명 및 일반 유저 접근 권한 제어
REVOKE ALL ON TABLE cs_tickets FROM anon, authenticated;
GRANT SELECT, UPDATE, INSERT ON TABLE cs_tickets TO authenticated;

-- 4. RLS 정책 정의 (인증된 직원에 대해 조회 및 수정 허용)
DROP POLICY IF EXISTS "직원은 모든 티켓을 조회할 수 있다." ON cs_tickets;
CREATE POLICY "직원은 모든 티켓을 조회할 수 있다."
ON cs_tickets
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "직원은 티켓을 업데이트할 수 있다." ON cs_tickets;
CREATE POLICY "직원은 티켓을 업데이트할 수 있다."
ON cs_tickets
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. 테스트용 시드 데이터 (Seed Data) 삽입
INSERT INTO cs_tickets (customer_name, contact, category, summary, status, memo, created_at)
VALUES
(
  '김영희',
  '010-3456-7890',
  '청소품질',
  '어르신 댁 주방 바닥 청소 상태 미흡 관련 재방문 조치 요청. 냉장고 밑 먼지 제거가 누락되었다고 함.',
  '대기중',
  NULL,
  NOW() - INTERVAL '30 minutes'
),
(
  '박철수',
  '010-9876-5432',
  '시간미준수',
  '돌봄 요양보호사 서비스 시작 예정 시간(14:00) 대비 40분 지연 도착하여 사전 연락 부족에 대한 불편 민원 접수.',
  '대기중',
  NULL,
  NOW() - INTERVAL '2 hours'
),
(
  '이민수',
  '010-1122-3344',
  '서비스태도',
  '담당 생활지원사 방문 상담 시 불친절한 응대 언행에 대한 지적 및 담당자 변경 희망 문의.',
  '처리완료',
  '고객 유선 상담 진행하여 사과 전달함. 담당 생활지원사 재배정(이정숙 지원사) 완료 및 재발 방지 교육 안내.',
  NOW() - INTERVAL '1 day'
),
(
  '정순자',
  '010-5566-7788',
  '요금 및 일정',
  '9월 돌봄 서비스 이용 시간표 변경 요청 및 정부 지원 바우처 본인부담금 입금 계좌 재확인 문의.',
  '대기중',
  NULL,
  NOW() - INTERVAL '3 hours'
),
(
  '최성호',
  '010-8899-0011',
  '청소품질',
  '어르신 안방 창틀 및 베란다 묵은 먼지 청소 요청건. 추가 작업 지원 가능한지 문의.',
  '처리완료',
  '청소 전문 보조 인력 추가 편성하여 8/29 10시 방문 처리 예정 안내 완료.',
  NOW() - INTERVAL '2 days'
);
