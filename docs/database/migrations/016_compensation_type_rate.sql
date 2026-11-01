-- ============================================================
-- CS361 Migration 016 : อัตราค่าตอบแทนย้ายไปอยู่ที่ compensation_type
--
--   1) compensation_type.hourly_rate = อัตราต่อชั่วโมงของประเภทนั้น
--   2) claim.type_id เป็น NOT NULL (คำร้องเก่าที่ยังว่าง -> TEACHING)
--   3) ลบ claim.hourly_rate (+ trigger trg_claim_hourly_rate / ฟังก์ชัน claim_set_hourly_rate)
--   4) ลบ course.hourly_rate
--   5) view claim_amount คำนวณจาก claim.hour x compensation_type.hourly_rate
--
-- !! ผลข้างเคียง: ยอดเงินของคำร้องเก่าทุกใบจะเปลี่ยนตามอัตราปัจจุบันของประเภท
--    (ไม่มี snapshot อัตราใน claim แล้ว) ห้ามแก้อัตราของประเภทที่มีคำร้องอนุมัติ/จ่ายแล้ว
--
-- ก่อนรัน: ต้องแก้ Lambda ที่อ่าน claim.hourly_rate (ClaimUserRequest) ให้พร้อม deploy
--          ไม่อย่างนั้นจะ error ทันทีหลังรัน
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

-- ------------------------------------------------------------
-- 1) อัตราต่อชั่วโมงของประเภทค่าตอบแทน
-- ------------------------------------------------------------
ALTER TABLE compensation_type
  ADD COLUMN hourly_rate NUMERIC(8,2) NOT NULL DEFAULT 0
    CHECK (hourly_rate >= 0);

COMMENT ON COLUMN compensation_type.hourly_rate IS 'อัตราค่าตอบแทนต่อชั่วโมง (บาท)';

-- TEACHING (id 1 จาก 005) = ค่าตอบแทนอาจารย์ผู้สอนบรรยาย
-- เพิ่มอีก 1 ประเภท: อาจารย์พิเศษภายนอก (ตรงกับตัวเลือกในหน้าเว็บ ปรับให้ตรงกับประกาศจริง)
INSERT INTO compensation_type (code, name, hourly_rate) VALUES
  ('TEACHING',         'ค่าตอบแทนอาจารย์ผู้สอนบรรยาย',  600),
  ('SPECIAL_LECTURER', 'ค่าตอบแทนอาจารย์พิเศษภายนอก',    900)
ON CONFLICT (code) DO UPDATE
  SET name        = EXCLUDED.name,
      hourly_rate = EXCLUDED.hourly_rate;

-- ------------------------------------------------------------
-- 2) คำร้องทุกใบต้องมีประเภท (ไม่มีประเภท = ไม่มีอัตรา)
-- ------------------------------------------------------------
UPDATE claim
   SET type_id = (SELECT id FROM compensation_type WHERE code = 'TEACHING')
 WHERE type_id IS NULL;

ALTER TABLE claim ALTER COLUMN type_id SET NOT NULL;

-- ------------------------------------------------------------
-- 3) ลบอัตราออกจาก claim (view ต้องลบก่อน เพราะอ้างคอลัมน์นี้)
-- ------------------------------------------------------------
DROP VIEW IF EXISTS claim_amount;

DROP TRIGGER IF EXISTS trg_claim_hourly_rate ON claim;
DROP FUNCTION IF EXISTS claim_set_hourly_rate();

ALTER TABLE claim DROP COLUMN hourly_rate;   -- claim_hourly_rate_check หายไปพร้อมกัน

-- ------------------------------------------------------------
-- 4) ลบอัตราตามรายวิชา
-- ------------------------------------------------------------
ALTER TABLE course DROP COLUMN hourly_rate;

-- ------------------------------------------------------------
-- 5) จำนวนเงินของแต่ละคำร้อง
-- ------------------------------------------------------------
CREATE VIEW claim_amount AS
SELECT c.id                                           AS claim_id,
       ct.hourly_rate,
       c.hour                                         AS total_hour,
       (c.hour * ct.hourly_rate)::NUMERIC(12,2)       AS amount
  FROM claim c
  JOIN compensation_type ct ON ct.id = c.type_id;

COMMIT;

-- ตรวจผล
-- SELECT id, code, name, hourly_rate FROM compensation_type ORDER BY id;
-- \d claim
-- SELECT * FROM claim_amount LIMIT 10;
