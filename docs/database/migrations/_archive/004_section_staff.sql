-- =====================================================================
-- CS361 Migration 004 : ใครสอน section ไหน
-- =====================================================================
SET client_encoding = 'UTF8';

CREATE TABLE section_staff (
  section_id  INT  NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES app_user(cognito_sub) ON UPDATE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('INSTRUCTOR', 'TA')),
  PRIMARY KEY (section_id, user_id)
);
CREATE INDEX idx_section_staff_user ON section_staff (user_id);
