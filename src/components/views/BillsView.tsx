import React, { useState } from 'react';
import { Bill, RecurrenceFrequency } from '../../types';
import { FileText, Plus, Trash2, CheckCircle, Circle, Edit2 } from 'lucide-react';

interface BillsViewProps {
  bills: Bill[];
  onAddBill: (bill: Omit<Bill, 'id'>) => void;
  onUpdateBill: (id: string, updated: Partial<Bill>) => void;
  onDeleteBill: (id: string) => void;
}

export default function BillsView({ bills, onAddBill, onUpdateBill, onDeleteBill }: BillsViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editBillId, setEditBillId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formBillingDay, setFormBillingDay] = useState(1);
  const [formCycle, setFormCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [formCategory, setFormCategory] = useState('Housing');
  const [customCategory, setCustomCategory] = useState('');
  const [formError, setFormError] = useState('');

  const handleEditClick = (bill: Bill) => {
    setEditBillId(bill.id);
    setFormName(bill.name);
    setFormAmount(String(bill.amount));
    setFormBillingDay(bill.billingDay || 1);
    setFormCycle(bill.cycle || 'monthly');
    setFormCategory(bill.category);
    setCustomCategory('');
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditBillId(null);
    setFormName('');
    setFormAmount('');
    setFormBillingDay(1);
    setFormCycle('monthly');
    setFormCategory('Housing');
    setCustomCategory('');
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formAmount || formBillingDay < 1 || formBillingDay > 31) {
      setFormError('Please fill all fields with valid data');
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Invalid amount');
      return;
    }

    let finalCategory = formCategory;
    if (formCategory === 'CUSTOM') {
      if (!customCategory.trim()) {
        setFormError('Please enter a custom category');
        return;
      }
      finalCategory = customCategory.trim();
    }

    if (editBillId) {
      onUpdateBill(editBillId, {
        name: formName,
        amount: amt,
        billingDay: formBillingDay,
        cycle: formCycle,
        category: finalCategory
      });
    } else {
      onAddBill({
        name: formName,
        amount: amt,
        billingDay: formBillingDay,
        cycle: formCycle,
        category: finalCategory,
        paid: false
      });
    }
    
    handleCancel();
  };

  const computeNextDueDate = (billingDay: number, cycle: string) => {
    const today = new Date();
    let nextDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    
    // If it's already past this month's billing day, and not marked paid (wait, logic says:
    // the next due date is just the upcoming one.
    // If it's monthly, and today's day > billingDay, it means it was due this month and might be overdue.
    // Let's compute the *current cycle's* due date, which is this month if monthly, or this year if yearly.
    // We'll define "due date" for the current period.
    if (cycle === 'monthly') {
      // The due date for the current month
      return new Date(today.getFullYear(), today.getMonth(), billingDay);
    } else {
      // Yearly: assume due in the current month but maybe a specific month? 
      // The schema only has billingDay (1-31), doesn't have a month for yearly.
      // So we'll just treat yearly as due this month for simplicity or just due on this day of the year? 
      // We'll stick to monthly logic mostly, as yearly without a month doesn't make sense.
      // Let's assume yearly is due on the billingDay of the current month (if it's the start of the year).
      return new Date(today.getFullYear(), today.getMonth(), billingDay);
    }
  };

  const getOrdinalSuffix = (i: number) => {
    const j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const processedBills = bills.map(bill => {
    const dueDateObj = computeNextDueDate(bill.billingDay, bill.cycle);
    const dueDateStr = dueDateObj.toISOString().split('T')[0];
    const isOverdue = !bill.paid && dueDateStr < todayStr;
    const daysUntilDue = Math.ceil((dueDateObj.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    
    return { ...bill, dueDateObj, dueDateStr, isOverdue, daysUntilDue };
  }).sort((a, b) => {
    // Overdue first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    // Paid last
    if (a.paid && !b.paid) return 1;
    if (!a.paid && b.paid) return -1;
    // Then due soonest
    return a.daysUntilDue - b.daysUntilDue;
  });

  const totalUnpaid = bills.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <span className="font-sans text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
            Recurring Liabilities
          </span>
          <h1 className="font-sans font-semibold text-xl text-gray-900 dark:text-gray-50 mt-0.5 tracking-tight">
            Subscriptions & Bills
          </h1>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-sans text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {isAdding ? 'Cancel' : <><Plus size={16} /> Add Subscription</>}
        </button>
      </header>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p className="font-sans text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Total Unpaid This Month</p>
          <p className="text-3xl font-sans font-bold text-gray-900 dark:text-gray-50">
            ₹{totalUnpaid.toLocaleString('en-IN')}
          </p>
        </div>
        <FileText size={48} className="text-blue-100 dark:text-blue-900/40" />
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-top-2">
          <h3 className="text-lg font-sans font-semibold text-gray-900 dark:text-gray-50 mb-4">
            {editBillId ? 'Edit Subscription' : 'Add New Subscription'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  placeholder="e.g. Netflix, Rent"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Billing Day (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formBillingDay}
                  onChange={e => setFormBillingDay(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Cycle</label>
                <select
                  value={formCycle}
                  onChange={e => setFormCycle(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Category</label>
                <select
                  value={formCategory}
                  onChange={e => {
                    setFormCategory(e.target.value);
                    if (e.target.value !== 'CUSTOM') {
                      setCustomCategory('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                >
                  {Array.from(new Set(['Bills & Subscription', 'Housing', 'Utilities', 'Internet', 'Entertainment', ...bills.map(b => b.category).filter(Boolean)])).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="CUSTOM">+ Add Custom Category...</option>
                </select>
                {formCategory === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customCategory}
                    placeholder="Custom category name..."
                    className="w-full mt-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                )}
              </div>
            </div>
            {formError && <p className="text-red-600 text-xs">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-sans font-medium text-sm text-gray-700 dark:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-sans font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
              >
                {editBillId ? 'Save Changes' : 'Save Subscription'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {processedBills.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No subscriptions or bills tracked.</p>
          </div>
        ) : (
          processedBills.map(bill => (
            <div key={bill.id} className={`bg-white dark:bg-gray-900 border ${bill.isOverdue ? 'border-red-300 dark:border-red-800 shadow-sm' : 'border-gray-200 dark:border-gray-800 shadow-sm'} p-5 rounded-2xl flex flex-col justify-between transition-all hover:border-gray-300 dark:hover:border-gray-700`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`font-sans font-semibold text-lg ${bill.paid ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-50'}`}>
                    {bill.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`font-sans text-xs font-medium ${bill.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Due: {bill.billingDay}{getOrdinalSuffix(bill.billingDay)}
                    </p>
                    {bill.isOverdue && (
                      <span className="px-1.5 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-semibold uppercase tracking-wider">
                        Overdue
                      </span>
                    )}
                    {bill.cycle && (
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-semibold uppercase tracking-wider">
                        {bill.cycle}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateBill(bill.id, { paid: !bill.paid })}
                    className={`p-1.5 rounded-lg transition-colors ${bill.paid ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  >
                    {bill.paid ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <span className={`font-sans text-xl font-bold ${bill.paid ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-50'}`}>
                  ₹{(bill.amount || 0).toLocaleString('en-IN')}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(bill)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteBill(bill.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-gray-50 dark:bg-gray-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
