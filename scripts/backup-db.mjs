// Logical backup of every table in the public schema to backups/<timestamp>/.
// Postgres serializes each table to jsonb itself, so dates, timestamps and json
// columns round-trip exactly and key order is canonical; restore-db.mjs reads
// them back with jsonb_populate_recordset and verifies row-for-row. All tables
// are read inside one REPEATABLE READ snapshot so the backup is consistent
// across foreign keys. No pg_dump needed.
//
//   node scripts/backup-db.mjs                       # backs up DATABASE_URL
//   node scripts/backup-db.mjs SOURCE_DATABASE_URL   # backs up another env var's DB
import dotenv from "dotenv";
import pg from "pg";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config({ quiet: true });

const envName = process.argv[2] ?? "DATABASE_URL";
const url = process.env[envName];
if (!url) {
  console.error(`${envName} is not set.`);
  process.exit(1);
}

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const client = new pg.Client({ connectionString: url, ssl: true });
await client.connect();

try {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");

  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`);
  if (tables.length === 0) throw new Error(`No tables in the public schema of ${envName}; nothing to back up.`);
  const { rows: fks } = await client.query(`
    SELECT child.relname AS child, parent.relname AS parent
    FROM pg_constraint c
    JOIN pg_class child ON child.oid = c.conrelid
    JOIN pg_class parent ON parent.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = child.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'`);

  // Parents before children, so a restore never violates a foreign key.
  const order = [];
  const visit = (table, path = new Set()) => {
    if (order.includes(table)) return;
    if (path.has(table)) throw new Error(`Foreign-key cycle at ${table}`);
    path.add(table);
    for (const fk of fks) if (fk.child === table && fk.parent !== table) visit(fk.parent, path);
    order.push(table);
  };
  tables.forEach((t) => visit(t.table_name));

  const dbUrl = new URL(url);
  const dir = join("backups", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(dir, { recursive: true });
  const manifest = {
    createdAt: new Date().toISOString(),
    source: `${dbUrl.host}${dbUrl.pathname}`,
    order,
    tables: {},
  };

  for (const table of order) {
    const { rows } = await client.query(`
      SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)), '[]')::text AS data, count(*)::int AS n
      FROM "${table}" t`);
    const { data, n } = rows[0];
    writeFileSync(join(dir, `${table}.json`), data);
    manifest.tables[table] = { rows: n, sha256: sha256(data) };
  }
  await client.query("COMMIT");
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));

  // Read every file back and check it against the manifest before calling it good.
  console.log(`Source: ${manifest.source}`);
  for (const [table, meta] of Object.entries(manifest.tables)) {
    const text = readFileSync(join(dir, `${table}.json`), "utf8");
    if (sha256(text) !== meta.sha256 || JSON.parse(text).length !== meta.rows) {
      throw new Error(`Verification failed for ${table}.json`);
    }
    console.log(`  ${table.padEnd(18)} ${String(meta.rows).padStart(6)} rows`);
  }
  console.log(`Backup written and verified: ${dir}`);
} finally {
  await client.end();
}
