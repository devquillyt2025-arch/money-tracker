import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Landmark, Wallet, DollarSign, ListFilter, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Account, Entry } from '../../types';

interface AccountsViewProps {
  accounts: Account[];
  entries: Entry[];
  onAddAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  onUpdateAccount: (id: string, updated: Partial<Account>) => Promise<void>;
  onDeleteAccount: (id: string) => void;
}

export default function AccountsView({
  accounts,
  entries,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount
}: AccountsViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('checking');
  const [formBalance, setFormBalance] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formIfscCode, setFormIfscCode] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'closed'>('active');
  const [formError, setFormError] = useState('');
  const [showClosedAccounts, setShowClosedAccounts] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'balance-desc' | 'balance-asc' | 'name-asc' | 'type-asc'>('balance-desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const processedAccounts = [...accounts]
    .filter(a => showClosedAccounts || a.status !== 'closed')
    .filter(a => filterType === 'all' || a.type === filterType)
    .filter(a => filterStatus === 'all' || (a.status || 'active') === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'balance-desc') return (b.availableBalance ?? b.balance) - (a.availableBalance ?? a.balance);
      if (sortBy === 'balance-asc') return (a.availableBalance ?? a.balance) - (b.availableBalance ?? b.balance);
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'type-asc') return a.type.localeCompare(b.type);
      return 0;
    });

  const totalBalance = processedAccounts.reduce((sum, a) => sum + (a.availableBalance ?? a.balance), 0);
  const accountTypes = Array.from(new Set(accounts.map(a => a.type)));

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const netChangeThisMonth = entries.reduce((acc, entry) => {
    const entryDate = new Date(entry.date);
    if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
      return acc + (entry.type === 'income' ? entry.amount : -entry.amount);
    }
    return acc;
  }, 0);

  const bankBalances = processedAccounts.reduce((acc, account) => {
    const bal = account.availableBalance ?? account.balance;
    if (bal > 0) {
      acc[account.name] = (acc[account.name] || 0) + bal;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const totalPositiveBalance = Object.values(bankBalances).reduce((sum, val) => sum + val, 0);
  const bankSegments = Object.entries(bankBalances)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bal]) => ({
      name,
      percentage: (bal / totalPositiveBalance) * 100
    }));

  const segmentColors = [
    'bg-blue-300 dark:bg-blue-800',
    'bg-slate-300 dark:bg-slate-700',
    'bg-gray-300 dark:bg-gray-700',
    'bg-indigo-300 dark:bg-indigo-800',
    'bg-sky-300 dark:bg-sky-800',
  ];

  const openAddModal = () => {
    setFormName('');
    setFormType('checking');
    setFormBalance('');
    setFormAccountNumber('');
    setFormIfscCode('');
    setFormStatus('active');
    setFormError('');
    setEditingAccountId(null);
    setIsAddOpen(true);
  };

  const openEditModal = (account: Account) => {
    setFormName(account.name);
    setFormType(account.type);
    setFormBalance(account.balance.toString());
    setFormAccountNumber(account.accountNumber || '');
    setFormIfscCode(account.ifscCode || '');
    setFormStatus(account.status || 'active');
    setFormError('');
    setEditingAccountId(account.id);
    setIsAddOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const balance = parseFloat(formBalance);

    if (!formName.trim() || isNaN(balance)) {
      setFormError('Please provide a valid name and balance.');
      return;
    }

    if (formIfscCode.trim() && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(formIfscCode.trim())) {
      setFormError('Invalid IFSC code format. E.g., HDFC0001234.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAccountId) {
        await onUpdateAccount(editingAccountId, {
          name: formName.trim(),
          type: formType,
          balance: Math.round(balance),
          status: formStatus,
          accountNumber: formAccountNumber.trim() || undefined,
          ifscCode: formIfscCode.trim() || undefined
        });
      } else {
        await onAddAccount({
          name: formName.trim(),
          type: formType,
          balance: Math.round(balance),
          status: formStatus,
          accountNumber: formAccountNumber.trim() || undefined,
          ifscCode: formIfscCode.trim() || undefined
        });
      }
      setIsAddOpen(false);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to save account. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <DollarSign size={24} className="text-emerald-500" />;
      case 'savings':
        return <Landmark size={24} className="text-blue-500" />;
      default:
        return <Wallet size={24} className="text-purple-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="font-sans font-semibold text-xl text-gray-900 dark:text-gray-50 mt-0.5 tracking-tight">
              Bank Accounts
            </h1>
            {accounts.some(a => a.status === 'closed') && (
              <button 
                onClick={() => setShowClosedAccounts(!showClosedAccounts)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {showClosedAccounts ? 'Hide closed accounts' : 'Show closed accounts'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Sort and Filter"
            >
              <ListFilter size={18} />
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-20 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-sans text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sort By</h3>
                  <div className="space-y-2">
                    {[
                      { value: 'balance-desc', label: 'Balance (High to Low)' },
                      { value: 'balance-asc', label: 'Balance (Low to High)' },
                      { value: 'name-asc', label: 'Bank Name (A-Z)' },
                      { value: 'type-asc', label: 'Account Type' },
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value as any)}
                        className={`w-full text-left font-sans text-sm flex items-center justify-between py-1 px-2 -mx-2 rounded-lg transition-colors ${sortBy === option.value ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        {option.label}
                        {sortBy === option.value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-sans text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Filter by Type</h3>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full font-sans text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="all">All Types</option>
                    {accountTypes.map(type => (
                      <option key={type} value={type} className="capitalize">{type}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4">
                  <h3 className="font-sans text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Filter by Status</h3>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full font-sans text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={openAddModal}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-sans text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Add Account
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
        <p className="font-sans text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Total Balance</p>
        <p className="font-sans font-semibold text-4xl text-gray-900 dark:text-gray-50 tracking-tight">
          ₹{totalBalance.toLocaleString()}
        </p>
        {netChangeThisMonth !== 0 && (
          <p className={`font-sans text-xs font-medium mt-2 ${netChangeThisMonth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {netChangeThisMonth > 0 ? '+' : ''}₹{Math.abs(netChangeThisMonth).toLocaleString()} this month
          </p>
        )}
        
        {bankSegments.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800">
              {bankSegments.map((segment, idx) => (
                <div 
                  key={segment.name} 
                  className={segmentColors[idx % segmentColors.length]}
                  style={{ width: `${segment.percentage}%` }}
                  title={`${segment.name}: ${segment.percentage.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {bankSegments.map((segment, idx) => (
                <div key={segment.name} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${segmentColors[idx % segmentColors.length]}`} />
                  <span className="font-sans text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                    {segment.name} ({segment.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {processedAccounts.map(account => (
          <div key={account.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm hover:border-blue-200 dark:border-blue-800 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  {getAccountIcon(account.type)}
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-gray-900 dark:text-gray-50 text-lg">{account.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium capitalize border border-gray-200 dark:border-gray-700">
                      {account.type}
                    </span>
                    {account.accountNumber && account.accountNumber.trim().length > 0 && (
                      <span className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium border border-gray-200 dark:border-gray-700">
                        •••• {account.accountNumber.length > 4 ? account.accountNumber.slice(-4) : account.accountNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(account)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-900/20 rounded-xl transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteAccount(account.id)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 rounded-xl transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Available Balance</p>
              <p className={`font-sans font-semibold text-xl ${((account.availableBalance ?? account.balance) >= 0) ? 'text-gray-900 dark:text-gray-50' : 'text-red-600 dark:text-red-400'}`}>
                {account.currency && account.currency !== 'INR' ? `${account.currency} ` : '₹'}{(account.availableBalance ?? account.balance).toLocaleString()}
              </p>
              {account.balanceUpdatedAt && (
                <p className="font-sans text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Updated {formatDistanceToNow(new Date(account.balanceUpdatedAt))} ago
                </p>
              )}
            </div>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-dashed rounded-2xl">
            <Landmark size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="font-sans text-gray-500 dark:text-gray-400 font-medium">No bank accounts added yet</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-sans font-semibold text-gray-900 dark:text-gray-50">
                {editingAccountId ? 'Edit Account' : 'Add New Account'}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSaveAccount} className="space-y-5">
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Account Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  placeholder="e.g. Chase Checking"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit Card</option>
                    <option value="cash">Cash</option>
                    <option value="investment">Investment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Balance (₹)</label>
                  <input
                    type="number"
                    required
                    value={formBalance}
                    onChange={e => setFormBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Account Number (Full)</label>
                  <input
                    type="text"
                    value={formAccountNumber}
                    onChange={e => setFormAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                    placeholder="e.g. 123456789012"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">IFSC Code (Optional)</label>
                  <input
                    type="text"
                    value={formIfscCode}
                    onChange={e => setFormIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all uppercase placeholder:normal-case"
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                  />
                </div>
                {editingAccountId && (
                  <div className="col-span-2">
                    <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Status</label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-red-500 font-sans text-xs font-medium">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-sans font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-sans font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : editingAccountId ? 'Update Account' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
