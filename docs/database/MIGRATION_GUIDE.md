# Database Migration & Seeding Guide

**Project:** CS361 Teaching Claim System  
**Version:** V5  
**Database:** PostgreSQL (AWS RDS)  
**Migration Runtime:** Node.js / AWS Lambda

## 1. Overview

ระบบ Automated Database Migration ช่วยสร้างและอัปเดต PostgreSQL Schema โดยไม่จำเป็นต้องรัน SQL แต่ละไฟล์ด้วยตนเอง

Migration Runner อยู่ที่:

`infra/deploy_script/migrate/index.mjs`

SQL Migration อยู่ที่:

`docs/database/migrations/`

ระบบบันทึกประวัติ Migration ที่ดำเนินการแล้วในตาราง `schema_migrations`

## 2. Migration Files

| File | Description |
|---|---|
| `001_schema.sql` | สร้าง Database Schema สำหรับฐานข้อมูลใหม่ |
| `002_seed.sql` | เพิ่มข้อมูลเริ่มต้นและข้อมูลตัวอย่าง |
| `003_claim_paid_status.sql` | เพิ่มสถานะ Claim Paid |
| `004_add_claim_paid_at.sql` | เพิ่มคอลัมน์ `paid_at` |
| `_archive/` | เก็บ Migration รุ่นเก่าสำหรับอ้างอิง |

Migration Runner จะอ่านไฟล์ `.sql` ตามลำดับชื่อ และไม่รัน Migration ที่บันทึกว่า Applied หรือ Baselined แล้วซ้ำ

## 3. Migration History

ตาราง `schema_migrations` เก็บข้อมูลสำคัญ ได้แก่:

| Column | Purpose |
|---|---|
| `name` | ชื่อ Migration File |
| `checksum` | SHA-256 ของไฟล์ |
| `applied_at` | เวลาบันทึก Migration |
| `baselined` | ระบุว่า Migration ถูกลงทะเบียนจากฐานข้อมูลเดิมหรือไม่ |

ระบบตรวจสอบ Checksum เพื่อช่วยป้องกันการแก้ไข Migration ที่เคยรันแล้ว

**ข้อกำหนด:** หลังจาก Apply Migration แล้ว ไม่ควรแก้ไขเนื้อหาไฟล์เดิม ให้สร้าง Migration ใหม่แทน

## 4. Runner Actions

| Action | Description | Modifies Database |
|---|---|---|
| `status` | แสดง Migration Status | No |
| `baseline-check` | ตรวจสอบฐานข้อมูล Legacy | No |
| `baseline` | ลงทะเบียน Schema และ Seed เดิม | Yes |
| `apply` | รัน Migration ที่ยัง Pending | Yes |

### Check Status

```json
{
  "action": "status"
}
```

### Apply Pending Migrations

```json
{
  "action": "apply"
}
```

### Check Legacy Database

```json
{
  "action": "baseline-check"
}
```

### Register Legacy Baseline

```json
{
  "action": "baseline",
  "confirm": "BASELINE_LEGACY_V4",
  "expectedDatabase": "claims"
}
```

ก่อน Baseline ต้องตรวจ Schema กับฐานข้อมูลเป้าหมาย และสำรองข้อมูลเรียบร้อยแล้ว

## 5. Fresh Database Workflow

สำหรับฐานข้อมูล PostgreSQL ที่ว่างเปล่า:

1. ตรวจสอบ Database Connection
2. เรียก `status`
3. ยืนยันว่า `databaseState` เป็น `empty`
4. อนุญาต Demo Seed เฉพาะ Environment ทดสอบ
5. เรียก `apply`
6. ตรวจสอบรายการ Applied Migrations และข้อมูลเริ่มต้น

หากใช้ Demo Seed ต้องกำหนด `ENABLE_DEMO_SEED=true` เฉพาะ Environment ที่แยกจาก Production

ไม่ควรเปิด Demo Seed ใน Production

## 6. Existing Database Workflow

สำหรับฐานข้อมูล Legacy ที่เคยใช้ Migration รุ่นเก่า:

1. สำรองฐานข้อมูลหรือสร้าง RDS Snapshot
2. เรียก `status` และ `baseline-check`
3. ตรวจสอบ Schema, Constraints, Indexes และข้อมูลอ้างอิง
4. เมื่อผ่านการตรวจสอบแล้ว จึงเรียก `baseline`
5. ตรวจสอบว่า `001_schema.sql` และ `002_seed.sql` มีสถานะ `baselined`
6. เรียก `apply` เพื่ออัปเกรด Migration ที่ยัง Pending
7. ตรวจสอบ Schema และข้อมูลหลัง Migration

**ห้ามรัน `001_schema.sql` ซ้ำกับฐานข้อมูลเดิมที่มีข้อมูลอยู่แล้ว**

การตรวจ `baseline-check` เป็นเพียงการตรวจความพร้อมเบื้องต้น ไม่ใช่การยืนยันว่า Schema เดิมตรงกันทุก Constraint และ Index

## 7. Transaction & Error Handling

Migration Runner ใช้ PostgreSQL Transaction เพื่อให้ SQL และการบันทึก Migration History อยู่ภายใต้ Transaction เดียวกัน

หาก Migration ล้มเหลว:

- Execute `ROLLBACK`
- ไม่บันทึก Migration ที่ล้มเหลวเป็น Applied
- หยุดการทำงานและรายงาน Error
- ไม่ดำเนินการ Migration ถัดไป

Transaction Rollback ไม่ใช่ระบบ Down Migration สำหรับย้อนกลับการเปลี่ยนแปลง Schema ที่ Commit ไปแล้ว

## 8. Security & Environment Configuration

- เก็บ Database Credentials นอก Git Repository
- ใช้ Database Account ที่มีสิทธิ์เหมาะสม
- จำกัดการเรียก Migration Lambda ให้เฉพาะผู้ดูแลระบบที่ได้รับอนุญาต
- ไม่เปิดเผย Migration Runner ผ่าน API Gateway
- สำรองข้อมูลก่อน Upgrade ฐานข้อมูลที่มีข้อมูลสำคัญ
- ใช้ PostgreSQL TLS Certificate Validation ที่เหมาะสมสำหรับ Production
- หลีกเลี่ยงการใช้ Demo Seed ในฐานข้อมูลจริง

ตัวแปรที่เกี่ยวข้อง:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL Connection |
| `ENABLE_DEMO_SEED` | อนุญาต Demo Seed เฉพาะ Environment ทดสอบ |
| `DB_SSL` | ตั้งค่า SSL สำหรับการเชื่อมต่อ |

## 9. Validation Checklist

- [ ] Fresh Database Migration
- [ ] Automatic Seeding
- [ ] Migration Order
- [ ] Migration History Tracking
- [ ] Repeated Execution / Idempotency
- [ ] Checksum Validation
- [ ] Transaction Rollback
- [ ] Legacy Database Baseline
- [ ] Existing Schema Upgrade
- [ ] Final Schema & Seed Verification

## 10. Testing Status

**Status: NOT RUN**

ขั้นตอน Integration Testing ถูกเลื่อนออกไป ยังไม่มีผลทดสอบจริงที่ยืนยันว่า Migration และ Seeding ทำงานครบตาม Acceptance Criteria

ต้องดำเนินการทดสอบก่อนยืนยัน Production Readiness หรือปิด Issue #77

## 11. Scope & Limitations

Issue #77 ครอบคลุม Database Schema, Migration, Seed Data และ Documentation

ไม่รวม Backend Deployment และ Infrastructure Provisioning

Migration Runner รองรับการทำงานบน RDS ผ่าน AWS Lambda ภายใน VPC แต่การนำโค้ด Runner เวอร์ชันใหม่ขึ้น AWS เป็นกระบวนการแยกจาก Issue นี้