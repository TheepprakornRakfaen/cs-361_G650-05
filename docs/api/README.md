# CS361 Claims API

REST API บน Amazon API Gateway (`cs361-claims-api`, stage `v2`) ต่อกับ AWS Lambda ใน [`script/lambda/functions/`](../../script/lambda/functions/)

รายละเอียดแต่ละ endpoint: [endpoints.md](endpoints.md)

## ข้อมูลทั่วไป

| รายการ | ค่า |
|---|---|
| Base URL | `https://<api-id>.execute-api.us-east-1.amazonaws.com/v2` (หน้าเว็บอ่านจาก `VITE_API_URL`) |
| รูปแบบข้อมูล | JSON (`Content-Type: application/json`) |
| การยืนยันตัวตน | Header `Authorization: <Cognito ID token>` ตรวจโดย Cognito User Pool authorizer |
| กลุ่มผู้ใช้ (`cognito:groups`) | `TEACHER`, `TA` (ผู้ยื่น), `REVIEWER`, `APPROVER`, `ADMIN` (เตรียมไว้ V4) |
| CORS | ทุก resource ต้องมี method `OPTIONS` |

## รูปแบบ error

```json
{ "message": "ข้อความภาษาไทยที่แสดงให้ผู้ใช้ได้" }
```

| รหัส | ความหมาย |
|---|---|
| 400 | ข้อมูลที่ส่งมาไม่ถูกต้อง |
| 401 | ไม่มี token หรือ token ไม่ถูกต้อง |
| 403 | ไม่มีสิทธิ์ (กลุ่มไม่ถูกต้อง หรือไม่ใช่ผู้สอนของ section) |
| 404 | ไม่พบข้อมูล |
| 405 | ไม่รองรับ method |
| 409 | ขัดแย้งกับสถานะปัจจุบัน (เช่น ยื่นซ้ำ สถานะเปลี่ยนไปแล้ว) |
| 500 | ข้อผิดพลาดฝั่งระบบ (รายละเอียดอยู่ใน CloudWatch ไม่ส่งให้ผู้ใช้) |

## สถานะของคำขอ (`claim.status`)

| รหัส | สถานะ |
|---|---|
| 0 | ร่าง |
| 1 | รอตรวจ |
| 2 | รออนุมัติ |
| 3 | อนุมัติ |
| 4 | ไม่อนุมัติ |
| 5 | ส่งคืนแก้ไข |

```
0 ร่าง ──ยื่น──▶ 1 รอตรวจ ──pass──▶ 2 รออนุมัติ ──approve──▶ 3 อนุมัติ
                    │                    ├──reject──▶ 4 ไม่อนุมัติ
                    └────return─────────┴──return──▶ 5 ส่งคืนแก้ไข ──resend──▶ 1
```

## สรุป endpoint

| Method | Path | Lambda | กลุ่ม |
|---|---|---|---|
| POST | `/api/auth/me` | `ClaimCRUDUser` | ทุกคนที่ล็อกอิน |
| GET | `/api/term` | `ClaimsPeriodTermCourses` | ทุกคนที่ล็อกอิน |
| GET | `/api/period` | `ClaimsPeriodTermCourses` | ทุกคนที่ล็อกอิน |
| GET | `/api/courses` | `ClaimsPeriodTermCourses` | ทุกคนที่ล็อกอิน |
| GET | `/api/claims` | `ClaimUserRequest` | TEACHER, TA |
| GET | `/api/claims?scope=review` | `ClaimUserRequest` | REVIEWER, APPROVER |
| POST | `/api/claims` | `ClaimUserRequest` | TEACHER, TA |
| DELETE | `/api/claims` | `ClaimUserRequest` | TEACHER, TA |
| POST | `/api/claims/{id}/resend` | `ClaimReview` | TEACHER, TA |
| POST | `/api/claims/{id}/pass` | `ClaimReview` | REVIEWER |
| POST | `/api/claims/{id}/return` | `ClaimReview` | REVIEWER, APPROVER |
| POST | `/api/claims/{id}/approve` | `ClaimReview` | APPROVER |
| POST | `/api/claims/{id}/reject` | `ClaimReview` | APPROVER |
| POST | `/api/claims/{id}/evidence/upload-url` | Evidence (ยังไม่อยู่ใน repo) | เจ้าของคำขอ |
| POST/GET | `/api/claims/{id}/evidence` | Evidence (ยังไม่อยู่ใน repo) | เจ้าของ / REVIEWER / APPROVER |
| POST | `/api/claims/{id}/actions` | workflow (ยังไม่อยู่ใน repo) | REVIEWER, APPROVER |
| GET | `/api/claims/{id}/history` | workflow (ยังไม่อยู่ใน repo) | ผู้มีสิทธิ์ |
| GET | `/api/audit-logs` | workflow (ยังไม่อยู่ใน repo) | ผู้มีสิทธิ์ audit |
| POST | `/api/claims/batch-actions` | ยังไม่พัฒนา (V4) | REVIEWER |

## Endpoint ที่หน้าเว็บเรียกจริง และที่ไม่ได้เรียก

หน้าเว็บ (`teaching-claim-system/src/services/api.js`) ตรวจ/อนุมัติผ่าน **`POST /api/claims/{id}/actions`** (body `{ action: REVIEW_PASS|APPROVE|REJECT|RETURN, comment }`) ไม่ได้เรียก `/pass`, `/return`, `/approve`, `/reject` ของ Lambda `ClaimReview` โดยตรง
ดังนั้น `ClaimReview` ใช้ได้ก็ต่อเมื่อมี route เหล่านั้นใน API Gateway หรือหน้าเว็บเปลี่ยนมาเรียก ต้องตัดสินใจว่าจะใช้ตัวไหนเป็นหลัก (ไม่ควรมีทั้งสองชุดที่เปลี่ยนสถานะได้)

## ข้อควรระวังของโค้ดปัจจุบัน

1. โค้ด `ClaimUserRequest` และ `ClaimsPeriodTermCourses` เป็นรุ่นก่อน migration 012 (ใช้ `class_schedule`, `claim_date.hour`) ต้องแก้ก่อนรัน 012 บน RDS
2. `ClaimsPeriodTermCourses` (`/api/period`) เทียบ `claim_period.status = 'OPEN'` (ข้อความ) แต่ใน migration 008 และ `ClaimUserRequest` ใช้ตัวเลข `status = 1` ให้ตรวจว่าเวอร์ชันที่ deploy ใช้แบบไหน
3. ค่า `Access-Control-Allow-Origin` ในทุก Lambda เป็น `*` ควรจำกัดเป็นโดเมน Amplify เมื่อใช้งานจริง
