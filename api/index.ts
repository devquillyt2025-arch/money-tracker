import express, { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { pgTable, text, integer, boolean, varchar, date, real, jsonb, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";

// ── Schema ────────────────────────────────────────────────────────────────────
const users = pgTable("users", {
  id: text("id").primaryKey(),
  userName: varchar("user_name", { length: 255 }).notNull().default("Dev"),
  investmentsBalance: integer("investments_balance").notNull().default(0),
  categoryBudgets: jsonb("category_budgets").$type<Record<string, number>>().default({}),
});

const entries = pgTable("entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  amount: integer("amount").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  date: date("date").notNull(),
});

const bills = pgTable("bills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  billingDay: integer("billing_day").notNull(),
  cycle: varchar("cycle", { length: 50 }).notNull().default("monthly"),
  amount: integer("amount").notNull(),
  paid: boolean("paid").notNull().default(false),
  category: varchar("category", { length: 255 }).notNull(),
});

const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull(),
});

const holdings = pgTable("holdings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  investedAmount: integer("invested_amount").notNull(),
  currentValue: integer("current_value").notNull(),
  units: real("units"),
});

const debts = pgTable("debts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  totalAmount: integer("total_amount").notNull(),
  remainingAmount: integer("remaining_amount").notNull(),
  interestRate: real("interest_rate"),
  emi: integer("emi"),
  startDate: date("start_date"),
});

const paymentHistory = pgTable("payment_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  debtId: text("debt_id").notNull().references(() => debts.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  date: date("date").notNull(),
});

const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  balance: integer("balance").notNull(),
  accountType: varchar("account_type", { length: 50 }).default("Savings"),
  accountNumber: text("account_number"),
  ifscCode: varchar("ifsc_code", { length: 11 }),
  availableBalance: integer("available_balance"),
  isPrimary: boolean("is_primary").default(false),
  status: varchar("status", { length: 50 }).default("active"),
  currency: text("currency").default("INR"),
  balanceUpdatedAt: timestamp("balance_updated_at").defaultNow(),
});

// ── Database ──────────────────────────────────────────────────────────────────
const schema = { users, entries, bills, goals, holdings, debts, paymentHistory, accounts };
// Explicit pool limits — relying on pg defaults (max: 10, no idle timeout tuning)
// risks connection exhaustion on small/serverless deployments. Override via env
// (e.g. lower PG_POOL_MAX to 1-3 per instance on serverless).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 15000),
  // Encrypted and certificate-verified (Neon's certs are publicly trusted).
  ssl: true,
});

// A pool-level error handler is required: without it, an error on an idle client
// (e.g. the DB dropping the connection) crashes the whole process.
pool.on("error", (err) => {
  console.error("Unexpected error on idle pg client:", err.message);
});

export const db = drizzle(pool, { schema });

// Lightweight connectivity probe used by both the startup retry and /api/health.
export async function checkDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

// ── Auth (Neon Auth) ──────────────────────────────────────────────────────────
// The browser signs in against Neon Auth and sends its short-lived JWT as a
// Bearer token. It's verified locally against Neon Auth's public keys (JWKS),
// which jose fetches once, caches, and refetches on key rotation, so there is
// no network call to the auth service per request.
const NEON_AUTH_URL = process.env.VITE_NEON_AUTH_URL?.replace(/\/+$/, "");
const jwks = NEON_AUTH_URL ? createRemoteJWKSet(new URL(`${NEON_AUTH_URL}/.well-known/jwks.json`)) : null;

export interface AuthRequest extends Request {
  user?: { uid: string; email?: string };
}

const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!jwks) {
    return res.status(500).json({ error: "Auth not configured: VITE_NEON_AUTH_URL is not set" });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  try {
    const { payload } = await jwtVerify(authHeader.slice("Bearer ".length), jwks, {
      issuer: new URL(NEON_AUTH_URL!).origin,
      algorithms: ["EdDSA", "Ed25519"],
    });
    if (!payload.sub) throw new Error("token has no subject");
    req.user = { uid: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
  } catch (error: any) {
    console.error("Rejected auth token:", error.code ?? error.message);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
  try {
    await db.insert(users)
      .values({ id: req.user.uid, userName: req.user.email?.split("@")[0] || "User" })
      .onConflictDoNothing();
  } catch (error) {
    return next(error);
  }
  next();
};

// Request bodies may never set a row's id or owner; the server assigns those.
const bodyOf = (req: AuthRequest) => {
  const { id: _id, userId: _userId, ...rest } = req.body ?? {};
  return rest;
};

// Matches the row named in the URL only if it belongs to the signed-in user, so
// one account can never change or delete another account's data.
const ownedRow = (table: { id: AnyPgColumn; userId: AnyPgColumn }, req: AuthRequest) =>
  and(eq(table.id, req.params.id), eq(table.userId, req.user!.uid));

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const status: Record<string, any> = {
    neon_auth_url: !!NEON_AUTH_URL,
    database_url: !!process.env.DATABASE_URL,
  };
  try {
    await checkDatabase();
    status.database = "connected";
    res.status(200).json(status);
  } catch (e: any) {
    status.database = e.message;
    res.status(503).json(status);
  }
});

app.get("/api/ledger", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    let userRec = await db.select().from(users).where(eq(users.id, uid));
    if (userRec.length === 0) {
      userRec = await db.insert(users).values({ id: uid, userName: req.user!.email?.split("@")[0] || "User" }).returning();
    }
    res.json({
      user: userRec[0] || null,
      entries: await db.select().from(entries).where(eq(entries.userId, uid)),
      bills: await db.select().from(bills).where(eq(bills.userId, uid)),
      goals: await db.select().from(goals).where(eq(goals.userId, uid)),
      holdings: await db.select().from(holdings).where(eq(holdings.userId, uid)),
      debts: await db.select().from(debts).where(eq(debts.userId, uid)),
      accounts: await db.select().from(accounts).where(eq(accounts.userId, uid)),
      paymentHistory: await db.select().from(paymentHistory).where(eq(paymentHistory.userId, uid)),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/entries", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(entries).values({ ...bodyOf(req), id: crypto.randomUUID(), userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/entries/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(entries).set(bodyOf(req)).where(ownedRow(entries, req)).returning();
    if (!item[0]) return res.status(404).json({ error: "Not found" });
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/entries/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(entries).where(ownedRow(entries, req));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/bills", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(bills).values({ ...bodyOf(req), id: crypto.randomUUID(), userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/bills/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(bills).set(bodyOf(req)).where(ownedRow(bills, req)).returning();
    if (!item[0]) return res.status(404).json({ error: "Not found" });
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/bills/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(bills).where(ownedRow(bills, req));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/holdings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(holdings).values({ ...bodyOf(req), id: crypto.randomUUID(), userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/holdings/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(holdings).set(bodyOf(req)).where(ownedRow(holdings, req)).returning();
    if (!item[0]) return res.status(404).json({ error: "Not found" });
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/holdings/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(holdings).where(ownedRow(holdings, req));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/goals", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(goals).values({ ...bodyOf(req), id: crypto.randomUUID(), userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/goals/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(goals).set(bodyOf(req)).where(ownedRow(goals, req)).returning();
    if (!item[0]) return res.status(404).json({ error: "Not found" });
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/debts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(debts).values({ ...bodyOf(req), id: crypto.randomUUID(), userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/debts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(debts).set(bodyOf(req)).where(ownedRow(debts, req)).returning();
    if (!item[0]) return res.status(404).json({ error: "Not found" });
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/debts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(debts).where(ownedRow(debts, req));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/payment_history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const payment = bodyOf(req);
    const debt = await db.select({ id: debts.id }).from(debts)
      .where(and(eq(debts.id, payment.debtId), eq(debts.userId, req.user!.uid)));
    if (debt.length === 0) return res.status(404).json({ error: "Debt not found" });
    const item = await db.insert(paymentHistory).values({ ...payment, id: crypto.randomUUID(), userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/accounts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const accountData = bodyOf(req);
    if (accountData.isPrimary) {
      await db.update(accounts).set({ isPrimary: false }).where(eq(accounts.userId, uid));
    }
    const item = await db.insert(accounts).values({ ...accountData, id: crypto.randomUUID(), userId: uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/accounts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const accountData = bodyOf(req);
    const existing = await db.select().from(accounts).where(ownedRow(accounts, req));
    if (existing.length === 0) return res.status(404).json({ error: "Not found" });
    if (accountData.isPrimary) {
      await db.update(accounts).set({ isPrimary: false }).where(eq(accounts.userId, uid));
    }
    if (
      (accountData.balance !== undefined && accountData.balance !== existing[0].balance) ||
      (accountData.availableBalance !== undefined && accountData.availableBalance !== existing[0].availableBalance)
    ) {
      accountData.balanceUpdatedAt = new Date();
    }
    const item = await db.update(accounts).set(accountData).where(ownedRow(accounts, req)).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/accounts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(accounts).where(ownedRow(accounts, req));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/users/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(users).set(bodyOf(req)).where(eq(users.id, req.user!.uid)).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Final error handler ─────────────────────────────────────────────────────────
// Express treats a 4-arg middleware as an error handler. Registered last so any
// error passed to next(err) — or a JSON body-parse failure, or a sync throw in a
// handler — returns a clean response instead of hanging the request or crashing.
// Client errors raised by middleware (e.g. malformed JSON → 400) keep their status.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return _next(err);
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error("Unhandled route error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
