-- ============================================================
-- 004 : ตารางงบประมาณรายปี (academic_year)
--
--   - academic_year.year (ปี พ.ศ.) เป็น PRIMARY KEY และมีคอลัมน์ budget (งบประมาณของปีนั้น)
--   - academic_term.year ชี้ไป academic_year.year (FOREIGN KEY)
--   - ปีที่มีอยู่ใน academic_term แล้ว จะถูกเพิ่มเข้า academic_year อัตโนมัติ (budget = 0)
--     ให้แก้งบจริงทีหลังด้วย UPDATE academic_year SET budget = ... WHERE year = ...
--
--   ใช้กับ RDS ที่รัน migration เดิมถึง 017 (baseline 001_schema.sql ใหม่รวมไฟล์นี้แล้ว)
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

CREATE TABLE academic_year (
  year    INT PRIMARY KEY,                                    -- ปี พ.ศ. เช่น 2569
  budget  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (budget >= 0) -- งบประมาณของปี (บาท)
);

COMMENT ON TABLE  academic_year        IS 'งบประมาณรายปีการศึกษา';
COMMENT ON COLUMN academic_year.year   IS 'ปี พ.ศ. (อ้างอิงจาก academic_term.year)';
COMMENT ON COLUMN academic_year.budget IS 'งบประมาณค่าตอบแทนของปีนั้น (บาท)';

-- ย้ายปีที่มีอยู่แล้วเข้าตารางใหม่
INSERT INTO academic_year (year)
SELECT DISTINCT year FROM academic_term
ON CONFLICT (year) DO NOTHING;

ALTER TABLE academic_term
  ADD CONSTRAINT academic_term_year_fkey
  FOREIGN KEY (year) REFERENCES academic_year (year);

COMMIT;
