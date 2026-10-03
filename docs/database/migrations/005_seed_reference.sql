-- =====================================================================
-- CS361 Migration 005 : ข้อมูลทดสอบ
-- =====================================================================
SET client_encoding = 'UTF8';

BEGIN;

INSERT INTO academic_term (id, year, semester, start_date, end_date) VALUES
  (1, 2568, 2, '2026-01-12', '2026-05-15'),
  (2, 2568, 3, '2026-06-01', '2026-07-31'),
  (3, 2569, 1, '2026-08-10', '2026-12-11')
ON CONFLICT DO NOTHING;

INSERT INTO course (id, code, name_th, name_en) VALUES
  (1, 'CS213', 'โครงสร้างข้อมูล',                        'Data Structures'),
  (2, 'CS223', 'ระบบฐานข้อมูล',                          'Database Systems'),
  (3, 'CS251', 'ระบบปฏิบัติการ',                         'Operating Systems'),
  (4, 'CS341', 'วิศวกรรมซอฟต์แวร์',                      'Software Engineering'),
  (5, 'CS361', 'การออกแบบสถาปัตยกรรมซอฟต์แวร์บนคลาวด์', 'Cloud-based Software Architecting')
ON CONFLICT DO NOTHING;

--          id  course     term  section_no
INSERT INTO section (id, course_id, term_id, section_no) VALUES
  (1, 4, 3, '650001'),   -- CS341 1/2569
  (2, 4, 3, '650002'),   -- CS341 1/2569
  (3, 5, 3, '650001'),   -- CS361 1/2569
  (4, 1, 3, '650001'),   -- CS213 1/2569
  (5, 2, 3, '650001'),   -- CS223 1/2569
  (6, 1, 1, '650001'),   -- CS213 2/2568
  (7, 3, 1, '650001')    -- CS251 2/2568
ON CONFLICT DO NOTHING;

INSERT INTO class_schedule (section_id, hour, max_hour, start_time, end_time) VALUES
  (1, 12, 45, '09:30', '12:30'),
  (2,  9, 45, '13:30', '16:30'),
  (3, 15, 45, '09:30', '12:30'),
  (4,  6, 45, '13:30', '16:30'),
  (5,  0, 30, '08:00', '10:00'),
  (6, 45, 45, '09:30', '12:30'),
  (7, 42, 45, '13:30', '16:30')
ON CONFLICT DO NOTHING;

-- รอบของเทอม 1/2569 (ก.ย. เปิดรับอยู่)
INSERT INTO claim_period (id, term_id, month, open_at, close_at, status) VALUES
  (1, 3,  8, '2026-09-01 00:00+07', '2026-09-10 23:59+07', 0),
  (2, 3,  9, '2026-09-25 00:00+07', '2026-10-10 23:59+07', 1),
  (3, 3, 10, '2026-11-01 00:00+07', '2026-11-10 23:59+07', 0),
  (4, 3, 11, '2026-12-01 00:00+07', '2026-12-10 23:59+07', 0),
  (5, 3, 12, '2026-12-14 00:00+07', '2026-12-24 23:59+07', 0)
ON CONFLICT DO NOTHING;

INSERT INTO compensation_type (id, code, name) VALUES
  (1, 'TEACHING', 'ค่าตอบแทนการสอน')
ON CONFLICT DO NOTHING;

-- ผู้สอนของแต่ละ section (หาผู้ใช้จาก username เพราะ cognito_sub อาจถูกเปลี่ยนเป็นของจริงแล้ว)
INSERT INTO section_staff (section_id, user_id, role)
SELECT v.section_id, u.cognito_sub, v.role
FROM (VALUES
        (1, 'teacher01@example.com', 'INSTRUCTOR'),
        (3, 'teacher01@example.com', 'INSTRUCTOR'),
        (6, 'teacher01@example.com', 'INSTRUCTOR'),
        (2, 'teacher02@example.com', 'INSTRUCTOR'),
        (4, 'teacher02@example.com', 'INSTRUCTOR'),
        (5, 'teacher02@example.com', 'INSTRUCTOR'),
        (7, 'teacher02@example.com', 'INSTRUCTOR'),
        (3, 'ta01@example.com',      'TA'),
        (2, 'ta02@example.com',      'TA')
     ) AS v(section_id, username, role)
JOIN app_user u ON lower(u.username) = v.username
ON CONFLICT DO NOTHING;

-- ให้ id ที่สร้างใหม่ภายหลังต่อจากเลขล่าสุด (ไม่ชนกับ id ที่ใส่เอง)
SELECT setval('academic_term_id_seq',     (SELECT max(id) FROM academic_term));
SELECT setval('course_id_seq',            (SELECT max(id) FROM course));
SELECT setval('section_id_seq',           (SELECT max(id) FROM section));
SELECT setval('claim_period_id_seq',      (SELECT max(id) FROM claim_period));
SELECT setval('compensation_type_id_seq', (SELECT max(id) FROM compensation_type));

COMMIT;
