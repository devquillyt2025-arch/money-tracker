// Restores a backup made by backup-db.mjs into DATABASE_URL. Runs as one
// transaction: rows go in parents-first with ON CONFLICT DO NOTHING (existing
// rows are never overwritten), then every backed-up row must exist in the target
// with identical values, or the whole restore rolls back. The target schema must
// already exist (npm run db:push). Dry run by default; --apply commits.
//
//   node scripts/restore-db.mjs backups/<timestamp>           # dry run
//   node scripts/restore-db.mjs backups/<timestamp> --apply
import dotenv from "dotenv";
import pg from "pg";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config({ quiet: true });

const apply = process.argv.includes("--apply");
const dir = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!dir || !process.env.DATABASE_URL) {
  console.error("Usage: node scripts/restore-db.mjs <backup-dir> [--apply]   (DATABASE_URL must be set)");
  process.exit(1);
}

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const data = {};
for (const [table, meta] of Object.entries(manifest.tables)) {
  const text = readFileSync(join(dir, `${table}.json`), "utf8");
  if (sha256(text) !== meta.sha256) {
    console.error(`${table}.json does not match its checksum; the backup is damaged. Nothing was written.`);
    process.exit(1);
  }
  data[table] = text;
}

const target = new URL(process.env.DATABASE_URL);
console.log(`Backup: ${manifest.source} @ ${manifest.createdAt}`);
console.log(`Target: ${target.host}${target.pathname}${apply ? "" : "  (dry run)"}`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true });
await client.connect();
try {
  await client.query("BEGIN");
  for (const table of manifest.order) {
    const rows = JSON.parse(data[table]);
    if (rows.length === 0) {
      console.log(`  ${table.padEnd(18)}      0 rows`);
      continue;
    }

    const { rows: cols } = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [table]
    );
    if (cols.length === 0) throw new Error(`Table "${table}" does not exist in the target. Run npm run db:push first.`);
    const targetCols = cols.map((c) => c.column_name);
    const backupCols = Object.keys(rows[0]);
    const missing = backupCols.filter((c) => !targetCols.includes(c));
    const extra = targetCols.filter((c) => !backupCols.includes(c));
    if (missing.length || extra.length) {
      throw new Error(`Column mismatch on "${table}": not in target [${missing}], not in backup [${extra}]`);
    }

    const inserted = await client.query(
      `INSERT INTO "${table}" SELECT * FROM jsonb_populate_recordset(NULL::"${table}", $1::jsonb) ON CONFLICT DO NOTHING`,
      [data[table]]
    );
    const { rows: [{ n: differing }] } = await client.query(
      `SELECT count(*)::int AS n FROM (
         SELECT b FROM jsonb_array_elements($1::jsonb) b
         EXCEPT SELECT to_jsonb(t) FROM "${table}" t
       ) x`,
      [data[table]]
    );
    if (differing > 0) {
      throw new Error(`${differing} row(s) of "${table}" already exist in the target with different values.`);
    }
    console.log(
      `  ${table.padEnd(18)} ${String(rows.length).padStart(6)} rows verified ` +
        `(${inserted.rowCount} inserted, ${rows.length - inserted.rowCount} already present)`
    );
  }

  if (apply) {
    await client.query("COMMIT");
    console.log("Restore committed.");
  } else {
    await client.query("ROLLBACK");
    console.log("Dry run OK; nothing was written. Re-run with --apply to commit.");
  }
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`Restore failed, nothing was written: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
