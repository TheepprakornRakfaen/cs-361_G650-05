-- ============================================================
-- CS361 Migration 009 : ข้อมูลรอบเบิก (claim_period) เพิ่มเติม
--   - เพิ่มภาคการศึกษา 1/2568, 2/2569, 3/2569, 1/2570
--   - สร้างรอบให้ "ทุกเดือน" ของทุกเทอมอัตโนมัติ
--       เดือนที่สอน  = ทุกเดือนตั้งแต่ start_date ถึง end_date
--       เปิดรับ      = วันที่ 1 ของเดือนถัดไป 00:00 (เวลาไทย)
--       ปิดรับ       = วันที่ 10 ของเดือนถัดไป 23:59 (เวลาไทย)
--       status       = 1 (เปิดใช้งาน) ถ้ายังไม่หมดเวลา, รอบที่ผ่านไปแล้ว = 0
--                      ยื่นได้จริงเมื่อ status = 1 และ now() อยู่ระหว่าง open_at - close_at
--   - รอบที่มีอยู่แล้ว (term_id, month ซ้ำ) จะไม่ถูกแก้ -> รันซ้ำได้
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

-- ------------------------------------------------------------
-- 1) ภาคการศึกษาเพิ่มเติม
-- ------------------------------------------------------------
INSERT INTO academic_term (year, semester, start_date, end_date) VALUES
  (2568, 1, '2025-08-11', '2025-12-12'),
  (2569, 2, '2027-01-11', '2027-05-14'),
  (2569, 3, '2027-06-01', '2027-07-30'),
  (2570, 1, '2027-08-09', '2027-12-10')
ON CONFLICT (year, semester) DO NOTHING;

-- ------------------------------------------------------------
-- 2) รอบเบิกทุกเดือนของทุกเทอม
-- ------------------------------------------------------------
INSERT INTO claim_period (term_id, month, open_at, close_at, status)
SELECT r.term_id,
       r.month,
       r.open_at,
       r.close_at,
       CASE WHEN r.close_at >= now() THEN 1 ELSE 0 END             AS status   -- รอบปัจจุบัน/อนาคต = เปิดใช้งาน
  FROM (
        SELECT t.id                                      AS term_id,
               EXTRACT(MONTH FROM m)::INT                AS month,
               ((m + INTERVAL '1 month')::timestamp)
                 AT TIME ZONE 'Asia/Bangkok'             AS open_at,
               ((m + INTERVAL '1 month 9 days 23 hours 59 minutes')::timestamp)
                 AT TIME ZONE 'Asia/Bangkok'             AS close_at
          FROM academic_term t
         CROSS JOIN LATERAL generate_series(date_trunc('month', t.start_date),
                                            date_trunc('month', t.end_date),
                                            INTERVAL '1 month') AS m
       ) AS r
ON CONFLICT (term_id, month) DO NOTHING;

COMMIT;

-- ตรวจผล
SELECT t.semester || '/' || t.year AS term, p.id, p.month,
       to_char(p.open_at  AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI') AS open_at,
       to_char(p.close_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI') AS close_at,
       p.status
  FROM claim_period p JOIN academic_term t ON t.id = p.term_id
 ORDER BY p.open_at;
