// =====================================================================
// CS361 - Lookup API (GET อย่างเดียว) : Lambda ตัวเดียว แยกตาม path
//
//   GET /api/term                 -> ภาคการศึกษาทั้งหมด (ล่าสุดก่อน)
//   GET /api/period               -> รอบที่เปิดรับคำร้องอยู่ตอนนี้
//       ?term_id=1                   กรองเฉพาะเทอม
//       ?all=true                    ทุกรอบ ไม่ว่าจะเปิดหรือปิด
//   GET /api/courses              -> section ที่ผู้ใช้สอน + ชั่วโมงสอนแล้ว / ทั้งหมด / คงเหลือ
//       ?term_id=1                   กรองเฉพาะเทอม
//       ?all=true                    ทุก section (ไม่กรองตามผู้สอน) ใช้ทดสอบ / Staff
//
// ทุก path ตั้ง Authorization เป็น Cognito authorizer
// ผู้ใช้ (cognito_sub) มาจาก event.requestContext.authorizer.claims.sub
//
// Environment variables:
//   DATABASE_URL = postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
// อยู่ใน VPC เดียวกับ RDS (security group: cs361-lambda-sg)
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

export const handler = async (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims?.sub) return respond(401, { message: 'ต้องเข้าสู่ระบบก่อน' });

  const q = event.queryStringParameters ?? {};
  const termId = q.term_id !== undefined ? Number(q.term_id) : null;
  if (termId !== null && !Number.isInteger(termId)) {
    return respond(400, { message: 'term_id ต้องเป็นตัวเลข' });
  }
  const all = q.all === 'true';

  try {
    switch (event.resource) {
      case '/api/term':    return await getTerms();
      case '/api/period':  return await getPeriods(termId, all);
      case '/api/courses': return await getCourses(claims.sub, termId, all);
      default:             return respond(404, { message: 'ไม่พบ endpoint นี้' });
    }
  } catch (err) {
    console.error('DB error:', err.code, err.message);
    return respond(500, { message: 'ดึงข้อมูลไม่สำเร็จ' });
  }
};

// ---------------------------------------------------------------------
// GET /api/term
// ---------------------------------------------------------------------
async function getTerms() {
  const { rows } = await pool.query(
    `SELECT id,
            year,
            semester,
            semester || '/' || year AS label,          -- เช่น "1/2569"
            start_date,
            end_date
       FROM academic_term
      ORDER BY year DESC, semester DESC`,
  );
  return respond(200, { count: rows.length, terms: rows });
}

// ---------------------------------------------------------------------
// GET /api/period
// ---------------------------------------------------------------------
async function getPeriods(termId, all) {
  const { rows } = await pool.query(
    `SELECT p.id,
            p.term_id,
            t.semester || '/' || t.year AS term_label,
            p.month,
            p.open_at,
            p.close_at,
            p.status,
            (p.status = 'OPEN' AND now() BETWEEN p.open_at AND p.close_at) AS is_open_now
       FROM claim_period p
       JOIN academic_term t ON t.id = p.term_id
      WHERE ($1::int IS NULL OR p.term_id = $1)
        AND ($2 OR (p.status = 'OPEN' AND now() BETWEEN p.open_at AND p.close_at))
      ORDER BY p.open_at DESC`,
    [termId, all],
  );
  return respond(200, { count: rows.length, periods: rows });
}

// ---------------------------------------------------------------------
// GET /api/courses : section + ชั่วโมงสอน จาก class_schedule
// ---------------------------------------------------------------------
async function getCourses(cognitoSub, termId, all) {
  const { rows } = await pool.query(
    `SELECT s.id                          AS section_id,
            co.code                       AS course_code,
            co.name_th                    AS course_name_th,
            co.name_en                    AS course_name_en,
            s.section_no,
            s.term_id,
            t.semester || '/' || t.year   AS term_label,
            ss.role,                                           -- INSTRUCTOR / TA (NULL ถ้า all=true แล้วไม่ได้สอน)
            cs.start_time,
            cs.end_time,
            cs.hour::float                AS hour,             -- สอน (เบิก) ไปแล้ว
            cs.max_hour::float            AS max_hour,         -- ชั่วโมงทั้งหมด
            (cs.max_hour - cs.hour)::float AS remaining_hour   -- เหลือ
       FROM section s
       JOIN course         co ON co.id = s.course_id
       JOIN academic_term  t  ON t.id  = s.term_id
       LEFT JOIN class_schedule cs ON cs.section_id = s.id
       LEFT JOIN section_staff  ss ON ss.section_id = s.id AND ss.user_id = $1
      WHERE ($2::int IS NULL OR s.term_id = $2)
        AND ($3 OR ss.user_id IS NOT NULL)
      ORDER BY t.year DESC, t.semester DESC, co.code, s.section_no`,
    [cognitoSub, termId, all],
  );
  return respond(200, { count: rows.length, courses: rows });
}
