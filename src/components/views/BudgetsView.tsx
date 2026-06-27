import React, { useState, useEffect } from 'react';
import { DEFAULT_CATEGORIES } from '../../initialData';
import { Entry } from '../../types';
import { Wallet, Check, AlertTriangle } from 'lucide-react';

interface BudgetsViewProps {
  categoryBudgets: Record<string, number>;
  setCategoryBudgets: (budgets: Record<string, number>) => void;
  entries: Entry[];
}

export default function BudgetsView({ categoryBudgets, setCategoryBudgets, entries }: BudgetsViewProps) {
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>(categoryBudgets);
  const [isBudgetsSaved, setIsBudgetsSaved] = useState(false);

  useEffect(() => {
    setLocalBudgets(categoryBudgets);
  }, [categoryBudgets]);

  const handleSaveBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryBudgets(localBudgets);
    setIsBudgetsSaved(true);
    setTimeout(() => setIsBudgetsSaved(false), 2000);
  };

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthlySpending: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.type === 'expense' && entry.date.startsWith(currentYearMonth)) {
      monthlySpending[entry.category] = (monthlySpending[entry.category] || 0) + entry.amount;
    }
  }

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700/60">
        <div>
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            BUDGET_ALLOCATION_DESK
          </span>
          <h1 className="font-sans font-medium text-lg text-gray-900 dark:text-gray-50 mt-0.5">
            Category Budgets
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Spending vs Limits overview */}
        <div className="xl:col-span-7">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-[8px]">
            <h3 className="font-sans font-medium text-xs text-gray-900 dark:text-gray-50 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/40 pb-2 flex items-center gap-2 mb-4">
              <Wallet size={13} className="text-blue-600 dark:text-blue-400" /> This Month's Spending vs Limits
            </h3>

            <div className="space-y-4">
              {DEFAULT_CATEGORIES.map(cat => {
                const spent = monthlySpending[cat] || 0;
                const budget = categoryBudgets[cat] || 0;
                const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                const isOver = budget > 0 && spent > budget;
                const hasNoLimit = budget === 0;

                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        {isOver && <AlertTriangle size={10} className="text-red-500" />}
                        <span className={isOver ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}>
                          {formatCurrency(spent)}
                        </span>
                        {!hasNoLimit && (
                          <span className="text-gray-400 dark:text-gray-600">/ {formatCurrency(budget)}</span>
                        )}
                        {hasNoLimit && (
                          <span className="text-gray-400 dark:text-gray-600">No limit set</span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      {!hasNoLimit && (
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver ? 'bg-red-500' : pct > 75 ? 'bg-amber-400' : 'bg-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Budget configuration form */}
        <div className="xl:col-span-5">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-[8px]">
            <h3 className="font-sans font-medium text-xs text-gray-900 dark:text-gray-50 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/40 pb-2 flex items-center gap-2 mb-4">
              <Wallet size={13} className="text-blue-600 dark:text-blue-400" /> Set Monthly Limits
            </h3>

            <form onSubmit={handleSaveBudgets} className="space-y-3">
              {DEFAULT_CATEGORIES.map(cat => (
                <div key={cat} className="flex gap-3 items-center">
                  <label className="w-36 font-sans text-xs text-gray-600 dark:text-gray-400 shrink-0">
                    {cat}
                  </label>
                  <input
                    type="number"
                    value={localBudgets[cat] || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLocalBudgets({ ...localBudgets, [cat]: val });
                    }}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[#E0BD7D] rounded-[6px] text-xs text-gray-900 dark:text-gray-50 outline-none transition-colors"
                    placeholder="e.g. 10000"
                  />
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-700 text-xs font-sans font-medium text-gray-900 dark:text-gray-50 rounded-[6px] flex items-center gap-1.5 transition-colors"
                >
                  {isBudgetsSaved ? (
                    <>
                      <Check size={12} className="text-green-600 dark:text-green-400" /> SAVED
                    </>
                  ) : (
                    'SAVE BUDGETS'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
