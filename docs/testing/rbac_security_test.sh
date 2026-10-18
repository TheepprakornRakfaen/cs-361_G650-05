#!/usr/bin/env bash
# =====================================================================
# CS361 - ทดสอบ Issue #41 (RBAC) และ #43 (Secure Claim / Evidence Access)
#
# เตรียม token (ID token) ของผู้ใช้ 4 คน
#   วิธีหา: login ในหน้าเว็บ -> DevTools -> Network -> คลิก request /api/... ->
#           Request Headers -> Authorization (ค่าหลังคำว่า Bearer ถ้ามี)
#
#   export T_A='eyJ...'      # อาจารย์ A (เจ้าของคำร้อง CLAIM_A)
#   export T_B='eyJ...'      # อาจารย์ B (ไม่ใช่เจ้าของ, ไม่มี group พิเศษ)
#   export T_REV='eyJ...'    # อยู่ใน group REVIEWER
#   export T_APP='eyJ...'    # อยู่ใน group APPROVER
#   export CLAIM_A='uuid'    # claim id ของอาจารย์ A ที่มีหลักฐานแนบแล้ว
#   (ไม่บังคับ) export T_EXPIRED='eyJ...'   # token เก่าที่หมดอายุแล้ว (> 1 ชม.)
#   (ไม่บังคับ) export S3_OBJECT_URL='https://<bucket>.s3.amazonaws.com/claims/...'  # URL ไฟล์ แบบไม่มีลายเซ็น
#
#   bash rbac_security_test.sh
#
# สคริปต์นี้ไม่สร้าง/ไม่แก้ข้อมูลจริง (ทุกกรณีที่เขียนข้อมูลคาดว่าจะถูกปฏิเสธก่อนถึง DB)
# =====================================================================
API=${API:-https://4gb0aky4q4.execute-api.us-east-1.amazonaws.com/v2}
FAKE_ID=00000000-0000-4000-8000-000000000000
PASS=0; FAIL=0; SKIP=0

check() {  # check "ชื่อ" "รหัสที่ยอมรับ (คั่นด้วยช่องว่าง)" METHOD PATH TOKEN [BODY]
  local name=$1 expect=$2 method=$3 path=$4 token=$5 body=$6
  local args=(-s -o /tmp/rbac_resp.json -w '%{http_code}' -X "$method" "$API$path" -H 'Content-Type: application/json')
  [[ -n $token ]] && args+=(-H "Authorization: $token")
  [[ -n $body  ]] && args+=(-d "$body")
  local code; code=$(curl "${args[@]}")
  if [[ " $expect " == *" $code "* ]]; then
    echo "  PASS  $name  ($code)"; PASS=$((PASS+1))
  else
    echo "  FAIL  $name  -> ได้ $code ต้องการ [$expect]  $(head -c 160 /tmp/rbac_resp.json)"; FAIL=$((FAIL+1))
  fi
}
need() { for v in "$@"; do [[ -z ${!v} ]] && { echo "  SKIP  (ไม่ได้ตั้งค่า $v)"; SKIP=$((SKIP+1)); return 1; }; done; return 0; }

echo "== #41 AC1-2: ไม่มี token / token ผิด / token หมดอายุ ต้องถูกปฏิเสธ"
for p in "/api/claims" "/api/term" "/api/period" "/api/courses" "/api/claims/$FAKE_ID/evidence"; do
  check "GET $p ไม่มี token"   "401 403" GET "$p" ""
  check "GET $p token มั่ว"     "401 403" GET "$p" "not-a-real-token"
done
check "POST /pass ไม่มี token" "401 403" POST "/api/claims/$FAKE_ID/pass" "" '{}'
if need T_EXPIRED; then check "GET /api/claims token หมดอายุ" "401 403" GET "/api/claims" "$T_EXPIRED"; fi

echo "== #41 AC3: แต่ละ role เรียกได้เฉพาะ action ของตัวเอง"
if need T_A; then
  check "อาจารย์กด /pass"          "403" POST "/api/claims/$FAKE_ID/pass"    "$T_A" '{}'
  check "อาจารย์กด /approve"       "403" POST "/api/claims/$FAKE_ID/approve" "$T_A" '{}'
  check "อาจารย์กด /reject"        "403" POST "/api/claims/$FAKE_ID/reject"  "$T_A" '{"comment":"x"}'
  check "อาจารย์ดูคิวตรวจ scope=review" "403" GET "/api/claims?scope=review" "$T_A"
  # ส่ง body ว่าง: ถ้ามีการเช็ค role ก่อน validate ต้องได้ 403, ถ้าได้ 400 = ไม่มีการเช็ค role
  check "อาจารย์สร้างภาคการศึกษา (POST /api/term)" "403" POST "/api/term"   "$T_A" '{}'
  check "อาจารย์สร้างรอบเบิก (POST /api/period)"  "403" POST "/api/period" "$T_A" '{}'
fi
if need T_REV; then
  check "REVIEWER กด /approve"     "403" POST "/api/claims/$FAKE_ID/approve" "$T_REV" '{}'
  check "REVIEWER กด /reject"      "403" POST "/api/claims/$FAKE_ID/reject"  "$T_REV" '{"comment":"x"}'
  check "REVIEWER ดูคิวตรวจ"        "200" GET  "/api/claims?scope=review"     "$T_REV"
fi
if need T_APP; then
  check "APPROVER กด /pass"        "403" POST "/api/claims/$FAKE_ID/pass"    "$T_APP" '{}'
  check "APPROVER ดูคิวตรวจ"        "200" GET  "/api/claims?scope=review"     "$T_APP"
fi

echo "== #41 AC4: ปลอม identity / role / status ผ่าน body ไม่ได้"
if need T_A; then
  check "ส่ง status=3 ตอนสร้างคำร้อง" "400" POST "/api/claims" "$T_A" '{"status":3}'
  check "ส่ง cognito:groups ใน body แล้วดูคิวตรวจ" "403" GET "/api/claims?scope=review&role=APPROVER" "$T_A"
fi

echo "== #43: เข้าถึงคำร้อง / หลักฐานของคนอื่นไม่ได้"
if need T_B CLAIM_A; then
  check "B ดูหลักฐานของคำร้อง A"         "403 404" GET  "/api/claims/$CLAIM_A/evidence" "$T_B"
  check "B ขอ upload-url ให้คำร้อง A"     "403 404" POST "/api/claims/$CLAIM_A/evidence/upload-url" "$T_B" '{"fileName":"x.pdf","contentType":"application/pdf","fileSize":100}'
  check "B ลงทะเบียนไฟล์ให้คำร้อง A"      "403 404" POST "/api/claims/$CLAIM_A/evidence" "$T_B" '{"evidence_id":"'$FAKE_ID'","object_key":"claims/x/y/z.pdf","file_name":"z.pdf","content_type":"application/pdf","file_size":100}'
  check "B ส่งใหม่ (resend) คำร้อง A"     "403 404 409" POST "/api/claims/$CLAIM_A/resend" "$T_B" '{}'
  check "B ลบคำร้อง A"                    "403 404" DELETE "/api/claims" "$T_B" '{"id":"'$CLAIM_A'"}'
fi
if need T_A CLAIM_A; then
  check "A ดูหลักฐานของตัวเอง"            "200" GET "/api/claims/$CLAIM_A/evidence" "$T_A"
fi
if need T_REV CLAIM_A; then
  check "REVIEWER ดูหลักฐานคำร้อง A"      "200" GET "/api/claims/$CLAIM_A/evidence" "$T_REV"
fi
if need T_A; then
  check "เดา claim id ที่ไม่มีอยู่"           "404" GET "/api/claims/$FAKE_ID/evidence" "$T_A"
  check "claim id รูปแบบผิด (ไม่หลุด error DB)" "400" GET "/api/claims/abc'%20OR%201=1--/evidence" "$T_A"
  grep -qiE "syntax|relation|column|postgres|stack" /tmp/rbac_resp.json \
    && { echo "  FAIL  ข้อความ error มีรายละเอียดภายใน: $(head -c 160 /tmp/rbac_resp.json)"; FAIL=$((FAIL+1)); } \
    || { echo "  PASS  ข้อความ error ไม่เปิดเผยรายละเอียดภายใน"; PASS=$((PASS+1)); }
fi

echo "== #43: ไฟล์ใน S3 ต้องไม่เปิด public"
if need S3_OBJECT_URL; then
  code=$(curl -s -o /dev/null -w '%{http_code}' "$S3_OBJECT_URL")
  if [[ $code == 403 ]]; then echo "  PASS  เปิด URL ไฟล์ตรงๆ (ไม่มีลายเซ็น) ได้ 403"; PASS=$((PASS+1));
  else echo "  FAIL  เปิด URL ไฟล์ตรงๆ ได้ $code (ต้องเป็น 403)"; FAIL=$((FAIL+1)); fi
fi

echo
echo "สรุป: PASS $PASS | FAIL $FAIL | SKIP $SKIP"
[[ $FAIL -eq 0 ]]
