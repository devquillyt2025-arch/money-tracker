import express, { Request, Response, NextFunction } from "express";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import { pgTable, text, integer, boolean, varchar, date, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

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
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool, { schema });

// ── AI ────────────────────────────────────────────────────────────────────────
let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
} catch (e: any) {
  console.error("GoogleGenAI init failed:", e.message);
}

// ── Firebase ──────────────────────────────────────────────────────────────────
let firebaseInitError: string | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
try {
  if (!getApps().length) {
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT
      ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      : applicationDefault();
    initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID || "project-434b365c-4216-414c-ab2",
    });
  }
  adminAuth = getAuth();
} catch (e: any) {
  firebaseInitError = e.message;
  console.error("Firebase init failed:", e);
}

// ── Auth middleware ───────────────────────────────────────────────────────────
export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!adminAuth) {
    return res.status(500).json({ error: `Firebase not initialized: ${firebaseInitError}` });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    await db.insert(users).values({ id: decodedToken.uid }).onConflictDoNothing();
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const status: Record<string, any> = {
    firebase_app: getApps().length > 0,
    firebase_init_error: firebaseInitError,
    ai_initialized: !!ai,
    database_url: !!process.env.DATABASE_URL,
    firebase_service_account: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    gemini_api_key: !!process.env.GEMINI_API_KEY,
  };
  try {
    await db.select().from(users).limit(1);
    status.database = "connected";
  } catch (e: any) {
    status.database = e.message;
  }
  res.json(status);
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
    const item = await db.insert(entries).values({ id: crypto.randomUUID(), ...req.body, userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/entries/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(entries).set(req.body).where(eq(entries.id, req.params.id)).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/entries/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(entries).where(eq(entries.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/bills", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(bills).values({ id: crypto.randomUUID(), ...req.body, userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/bills/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(bills).set(req.body).where(eq(bills.id, req.params.id)).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/bills/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(bills).where(eq(bills.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/holdings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(holdings).values({ id: crypto.randomUUID(), ...req.body, userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/holdings/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(holdings).set(req.body).where(eq(holdings.id, req.params.id)).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/holdings/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(holdings).where(eq(holdings.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/goals", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(goals).values({ id: crypto.randomUUID(), ...req.body, userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/goals/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(goals).set(req.body).where(eq(goals.id, req.params.id)).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/debts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(debts).values({ id: crypto.randomUUID(), ...req.body, userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/debts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(debts).set(req.body).where(eq(debts.id, req.params.id)).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/debts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(debts).where(eq(debts.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/payment_history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.insert(paymentHistory).values({ id: crypto.randomUUID(), ...req.body, userId: req.user!.uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/accounts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const accountData = { ...req.body };
    if (accountData.isPrimary) {
      await db.update(accounts).set({ isPrimary: false }).where(eq(accounts.userId, uid));
    }
    const item = await db.insert(accounts).values({ id: crypto.randomUUID(), ...accountData, userId: uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/accounts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const accountData = { ...req.body };
    if (accountData.isPrimary) {
      await db.update(accounts).set({ isPrimary: false }).where(eq(accounts.userId, uid));
    }
    const existing = await db.select().from(accounts).where(eq(accounts.id, req.params.id));
    if (existing.length > 0) {
      if (
        (accountData.balance !== undefined && accountData.balance !== existing[0].balance) ||
        (accountData.availableBalance !== undefined && accountData.availableBalance !== existing[0].availableBalance)
      ) {
        accountData.balanceUpdatedAt = new Date();
      }
    }
    const item = await db.update(accounts).set(accountData).where(eq(accounts.id, req.params.id)).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/accounts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(accounts).where(eq(accounts.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/insights", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!ai) return res.status(503).json({ error: "AI service not configured." });
    const { prompt } = req.body;
    let response;
    try {
      response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: prompt });
    } catch (e: any) {
      if (e?.status === 503 || e?.error?.status === "UNAVAILABLE" || e?.error?.code === 429 || e?.status === 429) {
        response = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: prompt });
      } else { throw e; }
    }
    res.json({ text: response.text });
  } catch (e: any) {
    res.status(429).json({ error: "AI models are currently experiencing high demand. Please try again later." });
  }
});

app.put("/api/users/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const item = await db.update(users).set(req.body).where(eq(users.id, req.user!.uid)).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
