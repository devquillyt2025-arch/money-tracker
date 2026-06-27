import { pgTable, text, integer, boolean, varchar, date, serial, real, jsonb, timestamp } from 'drizzle-orm/pg-core';


export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID
  userName: varchar('user_name', { length: 255 }).notNull().default('Dev'),
  investmentsBalance: integer('investments_balance').notNull().default(0),
  categoryBudgets: jsonb('category_budgets').$type<Record<string, number>>().default({}),
});

export const entries = pgTable('entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 255 }).notNull(),
  amount: integer('amount').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'income' | 'expense'
  date: date('date').notNull(),
});

export const bills = pgTable('bills', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  billingDay: integer('billing_day').notNull(),
  cycle: varchar('cycle', { length: 50 }).notNull().default('monthly'),
  amount: integer('amount').notNull(),
  paid: boolean('paid').notNull().default(false),
  category: varchar('category', { length: 255 }).notNull(),
});

export const goals = pgTable('goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  targetAmount: integer('target_amount').notNull(),
  currentAmount: integer('current_amount').notNull(),
});

export const holdings = pgTable('holdings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 255 }).notNull(),
  investedAmount: integer('invested_amount').notNull(),
  currentValue: integer('current_value').notNull(),
  units: real('units'),
});

export const debts = pgTable('debts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(), // 'loan', 'credit_card', 'mortgage', etc.
  totalAmount: integer('total_amount').notNull(),
  remainingAmount: integer('remaining_amount').notNull(),
  interestRate: real('interest_rate'),
  emi: integer('emi'),
  nextDueDate: date('next_due_date'),              // source of truth; nullable until migration backfill
  emisPaid: integer('emis_paid').notNull().default(0), // explicit counter, only changed by Mark EMI Paid
  startDate: date('start_date'),                   // record-keeping only, never drives calculations
});

export const paymentHistory = pgTable('payment_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  debtId: text('debt_id').notNull().references(() => debts.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  date: date('date').notNull(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  balance: integer('balance').notNull(),
  accountType: varchar('account_type', { length: 50 }).default('Savings'),
  accountNumber: text('account_number'),
  ifscCode: varchar('ifsc_code', { length: 11 }),
  availableBalance: integer('available_balance'),
  isPrimary: boolean('is_primary').default(false),
  status: varchar('status', { length: 50 }).default('active'),
  currency: text('currency').default('INR'),
  balanceUpdatedAt: timestamp('balance_updated_at').defaultNow(),
  nickname: varchar('nickname', { length: 255 }),
  branchName: varchar('branch_name', { length: 255 }),
  purpose: varchar('purpose', { length: 255 }),
  isDefault: boolean('is_default').default(false),
  notes: text('notes'),
  vaultLink: text('vault_link'),
});

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  module: varchar('module', { length: 100 }).notNull(),
  action: varchar('action', { length: 255 }).notNull(),
  entityId: text('entity_id'),
  entityName: varchar('entity_name', { length: 255 }),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  status: varchar('status', { length: 50 }).default('success').notNull(),
  details: text('details'),
});
