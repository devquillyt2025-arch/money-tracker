export interface User {
  id: string;
  userName: string;
  investmentsBalance: number;
  categoryBudgets: Record<string, number>;
}

export type EntryType = 'income' | 'expense';

export interface Entry {
  id: string;
  name: string;
  category: string;
  amount: number;
  type: EntryType;
  date: string; // YYYY-MM-DD
}

export type RecurrenceFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one-off';

export interface Bill {
  id: string;
  name: string;
  billingDay: number;
  cycle: 'monthly' | 'yearly';
  amount: number;
  paid: boolean;
  category: string;
}

export interface Goal {
  id?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

export interface Debt {
  id: string;
  name: string;
  type: string; // 'loan', 'credit_card', 'mortgage', etc.
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  emi?: number;
  startDate?: string;
}

export interface PaymentHistory {
  id: string;
  debtId: string;
  amount: number;
  date: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  accountType?: 'Savings' | 'Current' | 'Salary' | 'NRI' | 'Joint';
  accountNumber?: string;
  ifscCode?: string;
  availableBalance?: number | null;
  isPrimary?: boolean;
  status?: 'active' | 'inactive' | 'closed';
  currency?: string;
  balanceUpdatedAt?: string;
}

export type ActiveTab = 'dashboard' | 'transactions' | 'investments' | 'debts' | 'goals' | 'analytics' | 'bills' | 'accounts' | 'settings';
