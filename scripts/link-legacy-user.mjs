// Moves data created under the old Firebase sign-in onto your Neon Auth account.
// Every table that references users.id is re-pointed from the old id to the new
// one in a single transaction; per-table row counts must match before and after
// or nothing is committed. Dry run by default; --apply commits.
//
// Sign in to the app once with Neon Auth first so the new account exists. That
// first sign-in may create placeholder rows (e.g. the default goal); they are
// listed and only discarded if you pass --replace-target.
//
//   node scripts/link-legacy-user.mjs                                  # list accounts
//   node scripts/link-legacy-user.mjs --to you@example.com             # dry run
//   node scripts/link-legacy-user.mjs --to you@example.com --apply
//   node scripts/link-legacy-user.mjs --from <old id> --to <email|id> --apply
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ quiet: true });

const argv = process.argv.slice(2);
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const apply = argv.includes("--apply");
const replaceTarget = argv.includes("--replace-target");
let from = opt("--from");
const to = opt("--to");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true });
await client.connect();
const q = (text, values) => client.query(text, values).then((r) => r.rows);

try {
  const [{ hasNeonAuth }] = await q(`SELECT to_regclass('neon_auth."user"') IS NOT NULL AS "hasNeonAuth"`);
  const refs = await q(`
    SELECT child.relname AS "table", a.attname AS "column"
    FROM pg_constraint c
    JOIN pg_class child ON child.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = child.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.confrelid = 'public.users'::regclass AND n.nspname = 'public'
    ORDER BY 1`);
  const countsFor = async (id) => {
    const counts = {};
    for (const { table, column } of refs) {
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM "${table}" WHERE "${column}" = $1`, [id]);
      counts[table] = n;
    }
    return counts;
  };
  const summarize = (counts) =>
    Object.entries(counts).filter(([, n]) => n > 0).map(([t, n]) => `${t}: ${n}`).join(", ") || "no rows";

  const legacyIds = (
    await q(
      hasNeonAuth
        ? `SELECT id FROM users WHERE id NOT IN (SELECT id::text FROM neon_auth."user") ORDER BY id`
        : `SELECT id FROM users ORDER BY id`
    )
  ).map((r) => r.id);

  if (!to) {
    console.log("Accounts not linked to Neon Auth (old Firebase ids):");
    for (const id of legacyIds) console.log(`  ${id}  ${summarize(await countsFor(id))}`);
    if (!hasNeonAuth) {
      console.log("\nNeon Auth is not enabled on this database yet.");
    } else {
      console.log("\nNeon Auth accounts:");
      for (const u of await q(`SELECT id::text AS id, email FROM neon_auth."user" ORDER BY email`)) {
        console.log(`  ${u.id}  ${u.email}`);
      }
    }
    console.log("\nRe-run with --to <your email> to preview the link.");
    process.exit(0);
  }

  // Resolve the target to a real Neon Auth account, so data is never moved to an
  // id nobody can sign in as.
  let toId = to;
  if (!hasNeonAuth) {
    if (apply) throw new Error("Neon Auth is not enabled on this database, so the target account can't be verified.");
    if (to.includes("@")) throw new Error("Neon Auth is not enabled on this database, so an email can't be resolved.");
    console.log("Warning: Neon Auth is not enabled; dry run only, target id is unverified.");
  } else if (to.includes("@")) {
    const rows = await q(`SELECT id::text AS id FROM neon_auth."user" WHERE lower(email) = lower($1)`, [to]);
    if (rows.length !== 1) throw new Error(`No Neon Auth account for ${to}. Sign in to the app once first.`);
    toId = rows[0].id;
  } else if ((await q(`SELECT 1 FROM neon_auth."user" WHERE id::text = $1`, [toId])).length === 0) {
    throw new Error(`No Neon Auth account with id ${toId}.`);
  }

  if (!from) {
    const candidates = legacyIds.filter((id) => id !== toId);
    if (candidates.length !== 1) {
      throw new Error(`Found ${candidates.length} old accounts; pass --from <id> (run with no arguments to list them).`);
    }
    from = candidates[0];
  }
  if (from === toId) throw new Error("The old and new account are the same.");

  console.log(`From (old): ${from}`);
  console.log(`To   (new): ${toId}${to !== toId ? `  (${to})` : ""}`);

  await client.query("BEGIN");
  const locked = (await q(`SELECT id FROM users WHERE id = ANY($1) FOR UPDATE`, [[from, toId]])).map((r) => r.id);
  if (!locked.includes(from)) throw new Error(`No users row with id ${from}.`);
  const before = await countsFor(from);

  if (locked.includes(toId)) {
    const existing = await countsFor(toId);
    if (Object.values(existing).some((n) => n > 0)) {
      if (!replaceTarget) {
        throw new Error(
          `The new account already has rows (${summarize(existing)}). If these are just placeholders ` +
            `from the first sign-in, re-run with --replace-target to discard them.`
        );
      }
      console.log(`Discarding the new account's placeholder rows: ${summarize(existing)}`);
    }
    await client.query(`DELETE FROM users WHERE id = $1`, [toId]);
  }

  // Copy the profile (name, budgets, ...) to the new id, re-point every child
  // row, then drop the old profile once nothing references it.
  await client.query(
    `INSERT INTO users
     SELECT (jsonb_populate_record(NULL::users, to_jsonb(u) || jsonb_build_object('id', $2::text))).*
     FROM users u WHERE u.id = $1`,
    [from, toId]
  );
  for (const { table, column } of refs) {
    await client.query(`UPDATE "${table}" SET "${column}" = $2 WHERE "${column}" = $1`, [from, toId]);
  }
  if (Object.values(await countsFor(from)).some((n) => n > 0)) {
    throw new Error("Rows still reference the old id after re-pointing.");
  }
  await client.query(`DELETE FROM users WHERE id = $1`, [from]);

  const after = await countsFor(toId);
  for (const { table } of refs) {
    const ok = after[table] === before[table];
    console.log(`  ${table.padEnd(18)} ${String(before[table]).padStart(6)} → ${String(after[table]).padStart(6)}  ${ok ? "ok" : "MISMATCH"}`);
    if (!ok) throw new Error(`Row count changed on ${table}.`);
  }

  if (apply) {
    await client.query("COMMIT");
    console.log("Linked. Your data now belongs to the Neon Auth account.");
  } else {
    await client.query("ROLLBACK");
    console.log("Dry run OK; nothing was written. Re-run with --apply to commit.");
  }
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`Link failed, nothing was written: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
