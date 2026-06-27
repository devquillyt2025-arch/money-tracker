import express, { Request, Response, NextFunction } from "express";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import { pgTable, text, integer, boolean, varchar, date, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { eq, and, gte, lte, desc, like, or } from "drizzle-orm";
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
  nickname: text("nickname"),
  branchName: text("branch_name"),
  purpose: text("purpose"),
  isDefault: boolean("is_default").default(false),
  notes: text("notes"),
  vaultLink: text("vault_link"),
});

const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityId: text("entity_id"),
  entityName: varchar("entity_name", { length: 255 }),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  status: varchar("status", { length: 50 }).default("success").notNull(),
  details: text("details"),
});

// ── Database ──────────────────────────────────────────────────────────────────
const schema = { users, entries, bills, goals, holdings, debts, paymentHistory, accounts, activityLogs };
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
app.use(express.json({ limit: "50mb" }));

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
    if (accountData.isPrimary || accountData.isDefault) {
      await db.update(accounts).set({ isPrimary: false, isDefault: false }).where(eq(accounts.userId, uid));
    }
    const item = await db.insert(accounts).values({ id: crypto.randomUUID(), ...accountData, userId: uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/accounts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const accountData = { ...req.body };
    if (accountData.isPrimary || accountData.isDefault) {
      await db.update(accounts).set({ isPrimary: false, isDefault: false }).where(eq(accounts.userId, uid));
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

app.post("/api/parse-statement", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { pdfData, transactions } = req.body;

    if (transactions && Array.isArray(transactions)) {
      const createdEntries = [];
      for (const tx of transactions) {
        const item = await db.insert(entries).values({
          id: crypto.randomUUID(),
          userId: req.user!.uid,
          name: tx.name || "PhonePe Transaction",
          category: tx.category || "Miscellaneous",
          amount: Math.round(Number(tx.amount) || 0),
          type: tx.type === "income" ? "income" : "expense",
          date: tx.date || new Date().toISOString().split('T')[0],
        }).returning();
        createdEntries.push(item[0]);
      }
      return res.json({ success: true, count: createdEntries.length, entries: createdEntries });
    }

    if (!ai) return res.status(503).json({ error: "AI service not configured." });
    if (!pdfData) return res.status(400).json({ error: "No PDF data provided." });

    const prompt = `You are a financial AI assistant. Parse this PhonePe bank statement. Extract all transactions. For each transaction, provide:
- name: merchant or clean transaction description
- amount: positive integer representing the amount
- type: 'income' or 'expense'
- category: choose the closest match from ['Food & Grocery', 'Shopping', 'Travel', 'Bills & Subscription', 'Investment', 'Miscellaneous']
- date: YYYY-MM-DD format

Return ONLY a JSON object with a 'transactions' array containing these objects. Do not include markdown code blocks or any other text.`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfData
            }
          },
          { text: prompt }
        ]
      }
    ];

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: { responseMimeType: "application/json" }
      });
    } catch (e: any) {
      console.error("gemini-3.5-flash error:", e?.error || e);
      if (e?.status === 503 || e?.error?.status === "UNAVAILABLE" || e?.error?.code === 429 || e?.status === 429 || e?.status === 404 || e?.error?.code === 404) {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents,
          config: { responseMimeType: "application/json" }
        });
      } else { throw e; }
    }

    const textContent = response.text;
    if (!textContent) throw new Error("No text returned from AI model.");

    let parsed;
    try {
      parsed = JSON.parse(textContent);
    } catch (err) {
      const cleaned = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const txs = parsed.transactions || [];
    const createdEntries = [];

    for (const tx of txs) {
      const item = await db.insert(entries).values({
        id: crypto.randomUUID(),
        userId: req.user!.uid,
        name: tx.name || "PhonePe Transaction",
        category: tx.category || "Miscellaneous",
        amount: Math.round(Number(tx.amount) || 0),
        type: tx.type === "income" ? "income" : "expense",
        date: tx.date || new Date().toISOString().split('T')[0],
      }).returning();
      createdEntries.push(item[0]);
    }

    res.json({ success: true, count: createdEntries.length, entries: createdEntries });
  } catch (e: any) {
    console.error("Statement parsing error:", e?.error || e);
    const errDetail = e instanceof Error ? `${e.name}: ${e.message} ${JSON.stringify(e)}` : JSON.stringify(e);
    res.status(500).json({ error: `Backend API Error: ${errDetail}` });
  }
});

// ── Activity Logs ─────────────────────────────────────────────────────────────
app.post("/api/activity-logs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { module, action, entityId, entityName, oldValue, newValue, status, details } = req.body;
    const item = await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      userId: uid,
      module: module || "System",
      action: action || "Unknown",
      entityId: entityId || null,
      entityName: entityName || null,
      oldValue: oldValue !== undefined ? oldValue : null,
      newValue: newValue !== undefined ? newValue : null,
      status: status || "success",
      details: details || null,
    }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/activity-logs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { module: mod, status: st, from, to, q, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(activityLogs.userId, uid)];
    if (mod && mod !== "all") conditions.push(eq(activityLogs.module, mod));
    if (st && st !== "all") conditions.push(eq(activityLogs.status, st));
    if (from) conditions.push(gte(activityLogs.timestamp, new Date(from)));
    if (to) conditions.push(lte(activityLogs.timestamp, new Date(to)));

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const allLogs = await db.select().from(activityLogs)
      .where(whereClause)
      .orderBy(desc(activityLogs.timestamp));

    // Client-side search filter (jsonb text search fallback)
    const filtered = q
      ? allLogs.filter(log =>
          [log.action, log.module, log.entityName, log.details]
            .some(f => f?.toLowerCase().includes(q.toLowerCase()))
        )
      : allLogs;

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limitNum);
    res.json({ logs: paginated, total, page: pageNum, limit: limitNum });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/activity-logs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { olderThanDays } = req.query as Record<string, string>;
    if (olderThanDays) {
      const days = parseInt(olderThanDays);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      await db.delete(activityLogs).where(
        and(eq(activityLogs.userId, uid), lte(activityLogs.timestamp, cutoff))
      );
    } else {
      await db.delete(activityLogs).where(eq(activityLogs.userId, uid));
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
