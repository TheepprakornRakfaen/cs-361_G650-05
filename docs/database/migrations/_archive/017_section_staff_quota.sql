-- ============================================================
-- CS361 Migration 017 : โควตาชั่วโมงแยกรายคนในแต่ละ section
--
--   ย้าย hour / max_hour จาก section ไปที่ section_staff (1 แถว = 1 คน ใน 1 section)
--     section_staff.hour     = ชั่วโมงที่คนนั้นเบิกไปแล้ว (คำร้องสถานะ 1,2,3)
--     section_staff.max_hour = ชั่วโมงทั้งหมดที่คนนั้นเบิกได้ใน section นี้
--
--   ข้อมูลเดิม
--     max_hour = section.max_hour เดิม (ทุกคนได้เท่ากัน ปรับรายคนได้ภายหลัง)
--     hour     = ผลรวม claim.hour ของคนนั้นใน section นั้น สถานะ 1,2,3 (คำนวณจากคำร้องจริง)
--
--   ลบ section.hour / section.max_hour หลังย้ายแล้ว
--
-- ก่อนรัน: ต้อง deploy Lambda รุ่นใหม่ (ClaimsPeriodTermCourses, ClaimUserRequest)
--          และ snapshot RDS ไม่อย่างนั้นจะ error ทันทีหลังรัน
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

-- ------------------------------------------------------------
-- 0) ตรวจก่อนเริ่ม (ถ้าไม่ผ่าน ยกเลิกทั้งไฟล์ ไม่มีอะไรเปลี่ยน)
-- ------------------------------------------------------------
DO $$
DECLARE
  n_orphan INT;
BEGIN
  -- คำร้องที่ยังนับชั่วโมง แต่ผู้ยื่นไม่ได้อยู่ใน section_staff ของ section นั้น
  SELECT count(*) INTO n_orphan
    FROM claim c
   WHERE c.status IN (1, 2, 3)
     AND NOT EXISTS (SELECT 1 FROM section_staff ss
                      WHERE ss.section_id = c.section_id AND ss.user_id = c.claimant_id);

  IF n_orphan > 0 THEN
    RAISE EXCEPTION 'มีคำร้อง % รายการที่ผู้ยื่นไม่ได้อยู่ใน section_staff ของ section นั้น เพิ่มแถวใน section_staff ก่อน: '
                    'SELECT c.id, c.section_id, c.claimant_id FROM claim c WHERE c.status IN (1,2,3) AND NOT EXISTS '
                    '(SELECT 1 FROM section_staff ss WHERE ss.section_id = c.section_id AND ss.user_id = c.claimant_id);',
                    n_orphan;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1) เพิ่มคอลัมน์ที่ section_staff
-- ------------------------------------------------------------
ALTER TABLE section_staff
  ADD COLUMN hour     NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN max_hour NUMERIC(6,2) NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 2) ย้ายข้อมูล
-- ------------------------------------------------------------
UPDATE section_staff ss
   SET max_hour = s.max_hour
  FROM section s
 WHERE s.id = ss.section_id;

UPDATE section_staff ss
   SET hour = COALESCE((SELECT sum(c.hour)
                          FROM claim c
                         WHERE c.section_id  = ss.section_id
                           AND c.claimant_id = ss.user_id
                           AND c.status IN (1, 2, 3)), 0);

-- ------------------------------------------------------------
-- 3) ตรวจว่าไม่เกินโควตา แล้วใส่ constraint
-- ------------------------------------------------------------
DO $$
DECLARE
  n_over INT;
BEGIN
  SELECT count(*) INTO n_over FROM section_staff WHERE hour > max_hour;
  IF n_over > 0 THEN
    RAISE EXCEPTION 'มี % คนที่ชั่วโมงที่เบิกเกินโควตา แก้ก่อน: SELECT * FROM section_staff WHERE hour > max_hour;', n_over;
  END IF;
END $$;

ALTER TABLE section_staff
  ADD CONSTRAINT section_staff_hour_check CHECK (hour >= 0 AND hour <= max_hour);

COMMENT ON COLUMN section_staff.hour     IS 'ชั่วโมงที่คนนี้เบิกไปแล้วใน section นี้ (คำร้องสถานะ 1,2,3)';
COMMENT ON COLUMN section_staff.max_hour IS 'ชั่วโมงทั้งหมดที่คนนี้เบิกได้ใน section นี้';

-- ------------------------------------------------------------
-- 4) ลบโควตาระดับ section
-- ------------------------------------------------------------
ALTER TABLE section DROP CONSTRAINT IF EXISTS section_hour_check;
ALTER TABLE section
  DROP COLUMN hour,
  DROP COLUMN max_hour;

COMMIT;

-- ------------------------------------------------------------
-- ตรวจผล
-- ------------------------------------------------------------
-- \d section_staff
-- SELECT ss.section_id, u.username, ss.role, ss.hour, ss.max_hour
--   FROM section_staff ss JOIN app_user u ON u.cognito_sub = ss.user_id ORDER BY 1, 2;
