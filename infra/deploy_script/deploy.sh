#!/usr/bin/env bash
# =====================================================================
# deploy.sh - สร้างทั้งระบบตั้งแต่ศูนย์ด้วยคำสั่งเดียว
#
# ลำดับการทำงาน:
#   0) ตรวจ credentials และหา LabRole
#   1) build            เตรียมโค้ด Lambda (build.sh)
#   2) bucket ชั่วคราว  ที่เก็บ zip ตอน package
#   3) network stack    VPC + RDS + S3 หลักฐาน   (infra/network.yaml)
#   4) backend stack    Cognito + Lambda + API    (infra/backend.yaml)
#   5) migration        สร้างตาราง/ข้อมูลเริ่มต้นใน RDS ผ่าน Lambda
#   6) ผู้ใช้ทดสอบ      สร้างใน Cognito (ถ้าตั้ง SEED_PASSWORD)
#   7) สรุป             พิมพ์ค่าที่ต้องใส่ใน Amplify
#
# รันซ้ำได้: ทุกขั้นตอนตรวจก่อนว่ามีอยู่แล้วหรือไม่ (stack ที่ไม่เปลี่ยนจะข้าม,
#            migration ไม่รันไฟล์เดิมซ้ำ, ผู้ใช้ที่มีอยู่แล้วไม่สร้างซ้ำ)
#
# ก่อนรัน (AWS Learner Lab ต้องทำใหม่ทุกครั้งที่เริ่ม session เพราะ credentials หมดอายุ ~4 ชม.):
#   1) ตั้ง credentials จากหน้า AWS Details > AWS CLI เป็น environment variables
#        (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
#   2) export DB_PASSWORD='รหัสผ่านฐานข้อมูล'
#        ใช้ตัวอักษร/ตัวเลขเท่านั้น อย่างน้อย 8 ตัว (จะถูกต่อเข้า DATABASE_URL ตัวอักษรพิเศษทำ URL พัง)
#   3) (ไม่บังคับ) export SEED_PASSWORD='รหัสผ่านผู้ใช้ทดสอบ'
#        ต้องผ่านนโยบายของ Cognito (8 ตัวขึ้นไป มีตัวพิมพ์เล็ก/ใหญ่/ตัวเลข) ถ้าไม่ตั้งจะข้ามขั้นที่ 6
#
# ตัวแปรที่เปลี่ยนค่าได้ (มีค่าตั้งต้นให้): PREFIX, NET_STACK, BACKEND_STACK,
#   FUNCTION_PREFIX, CORS_ORIGIN, ARTIFACT_BUCKET, AWS_REGION
#
# ใช้: bash infra/deploy_script/deploy.sh
# =====================================================================
set -euo pipefail

# ตำแหน่งรากของโปรเจกต์ (ขึ้นไป 2 ชั้นจากโฟลเดอร์ของสคริปต์)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DIR="$ROOT/infra/deploy_script"

# ---------- ค่าตั้งต้น ----------
# ${VAR:?ข้อความ}  = ถ้าไม่ได้ตั้ง VAR ให้หยุดพร้อมแสดงข้อความ (บังคับต้องมีรหัสผ่าน)
# ${VAR:-ค่า}      = ถ้าไม่ได้ตั้ง VAR ใช้ค่าหลังเครื่องหมาย
: "${DB_PASSWORD:?ต้อง export DB_PASSWORD ก่อนรัน}"
PREFIX="${PREFIX:-cs361}"                              # คำนำหน้าชื่อ resource
NET_STACK="${NET_STACK:-cs361-net-test}"               # ชื่อ stack ของ network (backend ใช้ชื่อนี้ import ค่า)
BACKEND_STACK="${BACKEND_STACK:-cs361-backend-test}"   # ชื่อ stack ของ backend
FUNCTION_PREFIX="${FUNCTION_PREFIX:-GRP05-test-}"      # คำนำหน้าชื่อ Lambda (-test- กันชื่อชนกับตัวจริง)
CORS_ORIGIN="${CORS_ORIGIN:-*}"                        # origin ของเว็บ ช่วงทดสอบใช้ *
export AWS_DEFAULT_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"   # Learner Lab ใช้ us-east-1

NET_TEMPLATE="$ROOT/infra/network.yaml"
BACKEND_TEMPLATE="$ROOT/infra/backend.yaml"

command -v aws >/dev/null || { echo "ไม่พบ aws cli"; exit 1; }

# ฟังก์ชันช่วย: อ่านค่า Output ของ stack ที่ deploy เสร็จแล้ว
#   ใช้: stack_output <ชื่อ stack> <OutputKey>
#   --query ใช้ JMESPath กรองเอาเฉพาะค่าของ Output ที่ต้องการ
stack_output() {
  aws cloudformation describe-stacks --stack-name "$1" \
    --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text
}

# ---------- 0) ตรวจ credentials และหา LabRole ----------
# sts get-caller-identity เป็นคำสั่งเบาที่สุดสำหรับเช็กว่า credentials ยังใช้ได้
echo "==> ตรวจ credentials"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)" \
  || { echo "credentials ใช้ไม่ได้/หมดอายุ (Learner Lab อยู่ได้ประมาณ 4 ชม.)"; exit 1; }
# Learner Lab สร้าง IAM role ใหม่ไม่ได้ จึงใช้ LabRole ที่มีอยู่แล้วเป็นสิทธิ์ของทุก Lambda
# LAB_ROLE_ARN="$(aws iam get-role --role-name LabRole --query Role.Arn --output text)"
LAB_ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/LabRole"
echo "    account=$ACCOUNT region=$AWS_DEFAULT_REGION"

# ---------- 1) build ----------
echo "==> build"
bash "$SCRIPT_DIR/build.sh"

# ---------- 2) bucket สำหรับเก็บ zip ตอน package ----------
# `aws cloudformation package` ต้องอัปโหลดโค้ด Lambda ขึ้น S3 ก่อน CloudFormation จึงจะอ้างถึงได้
# ชื่อ bucket ต้องไม่ซ้ำทั้งโลก จึงต่อ account id และ region เข้าไป
ARTIFACT_BUCKET="${ARTIFACT_BUCKET:-$PREFIX-artifacts-$ACCOUNT-$AWS_DEFAULT_REGION}"
if ! aws s3api head-bucket --bucket "$ARTIFACT_BUCKET" 2>/dev/null; then   # head-bucket ล้มเหลว = ยังไม่มี
  echo "==> สร้าง bucket $ARTIFACT_BUCKET"
  aws s3 mb "s3://$ARTIFACT_BUCKET" >/dev/null
fi

# ---------- 3) network stack (RDS ใช้เวลาประมาณ 5-10 นาที) ----------
# `deploy` = สร้าง change set แล้วสั่ง execute และรอจนเสร็จ (สร้างใหม่หรืออัปเดตก็ใช้คำสั่งเดียวกัน)
# --no-fail-on-empty-changeset  ไม่มีอะไรเปลี่ยนก็ไม่ถือว่า error (ทำให้รันซ้ำได้)
# network.yaml ไม่ใช้ SAM จึงไม่ต้อง package และไม่ต้องใส่ --capabilities
echo "==> deploy network stack: $NET_STACK"
aws cloudformation deploy \
  --stack-name "$NET_STACK" \
  --template-file "$NET_TEMPLATE" \
  --parameter-overrides Prefix="$PREFIX" DbPassword="$DB_PASSWORD" CorsAllowedOrigin="$CORS_ORIGIN" \
  --no-fail-on-empty-changeset

# ---------- 4) backend stack ----------
# package: zip โฟลเดอร์ที่ CodeUri ชี้ (build/<ชื่อ>) อัปโหลดขึ้น S3 แล้วเขียน template ใหม่
#          ที่ CodeUri เปลี่ยนเป็น s3://... ผลลัพธ์อยู่ใน build/packaged-backend.yaml
echo "==> package backend (อัปโหลดโค้ดขึ้น S3)"
aws cloudformation package \
  --template-file "$BACKEND_TEMPLATE" \
  --s3-bucket "$ARTIFACT_BUCKET" \
  --output-template-file "$ROOT/build/packaged-backend.yaml" >/dev/null

# --capabilities CAPABILITY_AUTO_EXPAND  จำเป็นเพราะ template ใช้ SAM transform (ขยายเป็น resource จริงตอน deploy)
# --capabilities CAPABILITY_IAM          ใส่กันไว้ ไม่มีผลถ้า template ไม่สร้าง IAM resource
# --parameter-overrides                  ส่งค่าให้พารามิเตอร์ของ backend.yaml
#     NetworkStackName  ให้ backend รู้ว่าจะ import ค่า (subnet, SG, RDS, bucket) จาก stack ไหน
#     LabRoleArn        สิทธิ์ของ Lambda
echo "==> deploy backend stack: $BACKEND_STACK"
aws cloudformation deploy \
  --stack-name "$BACKEND_STACK" \
  --template-file "$ROOT/build/packaged-backend.yaml" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides \
      Prefix="$PREFIX" FunctionPrefix="$FUNCTION_PREFIX" NetworkStackName="$NET_STACK" \
      LabRoleArn="$LAB_ROLE_ARN" DbPassword="$DB_PASSWORD" CorsAllowedOrigin="$CORS_ORIGIN" \
  --no-fail-on-empty-changeset

# อ่านค่า Output ของ backend ไว้ใช้ในขั้นถัดไปและตอนสรุป
API_URL="$(stack_output "$BACKEND_STACK" ApiUrl)"
POOL_ID="$(stack_output "$BACKEND_STACK" UserPoolId)"
CLIENT_ID="$(stack_output "$BACKEND_STACK" UserPoolClientId)"
MIGRATE_FN="$(stack_output "$BACKEND_STACK" MigrateFunctionName)"

# ---------- 5) migration ----------
# RDS เป็น private เครื่องเราต่อ psql ตรงๆ ไม่ได้ จึงเรียก Lambda ที่อยู่ใน VPC ให้รัน SQL แทน
# Lambda จะรันไฟล์ 001-004 ตามลำดับ และจำไว้ในตาราง schema_migrations ว่าไฟล์ไหนรันแล้ว
# --query FunctionError  ถ้า Lambda โยน error จะได้ข้อความ (Unhandled) ถ้าปกติได้ "None"
# ผลลัพธ์ของฟังก์ชัน (ไฟล์ที่รัน/ข้าม) เขียนลงไฟล์ชั่วคราวแล้วแสดงออกหน้าจอ
echo "==> รัน migration ด้วย $MIGRATE_FN"
RESULT_FILE="$(mktemp)"
FN_ERROR="$(aws lambda invoke --function-name "$MIGRATE_FN" \
  --cli-binary-format raw-in-base64-out --payload '{}' \
  --query FunctionError --output text "$RESULT_FILE")"
cat "$RESULT_FILE"; echo
if [ "$FN_ERROR" != "None" ]; then
  echo "migration ล้มเหลว (ดูรายละเอียดด้านบน หรือ CloudWatch Logs ของ $MIGRATE_FN)"
  exit 1
fi
rm -f "$RESULT_FILE"

# ---------- 6) ผู้ใช้ทดสอบใน Cognito ----------
# ข้ามถ้าไม่ได้ตั้ง SEED_PASSWORD (รหัสผ่านไม่ถูกเขียนไว้ในไฟล์ จะได้ไม่หลุดเข้า git)
if [ -n "${SEED_PASSWORD:-}" ]; then
  echo "==> สร้างผู้ใช้ทดสอบ"
  # รูปแบบ  อีเมล:กลุ่ม  (แก้รายการได้ตามต้องการ) กลุ่มต้องเป็นหนึ่งใน 5 กลุ่มที่ backend.yaml สร้างไว้
  USERS=(
    "teacher01@example.com:TEACHER"
    "teacher02@example.com:TEACHER"
    "ta01@example.com:TA"
    "ta02@example.com:TA"
    "reviewer01@example.com:REVIEWER"
    "approver01@example.com:APPROVER"
    "admin01@example.com:ADMIN"
  )
  for entry in "${USERS[@]}"; do
    email="${entry%%:*}"; group="${entry##*:}"     # ตัดที่ ":" ตัวแรก/ตัวสุดท้าย แยกอีเมลกับกลุ่ม
    # สร้างเฉพาะคนที่ยังไม่มี (admin-get-user ล้มเหลว = ยังไม่มี) ทำให้รันซ้ำได้
    if ! aws cognito-idp admin-get-user --user-pool-id "$POOL_ID" --username "$email" >/dev/null 2>&1; then
      # SUPPRESS = ไม่ส่งอีเมลเชิญ (อีเมลทดสอบไม่มีอยู่จริง) email_verified=true ให้ล็อกอินได้เลย
      aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username "$email" \
        --user-attributes Name=email,Value="$email" Name=email_verified,Value=true \
        --message-action SUPPRESS >/dev/null
    fi
    # --permanent = ตั้งรหัสผ่านถาวร ไม่ต้องเปลี่ยนรหัสตอนล็อกอินครั้งแรก
    aws cognito-idp admin-set-user-password --user-pool-id "$POOL_ID" --username "$email" \
      --password "$SEED_PASSWORD" --permanent
    # กลุ่มคือสิทธิ์ของระบบ (อ่านจาก cognito:groups ใน token)
    aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$email" --group-name "$group"
    echo "    $email -> $group"
  done
else
  echo "==> ข้ามการสร้างผู้ใช้ทดสอบ (ไม่ได้ตั้ง SEED_PASSWORD)"
fi

# ---------- 7) สรุป ----------
# ค่าเหล่านี้ต้องไปตั้งใน Amplify (App settings > Environment variables) แล้ว redeploy frontend
# ใช้ตัวแปรชื่อเดียวกับที่ frontend อ่านด้วย import.meta.env
cat <<OUT

=====================================================
เสร็จแล้ว ใส่ค่าเหล่านี้ใน Amplify (Environment variables) แล้ว redeploy frontend
  VITE_API_URL=$API_URL
  VITE_COGNITO_USER_POOL_ID=$POOL_ID
  VITE_COGNITO_CLIENT_ID=$CLIENT_ID
=====================================================
OUT
