import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

async function migrate() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.error("DIRECT_URL not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });

  try {
    const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
    await pool.query(sql);
    console.log("✅ Migration complete — dannifinance schema created");
  } catch (err: any) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
