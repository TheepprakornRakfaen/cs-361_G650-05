#!/usr/bin/env bash
# =====================================================================
# build.sh - เตรียมโฟลเดอร์ build/ ให้ backend.yaml นำไปแพ็กและ deploy
#
# หน้าที่: ก๊อปโค้ด Lambda แต่ละตัวมาไว้ใน build/ แล้วติดตั้ง node_modules ให้ครบ
#          เพื่อให้ `aws cloudformation package` zip ขึ้น S3 ได้ทันที
#
# ผลลัพธ์:
#   build/<ชื่อ Lambda>/   โค้ด + node_modules (เฉพาะ dependencies ที่ใช้งานจริง)
#   build/migrate/         Lambda รัน migration + ไฟล์ sql
#
# ทำไมไม่ทำงานในโฟลเดอร์ต้นฉบับ:
#   build/ สร้างใหม่ทุกครั้ง (ลบทิ้งแล้วทำใหม่) ไม่ทำให้ node_modules ปนใน backend/
#   และ build/ ไม่ควร commit (ต้องอยู่ใน .gitignore)
#
# ทำไมไม่ใช้ Lambda layer:
#   โค้ดเราเป็น ESM (index.mjs) และ ESM ไม่ใช้ NODE_PATH ซึ่งเป็นที่ที่ layer วางไลบรารีไว้
#   จึงอาจ import 'pg' ไม่เจอ ติดตั้ง node_modules ไว้กับแต่ละ Lambda ปลอดภัยกว่า
#
# ใช้: bash infra/deploy_script/build.sh      (deploy.sh เรียกให้เองอยู่แล้ว)
# ต้องมี: npm และอินเทอร์เน็ต (ดาวน์โหลดแพ็กเกจ)
# =====================================================================

# -e  หยุดทันทีเมื่อคำสั่งใดล้มเหลว
# -u  ใช้ตัวแปรที่ไม่ได้ตั้งค่า = error (กันพิมพ์ชื่อตัวแปรผิดแล้วลบผิดที่)
# -o pipefail  ถ้าคำสั่งใดใน pipe ล้มเหลว ถือว่าทั้ง pipe ล้มเหลว
set -euo pipefail

# หาตำแหน่งรากของโปรเจกต์จากตำแหน่งของสคริปต์ (ขึ้นไป 2 ชั้น: deploy_script -> infra -> root)
# ทำให้รันจากโฟลเดอร์ไหนก็ได้
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$ROOT/backend/lambda/functions"   # โค้ดต้นฉบับของ Lambda ทั้งหมด
OUT="$ROOT/build"                      # ปลายทาง (ถูกลบแล้วสร้างใหม่ทุกครั้ง)

command -v npm >/dev/null || { echo "ไม่พบ npm"; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT"

# ---------- 1) Lambda ทุกตัวใน backend/lambda/functions ----------
# วนทุกโฟลเดอร์ย่อย ชื่อโฟลเดอร์ = ชื่อ Lambda ที่ backend.yaml อ้างถึง (CodeUri: ../build/<ชื่อ>)
for dir in "$SRC"/*/; do
  name="$(basename "$dir")"
  dest="$OUT/$name"
  echo "==> build $name"

  # คัดลอกโค้ดทั้งโฟลเดอร์ แล้วลบสิ่งที่ไม่ต้องขึ้น Lambda:
  #   node_modules เก่า (จะติดตั้งใหม่ให้สะอาด) และไฟล์ README
  cp -R "$dir/." "$dest/"
  rm -rf "$dest/node_modules" "$dest"/*.md

  # วงเล็บ ( ) = subshell: cd ข้างในไม่กระทบโฟลเดอร์ปัจจุบันของสคริปต์
  (
    cd "$dest"
    # ติดตั้งตาม dependencies ใน package.json (--omit=dev ไม่เอา devDependencies)
    # --no-audit --no-fund --silent ตัดข้อความรบกวนและการเรียกเครือข่ายที่ไม่จำเป็น
    npm install --omit=dev --no-audit --no-fund --silent
    # โค้ดทุกตัว import 'pg' แต่บางตัว (เช่น ClaimWorkflowAPI) ไม่ได้ประกาศใน package.json
    # ถ้าไม่มี pg จึงติดตั้งเพิ่มให้ใน build/ เท่านั้น (--no-save = ไม่แก้ package.json ต้นฉบับ)
    # ควรเพิ่ม pg ใน package.json ของ Lambda ตัวนั้นเองในภายหลัง
    if [ ! -d node_modules/pg ]; then
      echo "    package.json ไม่มี pg -> ติดตั้งเพิ่ม (ควรเพิ่มใน package.json ของ $name)"
      npm install --omit=dev --no-save --no-audit --no-fund --silent "pg@^8.13.0"
    fi
  )
done

# ---------- 2) Lambda สำหรับรัน migration ----------
# RDS อยู่ใน private subnet เครื่องเราต่อตรงไม่ได้ จึงใช้ Lambda ใน VPC ต่อแทน
# ต้องมีทั้งโค้ด (infra/deploy_script/migrate/index.mjs) และไฟล์ SQL ในแพ็กเกจเดียวกัน
echo "==> build migrate"
mkdir -p "$OUT/migrate/sql"
cp "$ROOT/infra/deploy_script/migrate/index.mjs" "$OUT/migrate/"
# 0*.sql = เฉพาะ 001-004 ที่ระดับบนสุด (ไม่รวมโฟลเดอร์ _archive ที่เป็นของเก่า)
# ชื่อไฟล์เรียงตามเลขนำหน้า migrate/index.mjs จะรันตามลำดับนั้น
shopt -s nullglob

migration_files=(
  "$ROOT"/docs/database/migrations/[0-9][0-9][0-9]_*.sql
)

if (( ${#migration_files[@]} == 0 )); then
  echo "ERROR: No migration SQL files found"
  exit 1
fi

cp -- "${migration_files[@]}" "$OUT/migrate/sql/"

(
  cd "$OUT/migrate"
  npm init -y >/dev/null                                      # สร้าง package.json เปล่าให้ npm ติดตั้งลงได้
  npm install --omit=dev --no-audit --no-fund --silent "pg@^8.13.0"
)

echo
echo "เสร็จแล้ว ขนาดของแต่ละ Lambda (Lambda จำกัด 250 MB หลังแตก zip):"
du -sh "$OUT"/*/
