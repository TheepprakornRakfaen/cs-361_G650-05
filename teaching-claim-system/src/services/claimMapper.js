function sessionToHour(
  session
) {
  const hours =
    Number(
      session?.hours || 0
    );

  const minutes =
    Number(
      session?.minutes || 0
    );

  return Number(
    (
      hours +
      minutes / 60
    ).toFixed(2)
  );
}

export function buildClaimApiPayload(form) {
  const status = form.status || 0;
  const sessions =
    Array.isArray(
      form?.sessions
    )
      ? form.sessions.filter(
          (session) =>
            session.date
        )
      : [];

  /*
   * Backend + DB ปัจจุบัน:
   * 1 Claim = 1 teach_date
   */
  if (
    sessions.length !== 1
  ) {
    throw new Error(
      "ระบบ Backend ปัจจุบันรองรับวันสอน 1 วันต่อ 1 คำขอ"
    );
  }

  const session =
    sessions[0];

  const hour =
    sessionToHour(
      session
    );

  if (hour <= 0) {
    throw new Error(
      "กรุณาระบุจำนวนชั่วโมงที่สอน"
    );
  }

  return {
    academic_term:
      Number(form.termId),

    period_id:
      Number(form.periodId),

    section_id:
      Number(form.sectionId),
    status,
    date:
      session.date,

    hour,

    note:
      form.notes?.trim() ||
      null,
  };
}

export function normalizeClaim(
  raw
) {
  const numericStatus =
    Number(raw.status);

  const status =
    numericStatus === 0
      ? "Draft"
      : numericStatus === 1
        ? "Submitted"
        : numericStatus === 2
          ? "Cancelled"
          : "Draft";

  const hours =
    Number(
      raw.hour || 0
    );

  const wholeHours =
    Math.floor(hours);

  const minutes =
    Math.round(
      (
        hours -
        wholeHours
      ) * 60
    );

  return {
    ...raw,

    id:
      raw.id,

    claimId:
      raw.id,

    status,

    termId:
      raw.academic_term,

    semester:
      raw.term || "",

    periodId:
      raw.period_id,

    sectionId:
      raw.section_id,

    courseCode:
      raw.course_code ||
      "",

    courseName:
      raw.course_name ||
      raw.course_name_en ||
      "",

    teachingDate:
      raw.date || "",

    sessions:
      raw.date
        ? [
            {
              id:
                `session-${raw.id}`,

              date:
                raw.date,

              hours:
                String(
                  wholeHours
                ),

              minutes:
                String(
                  minutes
                ),
            },
          ]
        : [],

    hours,

    notes:
      raw.note || "",

    createdAt:
      raw.created_at,

    submittedAt:
      raw.submitted_at,

    round:
      raw.period_month
        ? `เดือน ${raw.period_month}`
        : "",
  };
}

export function normalizeClaimsResponse(
  data
) {
  const rows =
    Array.isArray(data)
      ? data
      : Array.isArray(
          data?.claims
        )
        ? data.claims
        : [];

  return rows.map(
    normalizeClaim
  );
}