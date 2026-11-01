// =====================================================================
// CS361 - ClaimReview : ตรวจสอบ / อนุมัติคำร้อง
//
//   POST /api/claims/{id}/pass     REVIEWER  1 -> 2  (ผ่านการตรวจสอบ)
//   POST /api/claims/{id}/return   REVIEWER  1 -> 5  / APPROVER 2 -> 5  (ส่งกลับแก้ไข, ต้องมี comment)
//   POST /api/claims/{id}/approve  APPROVER  2 -> 3  (อนุมัติ)
//   POST /api/claims/{id}/reject   APPROVER  2 -> 4  (ไม่อนุมัติ, ต้องมี comment)
//
//   Body: { "comment": "..." | null }
//
// status: 0 ร่าง, 1 รอตรวจ, 2 รออนุมัติ, 3 ผ่าน, 4 ไม่ผ่าน, 5 ส่งกลับแก้ไข
// role มาจาก Cognito group ใน token (cognito:groups)
//
// Environment variables:
//   DATABASE_URL = postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
// Lambda ต้องอยู่ใน VPC / Security Group เดียวกับ RDS, Timeout >= 10s
// =====================================================================
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 3000,
});

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  },
  body: JSON.stringify(body),
});

// "REVIEWER,APPROVER" หรือ "[REVIEWER APPROVER]" -> ['REVIEWER', 'APPROVER']
const getGroups = (claims) =>
  String(claims?.['cognito:groups'] ?? '')
    .replace(/[\[\]]/g, '')
    .split(/[,\s]+/)
    .filter(Boolean);

const isUuid = (v) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const handler = async (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims?.sub) return respond(401, { message: 'ต้องเข้าสู่ระบบก่อน' });

  if (event.httpMethod !== 'POST') return respond(405, { message: 'ไม่รองรับ method นี้' });

  const groups  = getGroups(claims);
  const sub     = claims.sub;
  const claimId = event.pathParameters?.id;
  const action  = (event.resource ?? '').split('/').pop();   // pass | return | approve | reject

  try {
    if (action === 'pass') {
      if (!groups.includes('REVIEWER')) return respond(403, { message: 'เฉพาะ REVIEWER เท่านั้น' });
      return await changeStatus({ claimId, sub, from: [1], to: 2, text: 'ผ่านการตรวจสอบ', body: event.body });

    } else if (action === 'return') {
      const from = [];
      if (groups.includes('REVIEWER')) from.push(1);   // ส่งกลับจาก "รอตรวจ"
      if (groups.includes('APPROVER')) from.push(2);   // ส่งกลับจาก "รออนุมัติ"
      if (from.length === 0) return respond(403, { message: 'เฉพาะ REVIEWER หรือ APPROVER เท่านั้น' });
      return await changeStatus({ claimId, sub, from, to: 5, text: 'ส่งกลับแก้ไข', needComment: true, body: event.body });

    } else if (action === 'approve') {
      if (!groups.includes('APPROVER')) return respond(403, { message: 'เฉพาะ APPROVER เท่านั้น' });
      return await changeStatus({ claimId, sub, from: [2], to: 3, text: 'อนุมัติ', body: event.body });

    } else if (action === 'reject') {
      if (!groups.includes('APPROVER')) return respond(403, { message: 'เฉพาะ APPROVER เท่านั้น' });
      return await changeStatus({ claimId, sub, from: [2], to: 4, text: 'ไม่อนุมัติ', needComment: true, body: event.body });

    } else {
      return respond(404, { message: 'ไม่พบ endpoint นี้' });
    }
  } catch (err) {
    console.error('ClaimReview error:', err.code, err.message);
    if (err.code === '42703') return respond(500, { message: 'ฐานข้อมูลยังไม่มีคอลัมน์ reviewed_by / reviewed_at (ยังไม่ได้รัน migration 011)' });
    if (err.code === '23514') return respond(500, { message: 'สถานะนี้ยังไม่ได้เปิดใช้ใน CHECK ของตาราง claim' });
    return respond(500, { message: 'เกิดข้อผิดพลาดกับฐานข้อมูล' });
  }
};

async function changeStatus({ claimId, sub, from, to, text, needComment = false, body }) {
  if (!isUuid(claimId)) return respond(400, { message: 'claim id ไม่ถูกต้อง' });

  let data;
  try { data = JSON.parse(body ?? '{}'); } catch { return respond(400, { message: 'รูปแบบ JSON ไม่ถูกต้อง' }); }

  const comment = typeof data?.comment === 'string' && data.comment.trim() ? data.comment.trim() : null;
  if (needComment && !comment) return respond(400, { message: `กรุณาระบุเหตุผลในการ${text}` });

  const { rows } = await pool.query(
    `UPDATE claim
        SET status         = $1,
            return_comment = COALESCE($2, return_comment),
            reviewed_by    = $3::uuid,
            reviewed_at    = now()
      WHERE id = $4::uuid
        AND status = ANY($5::int[])
        AND claimant_id <> $3::uuid
      RETURNING id, status, return_comment, reviewed_at`,
    [to, comment, sub, claimId, from],
  );

  if (rows.length === 0) {
    return respond(409, { message: `ไม่สามารถ${text}ได้ (ไม่พบคำร้อง, สถานะไม่ถูกต้อง หรือเป็นคำร้องของตัวเอง)` });
  }
  return respond(200, { message: `${text}เรียบร้อย`, claim: rows[0] });
}
