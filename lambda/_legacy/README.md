# _legacy

โค้ดรุ่นแรก ๆ ที่ใช้ทดสอบการเชื่อมต่อ ถูกแทนที่ด้วยโฟลเดอร์ใน `lambda/` แล้ว เก็บไว้เป็นประวัติ (ไม่ควร deploy)

| โฟลเดอร์ | หน้าที่เดิม | ถูกแทนที่ด้วย |
|---|---|---|
| `api/` | `GET /me`, `GET/POST /claims` รุ่นแรก | `me/`, `ClaimsUserRequests/` |
| `get-user/` | `GET /api/me` ทดสอบ Cognito → API Gateway → Lambda → RDS | `me/` |
| `claims/` | `GET/POST /api/claims` (hour เดียวต่อคำขอ) | `ClaimsUserRequests/` |
| `test-api/` | `GET /test-api/getUser` **ไม่มี auth** ใช้ทดสอบ | ไม่ใช้แล้ว (ควรลบจาก API Gateway) |
