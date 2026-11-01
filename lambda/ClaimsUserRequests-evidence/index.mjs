// =====================================================================
// CS361 - ClaimsUserRequests (แบบง่าย) : RDS PostgreSQL
//   ตรงกับ schema: db/001_app_user.sql, 002_claim_submission.sql, 004_section_staff.sql
//
//   GET  /api/claims                 -> ดูคำร้องของตัวเอง (ล่าสุดก่อน) พร้อมหลักฐานจาก S3
//   GET  /api/claims/{id}/evidence   -> หลักฐานของคำร้องเดียว (ใช้รีเฟรชลิงก์ที่หมดอายุ)
//   POST /api/claims  -> สร้างคำร้องสถานะร่าง (claim.status = 0)
//        Body: {
//          "academic_term": 3,          // academic_term.id
//          "period_id": 2,              // claim_period.id
//          "section_id": 1,             // section.id
//          "date": "2026-09-18",        // claim.teach_date (YYYY-MM-DD)
//          "hour": 1.5,                 // claim.hour
//          "note": "..." | null         // claim.note (ไม่บังคับ)
//        }
//        claim.type_id = compensation_type ที่ code = 'TEACHING' (ใส่ให้อัตโนมัติ)
//
//   ตรวจก่อนบันทึก (ตาม schema):
//     - section / claim_period มีอยู่จริง และอยู่ใน academic_term เดียวกัน
//     - claim_period.status = 1 และตอนนี้อยู่ในช่วง open_at – close_at
//     - ผู้ใช้เป็นผู้สอน/TA ของ section นั้น (section_staff)
//     - hour ไม่เกินชั่วโมงคงเหลือ (class_schedule.max_hour - class_schedule.hour)
//
// ผู้ใช้ (cognito_sub) มาจาก Cognito authorizer:
//   event.requestContext.authorizer.claims.sub   (ไม่รับจาก body)
//
// Environment variables:
//   DATABASE_URL    = postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
//   EVIDENCE_BUCKET = ชื่อ S3 bucket ที่เก็บหลักฐาน
// =====================================================================
import pg from 'pg';
import { listEvidenceByClaim, listEvidenceForClaim } from './evidence.mjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 3000,
});

const DEFAULT_TYPE_CODE = 'TEACHING';

// response ของ Lambda proxy มีได้แค่ statusCode / headers / body
// (ห้ามเพิ่ม key อื่น และห้ามอ้าง event ในนี้ เพราะ event ไม่อยู่ใน scope)
const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  },
  body: JSON.stringify(body),
});

const toInt = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

export const handler = async (event) => {
  console.log('method:', event.httpMethod, 'resource:', event.resource);

  const claims = event.requestContext?.authorizer?.claims;
  if (!claims?.sub) return respond(401, { message: 'ต้องเข้าสู่ระบบก่อน' });

  try {
    if (event.httpMethod === 'GET' && event.resource === '/api/claims/{id}/evidence') {
      return await getClaimEvidence(claims.sub, event.pathParameters?.id);
    }
    if (event.httpMethod === 'GET') return await listMyClaims(claims.sub);
    if (event.httpMethod === 'POST') return await createClaim(claims, event.body);
    return respond(405, { message: 'ไม่รองรับ method นี้' });
  } catch (err) {
    console.error('DB error:', err.code, err.message);
    if (err.$metadata) return respond(502, { message: 'ดึงหลักฐานจาก S3 ไม่สำเร็จ' });   // error จาก AWS SDK
    if (err.code === '23503') return respond(400, { message: 'ไม่พบรอบ ประเภทการเบิก หรือรายวิชาที่เลือก' });
    if (err.code === '23514' || err.code === '22003') return respond(400, { message: 'จำนวนชั่วโมงไม่ถูกต้อง' });
    if (err.code === '22007' || err.code === '22008') return respond(400, { message: 'วันที่ไม่ถูกต้อง' });
    if (err.code === '22P02') return respond(400, { message: 'รูปแบบข้อมูลไม่ถูกต้อง' });
    if (err.code === '23502') return respond(500, { message: `ยังไม่มีประเภทการเบิก ${DEFAULT_TYPE_CODE} ในระบบ` });
    return respond(500, { message: 'เกิดข้อผิดพลาดกับฐานข้อมูล' });
  }
};

// ---------------------------------------------------------------------
// GET: คำร้องของตัวเอง
//   claim JOIN section / course / academic_term / claim_period / compensation_type
//   LEFT JOIN class_schedule (เวลาเรียน + ชั่วโมงสะสมของ section)
// ---------------------------------------------------------------------
async function listMyClaims(cognitoSub) {
  const { rows } = await pool.query(
    `SELECT c.id,
            c.status,
            CASE c.status WHEN 0 THEN 'ร่าง' WHEN 1 THEN 'ยื่นแล้ว' WHEN 2 THEN 'ยกเลิก' END AS status_text,
            to_char(c.teach_date, 'YYYY-MM-DD') AS date,
            c.hour::float                AS hour,
            c.note,
            c.submitted_at,
            c.created_at,
            c.section_id,
            co.code                      AS course_code,
            co.name_th                   AS course_name,
            co.name_en                   AS course_name_en,
            s.section_no,
            to_char(cs.start_time, 'HH24:MI') AS start_time,
            to_char(cs.end_time,   'HH24:MI') AS end_time,
            cs.hour::float               AS section_hour,      -- ชั่วโมงที่ยื่นไปแล้วของ section
            cs.max_hour::float           AS section_max_hour,
            s.term_id                    AS academic_term,
            t.semester || '/' || t.year  AS term,
            c.period_id,
            p.month                      AS period_month,
            c.type_id,
            ct.code                      AS type_code,
            ct.name                      AS type_name
       FROM claim c
       JOIN section            s  ON s.id  = c.section_id
       JOIN course             co ON co.id = s.course_id
       JOIN academic_term      t  ON t.id  = s.term_id
       JOIN claim_period       p  ON p.id  = c.period_id
       LEFT JOIN compensation_type ct ON ct.id = c.type_id
       LEFT JOIN class_schedule cs ON cs.section_id = c.section_id
      WHERE c.claimant_id = $1
      ORDER BY c.created_at DESC`,
    [cognitoSub],
  );

  // หลักฐานจาก S3 (ทุกคำร้องของผู้ใช้ใน ListObjectsV2 ครั้งเดียว)
  // ถ้า S3 มีปัญหา ยังคืนรายการคำร้องได้ แต่ evidence ว่าง + บอกว่าโหลดไม่สำเร็จ
  let evidenceByClaim = new Map();
  let evidence_error = false;
  try {
    evidenceByClaim = await listEvidenceByClaim(cognitoSub);
  } catch (err) {
    console.error('S3 error:', err.name, err.message);
    evidence_error = true;
  }

  const claims = rows.map((r) => ({ ...r, evidence: evidenceByClaim.get(r.id) ?? [] }));
  return respond(200, { count: claims.length, evidence_error, claims });
}

// ---------------------------------------------------------------------
// GET /api/claims/{id}/evidence : หลักฐานของคำร้องเดียว
//   ตรวจว่าคำร้องเป็นของผู้ใช้ก่อน (prefix ใช้ sub จาก token อยู่แล้ว
//   แต่เช็ค DB ด้วยเพื่อตอบ 404 ให้ถูกต้อง)
// ---------------------------------------------------------------------
async function getClaimEvidence(cognitoSub, claimId) {
  if (!/^[0-9a-f-]{36}$/i.test(claimId ?? '')) return respond(400, { message: 'รหัสคำร้องไม่ถูกต้อง' });
  const { rowCount } = await pool.query(
    'SELECT 1 FROM claim WHERE id = $1 AND claimant_id = $2',
    [claimId, cognitoSub],
  );
  if (!rowCount) return respond(404, { message: 'ไม่พบคำร้อง' });

  const evidence = await listEvidenceForClaim(cognitoSub, claimId);
  return respond(200, { claim_id: claimId, count: evidence.length, evidence });
}

// ---------------------------------------------------------------------
// POST: สร้างคำร้อง (status = 0 ร่าง)
// ---------------------------------------------------------------------
async function createClaim(claims, rawBody) {
  let body;
  try {
    body = JSON.parse(rawBody ?? '{}');
  } catch {
    return respond(400, { message: 'รูปแบบข้อมูลไม่ถูกต้อง' });
  }

  // แปลงชนิดข้อมูลให้ตรงกับคอลัมน์ (INT / NUMERIC) รองรับ frontend ที่ส่งเป็น string
  const academicTerm = toInt(body.academic_term);
  const periodId     = toInt(body.period_id);
  const sectionId    = toInt(body.section_id);
  const hour         = Number(body.hour);
  const date         = body.date;
  const note         = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

  if (!academicTerm || !periodId || !sectionId || !date || !(hour > 0)) {
    return respond(400, { message: 'กรุณากรอก academic_term, period_id, section_id, date และ hour ให้ครบ' });
  }
  if (hour > 999.99 || Math.abs(Math.round(hour * 100) - hour * 100) > 1e-9) {
    return respond(400, { message: 'hour ต้องไม่เกิน 999.99 และมีทศนิยมไม่เกิน 2 ตำแหน่ง' });   // NUMERIC(5,2)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return respond(400, { message: 'date ต้องอยู่ในรูปแบบ YYYY-MM-DD' });
  }

  // ตรวจทุกอย่างใน query เดียว (LEFT JOIN: ถ้าไม่พบจะได้ NULL)
  const { rows: [chk] } = await pool.query(
    `SELECT s.term_id                                    AS section_term,
            p.term_id                                    AS period_term,
            (p.status = 1 AND now() BETWEEN p.open_at AND p.close_at) AS period_open,
            ss.role                                      AS staff_role,
            (cs.max_hour - cs.hour)::float               AS remaining_hour,
            ($3::date BETWEEN t.start_date AND t.end_date) AS date_in_term
       FROM (SELECT 1) AS x
       LEFT JOIN section        s  ON s.id = $1
       LEFT JOIN academic_term  t  ON t.id = s.term_id
       LEFT JOIN claim_period   p  ON p.id = $2
       LEFT JOIN section_staff  ss ON ss.section_id = s.id AND ss.user_id = $4
       LEFT JOIN class_schedule cs ON cs.section_id = s.id`,
    [sectionId, periodId, date, claims.sub],
  );

  if (chk.section_term == null || chk.period_term == null) {
    return respond(400, { message: 'ไม่พบรอบหรือรายวิชาที่เลือก' });
  }
  if (chk.section_term !== academicTerm || chk.period_term !== academicTerm) {
    return respond(400, { message: 'รายวิชาหรือรอบที่เลือกไม่ได้อยู่ในภาคการศึกษานี้' });
  }
  if (!chk.period_open) {
    return respond(400, { message: 'รอบนี้ไม่ได้เปิดรับคำร้องอยู่' });
  }
  if (!chk.date_in_term) {
    return respond(400, { message: 'วันที่สอนไม่อยู่ในช่วงภาคการศึกษานี้' });
  }
  if (!chk.staff_role) {
    return respond(403, { message: 'คุณไม่ได้เป็นผู้สอนหรือผู้ช่วยสอนของ section นี้' });
  }
  if (chk.remaining_hour != null && hour > chk.remaining_hour) {
    return respond(400, { message: `ชั่วโมงเกินที่เหลือของ section (เหลือ ${chk.remaining_hour} ชม.)` });
  }

  // app_user: sync ชื่อจาก token (ตรงกับ 001: username, name, synced_at)
  const username = claims.email ?? claims['cognito:username'];
  const name = [claims.given_name, claims.family_name].filter(Boolean).join(' ') || username;
  await pool.query(
    `INSERT INTO app_user (cognito_sub, username, name) VALUES ($1, $2, $3)
     ON CONFLICT (cognito_sub) DO UPDATE
       SET username = EXCLUDED.username, name = EXCLUDED.name, synced_at = now()`,
    [claims.sub, username, name],
  );

  const { rows } = await pool.query(
    `INSERT INTO claim (claimant_id, period_id, type_id, section_id, teach_date, hour, note)
     VALUES ($1, $2, (SELECT id FROM compensation_type WHERE code = $3 AND is_active), $4, $5, $6, $7)
     RETURNING id, claimant_id, period_id, type_id, section_id,
               to_char(teach_date, 'YYYY-MM-DD') AS date, hour::float AS hour,
               note, status, submitted_at, created_at`,
    [claims.sub, periodId, DEFAULT_TYPE_CODE, sectionId, date, hour, note],
  );

  return respond(201, { ...rows[0], academic_term: academicTerm, role: chk.staff_role });
}
