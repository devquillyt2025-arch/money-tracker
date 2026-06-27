import React, { useState } from 'react';
import { Plus, Check, ArrowRight, Trash2, Edit2 } from 'lucide-react';
import { Debt, Entry, PaymentHistory } from '../../types';

interface DebtsViewProps {
  debts: Debt[];
  entries: Entry[];
  paymentHistory: PaymentHistory[];
  onAddDebt: (debt: Omit<Debt, 'id'>) => void;
  onUpdateDebt: (id: string, updated: Partial<Debt>) => void;
  onDeleteDebt: (id: string) => void;
  onAddTransaction: (entry: Omit<Entry, 'id'>) => void;
  onAddPaymentHistory: (payment: Omit<PaymentHistory, 'id'>) => void;
}

export default function DebtsView({
  debts,
  entries,
  paymentHistory,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onAddTransaction,
  onAddPaymentHistory
}: DebtsViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Personal Loan');
  const [customType, setCustomType] = useState('');
  const [formTotal, setFormTotal] = useState('');
  const [formRemaining, setFormRemaining] = useState('');
  const [formInterest, setFormInterest] = useState('');
  const [formEmi, setFormEmi] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  const [historyDebtId, setHistoryDebtId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [logPaymentDebtId, setLogPaymentDebtId] = useState<string | null>(null);
  const [logPaymentAmount, setLogPaymentAmount] = useState('');
  const [logPaymentError, setLogPaymentError] = useState('');

  const activeDebts = debts.filter(d => d.remainingAmount > 0);
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalEmi = activeDebts.reduce((sum, d) => sum + (d.emi || 0), 0);
  const debtsWithoutEmi = activeDebts.filter(d => !d.emi || d.emi <= 0);

  const getRawNextEmiDate = (debt: Debt): Date | null => {
    if (!debt.startDate || !debt.emi || debt.remainingAmount <= 0) return null;
    const numPaid = Math.max(
      paymentHistory.filter(p => p.debtId === debt.id).length,
      Math.floor((debt.totalAmount - debt.remainingAmount) / debt.emi)
    );
    const date = new Date(debt.startDate);
    date.setMonth(date.getMonth() + numPaid + 1);
    return date;
  };

  // Always returns the next upcoming (future) due date for display.
  const getNextDueDate = (debt: Debt): Date | null => {
    const raw = getRawNextEmiDate(debt);
    if (!raw) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (raw >= today) return raw;
    // Advance month-by-month to find the next future billing date.
    const result = new Date(raw);
    while (result < today) result.setMonth(result.getMonth() + 1);
    return result;
  };

  const isDebtOverdue = (debt: Debt) => {
    const raw = getRawNextEmiDate(debt);
    if (!raw) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return raw < today;
  };

  const getPayoffDate = (debt: Debt) => {
    if (!debt.emi || debt.remainingAmount <= 0) return null;
    const nextDue = getNextDueDate(debt) || new Date();
    const emisRemaining = Math.ceil(debt.remainingAmount / debt.emi);
    const payoff = new Date(nextDue);
    payoff.setMonth(payoff.getMonth() + emisRemaining - 1);
    return payoff.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  const sortedDebts = [...debts].sort((a, b) => {
    const aClosed = a.remainingAmount <= 0;
    const bClosed = b.remainingAmount <= 0;
    if (aClosed && !bClosed) return 1;
    if (!aClosed && bClosed) return -1;
    if (aClosed && bClosed) return 0;
    
    const aOverdue = isDebtOverdue(a);
    const bOverdue = isDebtOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    const aDue = getNextDueDate(a)?.getTime() || Infinity;
    const bDue = getNextDueDate(b)?.getTime() || Infinity;
    return aDue - bDue;
  });

  const handleMarkEmiPaid = (debt: Debt) => {
    if (!debt.emi || debt.remainingAmount <= 0) return;
    
    const newRemaining = Math.max(0, debt.remainingAmount - debt.emi);
    onUpdateDebt(debt.id, { remainingAmount: newRemaining });
    
    const today = new Date().toISOString().split('T')[0];

    onAddTransaction({
      name: `Payment: ${debt.name}`,
      category: 'Debt Repayment',
      amount: Math.round(debt.emi),
      type: 'expense',
      date: today
    });

    onAddPaymentHistory({
      debtId: debt.id,
      amount: Math.round(debt.emi),
      date: today
    });
  };

  const handleLogPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setLogPaymentError('');
    const debt = debts.find(d => d.id === logPaymentDebtId);
    if (!debt) return;
    const amt = parseFloat(logPaymentAmount);
    if (isNaN(amt) || amt <= 0) { setLogPaymentError('Enter a valid amount.'); return; }
    if (amt > debt.remainingAmount) { setLogPaymentError(`Amount exceeds remaining ₹${debt.remainingAmount.toLocaleString('en-IN')}.`); return; }
    const newRemaining = Math.max(0, debt.remainingAmount - amt);
    onUpdateDebt(debt.id, { remainingAmount: newRemaining });
    const today = new Date().toISOString().split('T')[0];
    onAddTransaction({ name: `Payment: ${debt.name}`, category: 'Debt Repayment', amount: Math.round(amt), type: 'expense', date: today });
    onAddPaymentHistory({ debtId: debt.id, amount: Math.round(amt), date: today });
    setLogPaymentDebtId(null);
    setLogPaymentAmount('');
  };

  const openAddModal = () => {
    setFormName('');
    setFormType('loan');
    setCustomType('');
    setFormTotal('');
    setFormRemaining('');
    setFormInterest('');
    setFormEmi('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormError('');
    setEditingDebtId(null);
    setIsAddOpen(true);
  };

  const openEditModal = (debt: Debt) => {
    setFormName(debt.name);
    
    // Check if debt type is one of the predefined ones, or if it's custom
    const standardTypes = ['loan', 'credit_card', 'mortgage', 'student_loan', 'borrowed', 'app_loan'];
    if (standardTypes.includes(debt.type)) {
      setFormType(debt.type);
      setCustomType('');
    } else {
      setFormType('custom');
      setCustomType(debt.type);
    }
    
    setFormTotal(debt.totalAmount.toString());
    setFormRemaining(debt.remainingAmount.toString());
    setFormInterest(debt.interestRate.toString());
    setFormEmi(debt.emi?.toString() || '');
    setFormStartDate(debt.startDate || new Date().toISOString().split('T')[0]);
    setFormError('');
    setEditingDebtId(debt.id);
    setIsAddOpen(true);
  };

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const total = parseFloat(formTotal);
    const remaining = parseFloat(formRemaining);
    const interest = parseFloat(formInterest) || 0;
    const emi = formEmi ? parseFloat(formEmi) : undefined;

    if (!formName.trim() || isNaN(total) || isNaN(remaining) || total <= 0 || remaining <= 0) {
      setFormError('Please provide valid name, total, and remaining amounts.');
      return;
    }

    let finalType = formType;
    if (formType === 'custom') {
      if (!customType.trim()) {
        setFormError('Please enter a custom type.');
        return;
      }
      finalType = customType.trim();
    }

    if (editingDebtId) {
      onUpdateDebt(editingDebtId, {
        name: formName.trim(),
        type: finalType,
        totalAmount: Math.round(total),
        remainingAmount: Math.round(remaining),
        interestRate: interest,
        startDate: formStartDate || undefined,
        ...(emi !== undefined ? { emi: Math.round(emi) } : { emi: undefined })
      });
    } else {
      onAddDebt({
        name: formName.trim(),
        type: finalType,
        totalAmount: Math.round(total),
        remainingAmount: Math.round(remaining),
        interestRate: interest,
        startDate: formStartDate || undefined,
        ...(emi !== undefined ? { emi: Math.round(emi) } : {})
      });
    }

    setIsAddOpen(false);
  };

  const getProgress = (debt: Debt) => {
    if (debt.totalAmount <= 0) return 0;
    const paid = debt.totalAmount - debt.remainingAmount;
    return Math.max(0, Math.min(100, (paid / debt.totalAmount) * 100));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <span className="font-sans text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Liabilities Monitor
          </span>
          <h1 className="font-sans font-semibold text-xl text-gray-900 dark:text-gray-50 mt-0.5 tracking-tight">
            Debt & Loans
          </h1>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-sans text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          Add Debt
        </button>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
          <p className="font-sans text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Total Outstanding Debt</p>
          <p className="text-3xl font-sans font-bold text-gray-900 dark:text-gray-50">
            ₹{totalDebt.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
          <p className="font-sans text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Total Monthly EMI</p>
          <p className="text-3xl font-sans font-bold text-gray-900 dark:text-gray-50">
            ₹{totalEmi.toLocaleString('en-IN')}
          </p>
          {debtsWithoutEmi.length > 0 && (
            <p
              className="font-sans text-[10px] text-amber-600 dark:text-amber-400 mt-2 cursor-default"
              title={`EMI not set for: ${debtsWithoutEmi.map(d => d.name).join(', ')}`}
            >
              EMI not set for {debtsWithoutEmi.length} {debtsWithoutEmi.length === 1 ? 'debt' : 'debts'} — hover to see
            </p>
          )}
        </div>
      </div>

      {/* Debt List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedDebts.map(debt => {
          const isClosed = debt.remainingAmount <= 0;
          const isOverdue = isDebtOverdue(debt);
          const nextDue = getNextDueDate(debt);
          const payoffDate = getPayoffDate(debt);

          const hasEmi = debt.emi !== undefined && debt.emi > 0;
          const paidAmount = debt.totalAmount - debt.remainingAmount;

          const currentMonth = new Date().toISOString().slice(0, 7);
          const thisMonthPaid = paymentHistory
            .filter(p => p.debtId === debt.id && p.date.startsWith(currentMonth))
            .reduce((sum, p) => sum + p.amount, 0);

          return (
          <div key={debt.id} className={`bg-white dark:bg-gray-900 border ${isClosed ? 'border-gray-100 dark:border-gray-800/50 opacity-60' : isOverdue ? 'border-red-300 dark:border-red-800 shadow-sm' : 'border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800'} p-4 rounded-2xl shadow-sm transition-colors`}>

            {/* Header row */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h3 className={`font-sans font-semibold text-base ${isClosed ? 'text-gray-500 dark:text-gray-400' : isOverdue ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-50'}`}>{debt.name}</h3>
                {isOverdue && !isClosed && (
                  <span className="px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 font-sans text-[10px] font-semibold shrink-0">OVERDUE</span>
                )}
                <span className="px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 font-sans text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium shrink-0">
                  {debt.type.replace(/_/g, ' ')}
                </span>
                {isClosed && (
                  <span className="px-2 py-0.5 rounded-md border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 font-sans text-[10px] font-semibold shrink-0">CLOSED</span>
                )}
                {debt.interestRate > 0 && !isClosed && (
                  <span className={`px-2 py-0.5 rounded-md border font-sans text-[10px] font-semibold shrink-0 ${
                    debt.interestRate > 18
                      ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : debt.interestRate >= 10
                        ? 'border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  }`}>
                    {debt.interestRate}% APR
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-sans text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-0.5">Remaining</p>
                    <p className={`font-sans text-lg font-bold ${isClosed ? 'text-gray-400' : 'text-gray-900 dark:text-gray-50'}`}>
                      ₹{debt.remainingAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  {!isClosed && (
                    hasEmi ? (
                      <button
                        onClick={() => handleMarkEmiPaid(debt)}
                        className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors whitespace-nowrap"
                      >
                        Mark EMI Paid
                      </button>
                    ) : (
                      <button
                        onClick={() => { setLogPaymentDebtId(debt.id); setLogPaymentAmount(''); setLogPaymentError(''); }}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                      >
                        Log Payment
                      </button>
                    )
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setHistoryDebtId(debt.id)}
                      className="p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Payment History"
                    >
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(debt)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteDebt(debt.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {thisMonthPaid > 0 && (
                  <p className="font-sans text-[10px] text-green-600 dark:text-green-400 font-medium">
                    ↓ ₹{thisMonthPaid.toLocaleString('en-IN')} paid this month
                  </p>
                )}
              </div>
            </div>

            {/* Stats row — always 4 columns; show "—" for missing EMI fields */}
            <div className="grid grid-cols-4 border-t border-gray-100 dark:border-gray-800 pt-3 pb-3">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-1">Original Amount</p>
                <p className="font-sans text-sm font-semibold text-gray-500 dark:text-gray-400">₹{debt.totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-1">Monthly EMI</p>
                <p className="font-sans text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {hasEmi ? `₹${debt.emi!.toLocaleString('en-IN')}` : <span className="text-gray-300 dark:text-gray-600">Not set</span>}
                </p>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-1">Due Date</p>
                <p className={`font-sans text-sm font-semibold ${hasEmi && isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {hasEmi && nextDue ? nextDue.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </p>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">EMIs Remaining</p>
                {hasEmi && !isClosed ? (
                  <>
                    <p className="font-sans text-base font-bold text-blue-600 dark:text-blue-400">{Math.ceil(debt.remainingAmount / debt.emi!)}</p>
                    {payoffDate && <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">paid off by {payoffDate}</p>}
                  </>
                ) : (
                  <p className="font-sans text-sm font-semibold text-gray-300 dark:text-gray-600">{isClosed ? 'Paid off' : '—'}</p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 border-t border-gray-200 dark:border-gray-700 pt-3 mt-1">
              <div className="flex justify-between font-sans text-xs text-gray-500 dark:text-gray-400 font-medium">
                <span>₹{paidAmount.toLocaleString('en-IN')} paid · ₹{debt.remainingAmount.toLocaleString('en-IN')} remaining</span>
                <span>{getProgress(debt).toFixed(1)}% Paid</span>
              </div>
              <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isClosed ? 'bg-green-500' : 'bg-blue-600'}`}
                  style={{ width: `${getProgress(debt)}%` }}
                />
              </div>
            </div>
          </div>
        )})}
        {debts.length === 0 && (
          <div className="lg:col-span-2 text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm font-medium">No debts or loans tracked.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-sans font-semibold text-gray-900 dark:text-gray-50">
                {editingDebtId ? 'Edit Debt' : 'Add New Debt'}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddDebt} className="space-y-5">
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">Debt Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                  placeholder="e.g. Car Loan"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">Type</label>
                  <select
                    value={formType}
                    onChange={e => {
                      setFormType(e.target.value);
                      if (e.target.value !== 'custom') {
                        setCustomType('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                  >
                    {Array.from(new Set(['Home Loan', 'Car Loan', 'Two-Wheeler Loan', 'Personal Loan', 'Education Loan', 'Credit Card', 'Gold Loan', 'Business Loan', ...debts.map(d => d.type).filter(Boolean)])).map(type => (
                      <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                  {formType === 'custom' && (
                    <input
                      type="text"
                      value={customType}
                      onChange={e => setCustomType(e.target.value)}
                      placeholder="Enter custom type..."
                      className="w-full mt-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formInterest}
                    onChange={e => setFormInterest(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                    placeholder="e.g. 5.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">Total Amount</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formTotal}
                    onChange={e => setFormTotal(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                    placeholder="e.g. 15000"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">Remaining Amount</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formRemaining}
                    onChange={e => setFormRemaining(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                    placeholder="e.g. 12000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">Monthly EMI (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={formEmi}
                    onChange={e => setFormEmi(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                  />
                </div>
              </div>
              
              {formError && (
                <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">{formError}</p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50 rounded-xl font-sans font-medium text-sm text-gray-700 dark:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-sans font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {editingDebtId ? 'Update Debt' : 'Save Debt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Payment Modal */}
      {logPaymentDebtId && (() => {
        const debt = debts.find(d => d.id === logPaymentDebtId);
        if (!debt) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-sans font-semibold text-gray-900 dark:text-gray-50">Log Payment — {debt.name}</h3>
                <button onClick={() => setLogPaymentDebtId(null)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-50">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleLogPayment} className="space-y-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">
                    Payment Amount <span className="normal-case text-gray-400">(Remaining: ₹{debt.remainingAmount.toLocaleString('en-IN')})</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    autoFocus
                    value={logPaymentAmount}
                    onChange={e => setLogPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                    placeholder="e.g. 5000"
                  />
                </div>
                {logPaymentError && (
                  <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-xl border border-red-200 dark:border-red-800">{logPaymentError}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setLogPaymentDebtId(null)} className="flex-1 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-sans font-medium text-sm text-gray-700 dark:text-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-sans font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm">Record Payment</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Payment History Modal */}
      {historyDebtId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-sans font-semibold text-gray-900 dark:text-gray-50">
                Payment History
              </h3>
              <button onClick={() => setHistoryDebtId(null)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {(() => {
                const selectedDebt = debts.find(d => d.id === historyDebtId);
                if (!selectedDebt) return null;
                
                const debtPayments = entries
                  .filter(e => e.name === `Payment: ${selectedDebt.name}`)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if (debtPayments.length === 0) {
                  return (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No payments recorded yet.</p>
                    </div>
                  );
                }

                return debtPayments.map((payment, idx) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div>
                      <p className="font-sans font-semibold text-gray-900 dark:text-gray-50 text-sm">
                        EMI #{idx + 1}
                      </p>
                      <p className="font-sans text-xs text-gray-500 dark:text-gray-400">
                        {new Date(payment.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <p className="font-sans font-bold text-gray-900 dark:text-gray-50">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
