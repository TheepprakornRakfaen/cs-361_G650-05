# infra/ - Infrastructure as Code (CloudFormation)

โฟลเดอร์นี้สร้างระบบ backend ของ CS361 (กลุ่ม GRP05) บน AWS ด้วยคำสั่งเดียว แทนการคลิกสร้างใน Console ทีละอย่าง
ใช้ **AWS CloudFormation** (ส่วนของ Lambda/API ใช้ส่วนขยาย SAM) และสคริปต์ bash ที่ `deploy_script/`

> ขอบเขต: automation ของการ build และ deploy ฝั่ง backend เท่านั้น
> Frontend (Amplify) ยังตั้งค่าด้วยมือ ดูหัวข้อ [ข้อจำกัด](#8-ข้อจำกัดที่ต้องรู้)

---

## 1. สิ่งที่สร้างให้

| Stack | ไฟล์ | สร้างอะไร |
|---|---|---|
| `cs361-net-test` | `network.yaml` | VPC, subnet 3 ก้อน (Lambda 1 + DB 2), route table (ไม่มีทางออกอินเทอร์เน็ต), S3 Gateway endpoint, Security Group, RDS PostgreSQL (Single-AZ), S3 bucket เก็บไฟล์หลักฐาน (private) |
| `cs361-backend-test` | `backend.yaml` | Cognito (User Pool, App client, กลุ่ม TEACHER/TA/REVIEWER/APPROVER/ADMIN), Lambda 7 ตัว + Lambda รัน migration, API Gateway (REST, stage `v2`, Cognito authorizer, CORS) |

ลำดับสำคัญ: **network ต้องสร้างก่อน backend** เพราะ backend ดึงค่า (subnet, security group, endpoint ของ RDS, ชื่อ bucket)
จาก Output ของ network ผ่าน `Fn::ImportValue`

```
network.yaml  --(Export)-->  backend.yaml
 VPC, RDS, S3                 Lambda, API, Cognito
```

## 2. โครงสร้างไฟล์

```
infra/
├── network.yaml            # VPC + RDS + S3
├── backend.yaml            # Cognito + Lambda + API Gateway (SAM)
├── README.md               # เอกสารนี้
└── deploy_script/
    ├── build.sh            # เตรียมโค้ด Lambda ลง build/
    ├── deploy.sh           # สร้างทั้งระบบ
    ├── destroy.sh          # ลบทั้งระบบ
    └── migrate/index.mjs   # Lambda ชั่วคราวสำหรับรัน SQL migration
```

`build/` ถูกสร้างตอนรันสคริปต์ **ห้าม commit** (ควรอยู่ใน `.gitignore`)

## 3. สิ่งที่ต้องมีก่อนเริ่ม

- AWS Learner Lab ที่ Start Lab แล้ว (ไฟสถานะเขียว) และ region เป็น **us-east-1**
- AWS CLI v2, Node.js และ npm, git
  (ใน **AWS CloudShell** มีให้ครบ ปกติเปิดได้จากไอคอน `>_` บนแถบของ Console)
- ไฟล์ใน repo ต้องถูก commit และ push แล้ว

## 4. วิธี deploy ทีละขั้น (ผ่าน CloudShell)

```bash
# 1) ดึงโค้ด
git clone https://github.com/<ชื่อ>/<repo>.git
cd <repo>
git checkout <branch>

# 2) ตั้งรหัสผ่าน (ห้ามมีช่องว่างรอบ = และไม่ต้องเขียนลงไฟล์)
export DB_PASSWORD='ตัวอักษรและตัวเลขเท่านั้น'     # รหัสฐานข้อมูล อย่างน้อย 8 ตัว
export SEED_PASSWORD='Claim1234'                    # รหัสผู้ใช้ทดสอบ (ไม่ตั้ง = ข้ามขั้นสร้างผู้ใช้)

# 3) รัน
bash infra/deploy_script/deploy.sh
```

ใช้เวลาราว 15-20 นาที ส่วนใหญ่คือรอ RDS อย่าปิดแท็บ
ถ้า CloudShell หลุดกลางคัน รันคำสั่งเดิมซ้ำได้ (สคริปต์รันซ้ำได้)

### ข้อกำหนดของรหัสผ่าน

| ตัวแปร | กติกา |
|---|---|
| `DB_PASSWORD` | 8 ตัวขึ้นไป ใช้ตัวอักษรและตัวเลขเท่านั้น (จะถูกต่อเข้า `DATABASE_URL`; RDS ไม่รับ `/ @ "` และช่องว่าง) |
| `SEED_PASSWORD` | ตามนโยบาย Cognito: 8 ตัวขึ้นไป มีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข |

### สคริปต์ทำอะไรบ้าง (ตามลำดับ)

| ขั้น | สิ่งที่ทำ |
|---|---|
| 0 | ตรวจ credentials และหา ARN ของ `LabRole` |
| 1 | `build.sh` สร้าง `build/` และติดตั้ง `node_modules` ให้ Lambda แต่ละตัว |
| 2 | สร้าง S3 bucket พัก zip (`<prefix>-artifacts-<account>-<region>`) ถ้ายังไม่มี |
| 3 | deploy `network.yaml` |
| 4 | `package` อัปโหลดโค้ด Lambda ขึ้น S3 แล้ว deploy `backend.yaml` |
| 5 | เรียก Lambda `ClaimMigrate` รัน SQL `docs/database/migrations/001-004` |
| 6 | สร้างผู้ใช้ทดสอบใน Cognito (ถ้าตั้ง `SEED_PASSWORD`) |
| 7 | พิมพ์ค่าที่ต้องใส่ใน Amplify |

### ขั้นตอนหลังสคริปต์จบ (ทำด้วยมือ)

สคริปต์พิมพ์ค่าสามตัวนี้ออกมา ให้นำไปใส่ใน **Amplify > App settings > Environment variables**
แล้วกด **Redeploy** (ค่า `VITE_*` ถูกฝังตอน build ต้อง build ใหม่)

```
VITE_API_URL=...
VITE_COGNITO_USER_POOL_ID=...
VITE_COGNITO_CLIENT_ID=...
```

## 5. ตัวแปรที่เปลี่ยนได้

ตั้งก่อนรัน เช่น `NET_STACK=my-net bash infra/deploy_script/deploy.sh`
ถ้าไม่ตั้งจะใช้ค่าตั้งต้น

| ตัวแปร | ค่าตั้งต้น | ใช้ทำอะไร |
|---|---|---|
| `DB_PASSWORD` | (บังคับ) | รหัสผ่าน RDS |
| `SEED_PASSWORD` | (ไม่บังคับ) | รหัสผู้ใช้ทดสอบ |
| `PREFIX` | `cs361` | คำนำหน้าชื่อ resource |
| `NET_STACK` | `cs361-net-test` | ชื่อ stack network (backend ใช้ชื่อนี้ import ค่า) |
| `BACKEND_STACK` | `cs361-backend-test` | ชื่อ stack backend |
| `FUNCTION_PREFIX` | `GRP05-test-` | คำนำหน้าชื่อ Lambda (`-test-` กันชื่อชนกับ Lambda ตัวจริง) |
| `CORS_ORIGIN` | `*` | origin ของเว็บ ใช้จริงควรเป็นโดเมน Amplify |
| `ARTIFACT_BUCKET` | `<prefix>-artifacts-<account>-<region>` | bucket พัก zip |
| `AWS_REGION` | `us-east-1` | region |

`destroy.sh` ต้องใช้ชื่อ `PREFIX`, `NET_STACK`, `BACKEND_STACK` เดียวกับตอน deploy

## 6. การปรับปรุงระบบหลัง deploy แล้ว

แก้ไฟล์ แล้ว **รัน `deploy.sh` ซ้ำ** (ไม่ต้องลบของเดิม) CloudFormation เทียบกับของที่มีอยู่ และอัปเดตเฉพาะส่วนที่เปลี่ยน

| เปลี่ยนอะไร | ผล |
|---|---|
| โค้ดใน `backend/lambda/functions/*` | build ใหม่ zip ใหม่ แล้วอัปเดต Lambda ตัวที่เปลี่ยน |
| ค่าใน `network.yaml` / `backend.yaml` (เช่น timeout, CORS) | อัปเดตเฉพาะ resource ที่เกี่ยวข้อง |
| ไฟล์ SQL ใหม่ใน `docs/database/migrations/` (เช่น 005) | Lambda migrate รันเฉพาะไฟล์ที่ยังไม่เคยรัน (จดไว้ในตาราง `schema_migrations`) |

ดูผลได้ที่ Console > CloudFormation > เลือก stack > แท็บ **Events**

**ข้อควรระวัง:** บางการแก้ไข network (เช่น เปลี่ยน subnet, เปลี่ยนรหัส DB) อาจทำให้ CloudFormation ลบแล้วสร้าง resource ใหม่ ซึ่งข้อมูลใน RDS หายได้
อ่านสรุป change ใน Events ก่อนยืนยันเสมอ และสำรองข้อมูลก่อนแก้ส่วน `Db`

## 7. การลบทั้งระบบ

```bash
bash infra/deploy_script/destroy.sh              # ถามให้พิมพ์ DELETE ยืนยัน
bash infra/deploy_script/destroy.sh --yes        # ข้ามคำถาม
bash infra/deploy_script/destroy.sh --artifacts  # ลบ bucket พัก zip ด้วย
```

ลำดับ: ลบ backend -> เคลียร์ bucket หลักฐาน -> ลบ network
**ข้อมูลใน RDS และไฟล์หลักฐานหายถาวร** (ไม่มี snapshot สำรอง)

## 8. ข้อจำกัดที่ต้องรู้

- **IAM:** Learner Lab สร้าง IAM role ใหม่ไม่ได้ ทุก Lambda จึงใช้ `LabRole` ที่มีอยู่แล้ว (สคริปต์หา ARN ให้เอง)
  ดังนั้น role/policy ไม่อยู่ใน IaC
- **Credentials ชั่วคราว:** อยู่ได้ประมาณ 4 ชั่วโมง ต้อง Start Lab ใหม่แล้วตั้งค่าใหม่
  จึงยัง deploy อัตโนมัติจาก GitHub Actions แบบถาวรไม่ได้ (ต้องอัปเดต secret ทุก session)
- **Amplify:** ไม่อยู่ใน IaC ต้องใส่ `VITE_*` ด้วยมือหลัง deploy
- **RDS:** Learner Lab หยุด/เริ่มฐานข้อมูลที่ถูกหยุดไว้เองได้ตามกติกาของ lab
- **RDS อยู่ใน private subnet:** เครื่องเรา (และ CloudShell ปกติ) ต่อ `psql` ตรงๆ ไม่ได้ จึงมี Lambda `ClaimMigrate` รัน SQL แทน
- **ชื่อภาษาไทย:** ข้อความที่ส่งให้ EC2/RDS (เช่น `GroupDescription`) ต้องเป็น ASCII เท่านั้น comment ใน YAML ใช้ไทยได้
