// =====================================================================
// CS361 - ClaimUserRequest (รุ่นหลัง migration 012)
//
//   GET    /api/claims                  -> คำร้องของตัวเอง
//   GET    /api/claims?scope=review     -> คิวตรวจ (REVIEWER / APPROVER) ทุกคน ยกเว้นร่าง
//   POST   /api/claims                  -> สร้างคำร้อง (status 0 ร่าง / 1 ยื่น)
//   POST   /api/claims/{id}/resend      -> แก้คำร้องที่ถูกส่งคืน (5) แล้วยื่นใหม่ (1)
//   DELETE /api/claims                  -> ลบร่างของตัวเอง  Body: { id }
//
// Body สร้าง/ส่งใหม่ (หลัง 012):
//   { academic_term, period_id, section_id, status?, hour, date: ["YYYY-MM-DD", ...], note }
//   - hour = ชั่วโมงรวมของคำร้อง (กรอกครั้งเดียว) เก็บที่ claim.hour
//   - date รับทั้ง ["2026-09-01"] และ [{ date: "2026-09-01" }]
//   - ถ้าไม่ส่ง hour แต่ date เป็น [{date, hour}] แบบเก่า จะรวม hour ให้ (เข้ากันได้ย้อนหลัง)
//
// ตัวนับ section.hour = ชั่วโมงที่เบิกไปแล้ว (คำร้องสถานะ 1,2,3)
//   - +hour ตอนยื่น (status 1) / ส่งใหม่  - ถ้าเกิน max_hour ปฏิเสธ
//   - ตอนไม่อนุมัติ (4) / ส่งคืนแก้ไข (5) ต้อง -hour ที่ ClaimReview / Workflow
//   - ไม่มี uq_claim_one_per_month แล้ว: ยื่นวิชาเดียวกันได้หลายครั้งต่อเดือน
//     แต่ห้ามวันสอนซ้ำกับคำร้องอื่นที่ยังไม่ถูกปฏิเสธ/ส่งคืน (ตรวจใน validateClaim)
//
// status: 0 ร่าง, 1 รอตรวจ, 2 รออนุมัติ, 3 อนุมัติ, 4 ไม่อนุมัติ, 5 ส่งคืนแก้ไข
//
// Issue #43: ส่งกลับเฉพาะข้อมูลที่หน้าเว็บใช้จริง
//   - ไม่ส่ง claimant_id (Cognito sub) และ id ภายในอื่นๆ ที่ไม่ใช้
//   - ไม่ส่งโควตาชั่วโมงของ section / ประเภทการเบิก
//   - error ไม่ส่งรายละเอียดของฐานข้อมูล (ดูได้ใน CloudWatch)
// =====================================================================
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 3000,
});

const DEFAULT_TYPE_CODE = 'TEACHING';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLAIMANT_GROUPS = ['TEACHER', 'TA'];
const REVIEW_GROUPS = ['REVIEWER', 'APPROVER'];

// ดึง Group จาก Cognito Claims ที่ API Gateway ตรวจสอบแล้ว
const getGroups = (claims) => {
  const raw = claims?.['cognito:groups'];
  if (Array.isArray(raw)) return raw;
  return String(raw ?? '')
    .replace(/[\[\]"']/g, '')
    .split(/[,\s]+/)
    .filter(Boolean);
};

const hasAnyGroup = (claims, allowedGroups) =>
  getGroups(claims).some((group) => allowedGroups.includes(group));

const isClaimant = (claims) => hasAnyGroup(claims, CLAIMANT_GROUPS);
const isReviewer = (claims) => hasAnyGroup(claims, REVIEW_GROUPS);

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

const parseBody = (raw) => {
  try { return JSON.parse(raw ?? '{}') || {}; } catch { return null; }
};

export const handler = async (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims?.sub) return respond(401, { message: 'ต้องเข้าสู่ระบบก่อน' });

  try {
    // GET /api/claims
    if (event.httpMethod === 'GET') {
      if (event.queryStringParameters?.scope === 'review') {
        if (!isReviewer(claims)) return respond(403, { message: 'คุณไม่มีสิทธิ์ดูคิวตรวจสอบ' });
        return await queryClaims(null);
      }
      if (!isClaimant(claims)) return respond(403, { message: 'คุณไม่มีสิทธิ์ดูรายการคำร้องส่วนนี้' });
      return await queryClaims(claims.sub);
    }

    // POST /api/claims/{id}/resend
    if (event.httpMethod === 'POST' && event.resource === '/api/claims/{id}/resend') {
      if (!isClaimant(claims)) return respond(403, { message: 'คุณไม่มีสิทธิ์ส่งคำร้อง' });
      return await resendClaim(claims.sub, event.pathParameters?.id, event.body);
    }

    // POST /api/claims
    if (event.httpMethod === 'POST' && event.resource === '/api/claims') {
      if (!isClaimant(claims)) return respond(403, { message: 'คุณไม่มีสิทธิ์สร้างคำร้อง' });
      return await createClaim(claims.sub, event.body);
    }

    // DELETE /api/claims
    if (event.httpMethod === 'DELETE' && event.resource === '/api/claims') {
      if (!isClaimant(claims)) return respond(403, { message: 'คุณไม่มีสิทธิ์ลบคำร้อง' });
      return await deleteRequest(claims.sub, event.body);
    }

    return respond(405, { message: 'ไม่รองรับ method นี้' });
  } catch (err) {
    // รายละเอียดเก็บใน CloudWatch เท่านั้น ไม่ส่งกลับให้ผู้ใช้
    console.error('DB error:', err.code, err.constraint, err.message);
    if (err.code === '23505') return respond(409, { message: 'มีวันสอนซ้ำกันในคำร้อง' });
    if (['23503', '23514', '22003', '22007', '22008', '22P02'].includes(err.code))
      return respond(400, { message: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่' });
    return respond(500, { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
  }
};

// ---------------------------------------------------------------------
// GET: cognitoSub = null -> ทุกคน (ยกเว้นร่าง), มีค่า -> เฉพาะของตัวเอง
// ส่งเฉพาะฟิลด์ที่ services/claimMapper.js ใช้
// ---------------------------------------------------------------------
async function queryClaims(cognitoSub) {
  const { rows } = await pool.query(
    `SELECT c.id,
            u.name                       AS claimant_name,
            c.status,
            COALESCE(d.dates, '[]')      AS date,
            c.hour::float                AS hour,
            c.hourly_rate::float         AS rate,
            (c.hour * c.hourly_rate)::float AS amount,
            c.note,
            c.submitted_at,
            c.created_at,
            c.section_id,
            co.code                      AS course_code,
            co.name_th                   AS course_name,
            co.name_en                   AS course_name_en,
            s.term_id                    AS academic_term,
            t.semester || '/' || t.year  AS term,
            c.period_id,
            p.month                      AS period_month
       FROM claim c
       JOIN app_user           u  ON u.cognito_sub = c.claimant_id
       JOIN section            s  ON s.id  = c.section_id
       JOIN course             co ON co.id = s.course_id
       JOIN academic_term      t  ON t.id  = s.term_id
       JOIN claim_period       p  ON p.id  = c.period_id
       LEFT JOIN LATERAL (
            SELECT json_agg(json_build_object(
                     'date', to_char(cd.teach_date, 'YYYY-MM-DD')
                   ) ORDER BY cd.teach_date) AS dates
              FROM claim_date cd
             WHERE cd.claim_id = c.id
       ) d ON true
      WHERE ($1::uuid IS NULL AND c.status <> 0)   -- คิวตรวจ: ทุกคน ยกเว้นร่าง
         OR c.claimant_id = $1::uuid              -- ของตัวเอง
      ORDER BY c.created_at DESC`,
    [cognitoSub],
  );

  return respond(200, { count: rows.length, claims: rows });
}

// ---------------------------------------------------------------------
// ตรวจข้อมูลคำร้อง (ใช้ร่วมกันทั้งสร้างใหม่และส่งใหม่)
// คืน { error } ถ้าไม่ผ่าน หรือ { data } ถ้าผ่าน
// ---------------------------------------------------------------------
async function validateClaim(cognitoSub, body, excludeClaimId = null) {
  const academicTerm = toInt(body.academic_term);
  const periodId     = toInt(body.period_id);
  const sectionId    = toInt(body.section_id);

  // date: ["YYYY-MM-DD", ...] หรือ [{ date: "YYYY-MM-DD" }, ...]
  const items = Array.isArray(body.date) ? body.date : [];
  const dates = items.map((i) => (typeof i === 'string' ? i : i?.date));
  // hour = ชั่วโมงรวม (ใหม่) ถ้าไม่ส่งมา รวมจาก date[].hour แบบเก่า
  const hour  = body.hour !== undefined && body.hour !== null
    ? Number(body.hour)
    : items.reduce((sum, i) => sum + Number(i?.hour), 0);
  const note  = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

  if (!academicTerm || !periodId || !sectionId)
    return { error: respond(400, { message: 'กรุณาเลือกภาคการศึกษา รอบ และรายวิชาให้ครบ' }) };
  if (items.length === 0)
    return { error: respond(400, { message: 'ต้องระบุวันที่สอนอย่างน้อย 1 วัน' }) };
  if (!Number.isFinite(hour) || hour <= 0 || hour > 9999.99 || Math.abs(hour * 100 - Math.round(hour * 100)) > 1e-6)
    return { error: respond(400, { message: 'ชั่วโมงสอนรวมต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง' }) };
  if (!dates.every((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))
    return { error: respond(400, { message: 'วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD' }) };
  if (new Set(dates).size !== dates.length)
    return { error: respond(400, { message: 'มีวันที่สอนซ้ำกัน' }) };

  const { rows: [chk] } = await pool.query(
    `SELECT s.term_id AS section_term,
            p.term_id AS period_term,
            (p.status = 1 AND now() BETWEEN p.open_at AND p.close_at) AS period_open,
            ss.role   AS staff_role,
            (s.max_hour - s.hour)::float AS remaining_hour,
            (SELECT bool_and(d BETWEEN t.start_date AND t.end_date)
               FROM unnest($3::date[]) AS d) AS date_in_term
       FROM (SELECT 1) AS x
       LEFT JOIN section s         ON s.id = $1
       LEFT JOIN academic_term t   ON t.id = s.term_id
       LEFT JOIN claim_period p    ON p.id = $2
       LEFT JOIN section_staff ss  ON ss.section_id = s.id AND ss.user_id = $4::uuid`,
    [sectionId, periodId, dates, cognitoSub],
  );

  if (chk.section_term == null || chk.period_term == null)
    return { error: respond(400, { message: 'ไม่พบรอบหรือรายวิชาที่เลือก' }) };
  if (Number(chk.section_term) !== academicTerm || Number(chk.period_term) !== academicTerm)
    return { error: respond(400, { message: 'รายวิชาหรือรอบที่เลือกไม่ได้อยู่ในภาคการศึกษานี้' }) };
  if (!chk.period_open)
    return { error: respond(400, { message: 'รอบนี้ไม่ได้เปิดรับคำร้องอยู่' }) };
  if (!chk.date_in_term)
    return { error: respond(400, { message: 'วันที่สอนไม่อยู่ในช่วงภาคการศึกษานี้' }) };
  // เช็คสิทธิ์ก่อนบอกชั่วโมงคงเหลือ -> คนนอก section ไม่เห็นข้อมูลของ section
  if (!chk.staff_role)
    return { error: respond(403, { message: 'คุณไม่ได้เป็นผู้สอนหรือผู้ช่วยสอนของ section นี้' }) };
  if (chk.remaining_hour != null && hour > Number(chk.remaining_hour))
    return { error: respond(400, { message: `ชั่วโมงเกินที่เหลือของ section (เหลือ ${chk.remaining_hour} ชม.)` }) };

  // ไม่มี uq_claim_one_per_month แล้ว -> กันวันสอนซ้ำกับคำร้องอื่นของตัวเอง (วิชาเดียวกัน)
  // นับเฉพาะที่ยังใช้งานอยู่: 1 รอตรวจ, 2 รออนุมัติ, 3 อนุมัติ
  const { rows: dup } = await pool.query(
    `SELECT to_char(cd.teach_date, 'YYYY-MM-DD') AS d
       FROM claim_date cd
       JOIN claim c ON c.id = cd.claim_id
      WHERE c.claimant_id = $1::uuid
        AND c.section_id  = $2
        AND c.status IN (1, 2, 3)
        AND ($3::uuid IS NULL OR c.id <> $3::uuid)
        AND cd.teach_date = ANY($4::date[])
      ORDER BY cd.teach_date`,
    [cognitoSub, sectionId, excludeClaimId, dates],
  );
  if (dup.length > 0)
    return { error: respond(409, { message: `วันสอนซ้ำกับคำร้องอื่นที่ยื่นไปแล้ว: ${dup.map((r) => r.d).join(', ')}` }) };

  return { data: { periodId, sectionId, dates, hour, note } };
}

// ---------------------------------------------------------------------
// จองชั่วโมงใน section (ตัวนับ section.hour) ภายใน transaction เดียวกับคำร้อง
// UPDATE เดียว เช็ก max_hour พร้อมกัน -> ไม่เกิดช่วงชิงกันระหว่างหลายคนยื่นพร้อมกัน
// คืน true ถ้าจองได้, false ถ้าเกิน max_hour
// ---------------------------------------------------------------------
async function reserveHours(client, sectionId, hour) {
  const { rowCount } = await client.query(
    `UPDATE section SET hour = hour + $2::numeric
      WHERE id = $1 AND hour + $2::numeric <= max_hour`,
    [sectionId, hour],
  );
  return rowCount === 1;
}

// ---------------------------------------------------------------------
// POST /api/claims : สร้างคำร้อง
// Body: { academic_term, period_id, section_id, status: 0|1, date: [...], note }
// Response: { id, status, hour, submitted_at, created_at }
// ---------------------------------------------------------------------
async function createClaim(cognitoSub, rawBody) {
  const body = parseBody(rawBody);
  if (!body) return respond(400, { message: 'รูปแบบ JSON ไม่ถูกต้อง' });

  const status = body.status === undefined || body.status === null ? 0 : Number(body.status);
  if (status !== 0 && status !== 1) return respond(400, { message: 'status ต้องเป็น 0 (ร่าง) หรือ 1 (ยื่น)' });

  const { error, data } = await validateClaim(cognitoSub, body);
  if (error) return error;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [created] } = await client.query(
      `INSERT INTO claim (claimant_id, period_id, type_id, section_id, status, hour, note, submitted_at)
       VALUES ($1::uuid, $2,
               (SELECT id FROM compensation_type WHERE code = $3 LIMIT 1),
               $4, $5::smallint, $6::numeric, $7,
               CASE WHEN $5::smallint = 1 THEN now() END)
       RETURNING id, status, submitted_at, created_at`,
      [cognitoSub, data.periodId, DEFAULT_TYPE_CODE, data.sectionId, status, data.hour, data.note],
    );

    await client.query(
      `INSERT INTO claim_date (claim_id, teach_date)
       SELECT $1, d FROM unnest($2::date[]) AS t(d)`,
      [created.id, data.dates],
    );

    // ร่าง (0) ยังไม่จองชั่วโมง จองเมื่อยื่น (1)
    if (status === 1 && !(await reserveHours(client, data.sectionId, data.hour))) {
      await client.query('ROLLBACK');
      return respond(400, { message: 'ชั่วโมงเกินที่เหลือของ section' });
    }

    await client.query('COMMIT');
    return respond(201, { ...created, hour: data.hour });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------
// POST /api/claims/{id}/resend : แก้คำร้องที่ถูกส่งคืน (5) แล้วยื่นใหม่ (1)
// Body: { academic_term, period_id, section_id, date: [...], note }
// Response: { id, status, hour, submitted_at, created_at }
// ---------------------------------------------------------------------
async function resendClaim(cognitoSub, claimId, rawBody) {
  if (!UUID_RE.test(claimId ?? '')) return respond(400, { message: 'claim id ไม่ถูกต้อง' });

  const body = parseBody(rawBody);
  if (!body) return respond(400, { message: 'รูปแบบ JSON ไม่ถูกต้อง' });

  // ต้องเป็นของตัวเอง และอยู่สถานะส่งคืนแก้ไข
  const { rows: [old] } = await pool.query(
    'SELECT status FROM claim WHERE id = $1::uuid AND claimant_id = $2::uuid',
    [claimId, cognitoSub],
  );
  if (!old) return respond(404, { message: 'ไม่พบคำร้องนี้' });
  if (old.status !== 5) return respond(409, { message: 'ส่งใหม่ได้เฉพาะคำร้องที่ถูกส่งคืนแก้ไข' });

  const { error, data } = await validateClaim(cognitoSub, body, claimId);
  if (error) return error;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // status = 5 ใน WHERE กันกรณีสถานะเปลี่ยนระหว่างทาง
    const { rows: [updated] } = await client.query(
      `UPDATE claim
          SET period_id = $3, section_id = $4, note = $5, hour = $6::numeric,
              status = 1, submitted_at = now()
        WHERE id = $1::uuid AND claimant_id = $2::uuid AND status = 5
        RETURNING id, status, submitted_at, created_at`,
      [claimId, cognitoSub, data.periodId, data.sectionId, data.note, data.hour],
    );
    if (!updated) {
      await client.query('ROLLBACK');
      return respond(409, { message: 'สถานะของคำร้องเปลี่ยนไปแล้ว กรุณาโหลดใหม่' });
    }

    // วันสอน: ลบชุดเดิม แล้วใส่ชุดใหม่
    await client.query('DELETE FROM claim_date WHERE claim_id = $1', [claimId]);
    await client.query(
      `INSERT INTO claim_date (claim_id, teach_date)
       SELECT $1, d FROM unnest($2::date[]) AS t(d)`,
      [claimId, data.dates],
    );

    // คำร้องสถานะ 5 ไม่นับในตัวนับ -> จองชั่วโมงใหม่ตอนส่งใหม่
    if (!(await reserveHours(client, data.sectionId, data.hour))) {
      await client.query('ROLLBACK');
      return respond(400, { message: 'ชั่วโมงเกินที่เหลือของ section' });
    }

    await client.query('COMMIT');
    return respond(200, { ...updated, hour: data.hour });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------
// DELETE /api/claims : ลบได้เฉพาะร่างของตัวเอง  Body: { id }
// ---------------------------------------------------------------------
async function deleteRequest(cognitoSub, rawBody) {
  const body = parseBody(rawBody);
  if (!body || !UUID_RE.test(body.id ?? '')) return respond(400, { message: 'claim id ไม่ถูกต้อง' });

  const { rows } = await pool.query(
    `DELETE FROM claim
      WHERE claimant_id = $1::uuid AND id = $2::uuid AND status = 0
      RETURNING id`,
    [cognitoSub, body.id],
  );

  if (rows.length === 0) return respond(404, { message: 'ไม่พบแบบร่าง หรือคำขอนี้ไม่สามารถลบได้' });
  return respond(200, { id: rows[0].id, message: 'ลบแบบร่างเรียบร้อยแล้ว' });
}
