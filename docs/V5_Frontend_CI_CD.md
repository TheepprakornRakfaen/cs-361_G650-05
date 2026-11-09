# V5 – Frontend CI/CD Pipeline

## ภาพรวม

| รายการ | ค่า |
|--------|-----|
| Workflow file | `.github/workflows/frontend-deploy.yml` |
| Trigger | Push to `main` / `V4` / `V5` |
| Runner | `ubuntu-latest` |
| Node.js | 20 |
| Build tool | Vite 5 |
| Deploy target | AWS Amplify |

---

## Pipeline Flow

```
Push to branch
      │
      ▼
┌─────────────────────────────────────────┐
│  JOB 1: Build                           │
│                                         │
│  1. Checkout code                       │
│  2. Setup Node.js 20 + npm cache        │
│  3. npm ci --prefer-offline             │
│  4. กำหนด .env.production.local        │
│     ตาม branch (ไม่ hard-code secrets)  │
│  5. npm run build                       │
│  6. ตรวจสอบ dist/ output               │
│  7. Upload artifact (retention 7 วัน)   │
└──────────────┬──────────────────────────┘
               │  (push เท่านั้น)
               ▼
┌─────────────────────────────────────────┐
│  JOB 2: Deploy                          │
│                                         │
│  1. Download artifact                   │
│  2. ตรวจสอบ artifact                    │
│  3. Zip dist/                           │
│  4. Configure AWS credentials           │
│  5. Upload zip → S3 staging bucket      │
│  6. aws amplify start-deployment        │
│  7. รอ deployment สำเร็จ (poll 15s)     │
│  8. Smoke test HTTP 200                 │
│  9. เขียน deployment summary           │
└─────────────────────────────────────────┘
```

---

## Environment Variables ต่อ Branch

| Variable | V5 (dev) | V4 (staging) | main (prod) |
|----------|----------|--------------|-------------|
| `VITE_ENV` | `development` | `staging` | `production` |
| `VITE_API_URL` | STAGING_API_URL | STAGING_API_URL | PROD_API_URL |
| `VITE_COGNITO_USER_POOL_ID` | STAGING_COGNITO_POOL_ID | STAGING_COGNITO_POOL_ID | PROD_COGNITO_POOL_ID |
| `VITE_COGNITO_CLIENT_ID` | STAGING_COGNITO_CLIENT_ID | STAGING_COGNITO_CLIENT_ID | PROD_COGNITO_CLIENT_ID |
| `VITE_DEV_AUTH_BYPASS` | `true` | — | — |

> **หมายเหตุ:** ค่า env ไม่มีใน repository — ดึงจาก GitHub Secrets ทั้งหมด

---

## Secrets ที่ต้องตั้งใน GitHub

ไปที่ **Settings → Secrets and variables → Actions → New repository secret**

### AWS Credentials (ใช้ทุก environment)
```
AWS_ACCESS_KEY_ID          IAM user key (deploy-only, least privilege)
AWS_SECRET_ACCESS_KEY      IAM user secret
AWS_REGION                 เช่น ap-southeast-1 หรือ us-east-1
```

### Amplify
```
AMPLIFY_APP_ID             App ID ดูได้จาก AWS Amplify Console
AMPLIFY_BUILD_BUCKET       S3 bucket สำหรับ staging build artifacts
                           เช่น my-project-amplify-builds
```

### Production (branch: main)
```
PROD_API_URL               https://xxx.execute-api.us-east-1.amazonaws.com/v2
PROD_COGNITO_POOL_ID       us-east-1_xxxxxxx
PROD_COGNITO_CLIENT_ID     xxxxxxxxxxxxxxxxxxxxxxxx
```

### Staging (branch: V4, V5)
```
STAGING_API_URL            https://4gb0aky4q4.execute-api.us-east-1.amazonaws.com/v2
STAGING_COGNITO_POOL_ID    us-east-1_f58xVgKc3
STAGING_COGNITO_CLIENT_ID  4p3t0bt0cng4k19bhtkn26lp6d
```

---

## IAM Policy ที่ต้องการ (Least Privilege)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AmplifyDeploy",
      "Effect": "Allow",
      "Action": [
        "amplify:StartDeployment",
        "amplify:GetJob",
        "amplify:GetBranch",
        "amplify:GetApp"
      ],
      "Resource": "arn:aws:amplify:*:*:apps/<AMPLIFY_APP_ID>/*"
    },
    {
      "Sid": "S3BuildBucket",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::AMPLIFY_BUILD_BUCKET/*"
    }
  ]
}
```

---

## วิธีตั้งค่า AWS Amplify ครั้งแรก

1. **สร้าง Amplify App**
   ```bash
   aws amplify create-app --name "teaching-claim-system"
   ```

2. **สร้าง Branch ใน Amplify** (ทำสำหรับแต่ละ branch)
   ```bash
   aws amplify create-branch \
     --app-id <AMPLIFY_APP_ID> \
     --branch-name V5
   ```

3. **สร้าง S3 Bucket สำหรับ build artifacts**
   ```bash
   aws s3 mb s3://cs361-amplify-builds --region us-east-1
   ```

4. **ตั้ง Secrets ใน GitHub** (ตามตารางด้านบน)

5. **Push code** → Pipeline จะทำงานอัตโนมัติ

---

## การตรวจสอบผล Build และ Deployment

### ดู Pipeline Status
- ไปที่ **GitHub → Actions tab → Frontend – Build & Deploy**
- กด workflow run ล่าสุด → ดู step-by-step log

### Build Summary
แต่ละ run จะมี summary แสดงใน GitHub Actions UI:

```
✅ Build สำเร็จ
| รายการ    | ค่า              |
|-----------|-----------------|
| Branch    | V5              |
| Commit    | abc1234         |
| Dist size | 890K            |
| Build time| 2026-10-27T...  |

🚀 Deployment Summary
| รายการ       | ค่า         |
|--------------|------------|
| Deploy Status| success    |
| Smoke Test   | passed     |
| Frontend URL | https://...  |
```

---

## Acceptance Criteria Checklist

| Criteria | วิธีที่ตรวจสอบ |
|----------|--------------|
| ✅ Build ผ่าน GitHub Actions | Job 1 สำเร็จ — ดูใน Actions tab |
| ✅ Deploy อัตโนมัติหลัง push | Job 2 รันอัตโนมัติทุก push |
| ✅ Environment ถูกต้อง | `.env.production.local` สร้างตาม branch |
| ✅ Secrets ไม่ hard-code | ใช้ `${{ secrets.XXX }}` ทั้งหมด |
| ✅ ไม่ต้อง build/deploy ด้วยมือ | ทุกอย่างอยู่ใน workflow |
| ✅ ตรวจสอบผ่าน GitHub Actions | มี Job summary + step logs |
| ✅ Frontend ใช้งานและเชื่อมต่อ backend | Smoke test HTTP 200 + VITE_API_URL ถูก |
| ✅ มีหลักฐานการทดสอบ | Deployment summary ใน GitHub Actions UI |
