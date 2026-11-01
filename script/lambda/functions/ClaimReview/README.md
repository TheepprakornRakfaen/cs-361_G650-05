# ClaimReview

| Method | Route | จากสถานะ → ไปสถานะ | กลุ่ม | ต้องมี comment |
|---|---|---|---|---|
| POST | `/api/claims/{id}/pass` | 1 → 2 | REVIEWER | ไม่ |
| POST | `/api/claims/{id}/return` | 1 → 5 (REVIEWER) / 2 → 5 (APPROVER) | REVIEWER, APPROVER | ใช่ |
| POST | `/api/claims/{id}/approve` | 2 → 3 | APPROVER | ไม่ |
| POST | `/api/claims/{id}/reject` | 2 → 4 | APPROVER | ใช่ |

- Lambda ตัวเดียว แยกการกระทำจากส่วนท้ายของ `event.resource` (`pass|return|approve|reject`)
- `UPDATE ... WHERE status = ANY(สถานะที่อนุญาต) AND claimant_id <> ผู้ตรวจ` กันข้ามขั้นตอนและกันตรวจคำขอของตัวเอง
- ตาราง: `claim` (ใช้คอลัมน์ `return_comment`, `reviewed_by`, `reviewed_at` จาก migration 010)
- Env: `DATABASE_URL`, Timeout >= 10 วินาที
- ไม่เขียน `audit_log` (ส่วนนั้นอยู่ที่ `/actions` ของ workflow Lambda)
