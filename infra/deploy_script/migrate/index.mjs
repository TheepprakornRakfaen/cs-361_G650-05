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

const SQL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "sql");

export const handler = async () => {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // เหมือน Lambda ตัวอื่น
  });
  await client.connect();

  const applied = [];
  const skipped = [];
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`
    );
    const done = new Set(
      (await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name)
    );

    const files = fs.readdirSync(SQL_DIR).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (done.has(file)) {
        skipped.push(file);
        continue;
      }
      console.log("running", file);
      // ไฟล์ของเรามี BEGIN/COMMIT ในตัวเอง จึงส่งทั้งไฟล์ในคำสั่งเดียว
      await client.query(fs.readFileSync(path.join(SQL_DIR, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      applied.push(file);
    }
  } finally {
    await client.end();
  }
  return { applied, skipped };
};
