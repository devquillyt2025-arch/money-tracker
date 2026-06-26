import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { db } from "../src/db";
import { entries, bills, goals, holdings, users, debts, accounts, paymentHistory } from "../src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
} catch (e: any) {
  console.error('GoogleGenAI init failed:', e.message);
}

let firebaseInitError: string | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
try {
  if (!getApps().length) {
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT
      ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      : applicationDefault();
    initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID || 'project-434b365c-4216-414c-ab2',
    });
  }
  adminAuth = getAuth();
} catch (e: any) {
  firebaseInitError = e.message;
  console.error('Firebase init failed:', e);
}

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

const app = express();
app.use(express.json());

// Health check — shows which services are configured
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
    status.database = 'connected';
  } catch (e: any) {
    status.database = e.message;
  }
  res.json(status);
});

// Get all ledger data
app.get("/api/ledger", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    let userRec = await db.select().from(users).where(eq(users.id, uid));
    if (userRec.length === 0) {
      userRec = await db.insert(users).values({ id: uid, userName: req.user!.email?.split('@')[0] || 'User' }).returning();
    }
    const userEntries = await db.select().from(entries).where(eq(entries.userId, uid));
    const userBills = await db.select().from(bills).where(eq(bills.userId, uid));
    const userGoals = await db.select().from(goals).where(eq(goals.userId, uid));
    const userHoldings = await db.select().from(holdings).where(eq(holdings.userId, uid));
    const userDebts = await db.select().from(debts).where(eq(debts.userId, uid));
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, uid));
    const userPaymentHistory = await db.select().from(paymentHistory).where(eq(paymentHistory.userId, uid));
    res.json({
      user: userRec[0] || null,
      entries: userEntries,
      bills: userBills,
      goals: userGoals,
      holdings: userHoldings,
      debts: userDebts,
      accounts: userAccounts,
      paymentHistory: userPaymentHistory
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Entries
app.post("/api/entries", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const newEntry = await db.insert(entries).values({ id: crypto.randomUUID(), ...req.body, userId: uid }).returning();
    res.json(newEntry[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/entries/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(entries).set(req.body).where(eq(entries.id, req.params.id)).returning();
    res.json(updated[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/entries/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(entries).where(eq(entries.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Bills
app.post("/api/bills", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const newBill = await db.insert(bills).values({ id: crypto.randomUUID(), ...req.body, userId: uid }).returning();
    res.json(newBill[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/bills/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(bills).set(req.body).where(eq(bills.id, req.params.id)).returning();
    res.json(updated[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/bills/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(bills).where(eq(bills.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Holdings
app.post("/api/holdings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const newItem = await db.insert(holdings).values({ id: crypto.randomUUID(), ...req.body, userId: uid }).returning();
    res.json(newItem[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/holdings/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(holdings).set(req.body).where(eq(holdings.id, req.params.id)).returning();
    res.json(updated[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/holdings/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(holdings).where(eq(holdings.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Goals
app.post("/api/goals", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const item = await db.insert(goals).values({ id: crypto.randomUUID(), ...req.body, userId: uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/goals/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(goals).set(req.body).where(eq(goals.id, req.params.id)).returning();
    res.json(updated[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Debts
app.post("/api/debts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const item = await db.insert(debts).values({ id: crypto.randomUUID(), ...req.body, userId: uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/debts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(debts).set(req.body).where(eq(debts.id, req.params.id)).returning();
    res.json(updated[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/debts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(debts).where(eq(debts.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Payment History
app.post("/api/payment_history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const item = await db.insert(paymentHistory).values({ id: crypto.randomUUID(), ...req.body, userId: uid }).returning();
    res.json(item[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Accounts
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
    const existingAccount = await db.select().from(accounts).where(eq(accounts.id, req.params.id));
    if (existingAccount.length > 0) {
      if (
        (accountData.balance !== undefined && accountData.balance !== existingAccount[0].balance) ||
        (accountData.availableBalance !== undefined && accountData.availableBalance !== existingAccount[0].availableBalance)
      ) {
        accountData.balanceUpdatedAt = new Date();
      }
    }
    const updated = await db.update(accounts).set(accountData).where(eq(accounts.id, req.params.id)).returning();
    res.json(updated[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/accounts/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(accounts).where(eq(accounts.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Financial Insights
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
    if (e?.status !== 503 && e?.error?.status !== "UNAVAILABLE") console.error("Gemini API Error:", e);
    res.status(429).json({ error: "AI models are currently experiencing high demand. Please try again later." });
  }
});

// User Profile
app.put("/api/users/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const updated = await db.update(users).set(req.body).where(eq(users.id, uid)).returning();
    res.json(updated[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
