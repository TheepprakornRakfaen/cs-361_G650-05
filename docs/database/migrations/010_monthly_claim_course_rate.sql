-- ============================================================
-- CS361 Migration 010 : V3 Monthly Claim + Course Rate
--   1) อัตราค่าตอบแทนต่อชั่วโมงกำหนดตามรายวิชา (course.hourly_rate)
--   2) คำร้องเก็บอัตรา ณ วันที่สร้าง (claim.hourly_rate) เติมให้อัตโนมัติ
--   3) 1 คน : 1 section : ยื่นได้ 1 คำร้องต่อรอบ (เดือน)
--      ไม่นับคำร้องที่ยกเลิกแล้ว (status = 2)
--   4) view claim_amount : ชั่วโมงรวม × อัตรา = จำนวนเงิน
--
-- ก่อนรัน ให้เช็คว่ามีคำร้องซ้ำในเดือนเดียวกันหรือไม่ (ถ้ามี index ข้อ 3 จะสร้างไม่ผ่าน)
--   SELECT claimant_id, section_id, period_id, count(*)
--     FROM claim WHERE status <> 2
--    GROUP BY 1, 2, 3 HAVING count(*) > 1;
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

-- ------------------------------------------------------------
-- 1) อัตราต่อชั่วโมงของแต่ละรายวิชา
-- ------------------------------------------------------------
ALTER TABLE course
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2) NOT NULL DEFAULT 0
    CHECK (hourly_rate >= 0);

-- ค่าตัวอย่าง (ปรับให้ตรงกับประกาศจริง)
UPDATE course SET hourly_rate = CASE code
  WHEN 'CS213' THEN 600
  WHEN 'CS223' THEN 600
  WHEN 'CS251' THEN 600
  WHEN 'CS341' THEN 900
  WHEN 'CS361' THEN 1200
  ELSE hourly_rate
END;

-- ------------------------------------------------------------
-- 2) อัตราที่ใช้คิดเงินของคำร้อง (snapshot)
--    เปลี่ยนอัตราของวิชาทีหลัง คำร้องเก่าจะไม่เปลี่ยนตาม
-- ------------------------------------------------------------
ALTER TABLE claim ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2);

-- คำร้องเดิม: ใช้อัตราปัจจุบันของวิชา
UPDATE claim c
   SET hourly_rate = co.hourly_rate
  FROM section s
  JOIN course co ON co.id = s.course_id
 WHERE s.id = c.section_id
   AND c.hourly_rate IS NULL;

ALTER TABLE claim ALTER COLUMN hourly_rate SET NOT NULL;
ALTER TABLE claim DROP CONSTRAINT IF EXISTS claim_hourly_rate_check;
ALTER TABLE claim ADD CONSTRAINT claim_hourly_rate_check CHECK (hourly_rate >= 0);

-- เติมอัตราให้อัตโนมัติ (Lambda ไม่ต้องส่ง hourly_rate)
--   INSERT                       -> ใช้อัตราของวิชา ถ้าไม่ได้ระบุมา
--   UPDATE section_id (ตอนร่าง) -> เปลี่ยนเป็นอัตราของวิชาใหม่
CREATE OR REPLACE FUNCTION claim_set_hourly_rate() RETURNS trigger AS $$
BEGIN
  IF NEW.hourly_rate IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.section_id IS DISTINCT FROM OLD.section_id) THEN
    SELECT co.hourly_rate INTO NEW.hourly_rate
      FROM section s
      JOIN course co ON co.id = s.course_id
     WHERE s.id = NEW.section_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_claim_hourly_rate ON claim;
CREATE TRIGGER trg_claim_hourly_rate
  BEFORE INSERT OR UPDATE OF section_id ON claim
  FOR EACH ROW EXECUTE FUNCTION claim_set_hourly_rate();

-- ------------------------------------------------------------
-- 3) ยื่นได้เดือนละ 1 คำร้องต่อ section
--    (claim_period 1 แถว = 1 เดือน จึงใช้ period_id แทนเดือน)
--    คำร้องที่ยกเลิก (2) ไม่นับ -> ยกเลิกแล้วสร้างใหม่ได้
--    คำร้องที่ถูกตีกลับ (3) ยังนับ -> ให้แก้ไขคำร้องเดิมแล้วยื่นใหม่
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_one_per_month
  ON claim (claimant_id, section_id, period_id)
  WHERE status <> 2;

-- ------------------------------------------------------------
-- 4) จำนวนเงินของแต่ละคำร้อง
-- ------------------------------------------------------------
DROP VIEW IF EXISTS claim_amount;
CREATE VIEW claim_amount AS
SELECT c.id                                       AS claim_id,
       c.hourly_rate,
       COALESCE(sum(cd.hour), 0)                  AS total_hour,
       (COALESCE(sum(cd.hour), 0) * c.hourly_rate)::NUMERIC(12,2) AS amount
  FROM claim c
  LEFT JOIN claim_date cd ON cd.claim_id = c.id
 GROUP BY c.id, c.hourly_rate;

COMMIT;
