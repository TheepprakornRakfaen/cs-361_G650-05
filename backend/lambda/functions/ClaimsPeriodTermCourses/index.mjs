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
//       ?q=cs34                      ค้นรหัสหรือชื่อวิชา
//       ?staff=none|assigned|used|full   กรองตาม section_staff ทั้ง section
//            none = ยังไม่มีผู้สอน · assigned = มีผู้สอนแล้ว
//            used = เบิกชั่วโมงไปแล้ว · full = ใช้ครบโควตา
//   GET /api/compensation-types   -> ประเภทค่าตอบแทน + อัตราต่อชั่วโมง
//
// แบ่งหน้า (/api/period, /api/courses) — ไม่ส่ง limit = คืนทั้งหมดเหมือนเดิม
//       ?limit=10&offset=20          คืน { total, limit, offset } เพิ่มให้ทำปุ่มหน้า
//
// ทุก path ตั้ง Authorization เป็น Cognito authorizer
// ผู้ใช้ (cognito_sub) มาจาก event.requestContext.authorizer.claims.sub
//
// Environment variables:
//   DATABASE_URL = postgres://claim_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
//
// รุ่นหลัง migration 017: โควตาชั่วโมงแยกรายคนอยู่ที่ section_staff.hour / max_hour
// (ไม่มี class_schedule และไม่มี start_time / end_time)
// อยู่ใน VPC เดียวกับ RDS (security group: cs361-lambda-sg)
// =====================================================================
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 3000,
});

const STAFF_FILTERS = ["none", "assigned", "used", "full"];

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims?.sub) return respond(401, { message: "ต้องเข้าสู่ระบบก่อน" });

  const q = event.queryStringParameters ?? {};
  const termId = q.term_id !== undefined ? Number(q.term_id) : null;
  if (termId !== null && !Number.isInteger(termId)) {
    return respond(400, { message: "term_id ต้องเป็นตัวเลข" });
  }
  const all = q.all === "true";

  // limit ไม่ส่ง = null (ไม่จำกัด) · สูงสุด 100 ต่อหน้า
  const limit = q.limit !== undefined ? Number(q.limit) : null;
  const offset = q.offset !== undefined ? Number(q.offset) : 0;
  if (
    limit !== null &&
    !(Number.isInteger(limit) && limit >= 1 && limit <= 100)
  ) {
    return respond(400, { message: "limit ต้องเป็นจำนวนเต็ม 1-100" });
  }
  if (!(Number.isInteger(offset) && offset >= 0)) {
    return respond(400, { message: "offset ต้องเป็นจำนวนเต็มตั้งแต่ 0" });
  }
  const page = { limit, offset };
  const search = String(q.q ?? "")
    .trim()
    .slice(0, 100);
  const staff = q.staff ?? "";
  if (staff && !STAFF_FILTERS.includes(staff)) {
    return respond(400, {
      message: `staff ต้องเป็น ${STAFF_FILTERS.join(" / ")}`,
    });
  }

  try {
    switch (event.resource) {
      case "/api/term":
        return await getTerms();
      case "/api/period":
        return await getPeriods(termId, all, page);
      case "/api/courses":
        return await getCourses(claims.sub, termId, all, page, search, staff);
      case "/api/compensation-types":
        return await getCompensationTypes();
      default:
        return respond(404, { message: "ไม่พบ endpoint นี้" });
    }
  } catch (err) {
    console.error("DB error:", err.code, err.message);
    return respond(500, { message: "ดึงข้อมูลไม่สำเร็จ" });
  }
};

// ---------------------------------------------------------------------
// แบ่งหน้า: SELECT ต้องมี "count(*) OVER () AS total_count" (จำนวนทั้งหมดก่อนตัดหน้า)
// limit/offset ต่อท้ายพารามิเตอร์เดิม — LIMIT NULL = ไม่จำกัด
// ---------------------------------------------------------------------
async function queryPage(sql, params, { limit, offset }, countSql) {
  const n = params.length;
  const { rows } = await pool.query(`${sql} LIMIT $${n + 1} OFFSET $${n + 2}`, [
    ...params,
    limit,
    offset,
  ]);

  let total = rows.length ? Number(rows[0].total_count) : 0;
  // offset เลยแถวสุดท้าย → ไม่มีแถวให้อ่าน total จึงนับแยก
  if (!rows.length && offset > 0) {
    total = Number((await pool.query(countSql, params)).rows[0].total);
  }
  rows.forEach((r) => delete r.total_count);

  return { rows, total };
}

const pageInfo = (rows, total, { limit, offset }) => ({
  count: rows.length,
  total,
  limit,
  offset,
});

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
// GET /api/compensation-types : ประเภทค่าตอบแทน + อัตราต่อชั่วโมง (dropdown ตอนยื่นคำร้อง)
// ---------------------------------------------------------------------
async function getCompensationTypes() {
  const { rows } = await pool.query(
    `SELECT id,
            code,
            name,
            hourly_rate::float AS hourly_rate
       FROM compensation_type
      ORDER BY id`,
  );
  return respond(200, { count: rows.length, types: rows });
}

// ---------------------------------------------------------------------
// GET /api/period
// ---------------------------------------------------------------------
async function getPeriods(termId, all, page) {
  const where = `
      WHERE ($1::int IS NULL OR p.term_id = $1)
        AND ($2 OR (p.status = 1 AND now() BETWEEN p.open_at AND p.close_at))`;
  const { rows, total } = await queryPage(
    `SELECT p.id,
            p.term_id,
            t.semester || '/' || t.year AS term_label,
            p.month,
            p.open_at,
            p.close_at,
            p.status,
            (p.status = 1 AND now() BETWEEN p.open_at AND p.close_at) AS is_open_now,
            count(*) OVER () AS total_count
       FROM claim_period p
       JOIN academic_term t ON t.id = p.term_id
      ${where}
      ORDER BY p.open_at DESC, p.id DESC`,
    [termId, all],
    page,
    `SELECT count(*) AS total FROM claim_period p ${where}`,
  );
  return respond(200, { ...pageInfo(rows, total, page), periods: rows });
}

// ---------------------------------------------------------------------
// GET /api/courses : section + โควตาชั่วโมงของผู้ใช้คนนั้น จาก section_staff.hour / max_hour
// ---------------------------------------------------------------------
async function getCourses(cognitoSub, termId, all, page, search, staff) {
  // agg = รวมทุกคนใน section — อยู่ใน FROM เพื่อให้ WHERE / query นับจำนวนใช้กรองได้
  const from = `
       FROM section s
       JOIN course         co ON co.id = s.course_id
       JOIN academic_term  t  ON t.id  = s.term_id
       LEFT JOIN section_staff  ss ON ss.section_id = s.id AND ss.user_id = $1
       LEFT JOIN LATERAL (
            SELECT count(*)::int                         AS staff_count,
                   COALESCE(sum(a.max_hour), 0)::float   AS section_max_hour,
                   COALESCE(sum(a.hour), 0)::float       AS section_used_hour
              FROM section_staff a
             WHERE a.section_id = s.id
       ) agg ON true`;
  // $4 = คำค้น ('' = ไม่กรอง) ตรงรหัส/ชื่อไทย/ชื่ออังกฤษ แบบไม่สนตัวพิมพ์
  // $5 = สถานะผู้สอน ('' = ไม่กรอง) ดู STAFF_FILTERS
  const where = `
      WHERE ($2::int IS NULL OR s.term_id = $2)
        AND ($3 OR ss.user_id IS NOT NULL)
        AND ($4 = '' OR co.code    ILIKE '%' || $4 || '%'
                     OR co.name_th ILIKE '%' || $4 || '%'
                     OR co.name_en ILIKE '%' || $4 || '%')
        AND CASE $5
              WHEN 'none'     THEN agg.staff_count = 0
              WHEN 'assigned' THEN agg.staff_count > 0
              WHEN 'used'     THEN agg.section_used_hour > 0
              WHEN 'full'     THEN agg.section_max_hour > 0
                                   AND agg.section_used_hour >= agg.section_max_hour
              ELSE true
            END`;
  const { rows, total } = await queryPage(
    `SELECT s.id                          AS section_id,
            co.code                       AS course_code,
            co.name_th                    AS course_name_th,
            co.name_en                    AS course_name_en,
            s.section_no,
            s.term_id,
            t.semester || '/' || t.year   AS term_label,
            ss.role,                                           -- INSTRUCTOR / TA (NULL ถ้า all=true แล้วไม่ได้สอน)
            COALESCE(ss.hour, 0)::float                          AS hour,           -- ผู้ใช้คนนี้เบิกไปแล้ว
            COALESCE(ss.max_hour, 0)::float                      AS max_hour,       -- โควตาของผู้ใช้คนนี้
            (COALESCE(ss.max_hour, 0) - COALESCE(ss.hour, 0))::float AS remaining_hour, -- เหลือ
            -- รวมทุกคนใน section (ใช้ในหน้าจัดการระบบ)
            agg.staff_count,
            agg.section_max_hour,
            agg.section_used_hour,
            count(*) OVER () AS total_count
      ${from}
      ${where}
      ORDER BY t.year DESC, t.semester DESC, co.code, s.section_no, s.id`,
    [cognitoSub, termId, all, search, staff],
    page,
    `SELECT count(*) AS total ${from} ${where}`,
  );
  return respond(200, { ...pageInfo(rows, total, page), courses: rows });
}
