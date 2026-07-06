import React, { useState } from 'react';
import { Bill } from '../../types';
import { FileText, Plus, Trash2, Edit2, ArrowRight, Check } from 'lucide-react';
import Select from '../Select';

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

  // ── Detail modal state ──────────────────────────────────────────────────────
  const [historyBillId, setHistoryBillId] = useState<string | null>(null);
  const [showDayPicker, setShowDayPicker] = useState(false);

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

  // ── Date / status helpers ────────────────────────────────────────────────────

  const computeNextDueDate = (billingDay: number, cycle: string): Date => {
    const today = new Date();
    if (cycle === 'monthly') {
      return new Date(today.getFullYear(), today.getMonth(), billingDay);
    }
    // Yearly: billingDay only, no month — keep same month logic for display
    return new Date(today.getFullYear(), today.getMonth(), billingDay);
  };

  const getOrdinalSuffix = (i: number): string => {
    const j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const formatDate = (d: Date): string =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  /**
   * Estimates "paid this year" from billing cycle × months elapsed since Jan 1.
   * Real payment history per bill can replace this when the feature is added.
   */
  const estimatePaidThisYear = (amount: number, cycle: string): number => {
    const monthsElapsed = new Date().getMonth(); // 0 = Jan, so July = 6 months billed
    if (cycle === 'monthly') return Math.max(0, monthsElapsed) * amount;
    if (cycle === 'yearly') return amount; // billed once per year
    return 0;
  };

  /** % of current billing cycle elapsed (0–100). Used for the progress bar. */
  const getCycleProgress = (daysRemaining: number, cycle: string): number => {
    const cycleDays = cycle === 'yearly' ? 365 : 30;
    const daysSince = cycleDays - daysRemaining;
    return Math.max(0, Math.min(100, (daysSince / cycleDays) * 100));
  };

  const annualCost = (amount: number, cycle: string): number =>
    cycle === 'yearly' ? amount : amount * 12;

  // ── Process bills ────────────────────────────────────────────────────────────

  const todayStr = new Date().toISOString().split('T')[0];

  const processedBills = bills.map(bill => {
    const dueDateObj = computeNextDueDate(bill.billingDay, bill.cycle);
    const dueDateStr = dueDateObj.toISOString().split('T')[0];
    const daysRemaining = Math.ceil(
      (dueDateObj.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 3600 * 24)
    );
    // Recompute dueDateObj since setHours mutates in-place
    const dueDateObjClean = computeNextDueDate(bill.billingDay, bill.cycle);
    const isOverdue = !bill.paid && dueDateStr < todayStr;
    const isDueSoon = !bill.paid && !isOverdue && daysRemaining <= 3;

    return { ...bill, dueDateObj: dueDateObjClean, dueDateStr, daysRemaining, isOverdue, isDueSoon };
  }).sort((a, b) => {
    if (a.paid && !b.paid) return 1;
    if (!a.paid && b.paid) return -1;
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.daysRemaining - b.daysRemaining;
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
          onClick={() => { setEditBillId(null); setFormName(''); setFormAmount(''); setFormBillingDay(1); setFormCycle('monthly'); setFormCategory('Bills & Subscription'); setCustomCategory(''); setFormError(''); setIsAdding(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-sans text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={16} /> Add Subscription
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

      {/* ── Add / Edit Modal ── identical structure to Debt & Loans modal ──────── */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-xl">
            {/* Modal header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-sans font-semibold text-gray-900 dark:text-gray-50">
                {editBillId ? 'Edit Subscription' : 'Add New Subscription'}
              </h3>
              <button onClick={handleCancel} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-50">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Subscription Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                  placeholder="e.g. Netflix, Spotify, Rent"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                  placeholder="e.g. 499"
                />
              </div>

              {/* Billing Day — dropdown popup picker */}
              <div className="relative">
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Billing Day</label>

                {/* Trigger button — looks like an input field */}
                <button
                  type="button"
                  onClick={() => setShowDayPicker(p => !p)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium hover:border-blue-400 dark:hover:border-blue-600"
                >
                  <span>
                    {formBillingDay}{getOrdinalSuffix(formBillingDay)} of each {formCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showDayPicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown calendar grid */}
                {showDayPicker && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Day-of-week header */}
                    <div className="grid grid-cols-7 mb-0.5">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-center font-sans text-[9px] font-semibold text-gray-400 dark:text-gray-500 py-0.5">
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-px">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                        const isSelected = formBillingDay === day;
                        const isLate = day >= 29;
                        return (
                          <button
                            key={day}
                            type="button"
                            title={isLate ? `Day ${day} may not exist in all months` : undefined}
                            onClick={() => { setFormBillingDay(day); setShowDayPicker(false); }}
                            className={`w-7 h-7 flex items-center justify-center rounded-md font-sans text-[11px] font-medium transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white scale-105'
                                : isLate
                                  ? 'text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    {formBillingDay >= 29 && (
                      <p className="font-sans text-[9px] text-amber-600 dark:text-amber-400 mt-1.5 px-1">
                        ⚠ Day {formBillingDay} doesn't exist in all months.
                      </p>
                    )}
                  </div>
                )}

              </div>


              {/* Cycle + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Billing Cycle</label>
                  <Select
                    value={formCycle}
                    onChange={e => setFormCycle(e.target.value as any)}
                    options={[
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'yearly', label: 'Yearly' },
                    ]}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Category</label>
                  <Select
                    value={formCategory}
                    onChange={e => {
                      setFormCategory(e.target.value);
                      if (e.target.value !== 'CUSTOM') setCustomCategory('');
                    }}
                    options={[
                      ...Array.from(new Set(['Bills & Subscription', 'Housing', 'Utilities', 'Internet', 'Entertainment', ...bills.map(b => b.category).filter(Boolean)])).map(cat => ({ value: cat, label: cat })),
                      { value: 'CUSTOM', label: '+ Custom...' },
                    ]}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                  />
                </div>
              </div>

              {/* Custom category input */}
              {formCategory === 'CUSTOM' && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Custom Category Name</label>
                  <input
                    type="text"
                    value={customCategory}
                    placeholder="e.g. Health & Fitness"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                    onChange={e => setCustomCategory(e.target.value)}
                  />
                </div>
              )}

              {/* Error */}
              {formError && (
                <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">{formError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-sans font-medium text-sm text-gray-700 dark:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-sans font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {editBillId ? 'Save Changes' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bills Grid — 2 cols to match Debt page density */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {processedBills.length === 0 ? (
          <div className="lg:col-span-2 p-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No subscriptions or bills tracked.</p>
          </div>
        ) : (
          processedBills.map(bill => {
            const cycleProgress = getCycleProgress(bill.daysRemaining, bill.cycle);
            const paidThisYear = estimatePaidThisYear(bill.amount, bill.cycle);
            const yearlyTotal = annualCost(bill.amount, bill.cycle);
            const paidPct = yearlyTotal > 0 ? Math.min(100, (paidThisYear / yearlyTotal) * 100) : 0;

            // Status badge config
            let statusLabel = 'ACTIVE';
            let statusClass = 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50';
            if (bill.paid) {
              statusLabel = 'PAID';
              statusClass = 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
            } else if (bill.isOverdue) {
              statusLabel = 'OVERDUE';
              statusClass = 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
            } else if (bill.isDueSoon) {
              statusLabel = 'DUE SOON';
              statusClass = 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
            }

            return (
              <div
                key={bill.id}
                className={`bg-white dark:bg-gray-900 border p-4 rounded-2xl shadow-sm transition-colors ${
                  bill.isOverdue && !bill.paid
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800'
                } ${bill.paid ? 'opacity-70' : ''}`}
              >
                {/* ── Header row ───────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  {/* Left: name + status badge + category/cycle tags */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-sans font-semibold text-base ${
                        bill.paid
                          ? 'text-gray-400 dark:text-gray-600'
                          : bill.isOverdue
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-gray-900 dark:text-gray-50'
                      }`}>
                        {bill.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md border font-sans text-[10px] font-semibold shrink-0 ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    {/* Tag row: category pill + cycle pill */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 font-sans text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                        {bill.category || 'Subscription'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 font-sans text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
                        {bill.cycle || 'Monthly'}
                      </span>
                    </div>
                  </div>

                  {/* Right: NEXT BILL amount + Mark Paid + icon row */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-3">
                      {/* NEXT BILL block */}
                      <div className="text-right">
                        <p className="font-sans text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                          Next Bill
                        </p>
                        <p className={`font-sans text-lg font-bold ${bill.paid ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-50'}`}>
                          ₹{(bill.amount || 0).toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Mark Paid / Paid toggle */}
                      {!bill.paid ? (
                        <button
                          onClick={() => onUpdateBill(bill.id, { paid: true })}
                          className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors whitespace-nowrap"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateBill(bill.id, { paid: false })}
                          className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl text-xs font-semibold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors whitespace-nowrap flex items-center gap-1"
                        >
                          <Check size={12} /> Paid
                        </button>
                      )}

                      {/* Icon row: details, edit, delete */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setHistoryBillId(bill.id)}
                          className="p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Details"
                        >
                          <ArrowRight size={16} />
                        </button>
                        <button
                          onClick={() => handleEditClick(bill)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteBill(bill.id)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Info grid: 4 columns ─────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 items-start gap-y-3 border-t border-gray-100 dark:border-gray-800 pt-3 pb-2">
                  <div>
                    <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-1">Amount</p>
                    <p className="font-sans text-sm font-semibold text-gray-500 dark:text-gray-400">
                      ₹{(bill.amount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-1">Billing Cycle</p>
                    <p className="font-sans text-sm font-semibold text-gray-500 dark:text-gray-400 capitalize">
                      {bill.cycle || 'Monthly'}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-1">Next Due Date</p>
                    <p className={`font-sans text-sm font-semibold ${bill.isOverdue && !bill.paid ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatDate(bill.dueDateObj)}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Days Remaining</p>
                    {bill.paid ? (
                      <p className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">Paid ✓</p>
                    ) : bill.isOverdue ? (
                      <p className="font-sans text-base font-bold text-red-600 dark:text-red-400">
                        {Math.abs(bill.daysRemaining)}d overdue
                      </p>
                    ) : (
                      <p className="font-sans text-base font-bold text-blue-600 dark:text-blue-400">
                        {bill.daysRemaining}
                        <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-0.5">days</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Progress bar section ─────────────────────────────────── */}
                <div className="space-y-1.5 border-t border-gray-200 dark:border-gray-700 pt-3 mt-1">
                  <div className="flex justify-between font-sans text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <span>₹{paidThisYear.toLocaleString('en-IN')} est. paid · ₹{yearlyTotal.toLocaleString('en-IN')} annual</span>
                    <span>{paidPct.toFixed(0)}% of year</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500">
                      Billed on {bill.billingDay}{getOrdinalSuffix(bill.billingDay)} · Annual: ₹{yearlyTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${bill.paid ? 'bg-green-500' : bill.isOverdue ? 'bg-red-500' : 'bg-blue-600'}`}
                      style={{ width: `${cycleProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Detail Modal (ArrowRight → info panel) ───────────────────────────── */}
      {historyBillId && (() => {
        const bill = processedBills.find(b => b.id === historyBillId);
        if (!bill) return null;
        const yearlyTotal = annualCost(bill.amount, bill.cycle);
        const paidThisYear = estimatePaidThisYear(bill.amount, bill.cycle);
        const monthsElapsed = new Date().getMonth();
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-sans font-semibold text-gray-900 dark:text-gray-50">{bill.name} — Details</h3>
                <button onClick={() => setHistoryBillId(null)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-50">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Monthly Cost', value: `₹${bill.amount.toLocaleString('en-IN')}` },
                  { label: 'Annual Cost', value: `₹${yearlyTotal.toLocaleString('en-IN')}` },
                  { label: 'Est. Paid This Year', value: `₹${paidThisYear.toLocaleString('en-IN')}` },
                  { label: 'Billing Day', value: `${bill.billingDay}${getOrdinalSuffix(bill.billingDay)} of every ${bill.cycle === 'monthly' ? 'month' : 'year'}` },
                  { label: 'Category', value: bill.category },
                  { label: 'Next Due', value: `${formatDate(bill.dueDateObj)}${bill.isOverdue ? ' (OVERDUE)' : bill.isDueSoon ? ' (DUE SOON)' : ''}`, red: bill.isOverdue },
                ].map(row => (
                  <div key={row.label} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
                    <span className="font-sans text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
                    <span className={`font-sans font-semibold ${row.red ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-50'}`}>{row.value}</span>
                  </div>
                ))}
                <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 text-center pt-1">
                  * Paid amount estimated from {monthsElapsed} months elapsed this year.
                </p>
              </div>
              <button
                onClick={() => setHistoryBillId(null)}
                className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-xl font-sans font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
