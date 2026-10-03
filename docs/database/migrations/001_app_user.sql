-- =====================================================================
-- CS361 Migration 001 : เพิ่มผู้ใช้งาน
-- =====================================================================
SET client_encoding = 'UTF8';

CREATE TABLE app_user (
  cognito_sub  UUID PRIMARY KEY,                       
  username     TEXT NOT NULL,                          
  name         TEXT NOT NULL,                        
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- username ห้ามซ้ำ (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
CREATE UNIQUE INDEX idx_app_user_username ON app_user (lower(username));
