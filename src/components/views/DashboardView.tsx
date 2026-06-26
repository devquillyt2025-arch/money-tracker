import React, { useState, useEffect, useMemo } from 'react';
import { Entry, Bill, Goal, Account, Debt } from '../../types';
import { api } from '../../lib/api';
import BarChart from '../BarChart';
import DonutChart from '../DonutChart';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Clock, 
  Plus, 
  CheckSquare, 
  Square,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';

interface DashboardViewProps {
  entries: Entry[];
  bills: Bill[];
  goal: Goal;
  investmentsBalance: number;
  accounts: Account[];
  debts: Debt[];
  holdings: any[];
  userName: string;
  categoryBudgets: Record<string, number>;
  onNavigateToTab: (tab: any) => void;
  onAddEntryClick: () => void;
  onToggleBillPaid: (id: string) => void;
}

export default function DashboardView({
  entries,
  bills,
  goal,
  investmentsBalance,
  accounts,
  debts,
  holdings,
  userName,
  categoryBudgets,
  onNavigateToTab,
  onAddEntryClick,
  onToggleBillPaid,
}: DashboardViewProps) {
  
  // --- 1. GREETING HELPER ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "GOOD MORNING";
    if (hour >= 12 && hour < 17) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  };

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit' 
    };
    return new Date().toLocaleDateString('en-IN', options).toUpperCase();
  };

  // --- 2. CALCULATIONS ---
  // Extract all unique months from entries
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    entries.forEach(e => {
      if (e.date && e.date.length >= 7) {
        months.add(e.date.substring(0, 7));
      }
    });
    const sorted = Array.from(months).sort((a, b) => b.localeCompare(a));
    return sorted.length > 0 ? sorted : ["2026-06"];
  }, [entries]);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0]);

  // Net worth: sum of all income - expense + investments
  const totalIncome = entries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalBills = bills.reduce((sum, b) => sum + (b.amount || 0), 0);

  const totalExpense = entries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + (e.amount || 0), 0) + totalBills; // adding subscriptions to total expenses

  const totalAccountsBalance = accounts
    .filter(a => a.status !== 'closed')
    .reduce((sum, a) => sum + ((a.availableBalance ?? a.balance) || 0), 0);
  const totalDebts = debts
    .filter(d => d.remainingAmount > 0)
    .reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
  const totalInvestments = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);

  const calculatedNetWorth = totalAccountsBalance + totalInvestments - totalDebts;

  // Monthly Spend
  const currentMonthPrefix = selectedMonth;
  const monthlyExpenses = entries
    .filter(e => e.type === 'expense' && e.date.startsWith(currentMonthPrefix))
    .reduce((sum, e) => sum + (e.amount || 0), 0) + totalBills; // adding subscriptions to monthly expenses

  const currentInvestments = totalInvestments;

  const currentMonthExpensesByCategory: Record<string, number> = {};
  entries
    .filter(e => e.type === 'expense' && e.date.startsWith(currentMonthPrefix))
    .forEach(e => {
      const cat = e.category || 'Miscellaneous';
      currentMonthExpensesByCategory[cat] = (currentMonthExpensesByCategory[cat] || 0) + (e.amount || 0);
    });
  
  bills.forEach(b => {
      const cat = b.category || 'Bills & Subscription';
      currentMonthExpensesByCategory[cat] = (currentMonthExpensesByCategory[cat] || 0) + (b.amount || 0);
  });

  const budgetAlerts = Object.keys(categoryBudgets).filter(cat => 
    (currentMonthExpensesByCategory[cat] || 0) > categoryBudgets[cat]
  ).map(cat => ({
    category: cat,
    spent: currentMonthExpensesByCategory[cat],
    limit: categoryBudgets[cat]
  }));

  // Savings Goal details
  const goalPercent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

  // --- 3. BAR CHART DATA PREPARATION (Last 6 Months) ---
  const monthsList = useMemo(() => {
    const list = [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10);

    for (let i = 5; i >= 0; i--) {
      let curM = m - i;
      let curY = y;
      if (curM <= 0) {
        curM += 12;
        curY -= 1;
      }
      
      const dateObj = new Date(curY, curM - 1, 1);
      const label = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
      const prefix = `${curY}-${curM.toString().padStart(2, '0')}`;
      
      list.push({
        label,
        prefix,
        isCurrent: i === 0,
        isComparison: i === 1 // The month before current
      });
    }
    return list;
  }, [selectedMonth]);

  const barChartData = monthsList.map(m => {
    // Sum of expenses in this month
    const amount = entries
      .filter(e => e.type === 'expense' && e.date.startsWith(m.prefix))
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      month: m.label,
      amount,
      isCurrent: m.isCurrent,
      isComparison: m.isComparison
    };
  });

  // --- 4. DONUT CHART DATA PREPARATION (Current Month Categories) ---
  const categoriesList = Array.from(new Set([
    'Food & Grocery',
    'Shopping',
    'Travel',
    'Bills & Subscription',
    'Investment',
    'Miscellaneous',
    ...entries.map(e => e.category)
  ]));

  const donutChartData = categoriesList.map(cat => {
    const amount = entries
      .filter(e => e.type === 'expense' && e.category === cat && e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: cat, amount };
  });

  // --- 5. RECENT TRANSACTIONS (Top 5) ---
  const recentTransactions = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 5);

  const [insights, setInsights] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  useEffect(() => {
    async function fetchInsights() {
      if (recentTransactions.length === 0) return;
      setIsLoadingInsights(true);
      try {
        const prompt = `Analyze these recent transactions and provide a single-sentence financial insight or spending warning:
${recentTransactions.map(t => `- ${t.name} (${t.category}): ₹${t.amount}`).join('\n')}

Monthly expenses by category:
${Object.entries(currentMonthExpensesByCategory).map(([cat, amt]) => `- ${cat}: ₹${amt}`).join('\n')}

Keep the insight to one concise, direct sentence.`;
        const res = await api.generateInsights(prompt);
        setInsights(res.text);
      } catch (err: any) {
        if (!err.message?.includes("high demand")) {
          console.error("Failed to fetch insights:", err);
        }
        setInsights("AI insights are temporarily unavailable due to high demand. Please check back later.");
      } finally {
        setIsLoadingInsights(false);
      }
    }
    fetchInsights();
  }, [recentTransactions.map(t => t.id).join(',')]); // re-run if top 5 changes

  return (
    <div className="space-y-6">
      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 dark:text-gray-500">
            {getGreeting()}
          </span>
          <h1 className="font-sans font-semibold text-xl text-gray-900 dark:text-gray-50 mt-0.5 tracking-tight">
            {userName}'s Ledger
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="print:hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
          >
            {availableMonths.map(month => {
              const [y, m] = month.split('-');
              const date = new Date(parseInt(y), parseInt(m) - 1);
              const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
              return (
                <option key={month} value={month}>{label}</option>
              );
            })}
          </select>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg font-sans text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500 shadow-sm">
            <Calendar size={12} className="text-blue-600" />
            <span>{getFormattedDate()}</span>
            <span className="text-[#6B6E73] ml-1">|</span>
            <Clock size={12} className="text-[#6B6E73]" />
            <span>10:46 UTC-7</span>
          </div>
        </div>
      </div>

      {/* GEMINI FINANCIAL INSIGHTS */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex items-start sm:items-center gap-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-sans text-sm font-semibold text-blue-900 dark:text-blue-100 mb-0.5">AI Financial Insight</h3>
          {isLoadingInsights ? (
            <div className="flex items-center gap-2 text-blue-700/70 dark:text-blue-300/70">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs font-medium">Analyzing spending patterns...</span>
            </div>
          ) : (
            <p className="font-sans text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              {insights || "No recent transactions to analyze."}
            </p>
          )}
        </div>
      </div>

      {/* BUDGET ALERTS */}
      {budgetAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {budgetAlerts.map(alert => (
            <div key={alert.category} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-3 flex items-start sm:items-center gap-3">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5 sm:mt-0" />
              <div className="font-sans text-[11px] sm:text-xs text-red-800 dark:text-red-300">
                <span className="font-semibold">Budget Exceeded: </span>
                You have spent <span className="font-medium">₹{alert.spent.toLocaleString('en-IN')}</span> on <span className="font-medium">{alert.category}</span> this month, exceeding your limit of ₹{alert.limit.toLocaleString('en-IN')}.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BUDGET PROGRESS */}
      {Object.keys(categoryBudgets).length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl">
          <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide mb-4 border-b border-gray-100 dark:border-gray-800/50 pb-2">
            Budget Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.keys(categoryBudgets).map(cat => {
              const limit = categoryBudgets[cat];
              const spent = currentMonthExpensesByCategory[cat] || 0;
              const percent = Math.min(100, Math.round((spent / limit) * 100));
              const isExceeded = spent > limit;
              
              return (
                <div key={cat} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">{cat}</span>
                    <span className={`font-semibold shrink-0 ${isExceeded ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-50'}`}>
                      ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isExceeded ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-blue-600'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. STAT CARD ROW (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Worth */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl flex flex-col justify-between min-h-[100px] group relative cursor-help">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Net Worth
          </span>
          <div className="mt-2 flex flex-col gap-1">
            <span className="font-sans text-2xl font-bold text-gray-900 dark:text-gray-50">
              ₹{calculatedNetWorth.toLocaleString('en-IN')}
            </span>
            <span className="font-sans text-xs text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
              <ArrowUpRight size={14} /> +12.4% vs last month
            </span>
          </div>
          
          {/* Tooltip Breakdown */}
          <div className="absolute top-full left-0 mt-2 w-max max-w-[280px] p-3 bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg pointer-events-none">
            <div className="font-semibold mb-1">Net Worth Breakdown</div>
            <div className="flex justify-between gap-4"><span>Bank Assets:</span> <span>+ ₹{totalAccountsBalance.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between gap-4"><span>Investments:</span> <span>+ ₹{totalInvestments.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between gap-4 text-red-300 dark:text-red-600"><span>Debt Liabilities:</span> <span>- ₹{totalDebts.toLocaleString('en-IN')}</span></div>
            <div className="border-t border-gray-600 dark:border-gray-300 mt-1 pt-1 flex justify-between gap-4 font-bold">
              <span>Total:</span> <span>₹{calculatedNetWorth.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Monthly Spend */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl flex flex-col justify-between min-h-[100px]">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Monthly Spend <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">(Jun)</span>
          </span>
          <div className="mt-2 flex flex-col gap-1">
            <span className="font-sans text-2xl font-bold text-gray-900 dark:text-gray-50">
              ₹{monthlyExpenses.toLocaleString('en-IN')}
            </span>
            <span className="font-sans text-xs text-red-500 flex items-center gap-1 font-medium">
              <ArrowDownRight size={14} /> +4.2% vs last month
            </span>
          </div>
        </div>

        {/* Card 3: Investments Balance */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl flex flex-col justify-between min-h-[100px]">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Investment Portfolio
          </span>
          <div className="mt-2 flex flex-col gap-1">
            <span className="font-sans text-2xl font-bold text-gray-900 dark:text-gray-50">
              ₹{currentInvestments.toLocaleString('en-IN')}
            </span>
            <span className="font-sans text-xs text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
              <TrendingUp size={14} /> +8.1% vs last month
            </span>
          </div>
        </div>

        {/* Card 4: Special Savings Goal Highlight */}
        <div className="bg-blue-600 border border-blue-700 shadow-md p-5 rounded-2xl flex flex-col justify-between min-h-[100px] relative overflow-hidden group">
          {/* Subtle geometric pattern */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white dark:bg-gray-900/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 pointer-events-none"></div>
          
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs text-blue-100 font-medium">
              Active Fund Target
            </span>
            <span className="font-sans text-sm text-white font-semibold">
              {goalPercent}%
            </span>
          </div>
          <div className="mt-2 relative z-10">
            <div className="font-sans text-base font-bold text-white truncate mb-2">
              {goal.name}
            </div>
            {/* Custom visual progress bar inside goal card */}
            <div className="w-full bg-blue-900/40 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-white dark:bg-gray-900 h-full rounded-full transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-sans text-blue-200 mt-2 font-medium tracking-wide">
              <span>₹{(goal?.currentAmount || 0).toLocaleString('en-IN')}</span>
              <span>OF ₹{(goal?.targetAmount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHARTS CONTAINER: TWO-COLUMN ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Chart: Monthly Expenses (7 cols) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl xl:col-span-7 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800/50 pb-2">
            <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
              Monthly Expenditure Trend (6M)
            </h3>
            <div className="flex gap-4 text-xs font-sans font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-gray-300 rounded-full" /> Past
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full" /> Compare
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" /> Current
              </span>
            </div>
          </div>
          <BarChart data={barChartData} />
        </div>

        {/* Right Chart: Top Category Donut (5 cols) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl xl:col-span-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800/50 pb-2">
            <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
              Category Distribution <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal lowercase">({new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1).toLocaleString('default', { month: 'short', year: 'numeric' })})</span>
            </h3>
          </div>
          <DonutChart categoryData={donutChartData} />
        </div>
      </div>

      {/* 4. RECENT EXPENSES & SUBSCRIPTIONS DUO ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Expenses Table (12 cols) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl lg:col-span-12">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
              Ledger Feed
            </h3>
            <button
              onClick={onAddEntryClick}
              className="flex items-center gap-1 text-[11px] font-sans font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md transition-colors"
            >
              <Plus size={12} /> RECORD
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800/50 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-sans font-medium">
                  <th className="pb-2">Particular / Label</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTransactions.map((entry) => {
                  const isIncome = entry.type === 'income';
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50/50 transition-colors">
                      <td className="py-3 text-sm text-gray-900 dark:text-gray-50 font-medium pr-2 max-w-[150px] truncate">
                        {entry.name}
                      </td>
                      <td className="py-3 text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500 font-sans">
                        <span className="px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                          {entry.category}
                        </span>
                      </td>
                      <td className="py-3 text-[11px] text-gray-400 dark:text-gray-500 font-sans">
                        {entry.date}
                      </td>
                      <td className={`py-3 text-sm font-semibold text-right ${
                        isIncome ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-50'
                      }`}>
                        {isIncome ? '+' : '-'}₹{(entry.amount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                      No transactions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <button 
            onClick={() => onNavigateToTab('expenses')}
            className="w-full text-center text-[11px] font-sans font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-blue-600 mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800/50 transition-colors"
          >
            View full history &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
