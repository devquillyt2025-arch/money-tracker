import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_CATEGORIES } from '../../initialData';
import { Entry } from '../../types';
import { Wallet, Check, AlertTriangle, TrendingUp, Plus, Edit2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface BudgetsViewProps {
  categoryBudgets: Record<string, number>;
  setCategoryBudgets: (budgets: Record<string, number>) => void;
  entries: Entry[];
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6', '#6366F1', '#84CC16'];

export default function BudgetsView({ categoryBudgets, setCategoryBudgets, entries }: BudgetsViewProps) {
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>(categoryBudgets);
  const [categories, setCategories] = useState<string[]>([]);
  const [isBudgetsSaved, setIsBudgetsSaved] = useState(false);
  
  // Editing State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [tempCategoryName, setTempCategoryName] = useState('');
  const [tempCategoryLimit, setTempCategoryLimit] = useState(0);

  useEffect(() => {
    setLocalBudgets(categoryBudgets);
    const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...Object.keys(categoryBudgets)]));
    setCategories(combined);
  }, [categoryBudgets]);

  const handleSaveBudgets = () => {
    setCategoryBudgets(localBudgets);
    setIsBudgetsSaved(true);
    setTimeout(() => setIsBudgetsSaved(false), 2000);
  };

  const startEdit = (cat: string) => {
    setEditingCategoryId(cat);
    setTempCategoryName(cat);
    setTempCategoryLimit(localBudgets[cat] || 0);
  };

  const cancelEdit = () => {
    if (editingCategoryId === '' && !localBudgets['']) {
      setCategories(categories.filter(c => c !== ''));
    }
    setEditingCategoryId(null);
    setTempCategoryName('');
    setTempCategoryLimit(0);
  };

  const saveEdit = (oldCat: string) => {
    const newName = tempCategoryName.trim();
    if (!newName) return; 
    
    setLocalBudgets(prev => {
      const updated = { ...prev };
      if (oldCat !== newName && oldCat !== '') {
        delete updated[oldCat];
      }
      updated[newName] = tempCategoryLimit;
      return updated;
    });

    setCategories(prev => {
      const newList = [...prev];
      const idx = newList.indexOf(oldCat);
      if (idx !== -1) {
        newList[idx] = newName;
      } else if (!newList.includes(newName)) {
        newList.push(newName);
      }
      return newList;
    });

    setEditingCategoryId(null);
  };

  const addNewCategory = () => {
    if (categories.includes('')) return;
    setCategories(prev => [...prev, '']);
    setEditingCategoryId('');
    setTempCategoryName('');
    setTempCategoryLimit(0);
  };

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate());

  const monthlySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.type === 'expense' && entry.date.startsWith(currentYearMonth)) {
        spending[entry.category] = (spending[entry.category] || 0) + entry.amount;
      }
    }
    return spending;
  }, [entries, currentYearMonth]);

  const { totalBudgeted, totalSpent, remainingBudget, topOverspent, chartData } = useMemo(() => {
    let budgeted = 0;
    let spent = 0;
    let maxOverspend = 0;
    let topOverspentCategory = null;
    const pieData: { name: string; value: number }[] = [];

    Object.entries(localBudgets).forEach(([cat, limit]) => {
      budgeted += limit;
      if (limit > 0) {
        pieData.push({ name: cat, value: limit });
      }
    });
    
    Object.entries(monthlySpending).forEach(([cat, amount]) => {
      spent += amount;
      const limit = localBudgets[cat] || 0;
      if (limit > 0 && amount > limit) {
        const diff = amount - limit;
        if (diff > maxOverspend) {
          maxOverspend = diff;
          topOverspentCategory = { category: cat, amount: diff };
        }
      }
    });

    return {
      totalBudgeted: budgeted,
      totalSpent: spent,
      remainingBudget: budgeted - spent,
      topOverspent: topOverspentCategory,
      chartData: pieData.sort((a, b) => b.value - a.value)
    };
  }, [localBudgets, monthlySpending]);

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 font-sans">
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

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 items-start">
        {/* Left: Interactive Spending List */}
        <div className="w-full">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-[8px]">
            <h3 className="font-sans font-medium text-xs text-gray-900 dark:text-gray-50 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/40 pb-2 flex items-center gap-2 mb-4">
              <Wallet size={13} className="text-blue-600 dark:text-blue-400" /> Spending Limits Config
            </h3>

            <div className="flex flex-col gap-y-1">
              {categories.map(cat => {
                const isEditing = editingCategoryId === cat;
                const spent = monthlySpending[cat] || 0;
                const budget = localBudgets[cat] || 0;
                const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                const isOver = budget > 0 && spent > budget;
                const hasNoLimit = budget === 0;

                if (isEditing) {
                  return (
                    <div key={cat} className="flex flex-col gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-700 w-full my-1">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={tempCategoryName}
                          onChange={e => setTempCategoryName(e.target.value)}
                          placeholder="Category Name"
                          className="flex-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-gray-50"
                        />
                        <input
                          type="number"
                          min="0"
                          value={tempCategoryLimit || ''}
                          onChange={e => setTempCategoryLimit(parseInt(e.target.value) || 0)}
                          placeholder="Limit (₹)"
                          className="w-32 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-gray-50"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={cancelEdit} className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                          Cancel
                        </button>
                        <button onClick={() => saveEdit(cat)} className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={cat} onClick={() => startEdit(cat)} className={`flex items-center justify-between w-full px-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors duration-150 cursor-pointer group ${hasNoLimit ? 'py-1' : 'py-2'}`}>
                    
                    {/* Left: Category Name */}
                    <div className="w-1/4 flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {cat || 'New Category'}
                      </span>
                      <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity shrink-0" />
                    </div>

                    {/* Center: Progress Bar */}
                    {!hasNoLimit && (
                      <div className="flex-1 mx-4 h-2 bg-gray-100 dark:bg-gray-700 rounded-full relative overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                            isOver ? 'bg-red-500' : pct > 75 ? 'bg-amber-400' : 'bg-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    {hasNoLimit && (
                      <div className="flex-1 mx-4 flex justify-center">
                        <span className="text-gray-400 italic text-xs p-1">No limit set</span>
                      </div>
                    )}

                    {/* Right: Amounts & Status */}
                    <div className="w-1/4 text-right flex items-center justify-end gap-2 text-[10px]">
                      {isOver && <AlertTriangle size={10} className="text-red-500 shrink-0" />}
                      <span className={isOver ? 'text-red-500 font-semibold text-xs' : hasNoLimit ? 'text-gray-400 line-through text-xs' : 'text-gray-500 dark:text-gray-400 text-xs'}>
                        {formatCurrency(spent)}
                      </span>
                      {!hasNoLimit && (
                        <span className="text-gray-400 dark:text-gray-600 text-xs whitespace-nowrap">/ {formatCurrency(budget)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-gray-100 dark:border-gray-700/50 pt-4 flex justify-between items-center">
              <button onClick={addNewCategory} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                <Plus size={16} /> Add Category
              </button>
              
              <button
                onClick={handleSaveBudgets}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-medium text-xs rounded-md flex items-center gap-1.5 transition-colors duration-200 shadow-sm"
              >
                {isBudgetsSaved ? (
                  <>
                    <Check size={12} /> SAVED
                  </>
                ) : (
                  'SAVE BUDGETS'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Budget Intelligence Dashboard */}
        <div className="w-full">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-[8px] sticky top-6">
            <h3 className="font-sans font-medium text-xs text-gray-900 dark:text-gray-50 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/40 pb-2 flex items-center gap-2 mb-6">
              <TrendingUp size={13} className="text-blue-600 dark:text-blue-400" /> Analytics Summary
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Budgeted</p>
                <p className="font-bold text-2xl text-gray-900 dark:text-gray-50">{formatCurrency(totalBudgeted)}</p>
              </div>
              
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Spent</p>
                <p className="font-bold text-2xl text-gray-900 dark:text-gray-50">{formatCurrency(totalSpent)}</p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Remaining Budget</p>
                <p className={`font-bold text-2xl ${remainingBudget >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                  {formatCurrency(remainingBudget)}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Daily Allowance</p>
                <p className="font-bold text-2xl text-gray-900 dark:text-gray-50">
                  {remainingBudget > 0 ? formatCurrency(Math.floor(remainingBudget / daysLeft)) : '₹0'}
                  <span className="text-sm font-normal text-gray-500"> /day</span>
                </p>
              </div>
            </div>

            {topOverspent && (
              <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-md flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    🚨 {topOverspent.category} is over budget by {formatCurrency(topOverspent.amount)}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Consider adjusting your spending in this category to stay within limits.
                  </p>
                </div>
              </div>
            )}

            {/* Allocation Breakdown Chart */}
            {chartData.length > 0 && (
              <div className="mt-8 border-t border-gray-200 dark:border-gray-700/60 pt-6">
                <h4 className="font-sans font-medium text-xs text-gray-900 dark:text-gray-50 uppercase tracking-wider mb-4">
                  Budget Allocation Breakdown
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
