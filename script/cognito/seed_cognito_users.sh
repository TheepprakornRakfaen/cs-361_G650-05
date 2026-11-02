#!/usr/bin/env bash
# =====================================================================
# CS361 - สร้างกลุ่มและผู้ใช้ใน Cognito แล้วสร้าง SQL ซิงก์ app_user (sub ใหม่)
#
# รันใน AWS CloudShell (region us-east-1):
#   bash seed_cognito_users.sh <USER_POOL_ID> '<PASSWORD>'
#   เช่น  bash seed_cognito_users.sh us-east-1_AbCdEf123 'MyPass@2569'
#
# ทำอะไรบ้าง
#   1) สร้างกลุ่ม TEACHER, TA, REVIEWER, APPROVER, ADMIN (มีแล้วข้าม)
#   2) สร้างผู้ใช้ตามรายการด้านล่าง: email ยืนยันแล้ว ไม่ส่งอีเมลเชิญ รหัสผ่านถาวร
#   3) ใส่ผู้ใช้เข้ากลุ่ม
#   4) อ่าน sub ของแต่ละคน แล้วเขียนไฟล์ sync_app_user.sql
#        - ถ้ามี app_user ที่ username ตรงกัน -> UPDATE cognito_sub (claim/section_staff ตามด้วย ON UPDATE CASCADE)
#        - ถ้ายังไม่มี -> INSERT
#
# รันซ้ำได้ (ผู้ใช้/กลุ่มที่มีแล้วจะข้าม แต่ยังตั้งรหัสผ่าน/กลุ่ม/อ่าน sub ใหม่)
# ข้อกำหนด: User pool ตั้ง sign-in ด้วย Email และรหัสผ่านต้องผ่าน password policy
# ไฟล์ผลลัพธ์ไม่มีรหัสผ่าน (อย่า commit sync_app_user.sql เพราะมี sub จริง)
# =====================================================================
set -euo pipefail

POOL_ID="${1:?ใส่ User Pool ID เป็น argument ตัวแรก เช่น us-east-1_AbCdEf123}"
PASSWORD="${2:?ใส่รหัสผ่านเป็น argument ตัวที่สอง (ต้องผ่าน password policy ของ pool)}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
OUT="sync_app_user.sql"
ERR="$(mktemp)"
trap 'rm -f "$ERR"' EXIT

GROUP_NAMES=(TEACHER TA REVIEWER APPROVER ADMIN)

#         email|ชื่อ|นามสกุล|กลุ่ม
USERS=(
  "teacher01@example.com|สมชาย|ใจดี|TEACHER"
  "teacher02@example.com|สมหญิง|รักสอน|TEACHER"
  "ta01@example.com|ธนกฤต|ขยันยิ่ง|TA"
  "ta02@example.com|พิมพ์ชนก|ช่วยงาน|TA"
  "reviewer01@example.com|รัชนี|ตรวจแม่น|REVIEWER"
  "approver01@example.com|วิชัย|อนุมัติไว|APPROVER"
  "admin01@example.com|ผู้ดูแล|ระบบ|ADMIN"
)

# 1) กลุ่ม
for g in "${GROUP_NAMES[@]}"; do
  if aws cognito-idp create-group --user-pool-id "$POOL_ID" --group-name "$g" >/dev/null 2>"$ERR"; then
    echo "✔ สร้างกลุ่ม $g"
  elif grep -q GroupExistsException "$ERR"; then
    echo "• กลุ่ม $g มีอยู่แล้ว"
  else
    cat "$ERR" >&2; exit 1
  fi
done

STATEMENTS=()
for row in "${USERS[@]}"; do
  IFS='|' read -r email given family group <<< "$row"
  name="$given $family"

  # 2) ผู้ใช้
  if aws cognito-idp admin-create-user \
        --user-pool-id "$POOL_ID" \
        --username "$email" \
        --user-attributes Name=email,Value="$email" Name=email_verified,Value=true \
                          Name=given_name,Value="$given" Name=family_name,Value="$family" \
        --message-action SUPPRESS >/dev/null 2>"$ERR"; then
    echo "✔ สร้างผู้ใช้ $email"
  elif grep -q UsernameExistsException "$ERR"; then
    echo "• ผู้ใช้ $email มีอยู่แล้ว"
  else
    cat "$ERR" >&2; exit 1
  fi

  # รหัสผ่านถาวร -> ไม่ติด NEW_PASSWORD_REQUIRED ตอน login ครั้งแรก
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$POOL_ID" --username "$email" \
    --password "$PASSWORD" --permanent >/dev/null

  # 3) กลุ่ม
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$POOL_ID" --username "$email" --group-name "$group" >/dev/null

  # 4) sub
  sub=$(aws cognito-idp admin-get-user --user-pool-id "$POOL_ID" --username "$email" \
          --query "UserAttributes[?Name=='sub'].Value | [0]" --output text)
  echo "  sub = $sub  (กลุ่ม $group)"

  STATEMENTS+=("UPDATE app_user SET cognito_sub = '$sub', name = '$name' WHERE lower(username) = lower('$email');
INSERT INTO app_user (cognito_sub, username, name)
SELECT '$sub', '$email', '$name'
 WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE lower(username) = lower('$email'));")
done

# เขียนไฟล์ SQL
{
  echo "-- ซิงก์ app_user กับ sub ใหม่ของ User Pool $POOL_ID"
  echo "-- รัน: psql -h <RDS_ENDPOINT> -U claims_admin -d claims -f $OUT"
  echo "SET client_encoding = 'UTF8';"
  echo "BEGIN;"
  for s in "${STATEMENTS[@]}"; do echo "$s"; done
  echo "COMMIT;"
  echo "-- ตรวจผล: SELECT cognito_sub, username, name FROM app_user ORDER BY username;"
} > "$OUT"

echo
echo "เสร็จแล้ว -> $OUT"
