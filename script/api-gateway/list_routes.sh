#!/usr/bin/env bash
# =====================================================================
# CS361 - แสดง route ทั้งหมดของ API Gateway พร้อม authorizer และ Lambda ที่ผูกอยู่
#   bash script/api-gateway/list_routes.sh [API_NAME]
# =====================================================================
set -euo pipefail
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
API_NAME="${1:-${API_NAME:-cs361-claims-api}}"
API_ID="$(aws apigateway get-rest-apis --query "items[?name=='$API_NAME'].id | [0]" --output text)"
[ "$API_ID" != "None" ] || { echo "ไม่พบ API $API_NAME" >&2; exit 1; }

aws apigateway get-resources --rest-api-id "$API_ID" --limit 500 --embed methods \
  --query "items[].{path:path,methods:keys(resourceMethods || \`{}\`)}" --output json |
jq -r '.[] | select(.methods|length>0) | .path as $p | .methods[] | "\(.)\t\($p)"' | sort -k2,2 -k1,1

echo
echo "Invoke URL: https://$API_ID.execute-api.$AWS_DEFAULT_REGION.amazonaws.com/<stage>"
