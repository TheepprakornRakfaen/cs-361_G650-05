-- ============================================================
-- CS361 Teaching Compensation Claim System
-- 001 : โครงสร้างฐานข้อมูล (schema) ฉบับรวม
--
--   รวมผลของ migration 001–017 เดิม (เก็บไว้ที่ migrations/_archive/)
--   ใช้กับ "ฐานข้อมูลใหม่ที่ว่างเปล่า" เท่านั้น
--     psql "$DATABASE_URL" -f 001_schema.sql
--     psql "$DATABASE_URL" -f 002_seed.sql
--
--   ถ้า RDS เดิมรัน migration เก่าไปแล้ว (ถึง 017) ไม่ต้องรันไฟล์นี้
--   ต้องการ PostgreSQL 13 ขึ้นไป (ใช้ gen_random_uuid())
--
--   สถานะคำร้อง (claim.status)
--     0 ร่าง, 1 รอตรวจ, 2 ตรวจแล้วรออนุมัติ, 3 อนุมัติ, 4 ไม่อนุมัติ, 5 ส่งคืนแก้ไข
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

-- ------------------------------------------------------------
-- ผู้ใช้ (สำเนาบางส่วนจาก Cognito; บทบาทอยู่ที่ Cognito Groups)
-- ------------------------------------------------------------
CREATE TABLE app_user (
  cognito_sub      UUID PRIMARY KEY,
  username         TEXT NOT NULL,                       -- email ที่ใช้ล็อกอิน
  name             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  bank_name        TEXT,
  bank_account_no  TEXT CHECK (bank_account_no IS NULL OR bank_account_no ~ '^[0-9]{10,15}$')
);
-- username ห้ามซ้ำ (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
CREATE UNIQUE INDEX idx_app_user_username ON app_user (lower(username));

COMMENT ON COLUMN app_user.bank_name       IS 'ชื่อธนาคารของบัญชีรับเงินโอน';
COMMENT ON COLUMN app_user.bank_account_no IS 'เลขบัญชีรับเงินโอน (เก็บเต็ม backend ปิดบังก่อนส่งออก)';

-- ------------------------------------------------------------
-- ข้อมูลอ้างอิงการเรียนการสอน
-- ------------------------------------------------------------
CREATE TABLE academic_term (
  id          SERIAL PRIMARY KEY,
  year        INT  NOT NULL,                            -- ปี พ.ศ. เช่น 2569
  semester    INT  NOT NULL CHECK (semester IN (1, 2, 3)),
  start_date  DATE NOT NULL,                            -- วันที่เป็น ค.ศ.
  end_date    DATE NOT NULL,
  UNIQUE (year, semester)
);

CREATE TABLE course (
  id       SERIAL PRIMARY KEY,
  code     TEXT NOT NULL UNIQUE,                        -- เช่น CS341
  name_th  TEXT NOT NULL,
  name_en  TEXT
);

CREATE TABLE section (
  id          SERIAL PRIMARY KEY,
  course_id   INT  NOT NULL REFERENCES course(id),
  term_id     INT  NOT NULL REFERENCES academic_term(id),
  section_no  TEXT NOT NULL,                            -- เช่น 650001
  UNIQUE (course_id, term_id, section_no)
);

-- ผู้สอน/TA ประจำ section พร้อมโควตาชั่วโมงแยกรายคน
CREATE TABLE section_staff (
  section_id  INT  NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES app_user(cognito_sub) ON UPDATE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('INSTRUCTOR', 'TA')),
  hour        NUMERIC(6,2) NOT NULL DEFAULT 0,          -- เบิกไปแล้ว (คำร้องสถานะ 1,2,3)
  max_hour    NUMERIC(6,2) NOT NULL DEFAULT 0,          -- เบิกได้ทั้งหมด
  PRIMARY KEY (section_id, user_id),
  CONSTRAINT section_staff_hour_check CHECK (hour >= 0 AND hour <= max_hour)
);
CREATE INDEX idx_section_staff_user ON section_staff (user_id);

COMMENT ON COLUMN section_staff.hour     IS 'ชั่วโมงที่คนนี้เบิกไปแล้วใน section นี้ (คำร้องสถานะ 1,2,3)';
COMMENT ON COLUMN section_staff.max_hour IS 'ชั่วโมงทั้งหมดที่คนนี้เบิกได้ใน section นี้';

-- รอบยื่นรายเดือน (1 แถว = 1 เดือนของ 1 ภาคการศึกษา)
CREATE TABLE claim_period (
  id        SERIAL PRIMARY KEY,
  term_id   INT NOT NULL REFERENCES academic_term(id),
  month     INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  open_at   TIMESTAMPTZ NOT NULL,
  close_at  TIMESTAMPTZ NOT NULL,
  status    SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1)),   -- 0 ปิด, 1 เปิด
  UNIQUE (term_id, month)
);

-- ประเภทค่าตอบแทน พร้อมอัตราต่อชั่วโมง
CREATE TABLE compensation_type (
  id           SERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  hourly_rate  NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0)
);

COMMENT ON COLUMN compensation_type.hourly_rate IS 'อัตราค่าตอบแทนต่อชั่วโมง (บาท)';

-- ------------------------------------------------------------
-- คำร้อง
-- ------------------------------------------------------------
CREATE TABLE claim (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claimant_id   UUID NOT NULL REFERENCES app_user(cognito_sub) ON UPDATE CASCADE,
  period_id     INT  NOT NULL REFERENCES claim_period(id),
  type_id       INT  NOT NULL REFERENCES compensation_type(id),
  section_id    INT  NOT NULL REFERENCES section(id),
  status        SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2, 3, 4, 5)),
  hour          NUMERIC(6,2) NOT NULL CHECK (hour > 0),  -- ชั่วโมงสอนรวม (กรอกครั้งเดียว)
  note          TEXT,
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_claim_claimant ON claim (claimant_id);

COMMENT ON COLUMN claim.status IS '0=แบบร่าง 1=รอตรวจ 2=ตรวจแล้วรออนุมัติ 3=อนุมัติ 4=ไม่อนุมัติ 5=ส่งคืนแก้ไข';
COMMENT ON COLUMN claim.hour   IS 'ชั่วโมงสอนรวมของคำร้อง (ผู้ยื่นกรอกครั้งเดียว)';

-- วันที่สอนของแต่ละคำร้อง
CREATE TABLE claim_date (
  id          SERIAL PRIMARY KEY,
  claim_id    UUID NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
  teach_date  DATE NOT NULL,
  UNIQUE (claim_id, teach_date)
);
CREATE INDEX idx_claim_date_claim_id ON claim_date (claim_id);

-- ไฟล์หลักฐาน (ตัวไฟล์อยู่ใน S3 ที่ object_key)
CREATE TABLE claim_evidence (
  id             UUID PRIMARY KEY,
  claim_id       UUID NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
  object_key     TEXT NOT NULL UNIQUE,                  -- {sub เจ้าของคำร้อง}/{claim_id}/{evidence_id}.{ext}
  file_name      TEXT NOT NULL,
  content_type   TEXT NOT NULL,
  file_size      BIGINT NOT NULL CHECK (file_size > 0),
  evidence_type  TEXT NOT NULL DEFAULT 'supporting'
                   CHECK (evidence_type IN ('signed_form', 'supporting')),
  uploaded_by    UUID REFERENCES app_user(cognito_sub) ON UPDATE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_claim_evidence_claim_id ON claim_evidence (claim_id);

COMMENT ON COLUMN claim_evidence.evidence_type IS 'signed_form = เอกสารลงนาม, supporting = หลักฐานประกอบ';
COMMENT ON COLUMN claim_evidence.uploaded_by   IS 'cognito_sub ของผู้อัปโหลด';

-- ประวัติการตรวจ/อนุมัติ (ไม่มี FK เพื่อให้ประวัติอยู่ต่อแม้ลบคำร้อง)
CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,
  claim_id     UUID NOT NULL,
  action       TEXT NOT NULL,
  actor_sub    UUID,
  actor_name   TEXT NOT NULL DEFAULT '',
  actor_role   TEXT NOT NULL DEFAULT '',
  from_status  TEXT,
  to_status    TEXT,
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_claim_created ON audit_log (claim_id, created_at DESC);
CREATE INDEX idx_audit_log_created       ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_action        ON audit_log (action);

-- ------------------------------------------------------------
-- จำนวนเงินของแต่ละคำร้อง = ชั่วโมงรวม x อัตราของประเภท
-- ------------------------------------------------------------
CREATE VIEW claim_amount AS
SELECT c.id                                      AS claim_id,
       ct.hourly_rate,
       c.hour                                    AS total_hour,
       (c.hour * ct.hourly_rate)::NUMERIC(12,2)  AS amount
  FROM claim c
  JOIN compensation_type ct ON ct.id = c.type_id;

COMMIT;
