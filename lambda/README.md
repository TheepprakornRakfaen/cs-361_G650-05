# lambda/

โค้ด AWS Lambda ของระบบ CS361 (Node.js 22, ESM) อยู่หลัง API Gateway `cs361-claims-api` และอยู่ใน VPC เดียวกับ RDS

| โฟลเดอร์ | Route | หน้าที่ |
|---|---|---|
| [`me/`](me/) | `POST /api/auth/me` | สร้าง/อัปเดตผู้ใช้ใน `app_user` และคืนกลุ่ม |
| [`lookup-api/`](lookup-api/) | `GET /api/term`, `/api/period`, `/api/courses` | ข้อมูลอ้างอิงสำหรับฟอร์มยื่น |
| [`ClaimsUserRequests/`](ClaimsUserRequests/) | `/api/claims`, `/api/claims/{id}/resend` | สร้าง ดู ลบ และส่งใหม่ของผู้ยื่น + คิวตรวจ |
| [`ClaimReview/`](ClaimReview/) | `/api/claims/{id}/pass\|return\|approve\|reject` | ตรวจสอบและอนุมัติ |

| [`auth-api/`](auth-api/) | `POST /api/login`, `/api/signup`, `/api/signup/confirm` | ล็อกอิน/สมัครผ่าน Cognito (ไม่แน่ใจว่ายังใช้ หน้าเว็บใช้ Amplify) |
| [`pre-token-generation/`](pre-token-generation/) | Cognito trigger | ใส่กลุ่มและ id ลง token (ไม่แน่ใจว่ายังผูกอยู่) |
| [`ClaimsUserRequests-evidence/`](ClaimsUserRequests-evidence/) | `GET /api/claims/{id}/evidence` | อ่านหลักฐานจาก S3 รุ่นเก่า |
| [`_legacy/`](_legacy/) | - | รุ่นทดสอบที่ถูกแทนที่แล้ว (`api`, `get-user`, `claims`, `test-api`) |

รายละเอียด request/response อยู่ใน [`docs/api/`](../docs/api/)

## ยังไม่อยู่ใน repo นี้

| ส่วน | เหตุผล |
|---|---|
| Evidence (ขอลิงก์อัปโหลด `PUT` S3 / บันทึกหลักฐาน / ขอลิงก์อ่าน) | โค้ดรุ่นปัจจุบันไม่อยู่ในโฟลเดอร์งาน ต้องดึงจาก Lambda Console |
| workflow ของเพื่อน (`/actions`, `/history`, `/audit-logs`) | โค้ดอยู่กับผู้พัฒนาส่วนนั้น |
| `POST /api/claims/batch-actions` (V4) | ยังไม่ได้พัฒนา (มีเฉพาะ mock ฝั่งหน้าเว็บ) |

## Environment variables

| ตัวแปร | ใช้ใน | ค่า |
|---|---|---|
| `DATABASE_URL` | ทุก function | `postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims` (ตั้งใน Lambda Console เท่านั้น **ห้ามใส่ในโค้ดหรือ commit**) |

## วิธีสร้างไฟล์ zip เพื่ออัปโหลด

```bash
cd lambda/<ชื่อโฟลเดอร์>
npm install --omit=dev
zip -r function.zip .
```

จากนั้นอัปโหลด `function.zip` ที่ Lambda Console (ไฟล์ zip และ `node_modules/` ถูกกันไว้ใน `.gitignore`)

## ข้อกำหนดการตั้งค่าบน AWS

- Runtime Node.js 22.x, Handler `index.handler`, Timeout >= 10 วินาที
- อยู่ใน VPC เดียวกับ RDS และใช้ security group `cs361-lambda-sg`
- ทุก method ใน API Gateway ใช้ **Cognito authorizer** และ **Lambda proxy integration**
- แก้โค้ดแล้วต้อง **Deploy API** ไปที่ stage `v2`
