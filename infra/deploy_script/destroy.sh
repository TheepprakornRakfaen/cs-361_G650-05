#!/usr/bin/env bash
# =====================================================================
# destroy.sh - ลบทุกอย่างที่ deploy.sh สร้าง (ข้อมูลใน RDS/S3 หายถาวร)
#
# ลำดับต้องย้อนกลับกับตอนสร้าง:
#   1) backend ก่อน  เพราะ backend import ค่าจาก network (CloudFormation ไม่ให้ลบ network
#                    ตราบใดที่ยังมี stack อื่นใช้ค่าที่ export อยู่)
#   2) เคลียร์ bucket หลักฐาน  CloudFormation ลบ bucket ที่ยังมีไฟล์ไม่ได้
#   3) network       (RDS ใช้เวลาหลายนาที)
#   4) bucket เก็บ zip  ลบเมื่อสั่ง --artifacts เท่านั้น
#
# ข้อมูลใน RDS ไม่มี snapshot สำรอง (ตั้ง DeletionPolicy Delete ไว้ใน network.yaml)
# ถ้าต้องการเก็บข้อมูลไว้ ให้ทำ snapshot เองก่อนรันสคริปต์นี้
#
# ใช้:  bash infra/deploy_script/destroy.sh              ถามให้พิมพ์ DELETE ยืนยันก่อน
#       bash infra/deploy_script/destroy.sh --yes        ข้ามคำถาม (สำหรับสคริปต์อัตโนมัติ)
#       bash infra/deploy_script/destroy.sh --artifacts  ลบ bucket เก็บ zip ด้วย
# =====================================================================
set -euo pipefail

# ต้องใช้ชื่อเดียวกับที่ deploy.sh ใช้ ไม่งั้นจะหา stack ไม่เจอ
PREFIX="${PREFIX:-cs361}"
NET_STACK="${NET_STACK:-cs361-net-test}"
BACKEND_STACK="${BACKEND_STACK:-cs361-backend-test}"
export AWS_DEFAULT_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"

# ---------- อ่านตัวเลือกจากบรรทัดคำสั่ง ----------
YES=0; ARTIFACTS=0
for a in "$@"; do
  case "$a" in
    --yes) YES=1 ;;
    --artifacts) ARTIFACTS=1 ;;
    *) echo "ไม่รู้จักตัวเลือก $a"; exit 1 ;;
  esac
done

# ---------- ถามยืนยัน ----------
# ให้พิมพ์คำว่า DELETE เอง (ไม่ใช่แค่ y) กันกดผิดเพราะลบแล้วกู้ไม่ได้
echo "จะลบ stack: $BACKEND_STACK และ $NET_STACK (รวม RDS และไฟล์หลักฐานใน S3) ย้อนกลับไม่ได้"
if [ "$YES" -ne 1 ]; then
  read -r -p "พิมพ์ DELETE เพื่อยืนยัน: " ans
  [ "$ans" = "DELETE" ] || { echo "ยกเลิก"; exit 1; }
fi

# ฟังก์ชันช่วย: stack นี้ยังมีอยู่ไหม (describe-stacks ล้มเหลว = ไม่มี) ทำให้รันซ้ำได้โดยไม่ error
stack_exists() { aws cloudformation describe-stacks --stack-name "$1" >/dev/null 2>&1; }

# ---------- 1) ลบ backend ----------
# delete-stack สั่งลบแล้วกลับทันที ต้อง wait จนลบเสร็จก่อนจึงไปลบ network ได้
if stack_exists "$BACKEND_STACK"; then
  echo "==> ลบ $BACKEND_STACK"
  aws cloudformation delete-stack --stack-name "$BACKEND_STACK"
  aws cloudformation wait stack-delete-complete --stack-name "$BACKEND_STACK"
else
  echo "ไม่พบ $BACKEND_STACK ข้าม"
fi

# ---------- 2) เคลียร์ bucket หลักฐาน แล้วลบ network ----------
if stack_exists "$NET_STACK"; then
  # ชื่อ bucket อ่านจาก Output ของ network stack (ชื่อมี account id จึงเดาเองไม่ได้)
  BUCKET="$(aws cloudformation describe-stacks --stack-name "$NET_STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='EvidenceBucketName'].OutputValue" --output text)"
  if [ -n "$BUCKET" ] && [ "$BUCKET" != "None" ]; then
    echo "==> เคลียร์ s3://$BUCKET"
    # ถ้า bucket ว่างอยู่แล้วหรือล้มเหลว ไม่ถือเป็นเหตุให้หยุด (|| true)
    aws s3 rm "s3://$BUCKET" --recursive >/dev/null || true
  fi
  echo "==> ลบ $NET_STACK (RDS ใช้เวลาหลายนาที)"
  aws cloudformation delete-stack --stack-name "$NET_STACK"
  aws cloudformation wait stack-delete-complete --stack-name "$NET_STACK"
else
  echo "ไม่พบ $NET_STACK ข้าม"
fi

# ---------- 3) bucket เก็บ zip (ไม่บังคับ) ----------
# bucket นี้ถูกสร้างโดย deploy.sh เอง ไม่ได้อยู่ใน stack จึงไม่ถูกลบไปพร้อม stack
# ปล่อยไว้ได้ (มีแต่ไฟล์ zip เล็กๆ) ลบเฉพาะเมื่อสั่ง --artifacts
if [ "$ARTIFACTS" -eq 1 ]; then
  ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
  AB="${ARTIFACT_BUCKET:-$PREFIX-artifacts-$ACCOUNT-$AWS_DEFAULT_REGION}"
  echo "==> ลบ s3://$AB"
  aws s3 rb "s3://$AB" --force >/dev/null || true     # --force = ลบไฟล์ข้างในก่อน
fi

echo "ลบเสร็จแล้ว"
