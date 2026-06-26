import { auth } from "./firebase";

const getHeaders = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const api = {
  getLedger: async () => {
    const res = await fetch("/api/ledger", { headers: await getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch ledger");
    return res.json();
  },

  createEntry: async (entry: any) => {
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(entry),
    });
    return res.json();
  },
  updateEntry: async (id: string, entry: any) => {
    const res = await fetch(`/api/entries/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(entry),
    });
    return res.json();
  },
  deleteEntry: async (id: string) => {
    await fetch(`/api/entries/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  },

  createBill: async (bill: any) => {
    const res = await fetch("/api/bills", {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(bill),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateBill: async (id: string, bill: any) => {
    const res = await fetch(`/api/bills/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(bill),
    });
    return res.json();
  },
  deleteBill: async (id: string) => {
    await fetch(`/api/bills/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  },

  createHolding: async (holding: any) => {
    const res = await fetch("/api/holdings", {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(holding),
    });
    return res.json();
  },
  updateHolding: async (id: string, holding: any) => {
    const res = await fetch(`/api/holdings/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(holding),
    });
    return res.json();
  },
  deleteHolding: async (id: string) => {
    await fetch(`/api/holdings/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  },

  createGoal: async (goal: any) => {
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateGoal: async (id: string, goal: any) => {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(goal),
    });
    return res.json();
  },

  createDebt: async (debt: any) => {
    const res = await fetch("/api/debts", {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(debt),
    });
    return res.json();
  },
  updateDebt: async (id: string, debt: any) => {
    const res = await fetch(`/api/debts/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(debt),
    });
    return res.json();
  },
  deleteDebt: async (id: string) => {
    await fetch(`/api/debts/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  },

  createPaymentHistory: async (payment: any) => {
    const res = await fetch("/api/payment_history", {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(payment),
    });
    return res.json();
  },

  createAccount: async (account: any) => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(account),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to create account");
    }
    return res.json();
  },
  updateAccount: async (id: string, account: any) => {
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(account),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to update account");
    }
    return res.json();
  },
  deleteAccount: async (id: string) => {
    await fetch(`/api/accounts/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  },

  updateUser: async (user: any) => {
    const res = await fetch("/api/users/profile", {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(user),
    });
    return res.json();
  },

  generateInsights: async (prompt: string) => {
    const res = await fetch("/api/insights", {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      let errorMessage = "Failed to fetch insights";
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = await res.text();
      }
      throw new Error(errorMessage);
    }
    return res.json();
  },
};
