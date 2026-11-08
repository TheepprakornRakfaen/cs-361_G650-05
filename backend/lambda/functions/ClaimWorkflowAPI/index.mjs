import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },

  max: 1,

  connectionTimeoutMillis: 3000,
});

const TERM_HOUR_LIMIT = 45;

const DEFAULT_TYPE_CODE = "TEACHING";

const respond = (statusCode, body) => ({
  statusCode,

  headers: {
    "Content-Type": "application/json",

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Headers": "Content-Type,Authorization",

    "Access-Control-Allow-Methods": "GET,PATCH,POST,OPTIONS",
  },

  body: JSON.stringify(body),
});

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function toInt(value) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseBody(rawBody) {
  try {
    return JSON.parse(rawBody ?? "{}");
  } catch {
    return null;
  }
}

/*
 * ============================================
 * อ่านข้อมูลทั้งหมดที่จำเป็นต่อ Validation
 * ============================================
 */
async function getClaimValidationData(client, claimId, cognitoSub) {
  const {
    rows: [claim],
  } = await client.query(
    `
    SELECT
      c.id,
      c.claimant_id,
      c.status,
      c.period_id,
      c.section_id,
      c.type_id,

      to_char(
        (
          SELECT MIN(cd.teach_date)
          FROM claim_date cd
          WHERE cd.claim_id = c.id
        ),
        'YYYY-MM-DD'
      ) AS date,

      COALESCE(
        (
          SELECT SUM(cd.hour)
          FROM claim_date cd
          WHERE cd.claim_id = c.id
        ),
        0
      )::float AS hour,

      c.note,
      c.submitted_at,
      c.created_at,
      s.term_id AS section_term,
      p.term_id AS period_term,
      p.status AS period_status,
      p.open_at,
      p.close_at,

      (
        p.status = 1
        AND now() BETWEEN p.open_at AND p.close_at
      ) AS period_open,

      (
        EXISTS (
          SELECT 1
          FROM claim_date cd
          WHERE cd.claim_id = c.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM claim_date cd
          WHERE cd.claim_id = c.id
            AND cd.teach_date NOT BETWEEN t.start_date AND t.end_date
        )
      ) AS date_in_term,

      ss.role AS staff_role,
      cs.hour::float AS section_used_hour,
      cs.max_hour::float AS section_max_hour,
      ct.code AS type_code,

      EXISTS (
        SELECT 1
        FROM claim_evidence ce
        WHERE ce.claim_id = c.id
      ) AS has_evidence,

      COALESCE(
        (
          SELECT SUM(cd.hour)
          FROM claim other
          JOIN claim_date cd
            ON cd.claim_id = other.id
          JOIN section other_section
            ON other_section.id = other.section_id
          WHERE other.claimant_id = c.claimant_id
            AND other.status IN (1, 2, 3)
            AND other.id <> c.id
            AND other_section.term_id = s.term_id
        ),
        0
      )::float AS submitted_term_hour

    FROM claim c
    JOIN section s
      ON s.id = c.section_id
    JOIN academic_term t
      ON t.id = s.term_id
    JOIN claim_period p
      ON p.id = c.period_id
    LEFT JOIN section_staff ss
      ON ss.section_id = c.section_id
     AND ss.user_id = c.claimant_id
    LEFT JOIN class_schedule cs
      ON cs.section_id = c.section_id
    LEFT JOIN compensation_type ct
      ON ct.id = c.type_id
    WHERE c.id = $1::uuid
      AND c.claimant_id = $2::uuid
    `,
    [claimId, cognitoSub],
  );

  return claim || null;
}

/*
 * ============================================
 * Validation Engine
 * ============================================
 */
function validateClaim(claim) {
  const errors = [];

  if (!claim) {
    return {
      valid: false,

      errors: [
        {
          code: "CLAIM_NOT_FOUND",

          field: null,

          message: "ไม่พบคำขอนี้",
        },
      ],
    };
  }

  /*
   * ต้องยังเป็น Draft
   */
  if (![0, 5].includes(Number(claim.status))) {
    errors.push({
      code: "CLAIM_NOT_EDITABLE",
      field: "status",
      message: "คำขอต้องอยู่ในสถานะ Draft หรือ Returned",
    });
  }

  /*
   * Compensation Type
   */
  if (claim.type_code !== DEFAULT_TYPE_CODE) {
    errors.push({
      code: "INVALID_COMPENSATION_TYPE",

      field: "type_id",

      message: "ประเภทค่าตอบแทนไม่ถูกต้อง",
    });
  }

  /*
   * Semester
   */
  if (Number(claim.section_term) !== Number(claim.period_term)) {
    errors.push({
      code: "TERM_MISMATCH",

      field: "period_id",

      message: "รายวิชาและรอบการยื่นไม่ได้อยู่ในภาคการศึกษาเดียวกัน",
    });
  }

  /*
   * Submission Period
   */
  if (!claim.period_open) {
    errors.push({
      code: "PERIOD_CLOSED",

      field: "period_id",

      message: "รอบนี้ไม่ได้อยู่ในช่วงเปิดรับคำขอ",
    });
  }

  /*
   * Teaching date
   */
  if (!claim.date_in_term) {
    errors.push({
      code: "DATE_OUTSIDE_TERM",

      field: "date",

      message: "วันที่สอนไม่อยู่ในช่วงภาคการศึกษา",
    });
  }

  /*
   * Teaching Assignment
   */
  if (!claim.staff_role) {
    errors.push({
      code: "TEACHING_ASSIGNMENT_REQUIRED",

      field: "section_id",

      message: "คุณไม่ได้เป็นผู้สอนหรือผู้ช่วยสอนของ Section นี้",
    });
  }

  /*
   * Hour
   */
  const currentHour = Number(claim.hour);

  if (!Number.isFinite(currentHour) || currentHour <= 0) {
    errors.push({
      code: "INVALID_HOUR",

      field: "hour",

      message: "จำนวนชั่วโมงไม่ถูกต้อง",
    });
  }

  /*
   * Section hour
   */
  if (claim.section_max_hour == null) {
    errors.push({
      code: "CLASS_SCHEDULE_NOT_FOUND",

      field: "section_id",

      message: "ไม่พบข้อมูลจำนวนชั่วโมงของ Section นี้",
    });
  } else {
    const used = Number(claim.section_used_hour || 0);

    const max = Number(claim.section_max_hour);

    if (used + currentHour > max) {
      errors.push({
        code: "SECTION_HOUR_LIMIT_EXCEEDED",

        field: "hour",

        message: `ชั่วโมงของ Section เกินกำหนด (ใช้แล้ว ${used} จาก ${max} ชม.)`,
      });
    }
  }

  /*
   * 45 ชั่วโมงต่อภาคการศึกษา
   *
   * นับเฉพาะ Submitted Claim
   * ของ user คนนี้
   */
  const submittedTermHour = Number(claim.submitted_term_hour || 0);

  const projectedTermHour = submittedTermHour + currentHour;

  if (projectedTermHour > TERM_HOUR_LIMIT) {
    errors.push({
      code: "TERM_HOUR_LIMIT_EXCEEDED",

      field: "hour",

      message: `จำนวนชั่วโมงรวมต่อภาคการศึกษาเกิน ${TERM_HOUR_LIMIT} ชั่วโมง`,
    });
  }

  /*
   * Evidence จาก Issue #10
   */
  if (!claim.has_evidence) {
    errors.push({
      code: "EVIDENCE_REQUIRED",

      field: "evidence",

      message: "กรุณาแนบหลักฐานก่อนยื่นคำขอ",
    });
  }

  return {
    valid: errors.length === 0,

    errors,

    summary: {
      currentHour,

      submittedTermHour,

      projectedTermHour,

      termHourLimit: TERM_HOUR_LIMIT,

      hasEvidence: Boolean(claim.has_evidence),

      sectionUsedHour: Number(claim.section_used_hour || 0),

      sectionMaxHour:
        claim.section_max_hour != null ? Number(claim.section_max_hour) : null,
    },
  };
}

/*
 * ============================================
 * PATCH /api/claims/{id}
 * แก้ไขได้เฉพาะ Draft
 * ============================================
 */
async function updateDraft(cognitoSub, groups, claimId, rawBody) {
  const body = parseBody(rawBody);

  if (!body) {
    return respond(400, {
      message: "รูปแบบ JSON ไม่ถูกต้อง",
    });
  }

  const academicTerm = toInt(body.academic_term);
  const periodId = toInt(body.period_id);
  const sectionId = toInt(body.section_id);
  const hour = Number(body.hour);
  const date = body.date;
  const note =
    typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!academicTerm || !periodId || !sectionId) {
    return respond(400, {
      message: "ข้อมูลภาคการศึกษา รอบ หรือ Section ไม่ถูกต้อง",
    });
  }

  if (!Number.isFinite(hour) || hour <= 0) {
    return respond(400, {
      message: "จำนวนชั่วโมงไม่ถูกต้อง",
    });
  }

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return respond(400, {
      message: "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD",
    });
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const fail = async (statusCode, body) => {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return respond(statusCode, body);
    };

    // Lock claim and confirm the owner/status before changing any data.
    const {
      rows: [existing],
    } = await client.query(
      `
      SELECT id, status
      FROM claim
      WHERE id = $1::uuid
        AND claimant_id = $2::uuid
      FOR UPDATE
      `,
      [claimId, cognitoSub],
    );

    if (!existing) {
      return await fail(404, {
        message: "ไม่พบคำขอนี้",
      });
    }

    if (![0, 5].includes(Number(existing.status))) {
      return await fail(409, {
        message: "แก้ไขได้เฉพาะคำขอสถานะ Draft หรือ Returned",
      });
    }

    // Validate the selected section, term, period and teaching assignment.
    const {
      rows: [check],
    } = await client.query(
      `
      SELECT
        s.term_id AS section_term,
        p.term_id AS period_term,
        (
          $3::date BETWEEN t.start_date AND t.end_date
        ) AS date_in_term,
        ss.role AS staff_role
      FROM section s
      JOIN academic_term t
        ON t.id = s.term_id
      JOIN claim_period p
        ON p.id = $2
      LEFT JOIN section_staff ss
        ON ss.section_id = s.id
       AND ss.user_id = $4::uuid
      WHERE s.id = $1
      `,
      [sectionId, periodId, date, cognitoSub],
    );

    if (!check) {
      return await fail(400, {
        message: "ไม่พบรอบหรือ Section ที่เลือก",
      });
    }

    if (
      Number(check.section_term) !== academicTerm ||
      Number(check.period_term) !== academicTerm
    ) {
      return await fail(400, {
        message: "รายวิชาหรือรอบไม่ได้อยู่ในภาคการศึกษานี้",
      });
    }

    if (!check.date_in_term) {
      return await fail(400, {
        message: "วันที่สอนไม่อยู่ในช่วงภาคการศึกษา",
      });
    }

    if (!check.staff_role) {
      return await fail(403, {
        message: "คุณไม่ได้เป็นผู้สอนหรือผู้ช่วยสอนของ Section นี้",
      });
    }

    // Update claim columns that actually belong to the claim table.
    const {
      rows: [updated],
    } = await client.query(
      `
      UPDATE claim
      SET
        period_id = $3,
        section_id = $4,
        note = $5
      WHERE id = $1::uuid
        AND claimant_id = $2::uuid
        AND status IN (0, 5)
      RETURNING
        id,
        claimant_id,
        period_id,
        type_id,
        section_id,
        status,
        note,
        submitted_at,
        created_at
      `,
      [claimId, cognitoSub, periodId, sectionId, note],
    );

    if (!updated) {
      return await fail(409, {
        message: "คำขอไม่อยู่ในสถานะที่แก้ไขได้",
      });
    }

    // This API accepts one date/hour pair per claim.
    // Keep the date and hour in claim_date, not in claim.
    await client.query(`DELETE FROM claim_date WHERE claim_id = $1::uuid`, [
      claimId,
    ]);

    await client.query(
      `
      INSERT INTO claim_date (claim_id, teach_date, hour)
      VALUES ($1::uuid, $2::date, $3)
      `,
      [claimId, date, hour],
    );

    // Record the draft update in the audit log.
    await writeAuditLog(client, {
      claimId,
      action: "UPDATE_DRAFT",
      actorSub: cognitoSub,
      groups,
      fromStatus: Number(existing.status),
      toStatus: Number(updated.status),
    });

    await client.query("COMMIT");
    transactionStarted = false;

    return respond(200, {
      ...updated,
      date,
      hour,
      academic_term: academicTerm,
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

/*
 * ============================================
 * POST /api/claims/{id}/validate
 * ============================================
 */
async function validateRequest(cognitoSub, claimId) {
  const client = await pool.connect();

  try {
    const claim = await getClaimValidationData(client, claimId, cognitoSub);

    if (!claim) {
      return respond(404, {
        message: "ไม่พบคำขอนี้",
      });
    }

    const validation = validateClaim(claim);

    return respond(200, {
      claimId,

      ...validation,
    });
  } finally {
    client.release();
  }
}

/*
 * ============================================
 * POST /api/claims/{id}/submit
 * ============================================
 */
async function submitRequest(cognitoSub, groups, claimId) {
  console.log("[SUBMIT_REQUEST_ENTERED]", { claimId });
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    /*
     * Lock Claim
     * ป้องกัน submit ซ้ำพร้อมกัน
     */
    const {
      rows: [locked],
    } = await client.query(
      `
      
      SELECT id, status
      FROM claim
      WHERE
        id = $1::uuid
        AND claimant_id = $2::uuid
      FOR UPDATE

      `,
      [claimId, cognitoSub],
    );

    if (!locked) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return respond(404, {
        message: "ไม่พบคำขอนี้",
      });
    }

    const claim = await getClaimValidationData(client, claimId, cognitoSub);

    const validation = validateClaim(claim);

    if (!validation.valid) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return respond(422, {
        message: "คำขอไม่ผ่านการตรวจสอบ",

        validation,
      });
    }

    /*
     * เพิ่มชั่วโมงของ Section
     */
    const {
      rows: [schedule],
    } = await client.query(
      `
      UPDATE class_schedule

      SET hour =
        hour + $1

      WHERE
        section_id = $2

        AND hour + $1 <=
            max_hour

      RETURNING
        hour::float,
        max_hour::float
      `,
      [Number(claim.hour), claim.section_id],
    );

    if (!schedule) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return respond(422, {
        message: "จำนวนชั่วโมงของ Section เกินกำหนด",
      });
    }

    /*
     * Draft → Submitted
     */
    const {
      rows: [submitted],
    } = await client.query(
      `
      UPDATE claim

      SET
        status = 1,

        submitted_at =
          now()

      WHERE
        id = $1::uuid

        AND claimant_id =
            $2::uuid

        AND status IN (0, 5)

      RETURNING
        id,
        status,
        submitted_at
      `,
      [claimId, cognitoSub],
    );

    if (!submitted) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return respond(409, {
        message: "คำขอนี้ถูกยื่นไปแล้ว",
      });
    }

    console.log("[BEFORE_WRITE_AUDIT]", { claimId });
    // บันทึกประวัติการยื่นคำขอใน Transaction เดียวกัน
    await writeAuditLog(client, {
      claimId,
      action: "SUBMIT",
      actorSub: cognitoSub,
      groups,
      fromStatus: Number(locked.status),
      toStatus: 1,
    });

    await client.query("COMMIT");
    transactionStarted = false;

    return respond(200, {
      message: "ยื่นคำขอเรียบร้อยแล้ว",

      claim: {
        id: submitted.id,

        status: submitted.status,

        submitted_at: submitted.submitted_at,
      },

      validation,
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

function getCognitoGroups(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  // Cognito อาจส่งกลุ่มมาเป็น JSON array
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ถ้าไม่ใช่ JSON ให้อ่านเป็นข้อความแทน
  }

  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((group) => group.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

const STATUS_LABEL = {
  0: "Draft",
  1: "Submitted",
  2: "Reviewed",
  3: "Approved",
  4: "Rejected",
  5: "Returned",
  6: "Paid",
};

async function writeAuditLog(
  client,
  {
    claimId,
    action,
    actorSub,
    groups = [],
    fromStatus,
    toStatus,
    comment = null,
  },
) {
  let actorName = "ระบบ";
  let actorRole = "SYSTEM";

  // ถ้าเป็นการกระทำของผู้ใช้ ให้ดึงชื่อจาก app_user
  if (actorSub) {
    const {
      rows: [actor],
    } = await client.query(
      `
        SELECT name
        FROM app_user
        WHERE cognito_sub = $1::uuid
      `,
      [actorSub],
    );

    actorName = actor?.name || "";
    actorRole = groups.join(",");
  }

  const result = await client.query(
    `
      INSERT INTO audit_log (
        claim_id,
        action,
        actor_sub,
        actor_name,
        actor_role,
        from_status,
        to_status,
        comment
      )
      VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8)
    `,
    [
      claimId,
      action,
      actorSub || null,
      actorName,
      actorRole,
      STATUS_LABEL[fromStatus] || String(fromStatus),
      STATUS_LABEL[toStatus] || String(toStatus),
      comment,
    ],
  );

  console.log("[AUDIT_LOG_INSERTED]", {
    claimId,
    action,
    rowCount: result.rowCount,
  });
}

async function handleClaimAction(cognitoSub, groups, claimId, rawBody) {
  const body = parseBody(rawBody);

  if (!body) {
    return respond(400, {
      message: "รูปแบบ JSON ไม่ถูกต้อง",
    });
  }

  const action =
    typeof body.action === "string" ? body.action.trim().toUpperCase() : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  // รองรับ Action ตาม V3 Workflow
  const allowedActions = ["REVIEW_PASS", "APPROVE", "REJECT", "RETURN"];

  if (!allowedActions.includes(action)) {
    return respond(400, {
      message: "Action ไม่ถูกต้อง",
    });
  }

  // กำหนดสิทธิ์ตามบทบาท
  const isReviewer = ["REVIEWER", "STAFF"].some((role) =>
    groups.includes(role),
  );

  const isApprover = groups.includes("APPROVER");

  // ตรวจสิทธิ์ตาม Action
  if (
    (action === "REVIEW_PASS" && !isReviewer) ||
    (action === "APPROVE" && !isApprover) ||
    (action === "REJECT" && !isApprover) ||
    (action === "RETURN" && !isReviewer && !isApprover)
  ) {
    return respond(403, {
      message: "คุณไม่มีสิทธิ์ดำเนินการนี้",
    });
  }

  // REJECT และ RETURN ต้องระบุเหตุผล
  if (["REJECT", "RETURN"].includes(action) && !comment) {
    return respond(400, {
      message:
        action === "REJECT"
          ? "กรุณาระบุเหตุผลที่ไม่อนุมัติ"
          : "กรุณาระบุเหตุผลที่ส่งกลับไปแก้ไข",
    });
  }

  if (comment.length > 2000) {
    return respond(400, {
      message: "เหตุผลต้องมีความยาวไม่เกิน 2000 ตัวอักษร",
    });
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // ล็อก Claim ป้องกันการดำเนินการซ้ำพร้อมกัน
    const {
      rows: [claim],
    } = await client.query(
      `
      SELECT
        c.id,
        c.claimant_id::text AS claimant_id,
        c.status,
        c.section_id,
        c.hour::float AS hour
      FROM claim c
      WHERE c.id = $1::uuid
      FOR UPDATE OF c
      `,
      [claimId],
    );

    if (!claim) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return respond(404, {
        message: "ไม่พบคำขอนี้",
      });
    }

    // ห้ามผู้ยื่นดำเนินการกับคำขอของตัวเอง
    if (claim.claimant_id === cognitoSub) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return respond(403, {
        message: "ไม่สามารถดำเนินการกับคำขอของตัวเองได้",
      });
    }

    const currentStatus = Number(claim.status);

    // ตรวจว่า Action นี้ทำได้จากสถานะปัจจุบันหรือไม่
    const allowedTransition =
      (action === "REVIEW_PASS" && currentStatus === 1 && isReviewer) ||
      (action === "APPROVE" && currentStatus === 2 && isApprover) ||
      (action === "REJECT" && currentStatus === 2 && isApprover) ||
      (action === "RETURN" &&
        ((currentStatus === 1 && isReviewer) ||
          (currentStatus === 2 && isApprover)));

    if (!allowedTransition) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return respond(409, {
        message:
          "Action นี้ไม่สามารถทำได้ในสถานะปัจจุบัน หรือคุณไม่มีสิทธิ์ดำเนินการ",
      });
    }

    // คืนชั่วโมงที่ผู้ยื่นจองไว้ (section_staff.hour) เมื่อไม่อนุมัติหรือส่งกลับแก้ไข
    if (action === "REJECT" || action === "RETURN") {
      const {
        rows: [quota],
      } = await client.query(
        `
          UPDATE section_staff
          SET hour = GREATEST(hour - $1::numeric, 0)
          WHERE section_id = $2
            AND user_id = $3::uuid
          RETURNING hour::float AS hour
        `,
        [Number(claim.hour), claim.section_id, claim.claimant_id],
      );

      if (!quota) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return respond(409, {
          message: "ไม่พบโควตาชั่วโมงของผู้ยื่นใน Section นี้",
        });
      }
    }

    // กำหนดสถานะปลายทางตาม Workflow V3
    const targetStatus = {
      REVIEW_PASS: 2,
      APPROVE: 3,
      REJECT: 4,
      RETURN: 5,
    }[action];

    const {
      rows: [updated],
    } = await client.query(
      `
        UPDATE claim
        SET status = $2
        WHERE id = $1::uuid
          AND status = $3
        RETURNING id, status
      `,
      [claimId, targetStatus, currentStatus],
    );

    if (!updated) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return respond(409, {
        message: "ไม่สามารถเปลี่ยนสถานะคำขอได้ กรุณาลองใหม่อีกครั้ง",
      });
    }

    // บันทึกประวัติใน Transaction เดียวกับการเปลี่ยนสถานะ Claim
    await writeAuditLog(client, {
      claimId,
      action,
      actorSub: cognitoSub,
      groups,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      comment: comment || null,
    });

    await client.query("COMMIT");
    transactionStarted = false;

    return respond(200, {
      message: {
        REVIEW_PASS: "ตรวจสอบคำขอเรียบร้อยแล้ว",
        APPROVE: "อนุมัติคำขอเรียบร้อยแล้ว",
        REJECT: "ไม่อนุมัติคำขอเรียบร้อยแล้ว",
        RETURN: "ส่งคำขอกลับไปแก้ไขเรียบร้อยแล้ว",
      }[action],
      claim: updated,
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function autoPayClaim(claimId) {
  if (!isUuid(claimId)) {
    return {
      success: false,
      message: "Invalid claimId",
    };
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // Lock claim to prevent duplicate payment
    const {
      rows: [claim],
    } = await client.query(
      `
        SELECT id, status
        FROM claim
        WHERE id = $1::uuid
        FOR UPDATE
      `,
      [claimId],
    );

    if (!claim) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return {
        success: false,
        message: "Claim not found",
      };
    }

    // Only Approved claims can become Paid
    if (Number(claim.status) !== 3) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return {
        success: true,
        message: "Claim is not awaiting payment",
        status: Number(claim.status),
      };
    }

    const {
      rows: [updated],
    } = await client.query(
      `
        UPDATE claim
        SET
          status = 6,
          paid_at = NOW()
        WHERE id = $1::uuid
          AND status = 3
        RETURNING id, status, paid_at
      `,
      [claimId],
    );

    if (!updated) {
      throw new Error("Unable to update claim to Paid");
    }

    // Record automatic payment in audit log
    await writeAuditLog(client, {
      claimId,
      action: "AUTO_PAY",
      actorSub: null,
      groups: ["SYSTEM"],
      fromStatus: 3,
      toStatus: 6,
      comment: "Automatically changed to Paid",
    });

    await client.query("COMMIT");
    transactionStarted = false;

    return {
      success: true,
      message: "Claim automatically marked as Paid",
      claim: updated,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("[AUTO_PAY_ERROR]", error);

    throw error;
  } finally {
    client.release();
  }
}

async function getClaimHistory(cognitoSub, groups, claimId) {
  const client = await pool.connect();

  try {
    // ตรวจว่า Claim มีอยู่จริง และระบุเจ้าของคำขอ
    const {
      rows: [claim],
    } = await client.query(
      `
        SELECT claimant_id::text AS claimant_id
        FROM claim
        WHERE id = $1::uuid
      `,
      [claimId],
    );

    if (!claim) {
      return respond(404, {
        message: "ไม่พบคำขอนี้",
      });
    }

    // เจ้าของคำขอหรือผู้มีบทบาทตรวจสอบ/อนุมัติจึงดูประวัติได้
    const canViewAll = ["REVIEWER", "STAFF", "APPROVER", "ADMIN"].some((role) =>
      groups.includes(role),
    );

    if (claim.claimant_id !== cognitoSub && !canViewAll) {
      return respond(403, {
        message: "คุณไม่มีสิทธิ์ดูประวัติคำขอนี้",
      });
    }

    // ดึงประวัติจากใหม่ไปเก่า
    const { rows: history } = await client.query(
      `
        SELECT
          id,
          action,
          actor_name,
          actor_role,
          from_status,
          to_status,
          comment,
          created_at
        FROM audit_log
        WHERE claim_id = $1::uuid
        ORDER BY created_at DESC, id DESC
      `,
      [claimId],
    );

    return respond(200, { history });
  } finally {
    client.release();
  }
}

/*
 * ============================================
 * GET /api/audit-logs
 * ดู Audit Log ทั้งระบบสำหรับ ADMIN / APPROVER
 * ============================================
 */
async function getAuditLogs(cognitoSub, groups, filters = {}) {
  // จำกัดสิทธิ์ก่อนเข้าถึงข้อมูล Audit Log ทั้งระบบ
  const canViewAll = ["ADMIN", "APPROVER"].some((role) =>
    groups.includes(role),
  );

  if (!canViewAll) {
    return respond(403, {
      message: "คุณไม่มีสิทธิ์ดู Audit Log ทั้งระบบ",
    });
  }

  const actor = typeof filters.actor === "string" ? filters.actor.trim() : "";
  const action =
    typeof filters.action === "string"
      ? filters.action.trim().toUpperCase()
      : "";
  const from = typeof filters.from === "string" ? filters.from.trim() : "";
  const to = typeof filters.to === "string" ? filters.to.trim() : "";
  const cursor =
    typeof filters.cursor === "string" ? filters.cursor.trim() : "";

  const requestedLimit = Number(filters.limit ?? 20);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit >= 1
      ? Math.min(requestedLimit, 100)
      : 20;

  // ตรวจรูปแบบวันที่ YYYY-MM-DD
  const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  };

  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    return respond(400, {
      message: "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD และเป็นวันที่จริง",
    });
  }

  if (from && to && from > to) {
    return respond(400, {
      message: "วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด",
    });
  }

  // สร้าง WHERE โดยใช้ parameterized query
  const conditions = [];
  const values = [];

  const addParam = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (actor) {
    const p = addParam(`%${actor}%`);
    conditions.push(`(actor_name ILIKE ${p} OR actor_role ILIKE ${p})`);
  }

  if (action) {
    conditions.push(`action = ${addParam(action)}`);
  }

  if (from) {
    conditions.push(`created_at >= ${addParam(from)}::date`);
  }

  if (to) {
    conditions.push(`created_at < (${addParam(to)}::date + INTERVAL '1 day')`);
  }

  // Cursor ใช้แบ่งหน้า โดยเรียงจากรายการใหม่ไปเก่า
  if (cursor) {
    let decoded;

    try {
      decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    } catch {
      return respond(400, {
        message: "Cursor ไม่ถูกต้อง",
      });
    }

    const cursorId = String(decoded?.id ?? "");

    if (
      !decoded ||
      typeof decoded.created_at !== "string" ||
      Number.isNaN(Date.parse(decoded.created_at)) ||
      !/^[1-9]\d*$/.test(cursorId) ||
      !Number.isFinite(Date.parse(decoded.created_at))
    ) {
      return respond(400, {
        message: "Cursor ไม่ถูกต้อง",
      });
    }

    const timeParam = addParam(decoded.created_at);
    const idParam = addParam(cursorId);

    conditions.push(
      `(created_at, id) < (${timeParam}::timestamptz, ${idParam}::bigint)`,
    );
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // ดึงเพิ่ม 1 รายการ เพื่อเช็กว่ามีหน้าถัดไปหรือไม่
  const limitParam = addParam(limit + 1);

  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      `
        SELECT
          id,
          claim_id::text AS claim_id,
          claim_id::text AS claim_code,
          action,
          actor_name,
          actor_role,
          from_status,
          to_status,
          comment,
          created_at
        FROM audit_log
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ${limitParam}
      `,
      values,
    );

    const hasMore = rows.length > limit;
    const logs = rows.slice(0, limit);

    const lastLog = logs[logs.length - 1];

    const next_cursor =
      hasMore && lastLog
        ? Buffer.from(
            JSON.stringify({
              created_at: new Date(lastLog.created_at).toISOString(),
              id: lastLog.id,
            }),
          ).toString("base64url")
        : null;

    return respond(200, {
      logs,
      next_cursor,
    });
  } finally {
    client.release();
  }
}

async function batchReviewPass(cognitoSub, groups, rawBody) {
  const body = parseBody(rawBody);

  if (!body) {
    return respond(400, {
      message: "รูปแบบ JSON ไม่ถูกต้อง",
    });
  }

  const isReviewer = ["REVIEWER", "STAFF"].some((role) =>
    groups.includes(role),
  );

  if (!isReviewer) {
    return respond(403, {
      message: "คุณไม่มีสิทธิ์ดำเนินการนี้",
    });
  }

  const claimIds = body.claimIds;
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (
    !Array.isArray(claimIds) ||
    claimIds.length === 0 ||
    claimIds.length > 50 ||
    !claimIds.every(isUuid) ||
    new Set(claimIds).size !== claimIds.length
  ) {
    return respond(400, {
      message: "รายการ Claim ID ไม่ถูกต้อง",
    });
  }

  if (comment.length > 2000) {
    return respond(400, {
      message: "เหตุผลต้องมีความยาวไม่เกิน 2000 ตัวอักษร",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const results = [];

    for (const claimId of claimIds) {
      const {
        rows: [claim],
      } = await client.query(
        `
        SELECT id, claimant_id::text AS claimant_id, status
        FROM claim
        WHERE id = $1::uuid
        FOR UPDATE
        `,
        [claimId],
      );

      if (!claim) {
        throw new Error(`ไม่พบ Claim: ${claimId}`);
      }

      if (claim.claimant_id === cognitoSub) {
        throw new Error("ไม่สามารถตรวจสอบคำขอของตัวเองได้");
      }

      if (Number(claim.status) !== 1) {
        throw new Error(`Claim ${claimId} ไม่ได้อยู่ในสถานะ Submitted`);
      }

      const {
        rows: [updated],
      } = await client.query(
        `
        UPDATE claim
        SET status = 2
        WHERE id = $1::uuid AND status = 1
        RETURNING id, status
        `,
        [claimId],
      );

      if (!updated) {
        throw new Error(`ไม่สามารถอัปเดต Claim ${claimId} ได้`);
      }

      await writeAuditLog(client, {
        claimId,
        action: "REVIEW_PASS",
        actorSub: cognitoSub,
        groups,
        fromStatus: 1,
        toStatus: 2,
        comment: comment || null,
      });

      results.push(updated);
    }

    await client.query("COMMIT");

    return respond(200, {
      message: "ตรวจสอบคำขอเป็นกลุ่มเรียบร้อยแล้ว",
      total: results.length,
      claims: results,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Batch rollback failed:", rollbackError);
    }

    console.error("Batch review error:", error.message);

    return respond(400, {
      message: error.message || "ไม่สามารถตรวจสอบคำขอเป็นกลุ่มได้",
    });
  } finally {
    client.release();
  }
}

/*
 * ============================================
 * Handler
 * ============================================
 */
export const handler = async (event) => {
  // Handle CORS preflight before requiring Cognito authentication.
  if (event.httpMethod === "OPTIONS") {
    return respond(200, {});
  }

  // Handle internal Auto Pay event
  if (event.source === "cs361.claim.autopay" && event.detail?.claimId) {
    try {
      const result = await autoPayClaim(event.detail.claimId);

      return {
        statusCode: result.success ? 200 : 400,
        body: JSON.stringify(result),
      };
    } catch (error) {
      console.error("[AUTO_PAY_EVENT_ERROR]", error);
      throw error;
    }
  }

  const claims = event.requestContext?.authorizer?.claims;

  if (!claims?.sub) {
    return respond(401, {
      message: "ต้องเข้าสู่ระบบก่อน",
    });
  }

  const cognitoSub = claims.sub;

  const cognitoGroups = getCognitoGroups(claims["cognito:groups"]);

  // Global audit logs do not require a claimId.
  if (
    event.httpMethod === "GET" &&
    (event.resource || event.path || "").includes("/audit-logs")
  ) {
    try {
      return await getAuditLogs(
        cognitoSub,
        cognitoGroups,
        event.queryStringParameters || {},
      );
    } catch (error) {
      console.error("Audit logs error:", error.code, error.message);
      return respond(500, {
        message: "ไม่สามารถดึง Audit Log ได้",
      });
    }
  }

  // Batch review does not require a single claimId.
  if (
    event.httpMethod === "POST" &&
    event.resource === "/api/claims/batch-actions"
  ) {
    try {
      const body = parseBody(event.body);

      if (body?.action !== "REVIEW_PASS") {
        return respond(400, {
          message: "Action ไม่ถูกต้อง",
        });
      }

      return await batchReviewPass(cognitoSub, cognitoGroups, event.body);
    } catch (error) {
      console.error("Batch review error:", error);
      return respond(500, {
        message: "ไม่สามารถตรวจสอบคำขอเป็นกลุ่มได้",
      });
    }
  }

  // The remaining routes require a valid claimId.
  const claimId = event.pathParameters?.id;

  if (!isUuid(claimId)) {
    return respond(400, {
      message: "claimId ไม่ถูกต้อง",
    });
  }

  try {
    /*
     * GET /api/claims/{id}/history
     */
    if (event.httpMethod === "GET" && event.resource?.includes("/history")) {
      return await getClaimHistory(cognitoSub, cognitoGroups, claimId);
    }

    /*
     * PATCH /claims/{id}
     */
    if (
      event.httpMethod === "PATCH" &&
      !event.resource?.includes("/validate") &&
      !event.resource?.includes("/submit")
    ) {
      return await updateDraft(cognitoSub, cognitoGroups, claimId, event.body);
    }

    /*
     * POST /api/claims/{id}/actions
     */
    if (event.httpMethod === "POST" && event.resource?.includes("/actions")) {
      return await handleClaimAction(
        cognitoSub,
        cognitoGroups,
        claimId,
        event.body,
      );
    }

    /*
     * POST /claims/{id}/validate
     */
    if (event.httpMethod === "POST" && event.resource?.includes("/validate")) {
      return await validateRequest(cognitoSub, claimId);
    }

    /*
     * POST /claims/{id}/submit
     */
    if (event.httpMethod === "POST" && event.resource?.includes("/submit")) {
      return await submitRequest(cognitoSub, cognitoGroups, claimId);
    }

    return respond(405, {
      message: "ไม่รองรับ method นี้",
    });
  } catch (error) {
    console.error("Claim workflow error:", error.code, error.message);

    if (error.code === "22P02") {
      return respond(400, {
        message: "รูปแบบข้อมูลไม่ถูกต้อง",
      });
    }

    if (error.code === "23514") {
      return respond(400, {
        message: "จำนวนชั่วโมงไม่ถูกต้อง",
      });
    }

    return respond(500, {
      message: "เกิดข้อผิดพลาดในการจัดการคำขอ",
    });
  }
};
