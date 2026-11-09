
-- V5 Reference Seed
-- Safe to apply to existing databases.
-- Does not overwrite administrator-configured rates.

BEGIN;

INSERT INTO compensation_type
  (code, name, hourly_rate)
VALUES
  ('TEACHING', 'ค่าตอบแทนอาจารย์ผู้สอนบรรยาย', 600),
  ('SPECIAL_LECTURER', 'ค่าตอบแทนอาจารย์พิเศษภายนอก', 900)
ON CONFLICT (code) DO NOTHING;

COMMIT;
