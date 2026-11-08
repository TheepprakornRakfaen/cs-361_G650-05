# me

| รายการ | ค่า |
|---|---|
| Route | `POST /api/auth/me` (หน้าเว็บเรียกหลังล็อกอิน) |
| หน้าที่ | อ่าน claims จาก Cognito authorizer แล้ว upsert ลง `app_user` จากนั้นคืนโปรไฟล์และกลุ่ม |
| ตาราง | `app_user` |
| Env | `DATABASE_URL` |
| ต้องมี | อยู่ใน VPC เดียวกับ RDS (SG `cs361-lambda-sg`), Cognito authorizer ที่ method นี้ |

หมายเหตุ: REST API ส่ง `cognito:groups` เป็นสตริง (`"TEACHER"` หรือ `"[TEACHER, STAFF]"`) ฟังก์ชัน `parseGroups` แปลงให้
