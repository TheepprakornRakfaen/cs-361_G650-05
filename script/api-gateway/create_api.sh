#!/usr/bin/env bash
# =====================================================================
# CS361 - สร้างโครง API Gateway (REST): resource, method, Cognito authorizer, CORS
#         **ไม่ผูก Lambda และไม่ deploy** (ไปผูก integration เองใน Console ทีหลัง)
#
#   bash script/api-gateway/create_api.sh <USER_POOL_ID>
#   ตัวเลือก (ตัวแปรสภาพแวดล้อม):  API_NAME=cs361-claims-api  ALLOWED_ORIGIN='*'
#
# ทำอะไรบ้าง (รันซ้ำได้ ของที่มีแล้วจะข้าม)
#   1) สร้าง REST API (ถ้ายังไม่มี) และ Cognito authorizer ที่ชี้ User Pool
#   2) สร้าง resource ตาม path และ method (ตั้งให้ใช้ authorizer)
#   3) สร้าง OPTIONS (CORS) ทุก resource + CORS ให้ 4XX/5XX ของ gateway
#
# หลังรัน: เปิด Console -> API Gateway -> แต่ละ method -> Integration request
#          เลือก Lambda function (Lambda proxy integration) แล้วค่อย Deploy API ไป stage v2
#          (ถ้า method ไหนยังไม่มี integration จะ deploy ไม่ได้)
#
# รันใน CloudShell (us-east-1) ต้องมี aws cli
# =====================================================================
set -euo pipefail

POOL_ID="${1:?ใส่ User Pool ID เช่น us-east-1_AbCdEf123}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$REGION"
API_NAME="${API_NAME:-cs361-claims-api}"
ORIGIN="${ALLOWED_ORIGIN:-*}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"

#  METHOD|PATH
ROUTES=(
  "POST|/api/auth/me"
  "GET|/api/term"
  "GET|/api/period"
  "GET|/api/courses"
  "GET|/api/claims"
  "POST|/api/claims"
  "DELETE|/api/claims"
  "POST|/api/claims/batch-actions"
  "POST|/api/claims/{id}/resend"
  "POST|/api/claims/{id}/actions"
  "GET|/api/claims/{id}/history"
  "POST|/api/claims/{id}/evidence/upload-url"
  "POST|/api/claims/{id}/evidence"
  "GET|/api/claims/{id}/evidence"
  "POST|/api/claims/{id}/pass"
  "POST|/api/claims/{id}/return"
  "POST|/api/claims/{id}/approve"
  "POST|/api/claims/{id}/reject"
  "GET|/api/audit-logs"
)

# ---------- 1) API + authorizer ----------
API_ID="$(aws apigateway get-rest-apis --query "items[?name=='$API_NAME'].id | [0]" --output text)"
if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then
  API_ID="$(aws apigateway create-rest-api --name "$API_NAME" \
              --endpoint-configuration types=REGIONAL --query id --output text)"
  echo "✔ สร้าง API $API_NAME ($API_ID)"
else
  echo "• ใช้ API เดิม $API_NAME ($API_ID)"
fi
ROOT_ID="$(aws apigateway get-resources --rest-api-id "$API_ID" --query "items[?path=='/'].id | [0]" --output text)"

AUTH_ID="$(aws apigateway get-authorizers --rest-api-id "$API_ID" --query "items[?name=='cognito'].id | [0]" --output text)"
if [ "$AUTH_ID" = "None" ] || [ -z "$AUTH_ID" ]; then
  AUTH_ID="$(aws apigateway create-authorizer --rest-api-id "$API_ID" --name cognito \
               --type COGNITO_USER_POOLS \
               --provider-arns "arn:aws:cognito-idp:$REGION:$ACCOUNT:userpool/$POOL_ID" \
               --identity-source 'method.request.header.Authorization' \
               --query id --output text)"
  echo "✔ สร้าง authorizer cognito ($AUTH_ID)"
else
  echo "• ใช้ authorizer เดิม ($AUTH_ID)  *ถ้าเปลี่ยน User Pool ให้ลบ authorizer เก่าก่อน*"
fi

# ---------- ตัวช่วย ----------
ensure_resource() {            # คืน resource id ของ path (สร้างทีละระดับ)
  local path="$1" parent="$ROOT_ID" cur="" seg id
  local -a segs
  IFS='/' read -ra segs <<< "${path#/}"
  for seg in "${segs[@]}"; do
    cur="$cur/$seg"
    id="$(aws apigateway get-resources --rest-api-id "$API_ID" --limit 500 \
            --query "items[?path=='$cur'].id | [0]" --output text)"
    if [ "$id" = "None" ] || [ -z "$id" ]; then
      id="$(aws apigateway create-resource --rest-api-id "$API_ID" \
              --parent-id "$parent" --path-part "$seg" --query id --output text)"
    fi
    parent="$id"
  done
  echo "$parent"
}

method_exists() {              # $1=resource id  $2=method
  aws apigateway get-method --rest-api-id "$API_ID" --resource-id "$1" --http-method "$2" >/dev/null 2>&1
}

CORS_PARAMS="$(cat <<JSON
{"method.response.header.Access-Control-Allow-Origin":"'${ORIGIN}'",
 "method.response.header.Access-Control-Allow-Headers":"'Content-Type,Authorization'",
 "method.response.header.Access-Control-Allow-Methods":"'GET,POST,DELETE,OPTIONS'"}
JSON
)"

ensure_options() {             # สร้าง OPTIONS (CORS) บน resource
  local rid="$1"
  method_exists "$rid" OPTIONS && return 0
  aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$rid" \
    --http-method OPTIONS --authorization-type NONE >/dev/null
  aws apigateway put-integration --rest-api-id "$API_ID" --resource-id "$rid" \
    --http-method OPTIONS --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' >/dev/null
  aws apigateway put-method-response --rest-api-id "$API_ID" --resource-id "$rid" \
    --http-method OPTIONS --status-code 200 \
    --response-parameters 'method.response.header.Access-Control-Allow-Origin=true,method.response.header.Access-Control-Allow-Headers=true,method.response.header.Access-Control-Allow-Methods=true' >/dev/null
  aws apigateway put-integration-response --rest-api-id "$API_ID" --resource-id "$rid" \
    --http-method OPTIONS --status-code 200 \
    --response-parameters "$CORS_PARAMS" >/dev/null
}

# ---------- 2-3) resource + method + OPTIONS ----------
for row in "${ROUTES[@]}"; do
  IFS='|' read -r method path <<< "$row"

  rid="$(ensure_resource "$path")"
  ensure_options "$rid"

  if method_exists "$rid" "$method"; then
    echo "• $method $path มีอยู่แล้ว"
  else
    aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$rid" \
      --http-method "$method" --authorization-type COGNITO_USER_POOLS \
      --authorizer-id "$AUTH_ID" >/dev/null
    echo "✔ $method $path"
  fi
done

# CORS ให้ error ของ gateway เอง (401 จาก authorizer, 403, 5XX)
GW_PARAMS="{\"gatewayresponse.header.Access-Control-Allow-Origin\":\"'${ORIGIN}'\",\"gatewayresponse.header.Access-Control-Allow-Headers\":\"'Content-Type,Authorization'\"}"
for t in DEFAULT_4XX DEFAULT_5XX; do
  aws apigateway put-gateway-response --rest-api-id "$API_ID" --response-type "$t" \
    --response-parameters "$GW_PARAMS" >/dev/null
done

echo
echo "เสร็จแล้ว  API id: $API_ID"
echo "ต่อไป: ผูก Lambda ที่แต่ละ method ใน Console แล้ว Deploy API ไป stage v2"
echo "Invoke URL (หลัง deploy): https://$API_ID.execute-api.$REGION.amazonaws.com/v2"
