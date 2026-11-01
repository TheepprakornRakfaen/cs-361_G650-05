-- ============================================================
-- CS361 Migration 013 : ข้อมูลทดสอบชุดใหม่ (ภาคการศึกษา / รายวิชา / section / รอบเบิก)
--
--   ลบข้อมูลทดสอบเดิมของ 005 และ 008 แล้วใส่ชุดใหม่ที่ตรงกับ schema หลัง 012
--     - section มี hour / max_hour (ไม่มี class_schedule แล้ว)
--     - course มี hourly_rate (009)
--     - รอบเบิกสร้างให้ทุกเดือนของทุกเทอม (เปิดวันที่ 1–10 ของเดือนถัดไป)
--     - ผู้สอน (section_staff) ผูกกับผู้ใช้ทดสอบของ 003 ใหม่
--
--   ต้องไม่มีคำร้องในระบบ (claim อ้างถึง section / claim_period อยู่)
--   ไม่อย่างนั้นจะยกเลิกทั้งไฟล์ ไม่มีอะไรเปลี่ยน
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

-- ------------------------------------------------------------
-- 0) ตรวจก่อนลบ
-- ------------------------------------------------------------
DO $$
DECLARE
  n_claim INT;
BEGIN
  SELECT count(*) INTO n_claim FROM claim;

  IF n_claim > 0 THEN
    RAISE EXCEPTION 'มีคำร้อง % รายการอ้างถึงข้อมูลเดิม ลบคำร้องก่อนรันไฟล์นี้: DELETE FROM claim;', n_claim;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1) ลบข้อมูลเดิม (ลูกก่อนแม่) แล้วเริ่มเลข id ใหม่
-- ------------------------------------------------------------
DELETE FROM section_staff;
DELETE FROM section;
DELETE FROM claim_period;
DELETE FROM course;
DELETE FROM academic_term;

ALTER SEQUENCE academic_term_id_seq RESTART WITH 1;
ALTER SEQUENCE course_id_seq        RESTART WITH 1;
ALTER SEQUENCE section_id_seq       RESTART WITH 1;
ALTER SEQUENCE claim_period_id_seq  RESTART WITH 1;

-- ------------------------------------------------------------
-- 2) ภาคการศึกษา
-- ------------------------------------------------------------
INSERT INTO academic_term (id, year, semester, start_date, end_date) VALUES
  (1, 2568, 2, '2026-01-12', '2026-05-15'),
  (2, 2568, 3, '2026-06-01', '2026-07-31'),
  (3, 2569, 1, '2026-08-10', '2026-12-11'),   -- เทอมปัจจุบัน
  (4, 2569, 2, '2027-01-11', '2027-05-14');

-- ------------------------------------------------------------
-- 3) รายวิชา + อัตราต่อชั่วโมง (บาท)
-- ------------------------------------------------------------
INSERT INTO course (id, code, name_th, name_en, hourly_rate) VALUES
  (1, 'CS102', 'การเขียนโปรแกรมคอมพิวเตอร์',             'Computer Programming',              60),
  (2, 'CS213', 'โครงสร้างข้อมูล',                        'Data Structures',                   60),
  (3, 'CS223', 'ระบบฐานข้อมูล',                          'Database Systems',                  60),
  (4, 'CS251', 'ระบบปฏิบัติการ',                         'Operating Systems',                 60),
  (5, 'CS341', 'วิศวกรรมซอฟต์แวร์',                      'Software Engineering',              90),
  (6, 'CS361', 'การออกแบบสถาปัตยกรรมซอฟต์แวร์บนคลาวด์', 'Cloud-based Software Architecting', 120),
  (7, 'CS374', 'ปัญญาประดิษฐ์',                          'Artificial Intelligence',           90);

-- ------------------------------------------------------------
-- 4) section (hour = เบิกไปแล้ว เริ่มที่ 0 เพราะยังไม่มีคำร้อง)
-- ------------------------------------------------------------
--          id  course  term  section_no  hour  max_hour
INSERT INTO section (id, course_id, term_id, section_no, hour, max_hour) VALUES
  -- 2/2568
  ( 1, 2, 1, '650001', 0, 45),   -- CS213
  ( 2, 4, 1, '650001', 0, 45),   -- CS251
  -- 3/2568 (ภาคฤดูร้อน)
  ( 3, 1, 2, '650001', 0, 30),   -- CS102
  -- 1/2569 (ปัจจุบัน)
  ( 4, 5, 3, '650001', 0, 45),   -- CS341
  ( 5, 5, 3, '650002', 0, 45),   -- CS341
  ( 6, 6, 3, '650001', 0, 45),   -- CS361
  ( 7, 2, 3, '650001', 0, 45),   -- CS213
  ( 8, 3, 3, '650001', 0, 30),   -- CS223
  ( 9, 7, 3, '650001', 0, 45),   -- CS374
  -- 2/2569
  (10, 1, 4, '650001', 0, 45),   -- CS102
  (11, 4, 4, '650001', 0, 45);   -- CS251

-- ------------------------------------------------------------
-- 5) ผู้สอนของแต่ละ section (ผู้ใช้ทดสอบจาก 003)
-- ------------------------------------------------------------
INSERT INTO section_staff (section_id, user_id, role)
SELECT v.section_id, u.cognito_sub, v.role
FROM (VALUES
        ( 1, 'teacher01@example.com', 'INSTRUCTOR'),
        ( 2, 'teacher02@example.com', 'INSTRUCTOR'),
        ( 3, 'teacher01@example.com', 'INSTRUCTOR'),
        ( 4, 'teacher01@example.com', 'INSTRUCTOR'),
        ( 5, 'teacher02@example.com', 'INSTRUCTOR'),
        ( 6, 'teacher01@example.com', 'INSTRUCTOR'),
        ( 7, 'teacher02@example.com', 'INSTRUCTOR'),
        ( 8, 'teacher02@example.com', 'INSTRUCTOR'),
        ( 9, 'teacher01@example.com', 'INSTRUCTOR'),
        (10, 'teacher02@example.com', 'INSTRUCTOR'),
        (11, 'teacher01@example.com', 'INSTRUCTOR'),
        ( 4, 'ta01@example.com',      'TA'),
        ( 6, 'ta01@example.com',      'TA'),
        ( 5, 'ta02@example.com',      'TA'),
        ( 8, 'ta02@example.com',      'TA')
     ) AS v(section_id, username, role)
JOIN app_user u ON lower(u.username) = v.username;

-- ------------------------------------------------------------
-- 6) รอบเบิกทุกเดือนของทุกเทอม
--      เดือนที่สอน = ทุกเดือนตั้งแต่ start_date ถึง end_date
--      เปิดรับ     = วันที่ 1 ของเดือนถัดไป 00:00 (เวลาไทย)
--      ปิดรับ      = วันที่ 10 ของเดือนถัดไป 23:59 (เวลาไทย)
--      status      = 1 ถ้ายังไม่หมดเวลา, รอบที่ผ่านไปแล้ว = 0
-- ------------------------------------------------------------
INSERT INTO claim_period (term_id, month, open_at, close_at, status)
SELECT r.term_id,
       r.month,
       r.open_at,
       r.close_at,
       CASE WHEN r.close_at >= now() THEN 1 ELSE 0 END
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
 ORDER BY r.open_at;

-- ให้ id ที่สร้างภายหลังต่อจากเลขล่าสุด (ไม่ชนกับ id ที่ใส่เอง)
SELECT setval('academic_term_id_seq', (SELECT max(id) FROM academic_term));
SELECT setval('course_id_seq',        (SELECT max(id) FROM course));
SELECT setval('section_id_seq',       (SELECT max(id) FROM section));

COMMIT;

-- ------------------------------------------------------------
-- ตรวจผล
-- ------------------------------------------------------------
-- SELECT t.semester || '/' || t.year AS term, co.code, s.section_no, s.hour, s.max_hour
--   FROM section s JOIN course co ON co.id = s.course_id JOIN academic_term t ON t.id = s.term_id
--  ORDER BY t.year, t.semester, co.code;
-- SELECT t.semester || '/' || t.year AS term, p.month, p.open_at, p.close_at, p.status
--   FROM claim_period p JOIN academic_term t ON t.id = p.term_id ORDER BY p.open_at;
