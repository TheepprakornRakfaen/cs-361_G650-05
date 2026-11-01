# script/lambda/functions/

โค้ด AWS Lambda ของระบบ CS361 (Node.js 22, ESM) อยู่หลัง API Gateway `cs361-claims-api` และอยู่ใน VPC เดียวกับ RDS

| โฟลเดอร์ | Route | หน้าที่ |
|---|---|---|
| [`ClaimCRUDUser/`](ClaimCRUDUser/) | `POST /api/auth/me` | สร้าง/อัปเดตผู้ใช้ใน `app_user` และคืนกลุ่ม |
| [`ClaimsPeriodTermCourses/`](ClaimsPeriodTermCourses/) | `GET /api/term`, `/api/period`, `/api/courses` | ข้อมูลอ้างอิงสำหรับฟอร์มยื่น |
| [`ClaimUserRequest/`](ClaimUserRequest/) | `/api/claims` (GET/POST/DELETE) | สร้าง ดู ลบ คำขอของผู้ยื่น + คิวตรวจ |
| [`ClaimReview/`](ClaimReview/) | `/api/claims/{id}/resend\|pass\|return\|approve\|reject` | ส่งใหม่ ตรวจสอบและอนุมัติ |
| [`ClaimWorkflowAPI/`](ClaimWorkflowAPI/) | `/actions`, `/history`, `/batch-actions`, `/api/audit-logs` | ยังไม่มีโค้ด (stub 501) |
| [`ClaimEvidenceAPI/`](ClaimEvidenceAPI/) | `/api/claims/{id}/evidence` POST/GET | ยังไม่มีโค้ด (stub 501) |
| [`ClaimEvidencePresign/`](ClaimEvidencePresign/) | `POST /api/claims/{id}/evidence/upload-url` | ยังไม่มีโค้ด (stub 501) |

ชื่อใน AWS ขึ้นต้นด้วย `GRP05-` เช่น `GRP05-ClaimReview`

รายละเอียด request/response อยู่ใน [`docs/api/`](../../../docs/api/)

## Environment variables

| ตัวแปร | ใช้ใน | ค่า |
|---|---|---|
| `DATABASE_URL` | ทุก function | `postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims` (ตั้งใน Lambda Console เท่านั้น **ห้ามใส่ในโค้ดหรือ commit**) |

## วิธีสร้างไฟล์ zip เพื่ออัปโหลด

```bash
bash script/lambda/package.sh <ชื่อโฟลเดอร์>      # ได้ script/lambda/dist/<ชื่อ>.zip
```

จากนั้นอัปโหลด `function.zip` ที่ Lambda Console (ไฟล์ zip และ `node_modules/` ถูกกันไว้ใน `.gitignore`)

## ข้อกำหนดการตั้งค่าบน AWS

- Runtime Node.js 22.x, Handler `index.handler`, Timeout >= 10 วินาที
- อยู่ใน VPC เดียวกับ RDS และใช้ security group `cs361-lambda-sg`
- ทุก method ใน API Gateway ใช้ **Cognito authorizer** และ **Lambda proxy integration**
- แก้โค้ดแล้วต้อง **Deploy API** ไปที่ stage `v2`
