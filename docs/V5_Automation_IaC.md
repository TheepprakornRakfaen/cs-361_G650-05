# V5 – Automation / Infrastructure as Code

## เป้าหมาย

Infrastructure และ Deployment ที่สำคัญของระบบต้องสามารถสร้างหรือปรับใช้ซ้ำได้ด้วย Automation / Infrastructure as Code เพื่อลด Manual Configuration และความคลาดเคลื่อนจากการตั้งค่าด้วยมือ

---

## ส่วน Frontend (ทำแล้ว)

### 1. CI/CD Pipeline — GitHub Actions

ไฟล์: `.github/workflows/frontend-deploy.yml`

Pipeline ทำงานอัตโนมัติทุกครั้งที่ push ไปยัง `main` / `V4` / `V5` และมีการเปลี่ยนแปลงใน `teaching-claim-system/`

```
push → [Build Job] → [Deploy Job]
              ↓
     npm ci + vite build
     (env vars ตาม branch)
              ↓
     upload artifact
              ↓
     deploy to AWS Amplify
     หรือ S3 + CloudFront
```

**สิ่งที่ Pipeline ทำแทน Manual:**

| ขั้นตอนเดิม (ทำมือ) | ขั้นตอนใหม่ (อัตโนมัติ) |
|---|---|
| `npm run build` บนเครื่องตัวเอง | Build บน GitHub Actions runner |
| Copy `.env` ให้ถูก environment | ใช้ GitHub Secrets + branch condition |
| Upload `dist/` ขึ้น S3 ด้วยมือ | `aws s3 sync` อัตโนมัติ |
| Invalidate CloudFront ด้วย console | `aws cloudfront create-invalidation` อัตโนมัติ |
| แจ้งทีมว่า deploy แล้ว | ใช้ GitHub deployment status |

### 2. Environment Variables — ไม่มี `.env` ใน repository

ค่า environment แต่ละ branch ถูกจัดการผ่าน **GitHub Secrets** และ **GitHub Environments** ไม่ต้องสร้างไฟล์ `.env` ด้วยมือ:

| Branch | Environment | Secrets ที่ใช้ |
|---|---|---|
| `main` | production | `PROD_API_URL`, `PROD_COGNITO_POOL_ID`, `PROD_COGNITO_CLIENT_ID` |
| `V4` | staging | `STAGING_API_URL`, `STAGING_COGNITO_POOL_ID`, `STAGING_COGNITO_CLIENT_ID` |
| `V5` | development | ใช้ dev mock (ไม่มี backend จริง) |

### 3. Build Configuration — Vite

ไฟล์: `teaching-claim-system/vite.config.js`

กำหนด `manualChunks` แยก vendor libraries (react, amplify, lucide-react) ออกจาก app code เพื่อให้เบราว์เซอร์ cache ได้นาน:

```
dist/
├── index.html           (no-cache)
├── assets/
│   ├── react-[hash].js  (cache 1 ปี — เปลี่ยนเฉพาะ React version)
│   ├── amplify-[hash].js
│   ├── icons-[hash].js
│   └── index-[hash].js  (app code)
```

### 4. Secrets ที่ต้องตั้งใน GitHub

ไปที่ **Settings → Secrets and variables → Actions** แล้วเพิ่ม:

```
AWS_ACCESS_KEY_ID          — IAM user สำหรับ deploy (ให้สิทธิ์เฉพาะที่จำเป็น)
AWS_SECRET_ACCESS_KEY
AWS_REGION                 — เช่น ap-southeast-1
AMPLIFY_APP_ID             — ID ของ Amplify app
BUILD_BUCKET               — S3 bucket สำหรับ staging build artifacts
S3_BUCKET_NAME             — S3 bucket สำหรับ production hosting (ถ้าใช้ตัวเลือก B)
CLOUDFRONT_DISTRIBUTION_ID — (ถ้าใช้ตัวเลือก B)

PROD_API_URL               — เช่น https://api.example.com
PROD_COGNITO_POOL_ID
PROD_COGNITO_CLIENT_ID

STAGING_API_URL
STAGING_COGNITO_POOL_ID
STAGING_COGNITO_CLIENT_ID
```

---

## ส่วน Backend / Infrastructure (งานถัดไป)

| ส่วน | เครื่องมือที่แนะนำ | หมายเหตุ |
|---|---|---|
| AWS VPC, Subnets, Security Groups | Terraform หรือ AWS CDK | ดู `docs/AWS_Architecture/VPC.md` |
| RDS PostgreSQL | Terraform `aws_db_instance` | รัน migrations จาก `docs/database/migrations/` |
| Lambda Functions | AWS SAM / CDK | deploy พร้อมกัน กำหนด memory/timeout ในโค้ด |
| Cognito User Pool | Terraform `aws_cognito_user_pool` | กำหนด groups (TEACHER, TA, REVIEWER, APPROVER, ADMIN) |
| API Gateway | Terraform `aws_apigatewayv2_api` | สร้าง routes จาก `src/services/api.js` |
| S3 Evidence Bucket | Terraform `aws_s3_bucket` | policy: private + signed URL เท่านั้น |

---

## การรัน Pipeline ครั้งแรก

1. Fork/clone repo และตั้ง GitHub Secrets ตามตารางด้านบน
2. Push ไปยัง branch `V5` เพื่อทดสอบ development build
3. สร้าง Pull Request มายัง `main` เพื่อให้ build job ตรวจสอบก่อน merge
4. Merge → deploy job รัน → production อัปเดตอัตโนมัติ

---

## อ้างอิง

- AWS Amplify CI/CD: https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html
- GitHub Actions + AWS: https://github.com/aws-actions/configure-aws-credentials
- Vite Build Configuration: https://vitejs.dev/guide/build.html
