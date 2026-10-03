-- =====================================================================
-- CS361 Migration 002 : ข้อมูลการสอน และคำร้อง
-- =====================================================================
SET client_encoding = 'UTF8';

BEGIN;

-- ภาคการศึกษา
CREATE TABLE academic_term (
  id          SERIAL PRIMARY KEY,
  year        INT  NOT NULL,                              -- 2569
  semester    INT  NOT NULL CHECK (semester IN (1, 2, 3)),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  UNIQUE (year, semester)
);

-- รายวิชา
CREATE TABLE course (
  id       SERIAL PRIMARY KEY,
  code     TEXT NOT NULL UNIQUE,                          -- CS341
  name_th  TEXT NOT NULL,
  name_en  TEXT
);

-- ตอนเรียนของวิชาในแต่ละเทอม
CREATE TABLE section (
  id          SERIAL PRIMARY KEY,
  course_id   INT  NOT NULL REFERENCES course(id),
  term_id     INT  NOT NULL REFERENCES academic_term(id),
  section_no  TEXT NOT NULL,                              -- 650001
  UNIQUE (course_id, term_id, section_no)
);

-- ชั่วโมงสอนของแต่ละ section (1 section = 1 แถว)
CREATE TABLE class_schedule (
  id          SERIAL PRIMARY KEY,
  section_id  INT NOT NULL UNIQUE REFERENCES section(id) ON DELETE CASCADE,
  hour        NUMERIC(6,2) NOT NULL DEFAULT 0,            -- สอน (เบิก) ไปแล้ว
  max_hour    NUMERIC(6,2) NOT NULL,                      -- ทั้งหมด
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  CHECK (hour >= 0 AND hour <= max_hour)
);

-- รอบเปิดรับคำร้องรายเดือน  status: 0 = ปิด, 1 = เปิด
CREATE TABLE claim_period (
  id        SERIAL PRIMARY KEY,
  term_id   INT NOT NULL REFERENCES academic_term(id),
  month     INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  open_at   TIMESTAMPTZ NOT NULL,
  close_at  TIMESTAMPTZ NOT NULL,
  status    SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1)),
  UNIQUE (term_id, month)
);

-- คำร้อง  status: 0 = ร่าง, 1 = ยื่นแล้ว, 2 = ยกเลิก
CREATE TABLE claim (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claimant_id   UUID NOT NULL REFERENCES app_user(cognito_sub) ON UPDATE CASCADE,
  period_id     INT  NOT NULL REFERENCES claim_period(id),
  type_id       INT  REFERENCES compensation_type(id),   -- NULL ได้ (ยังไม่ระบุประเภท)
  section_id    INT  NOT NULL REFERENCES section(id),
  status        SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
  teach_date    DATE NOT NULL,
  hour          NUMERIC(5,2) NOT NULL CHECK (hour > 0),
  note          TEXT,
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_claim_claimant ON claim (claimant_id);

COMMIT;
