-- ============================================================
-- CS361 Migration 012 : Claim Hour & Section Merge
--
--   1) ยื่นคำร้องวิชาเดียวกันได้หลายครั้งในเดือนเดียว
--        ลบ uq_claim_one_per_month (claimant, section, period)
--        -> การกันวันสอนซ้ำย้ายไปตรวจใน Lambda (ClaimsUserRequests)
--
--   2) ชั่วโมงรวมเก็บที่ claim.hour (ผู้ยื่นกรอกครั้งเดียว)
--        claim_date เหลือแค่วันที่สอน
--        view claim_amount คำนวณจาก claim.hour (ชื่อคอลัมน์เดิม)
--
--   3) รวม class_schedule เข้า section
--        section.hour     = ชั่วโมงที่เบิกไปแล้ว (ตัวนับ)
--        section.max_hour = ชั่วโมงทั้งหมดที่เบิกได้
--        start_time / end_time เลิกใช้
--
-- ก่อนรัน: ต้องแก้ Lambda ที่อ่าน class_schedule / claim_date.hour ให้พร้อม deploy
--   (ClaimsUserRequests, Workflow, Lookup) ไม่อย่างนั้นจะ error ทันทีหลังรัน
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

-- ------------------------------------------------------------
-- 0) ตรวจข้อมูลก่อนเริ่ม (ถ้าไม่ผ่าน จะยกเลิกทั้งไฟล์ ไม่มีอะไรเปลี่ยน)
-- ------------------------------------------------------------
DO $$
DECLARE
  n_no_date  INT;
  n_over_max INT;
BEGIN
  SELECT count(*) INTO n_no_date
    FROM claim c
   WHERE NOT EXISTS (SELECT 1 FROM claim_date cd WHERE cd.claim_id = c.id);

  IF n_no_date > 0 THEN
    RAISE EXCEPTION 'มีคำร้อง % รายการที่ไม่มีวันสอน (ชั่วโมงรวม = 0) ลบหรือเพิ่มวันสอนก่อน: '
                    'SELECT id FROM claim c WHERE NOT EXISTS (SELECT 1 FROM claim_date cd WHERE cd.claim_id = c.id);',
                    n_no_date;
  END IF;

  SELECT count(*) INTO n_over_max FROM class_schedule WHERE hour > max_hour;

  IF n_over_max > 0 THEN
    RAISE EXCEPTION 'มี section % รายการที่ hour > max_hour แก้ก่อน: '
                    'SELECT * FROM class_schedule WHERE hour > max_hour;',
                    n_over_max;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1) ยื่นได้หลายครั้งต่อเดือน
-- ------------------------------------------------------------
DROP INDEX IF EXISTS uq_claim_one_per_month;

-- ------------------------------------------------------------
-- 2) ชั่วโมงรวมย้ายไปอยู่ที่ claim
-- ------------------------------------------------------------
-- view เดิมคำนวณจาก claim_date.hour ต้องลบก่อนลบคอลัมน์
DROP VIEW IF EXISTS claim_amount;

ALTER TABLE claim ADD COLUMN hour NUMERIC(6,2);

-- ย้ายข้อมูลเดิม: ชั่วโมงรวม = ผลรวมทุกวันของคำร้องนั้น
UPDATE claim c
   SET hour = (SELECT sum(cd.hour) FROM claim_date cd WHERE cd.claim_id = c.id);

ALTER TABLE claim
  ALTER COLUMN hour SET NOT NULL,
  ADD CONSTRAINT claim_hour_check CHECK (hour > 0);

COMMENT ON COLUMN claim.hour IS 'ชั่วโมงสอนรวมของคำร้อง (ผู้ยื่นกรอกครั้งเดียว)';

-- claim_date เหลือแค่วันที่สอน (UNIQUE (claim_id, teach_date) ยังอยู่)
ALTER TABLE claim_date DROP COLUMN hour;

CREATE VIEW claim_amount AS
SELECT id                                  AS claim_id,
       hourly_rate,
       hour                                AS total_hour,
       (hour * hourly_rate)::NUMERIC(12,2) AS amount
  FROM claim;

-- ------------------------------------------------------------
-- 3) รวม class_schedule เข้า section
-- ------------------------------------------------------------
ALTER TABLE section
  ADD COLUMN hour     NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN max_hour NUMERIC(6,2) NOT NULL DEFAULT 0;

UPDATE section s
   SET hour     = cs.hour,
       max_hour = cs.max_hour
  FROM class_schedule cs
 WHERE cs.section_id = s.id;

ALTER TABLE section
  ADD CONSTRAINT section_hour_check CHECK (hour >= 0 AND hour <= max_hour);

COMMENT ON COLUMN section.hour     IS 'ชั่วโมงที่เบิกไปแล้ว (คำร้องสถานะ 1,2,3)';
COMMENT ON COLUMN section.max_hour IS 'ชั่วโมงทั้งหมดที่เบิกได้';

DROP TABLE class_schedule;

COMMIT;

-- ------------------------------------------------------------
-- ตรวจผล
-- ------------------------------------------------------------
-- \d claim
-- \d claim_date
-- \d section
-- SELECT id, section_no, hour, max_hour FROM section ORDER BY id;
-- SELECT * FROM claim_amount;
