// =====================================================================
// Lambda ชั่วคราวสำหรับรัน SQL migration บน RDS
// เหตุผล: RDS อยู่ใน private subnet เครื่องเราต่อ psql ตรงๆ ไม่ได้
//         แต่ Lambda ตัวนี้อยู่ใน VPC เดียวกับ RDS จึงต่อได้
// ไม่มี route ใน API Gateway ต้องเรียกด้วย `aws lambda invoke` (deploy.sh เรียกให้)
//
// วิธีทำงาน:
//   1) สร้างตาราง schema_migrations ไว้จำว่าไฟล์ไหนรันไปแล้ว
//   2) อ่านไฟล์ sql/*.sql เรียงตามชื่อ (001, 002, 003, 004)
//   3) ไฟล์ไหนยังไม่เคยรัน -> รัน แล้วบันทึกชื่อไว้ (รันซ้ำกี่รอบก็ไม่ซ้ำ)
// =====================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createHash } from "node:crypto";

const SQL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "sql");


const REQUIRED_COLUMNS = {
  app_user: ["cognito_sub", "username", "name", "bank_name", "bank_account_no"],
  academic_term: ["id", "year", "semester", "start_date", "end_date"],
  course: ["id", "code", "name_th"],
  section: ["id", "course_id", "term_id", "section_no"],
  section_staff: ["section_id", "user_id", "role", "hour", "max_hour"],
  claim_period: ["id", "term_id", "month", "open_at", "close_at", "status"],
  compensation_type: ["id", "code", "name", "hourly_rate"],
  claim: ["id", "claimant_id", "period_id", "type_id",
          "section_id", "status", "hour", "created_at"],
  claim_date: ["id", "claim_id", "teach_date"],
  claim_evidence: ["id", "claim_id", "object_key", "evidence_type"],
  audit_log: ["id", "claim_id", "action", "created_at"],
};

async function inspectLegacyDatabase(client) {
  const probe = (await client.query(`
    SELECT
      current_database() AS database,
      to_regclass('public.app_user') IS NOT NULL AS has_schema,
      to_regclass('public.schema_migrations') IS NOT NULL AS has_history
  `)).rows[0];

  const historyCount = probe.has_history
    ? Number((await client.query(
        "SELECT COUNT(*)::int AS n FROM public.schema_migrations"
      )).rows[0].n)
    : 0;

  const result = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
  `, [Object.keys(REQUIRED_COLUMNS)]);

  const present = new Set(
    result.rows.map((r) => `${r.table_name}.${r.column_name}`)
  );

  const missingColumns = Object.entries(REQUIRED_COLUMNS)
    .flatMap(([table, columns]) =>
      columns
        .filter((column) => !present.has(`${table}.${column}`))
        .map((column) => `${table}.${column}`)
    );

  const viewExists = (await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'claim_amount'
        AND c.relkind = 'v'
    ) AS ok
  `)).rows[0].ok;

  let seedChecks = {};

  if (missingColumns.length === 0) {
    seedChecks = (await client.query(`
      SELECT
        EXISTS(SELECT 1 FROM app_user) AS users,
        EXISTS(SELECT 1 FROM academic_term) AS terms,
        EXISTS(SELECT 1 FROM course) AS courses,
        EXISTS(SELECT 1 FROM section) AS sections,
        EXISTS(SELECT 1 FROM section_staff) AS assignments,
        EXISTS(SELECT 1 FROM claim_period) AS periods,
        EXISTS(SELECT 1 FROM compensation_type) AS types,
        EXISTS(SELECT 1 FROM course WHERE code = 'CS361') AS cs361,
        EXISTS(
          SELECT 1 FROM compensation_type
          WHERE code = 'TEACHING'
        ) AS teaching_type,
        EXISTS(
          SELECT 1 FROM compensation_type
          WHERE code = 'SPECIAL_LECTURER'
        ) AS special_lecturer_type
    `)).rows[0];
  }

  const missingSeed = Object.entries(seedChecks)
    .filter(([, found]) => !found)
    .map(([name]) => name);

  return {
    database: probe.database,
    existingSchema: probe.has_schema,
    tracked: probe.has_history,
    historyCount,
    missingColumns,
    viewExists,
    seedChecks,
    missingSeed,
    ready:
      probe.has_schema &&
      historyCount === 0 &&
      missingColumns.length === 0 &&
      viewExists &&
      Object.keys(seedChecks).length > 0 &&
      missingSeed.length === 0
  };
}

export const handler = async (event = {}) => {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "disable"
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();

  const applied = [];
  const skipped = [];
  try {
    
    if (event.action === "status") {
      const { rows: [probe] } = await client.query(`
        SELECT
          to_regclass('public.app_user') IS NOT NULL
            AS existing_schema,
          to_regclass('public.schema_migrations') IS NOT NULL
            AS tracked
      `);

      let history = [];

      if (probe.tracked) {
        const result = await client.query(`
          SELECT
            name,
            applied_at,
            to_jsonb(sm)->>'checksum' AS checksum,
            to_jsonb(sm)->>'baselined' AS baselined
            to_jsonb(sm)->>'skipped' AS skipped
          FROM public.schema_migrations sm
          ORDER BY name
        `);

        history = result.rows;
      }

      const recorded = new Map(
        history.map((row) => [row.name, row])
      );

      const files = fs.readdirSync(SQL_DIR)
        .filter((file) => /^\d{3}_.+\.sql$/.test(file))
        .sort();

      const migrations = files.map((file) => {
        const content = fs.readFileSync(
          path.join(SQL_DIR, file),
          "utf8"
        );

        const checksum = createHash("sha256")
          .update(content)
          .digest("hex");

        const previous = recorded.get(file);

        let state = "pending";

        if (previous) {
          if (!previous.checksum) {
            state = "applied_without_checksum";
          } else if (previous.checksum === checksum) {         
            state = previous.skipped === "true"
              ? "skipped_by_policy"
              : previous.baselined === "true"
                ? "baselined"
                : "applied";
          } else {
            state = "modified";
          }
        }

        return {
          file,
          state,
          appliedAt: previous?.applied_at ?? null
        };
      });

      const databaseState = !probe.existing_schema
        ? "empty"
        : !probe.tracked
          ? "legacy_untracked"
          : history.length === 0
            ? "legacy_history_empty"
            : "tracked";

      return {
        action: "status",
        databaseState,
        migrations,
        unknownHistory: history
          .filter((row) => !files.includes(row.name))
          .map((row) => row.name)
      };
    }

    if (
      event.action === "baseline-check" ||
      event.action === "baseline"
    ) {
      if (event.action === "baseline-check") {
        const inspection = await inspectLegacyDatabase(client);

        return {
          action: "baseline-check",
          ...inspection
        };
      }

      if (event.confirm !== "BASELINE_LEGACY_V4") {
        throw new Error("Explicit baseline confirmation required");
      }

      await client.query("BEGIN");

      try {
        // ใช้ Lock เดียวกับ Migration Runner ปกติ
        await client.query(
          "SELECT pg_advisory_xact_lock(361, 77)"
        );

        const inspection = await inspectLegacyDatabase(client);

        if (event.expectedDatabase !== inspection.database) {
          throw new Error("Database name mismatch");
        }

        if (!inspection.ready) {
          throw new Error(
            "Legacy database is not ready for baseline: " +
            JSON.stringify(inspection)
          );
        }

        await client.query(`
          CREATE TABLE IF NOT EXISTS public.schema_migrations (
            name TEXT PRIMARY KEY,
            checksum TEXT,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            baselined BOOLEAN NOT NULL DEFAULT false
          )
        `);

        await client.query(`
          ALTER TABLE public.schema_migrations
          ADD COLUMN IF NOT EXISTS checksum TEXT
        `);

        await client.query(`
          ALTER TABLE public.schema_migrations
          ADD COLUMN IF NOT EXISTS baselined BOOLEAN
          NOT NULL DEFAULT false
        `);

        const baselineFiles = [
          "001_schema.sql",
          "002_seed.sql"
        ];

        for (const file of baselineFiles) {
          const content = fs.readFileSync(
            path.join(SQL_DIR, file),
            "utf8"
          );

          const checksum = createHash("sha256")
            .update(content)
            .digest("hex");

          await client.query(
            `INSERT INTO public.schema_migrations
               (name, checksum, baselined)
             VALUES ($1, $2, true)`,
            [file, checksum]
          );
        }

        await client.query("COMMIT");

        return {
          action: "baseline",
          database: inspection.database,
          baselined: baselineFiles,
          next: [
            "003_claim_paid_status.sql",
            "004_add_claim_paid_at.sql"
          ]
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    if (event.action && event.action !== "apply") {
      throw new Error("Unsupported migration action");
    }

    await client.query("SELECT pg_advisory_lock(361, 77)");

    const probe = (await client.query(`
      SELECT
        to_regclass('public.schema_migrations') IS NOT NULL
          AS tracked,
        to_regclass('public.app_user') IS NOT NULL
          AS existing_schema
    `)).rows[0];

    if (probe.existing_schema && !probe.tracked) {
      throw new Error(
        "Existing database has no migration history. " +
        "Legacy schema baseline is required before migration."
      );
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      ALTER TABLE schema_migrations
      ADD COLUMN IF NOT EXISTS checksum TEXT
    `);

    await client.query(`
      ALTER TABLE schema_migrations
      ADD COLUMN IF NOT EXISTS skipped BOOLEAN
      NOT NULL DEFAULT false
    `);

    const history = await client.query(
      "SELECT name, checksum FROM schema_migrations"
    );

    const done = new Map(
      history.rows.map((row) => [row.name, row.checksum])
    );

    if (probe.existing_schema && done.size === 0) {
      throw new Error(
        "Existing database has an empty migration history. " +
        "Verify or baseline the schema before continuing."
      );
    }

    const files = fs.readdirSync(SQL_DIR).filter((f) => f.endsWith(".sql")).sort();

    // Detect migration records whose SQL files are missing.
    const availableFiles = new Set(files);

    const missingFiles = [...done.keys()].filter(
      (name) => !availableFiles.has(name)
    );

    if (missingFiles.length > 0) {
      throw new Error(
        `Applied migration files are missing: ${missingFiles.join(", ")}`
      );
    }

    const seedMode = process.env.SEED_MODE ?? "reference";

    if (!["reference", "demo"].includes(seedMode)) {
      throw new Error(`Invalid SEED_MODE: ${seedMode}`);
    }

    const skippedByPolicy = new Set(
      (await client.query(`
        SELECT name
        FROM schema_migrations
        WHERE skipped = true
      `)).rows.map((row) => row.name)
    );

    // Never execute a previously skipped demo seed later
    // without a reviewed migration plan.
    if (
      seedMode === "demo" &&
      skippedByPolicy.has("002_seed.sql")
    ) {
      throw new Error(
        "Demo seed was previously skipped. " +
        "Do not change seed policy on this database."
      );
    }

    for (const file of files) {
      const content = fs.readFileSync(
        path.join(SQL_DIR, file),
        "utf8"
      );

      const checksum = createHash("sha256")
        .update(content)
        .digest("hex");

      if (done.has(file)) {
        const previous = done.get(file);

        if (previous && previous !== checksum) {
          throw new Error(
            `Migration checksum mismatch: ${file}`
          );
        }

        if (!previous) {
          console.warn(
            `Legacy migration without checksum: ${file}`
          );
        }

        skipped.push(file);
        continue;
      }

      if (
        file === "002_seed.sql" &&
        seedMode === "reference"
      ) {
        try {
          await client.query("BEGIN");

          await client.query(
            `INSERT INTO schema_migrations
              (name, checksum, skipped)
            VALUES ($1, $2, true)`,
            [file, checksum]
          );

          await client.query("COMMIT");
          skipped.push(file);
          continue;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }

      const sql = content.replace(
        /^[ \t]*(?:BEGIN|COMMIT);[ \t]*$/gim,
        ""
      );

      try {
        await client.query("BEGIN");

        await client.query(sql);

        await client.query(
          `INSERT INTO schema_migrations (name, checksum)
           VALUES ($1, $2)`,
          [file, checksum]
        );

        await client.query("COMMIT");
        applied.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(
          `Migration failed (${file}): ${error.message}`
        );
      }
    }

  } finally {
    await client.end();
  }
  return { applied, skipped };
};
