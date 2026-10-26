-- ============================================================
-- CS361 Migration 013 : บัญชีธนาคารของผู้ใช้ (บัญชีรับเงินโอน)
--
--   เพิ่มเลขบัญชีธนาคารในโปรไฟล์ผู้ใช้ (ตาราง app_user)
--   ใช้เป็นบัญชีปลายทางเมื่อระบบจ่ายเงินค่าตอบแทนการสอน
--
--   หมายเหตุด้านความปลอดภัย:
--     - เก็บเลขบัญชีแบบเต็มไว้ที่ backend เท่านั้น
--     - ทุก API ที่ส่งออกไปหน้าเว็บต้องปิดบังเหลือ 4 ตัวท้าย (เช่น xxxxxx7890)
--       (ฝั่ง UI มี maskBankAccount เป็นชั้นป้องกันเพิ่ม ไม่ใช่ชั้นหลัก)
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

ALTER TABLE app_user
  ADD COLUMN bank_name       TEXT,
  ADD COLUMN bank_account_no TEXT;

-- เลขบัญชีต้องเป็นตัวเลข 10–15 หลัก (รองรับทุกธนาคาร) หรือเว้นว่าง
ALTER TABLE app_user
  ADD CONSTRAINT app_user_bank_account_no_check
  CHECK (bank_account_no IS NULL OR bank_account_no ~ '^[0-9]{10,15}$');

COMMENT ON COLUMN app_user.bank_name       IS 'ชื่อธนาคารของบัญชีรับเงินโอน';
COMMENT ON COLUMN app_user.bank_account_no IS 'เลขบัญชีรับเงินโอน (เก็บเต็ม backend ปิดบังก่อนส่งออก)';

-- เติมบัญชีให้ผู้ใช้ทดสอบ (ดู migration 003)
UPDATE app_user SET bank_name = 'ธนาคารกรุงไทย',     bank_account_no = '1234567890'
  WHERE username = 'teacher01@example.com';
UPDATE app_user SET bank_name = 'ธนาคารไทยพาณิชย์',  bank_account_no = '4051122334'
  WHERE username = 'teacher02@example.com';
UPDATE app_user SET bank_name = 'ธนาคารกสิกรไทย',    bank_account_no = '7889900112'
  WHERE username = 'ta01@example.com';
UPDATE app_user SET bank_name = 'ธนาคารกรุงเทพ',     bank_account_no = '1472583690'
  WHERE username = 'ta02@example.com';

COMMIT;

-- ------------------------------------------------------------
-- ตรวจผล
-- ------------------------------------------------------------
-- \d app_user
-- SELECT username, bank_name, bank_account_no FROM app_user ORDER BY username;
