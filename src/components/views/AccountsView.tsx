import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Landmark, Wallet, DollarSign, ListFilter, Check, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Account, Entry } from '../../types';
import Select from '../Select';

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
  const [formNickname, setFormNickname] = useState('');
  const [formBranchName, setFormBranchName] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [formVaultLink, setFormVaultLink] = useState('');
  const [formError, setFormError] = useState('');
  const [showClosedAccounts, setShowClosedAccounts] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

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
    setFormNickname('');
    setFormBranchName('');
    setFormPurpose('');
    setFormIsDefault(false);
    setFormNotes('');
    setFormVaultLink('');
    setFormError('');
    setEditingAccountId(null);
    setShowMoreOptions(false);
    setIsAddOpen(true);
  };

  const openEditModal = (account: Account) => {
    setFormName(account.name);
    setFormType(account.type);
    setFormBalance(account.balance.toString());
    setFormAccountNumber(account.accountNumber || '');
    setFormIfscCode(account.ifscCode || '');
    setFormStatus(account.status || 'active');
    setFormNickname(account.nickname || '');
    setFormBranchName(account.branchName || '');
    setFormPurpose(account.purpose || '');
    setFormIsDefault(!!(account.isDefault || account.isPrimary));
    setFormNotes(account.notes || '');
    setFormVaultLink(account.vaultLink || '');
    setFormError('');
    setEditingAccountId(account.id);
    setShowMoreOptions(false);
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
      const commonData = {
        name: formName.trim(),
        type: formType,
        balance: Math.round(balance),
        status: formStatus,
        accountNumber: formAccountNumber.trim() || undefined,
        ifscCode: formIfscCode.trim() || undefined,
        nickname: formNickname.trim() || undefined,
        branchName: formBranchName.trim() || undefined,
        purpose: formPurpose.trim() || undefined,
        isDefault: formIsDefault,
        isPrimary: formIsDefault,
        notes: formNotes.trim() || undefined,
        vaultLink: formVaultLink.trim() || undefined,
      };

      if (editingAccountId) {
        await onUpdateAccount(editingAccountId, commonData);
      } else {
        await onAddAccount(commonData);
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
                  <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Types' },
                      ...accountTypes.map(type => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) })),
                    ]}
                    className="w-full font-sans text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="p-4">
                  <h3 className="font-sans text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Filter by Status</h3>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                    className="w-full font-sans text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
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
          <div className="mt-2 flex items-center gap-1.5">
            <span className="font-sans text-xs text-gray-500 dark:text-gray-400 font-medium">Net Change This Month:</span>
            <span className={`font-sans text-xs font-semibold ${netChangeThisMonth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {netChangeThisMonth > 0 ? '+' : ''}₹{Math.abs(netChangeThisMonth).toLocaleString()}
            </span>
          </div>
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
                  <h3 className="font-sans font-semibold text-gray-900 dark:text-gray-50 text-lg flex items-center gap-2">
                    {account.nickname?.trim() ? account.nickname : account.name}
                    {(account.isDefault || account.isPrimary) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] rounded-full font-medium border border-amber-200 dark:border-amber-800">
                        <Star size={12} className="fill-amber-500 text-amber-500" /> Default
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium capitalize border border-gray-200 dark:border-gray-700">
                      {account.type}
                    </span>
                    {account.purpose && account.purpose.trim().length > 0 && (
                      <span className="inline-block px-2.5 py-1 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium border border-purple-200 dark:border-purple-800">
                        {account.purpose}
                      </span>
                    )}
                    {account.accountNumber && account.accountNumber.trim().length > 0 && (
                      <span className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium border border-gray-200 dark:border-gray-700">
                        •••• {account.accountNumber.length > 4 ? account.accountNumber.slice(-4) : account.accountNumber}
                      </span>
                    )}
                  </div>
                  {account.branchName && account.branchName.trim().length > 0 && (
                    <p className="font-sans text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      Branch: {account.branchName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {account.vaultLink && account.vaultLink.trim().length > 0 && (
                  <a
                    href={account.vaultLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 text-xs font-sans font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors inline-flex items-center gap-1"
                    title="Open Netbanking / Vault Link"
                  >
                    <span>Open</span>
                    <span>→</span>
                  </a>
                )}
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
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-sans font-semibold text-gray-900 dark:text-gray-50">
                {editingAccountId ? 'Edit Account' : 'Add New Account'}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSaveAccount} className="flex flex-col grow overflow-hidden">
              <div className="flex flex-col gap-5 overflow-y-auto pr-2 pb-2 grow">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Row 1: Bank/Account Name | Nickname (Optional) */}
                  <div>
                    <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Bank / Account Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                      placeholder="e.g. Chase Checking"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Nickname (Optional)</label>
                    <input
                      type="text"
                      value={formNickname}
                      onChange={e => setFormNickname(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                      placeholder="e.g. Salary Account"
                    />
                  </div>

                  {/* Row 2: Type | Balance (₹) */}
                  <div>
                    <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Type</label>
                    <Select
                      value={formType}
                      onChange={e => setFormType(e.target.value)}
                      options={[
                        { value: 'checking', label: 'Checking' },
                        { value: 'savings', label: 'Savings' },
                        { value: 'credit', label: 'Credit Card' },
                        { value: 'cash', label: 'Cash' },
                        { value: 'investment', label: 'Investment' },
                        { value: 'other', label: 'Other' },
                      ]}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                    />
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

                  {/* Row 3: Account Number (Full) | IFSC Code (Optional) */}
                  <div>
                    <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Account Number (Full)</label>
                    <input
                      type="text"
                      value={formAccountNumber}
                      onChange={e => setFormAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                      placeholder="e.g. 123456789012"
                    />
                  </div>
                  <div>
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

                  {/* Notes (optional textarea) — full width */}
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Notes (Optional)</label>
                    <textarea
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                      placeholder="Add any private notes here..."
                    />
                  </div>

                  {/* Status (if editing) */}
                  {editingAccountId && (
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Status</label>
                      <Select
                        value={formStatus}
                        onChange={e => setFormStatus(e.target.value as any)}
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                          { value: 'closed', label: 'Closed' },
                        ]}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Collapsible "More options" section */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    className="inline-flex items-center gap-1.5 text-sm font-sans font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <span>{showMoreOptions ? '- Less options' : '+ More options'}</span>
                    {showMoreOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showMoreOptions && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {/* Account Purpose Tag | Branch Name (Optional) */}
                      <div>
                        <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Account Purpose Tag</label>
                        <Select
                          value={formPurpose}
                          onChange={e => setFormPurpose(e.target.value)}
                          options={[
                            { value: '', label: 'Select Purpose...' },
                            { value: 'Primary', label: 'Primary' },
                            { value: 'Emergency Fund', label: 'Emergency Fund' },
                            { value: 'Business', label: 'Business' },
                            { value: 'Joint', label: 'Joint' },
                            { value: 'Other', label: 'Other' },
                          ]}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Branch Name (Optional)</label>
                        <input
                          type="text"
                          value={formBranchName}
                          onChange={e => setFormBranchName(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                          placeholder="e.g. Downtown Branch"
                        />
                      </div>

                      {/* Netbanking/Vault Link (optional) */}
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Netbanking / Vault Link (optional)</label>
                        <input
                          type="url"
                          value={formVaultLink}
                          onChange={e => setFormVaultLink(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                          placeholder="https://..."
                        />
                        <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mt-1">We never store credentials — just a quick link to your bank or password manager.</p>
                      </div>

                      {/* Set Default Account (toggle) */}
                      <div className="col-span-1 sm:col-span-2 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl">
                        <div>
                          <span className="font-sans text-sm font-semibold text-gray-900 dark:text-gray-50">Set as Default Account</span>
                          <p className="font-sans text-xs text-gray-500 dark:text-gray-400">Toggling this on will auto-disable other default accounts.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formIsDefault}
                          onChange={e => setFormIsDefault(e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <p className="text-red-500 font-sans text-xs font-medium px-1">{formError}</p>
              )}

              <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 shrink-0">
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
