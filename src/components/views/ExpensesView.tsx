import React, { useState } from 'react';
import { Entry, EntryType } from '../../types';
import { DEFAULT_CATEGORIES } from '../../initialData';
import { api } from '../../lib/api';
import { detectAndParseStatement, loadPdfJs } from '../../lib/spendLensParser';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown, 
  Calendar,
  X,
  PlusCircle,
  FileText
} from 'lucide-react';
import Select from '../Select';

interface ExpensesViewProps {
  entries: Entry[];
  onAddEntry: (entry: Omit<Entry, 'id'>) => void;
  onAddEntries?: (entries: Entry[]) => void;
  onEditEntry: (id: string, updated: Partial<Entry>) => void;
  onDeleteEntry: (id: string) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

type SortField = 'date' | 'amount' | 'name' | 'category';
type SortOrder = 'asc' | 'desc';

export default function ExpensesView({
  entries,
  onAddEntry,
  onAddEntries,
  onEditEntry,
  onDeleteEntry,
  isAddModalOpen,
  setIsAddModalOpen,
}: ExpensesViewProps) {
  
  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Edit states
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Form states for adding/editing
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<EntryType>('expense');
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [formError, setFormError] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const dynamicCategories = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...entries.map(e => e.category)
  ]));

  // --- FILTERS & SORTING ---
  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;
    const matchesType = selectedType === 'ALL' || e.type === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = a.date.localeCompare(b.date);
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'category') {
      comparison = a.category.localeCompare(b.category);
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // --- SUBMIT HANDLERS ---
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const amt = parseFloat(formAmount);
    if (!formName.trim()) {
      setFormError('Please enter a description / name.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }
    if (!formDate) {
      setFormError('Please select a valid date.');
      return;
    }

    let categoryToUse = formCategory;
    if (formCategory === 'CUSTOM') {
      const trimmedCustom = customCategory.trim();
      if (!trimmedCustom) {
        setFormError('Please enter a custom category name.');
        return;
      }
      categoryToUse = trimmedCustom;
    }

    onAddEntry({
      name: formName.trim(),
      category: categoryToUse,
      amount: Math.round(amt),
      type: formType,
      date: formDate
    });

    // Reset Form
    setFormName('');
    setFormAmount('');
    setCustomCategory('');
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    setFormError('');

    const amt = parseFloat(formAmount);
    if (!formName.trim()) {
      setFormError('Please enter a description.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }

    let categoryToUse = formCategory;
    if (formCategory === 'CUSTOM') {
      const trimmedCustom = customCategory.trim();
      if (!trimmedCustom) {
        setFormError('Please enter a custom category name.');
        return;
      }
      categoryToUse = trimmedCustom;
    }

    onEditEntry(editingEntry.id, {
      name: formName.trim(),
      category: categoryToUse,
      amount: Math.round(amt),
      type: formType,
      date: formDate
    });

    setEditingEntry(null);
    setFormName('');
    setFormAmount('');
    setCustomCategory('');
  };

  const startEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setFormName(entry.name);
    setFormCategory(entry.category);
    setFormAmount(String(entry.amount));
    setFormType(entry.type);
    setFormDate(entry.date);
    setFormError('');
    setCustomCategory('');
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setFormName('');
    setFormAmount('');
    setFormError('');
    setCustomCategory('');
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setFormName('');
    setFormAmount('');
    setFormCategory(DEFAULT_CATEGORIES[0]);
    setFormType('expense');
    setFormError('');
    setCustomCategory('');
    setIsAddModalOpen(true);
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [pendingPdfBuffer, setPendingPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
    setPasswordError('');
    setPdfPassword('');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        // Save a pristine copy immediately so it's ready for password retries without detachment
        setPendingPdfBuffer(arrayBuffer.slice(0));
        
        const pdfjsLib = await loadPdfJs();
        
        try {
          // Pass a slice so the original buffer isn't detached by Web Worker postMessage
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
          const pdf = await loadingTask.promise;
          setPendingPdfBuffer(null);
          await processUnlockedPdf(pdf);
        } catch (pdfErr: any) {
          if (pdfErr?.name === 'PasswordException' || pdfErr?.message?.includes('password') || pdfErr?.message?.includes('No password given')) {
            setIsPasswordPromptOpen(true);
            setIsUploading(false);
            if (e.target) e.target.value = '';
            return;
          }
          throw pdfErr;
        }
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload and parse statement');
        setIsUploading(false);
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file');
      setIsUploading(false);
      if (e.target) e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const processUnlockedPdf = async (pdf: any) => {
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      const c = await p.getTextContent();
      text += c.items.map((x: any) => x.str).join(' ') + '\n';
    }

    if (text.trim().length < 200) {
      throw new Error('This PDF has no extractable text — it appears to be a scanned image.');
    }

    const transactions = detectAndParseStatement(text);
    if (transactions.length === 0) {
      throw new Error('No transactions could be parsed from this statement.');
    }

    const result = await api.parseStatement({ transactions });
    if (result && result.entries) {
      onAddEntries?.(result.entries);
      setUploadSuccess(`Successfully imported ${result.entries.length} transactions from statement!`);
      setTimeout(() => setUploadSuccess(''), 7000);
    }
    setIsUploading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPdfBuffer) return;
    
    setIsUploading(true);
    setPasswordError('');

    try {
      const pdfjsLib = await loadPdfJs();
      // Pass a slice of pendingPdfBuffer so if password is wrong, pendingPdfBuffer remains intact for the next attempt
      const loadingTask = pdfjsLib.getDocument({ data: pendingPdfBuffer.slice(0), password: pdfPassword });
      const pdf = await loadingTask.promise;
      
      setIsPasswordPromptOpen(false);
      setPendingPdfBuffer(null);
      setPdfPassword('');
      await processUnlockedPdf(pdf);
    } catch (err: any) {
      setIsUploading(false);
      if (err?.name === 'PasswordException' || err?.message?.includes('password')) {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        setPasswordError(err.message || 'Failed to parse encrypted PDF.');
      }
    }
  };

  // --- STAT CALCULATIONS (Based on filtered entries) ---
  const debitsList = filteredEntries.filter(e => e.type === 'expense');
  const creditsList = filteredEntries.filter(e => e.type === 'income');
  const totalDebits = debitsList.reduce((sum, e) => sum + e.amount, 0);
  const totalCredits = creditsList.reduce((sum, e) => sum + e.amount, 0);
  const netOutflow = totalDebits - totalCredits;
  const avgPayment = debitsList.length > 0 ? totalDebits / debitsList.length : 0;
  const totalTransactions = filteredEntries.length;
  
  let largestPayment = 0;
  let largestPaymentName = 'None';
  if (debitsList.length > 0) {
    const maxDebit = [...debitsList].sort((a, b) => b.amount - a.amount)[0];
    largestPayment = maxDebit.amount;
    largestPaymentName = maxDebit.name;
  }

  return (
    <div className="space-y-6">
      {/* 1. HEADER & ACTION ROW */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <span className="font-sans text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Ledger Data
          </span>
          <h1 className="font-sans font-semibold text-xl text-gray-900 dark:text-gray-50 mt-0.5 tracking-tight">
            Transaction Feeds
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <label className={`flex items-center gap-2 text-sm font-sans text-white bg-purple-600 hover:bg-purple-700 shadow-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <FileText size={16} />
            {isUploading ? 'Parsing Statement...' : 'Upload PhonePe Statement'}
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isUploading} 
            />
          </label>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 text-sm font-sans text-white bg-blue-600 hover:bg-blue-700 shadow-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={16} /> Record Flow
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-between text-red-600 dark:text-red-400 text-sm font-sans">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError('')} className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl flex items-center justify-between text-green-600 dark:text-green-400 text-sm font-sans font-medium">
          <span>{uploadSuccess}</span>
          <button onClick={() => setUploadSuccess('')} className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. SEARCH & CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search particular or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium shrink-0">Cat:</span>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...dynamicCategories.map(cat => ({ value: cat, label: cat })),
            ]}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium shrink-0">Type:</span>
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Flows' },
              { value: 'income', label: 'Income (+)' },
              { value: 'expense', label: 'Expense (-)' },
            ]}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
          />
        </div>
      </div>

      {/* 3. CORE TABLE CARD */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-sans bg-gray-50 dark:bg-gray-800/50/50">
                <th className="py-3 px-5 font-semibold select-none w-12 text-center">
                  S.No
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  className="py-3 px-5 font-semibold cursor-pointer select-none hover:text-gray-900 dark:text-gray-50"
                >
                  <div className="flex items-center gap-1.5">
                    Particular / Description
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : <ArrowUpDown size={12} className="opacity-40" />}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('category')}
                  className="py-3 px-5 font-semibold cursor-pointer select-none hover:text-gray-900 dark:text-gray-50"
                >
                  <div className="flex items-center gap-1.5">
                    Category
                    {sortField === 'category' ? (
                      sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : <ArrowUpDown size={12} className="opacity-40" />}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="py-3 px-5 font-semibold cursor-pointer select-none hover:text-gray-900 dark:text-gray-50 font-sans"
                >
                  <div className="flex items-center gap-1.5">
                    Date
                    {sortField === 'date' ? (
                      sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : <ArrowUpDown size={12} className="opacity-40" />}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('amount')}
                  className="py-3 px-5 font-semibold cursor-pointer select-none hover:text-gray-900 dark:text-gray-50 font-sans text-right"
                >
                  <div className="flex items-center gap-1.5 justify-end">
                    Amount
                    {sortField === 'amount' ? (
                      sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : <ArrowUpDown size={12} className="opacity-40" />}
                  </div>
                </th>
                <th className="py-3 px-5 text-center font-semibold max-w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedEntries.map((entry, index) => {
                const isIncome = entry.type === 'income';
                return (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50/50 transition-colors">
                    <td className="py-3 px-5 text-xs text-gray-400 dark:text-gray-500 font-sans text-center font-medium">
                      {index + 1}
                    </td>
                    <td className="py-3 px-5 text-sm text-gray-900 dark:text-gray-50 font-medium max-w-[200px] truncate">
                      {entry.name}
                    </td>
                    <td className="py-3 px-5 text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      <span className="px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                        {entry.category}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs text-gray-400 dark:text-gray-500 font-sans">
                      {entry.date}
                    </td>
                    <td className={`py-3 px-5 text-sm font-semibold text-right ${
                      isIncome ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-50'
                    }`}>
                      {isIncome ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(entry)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:bg-gray-800 transition-colors"
                          title="Edit transaction entry"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteEntry(entry.id)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:text-red-400 rounded-md hover:bg-gray-100 dark:bg-gray-800 transition-colors"
                          title="Delete transaction entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                    No records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center text-xs font-sans text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
          <span>Total Query Match: {sortedEntries.length} records</span>
          <span>Cloud Sync Active</span>
        </div>
      </div>

      {/* OVERVIEW SUMMARY ROW */}
      <div className="space-y-1.5 pt-1">
        <h2 className="font-sans text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold px-0.5">
          OVERVIEW
        </h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Column 1: Total Debits */}
          <div className="p-4 flex flex-col justify-between border-b xl:border-b-0 border-r border-gray-100 dark:border-gray-800/60">
            <div>
              <span className="text-[11px] font-sans uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                Total Debits
              </span>
              <div className="text-lg font-sans font-bold text-gray-900 dark:text-gray-50 mt-1">
                ₹{totalDebits.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-[11px] font-sans text-gray-400 dark:text-gray-500 mt-1">
              {debitsList.length} {debitsList.length === 1 ? 'transaction' : 'transactions'}
            </div>
          </div>

          {/* Column 2: Total Credits */}
          <div className="p-4 flex flex-col justify-between border-b xl:border-b-0 border-r border-gray-100 dark:border-gray-800/60">
            <div>
              <span className="text-[11px] font-sans uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                Total Credits
              </span>
              <div className="text-lg font-sans font-bold text-gray-900 dark:text-gray-50 mt-1">
                ₹{totalCredits.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-[11px] font-sans text-gray-400 dark:text-gray-500 mt-1">
              {creditsList.length} {creditsList.length === 1 ? 'transaction' : 'transactions'}
            </div>
          </div>

          {/* Column 3: Net Outflow */}
          <div className="p-4 flex flex-col justify-between border-b xl:border-b-0 border-r border-gray-100 dark:border-gray-800/60">
            <div>
              <span className="text-[11px] font-sans uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                Net Outflow
              </span>
              <div className="text-lg font-sans font-bold text-gray-900 dark:text-gray-50 mt-1">
                {netOutflow < 0 ? '-₹' : '₹'}{Math.abs(netOutflow).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-[11px] font-sans text-gray-400 dark:text-gray-500 mt-1">
              {netOutflow > 0 ? 'Spent more than received' : netOutflow < 0 ? 'Received more than spent' : 'Perfectly balanced'}
            </div>
          </div>

          {/* Column 4: Avg Payment */}
          <div className="p-4 flex flex-col justify-between border-b xl:border-b-0 border-r border-gray-100 dark:border-gray-800/60">
            <div>
              <span className="text-[11px] font-sans uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                Avg Payment
              </span>
              <div className="text-lg font-sans font-bold text-gray-900 dark:text-gray-50 mt-1">
                ₹{Math.round(avgPayment).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-[11px] font-sans text-gray-400 dark:text-gray-500 mt-1">
              Per debit
            </div>
          </div>

          {/* Column 5: Transactions */}
          <div className="p-4 flex flex-col justify-between border-b xl:border-b-0 border-r border-gray-100 dark:border-gray-800/60">
            <div>
              <span className="text-[11px] font-sans uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                Transactions
              </span>
              <div className="text-lg font-sans font-bold text-gray-900 dark:text-gray-50 mt-1">
                {totalTransactions}
              </div>
            </div>
            <div className="text-[11px] font-sans text-gray-400 dark:text-gray-500 mt-1">
              Debits + credits
            </div>
          </div>

          {/* Column 6: Largest Payment */}
          <div className="p-4 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-sans uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
                Largest Payment
              </span>
              <div className="text-lg font-sans font-bold text-gray-900 dark:text-gray-50 mt-1">
                ₹{largestPayment.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-[11px] font-sans text-gray-400 dark:text-gray-500 mt-1 truncate" title={largestPaymentName}>
              {largestPaymentName}
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODALS (ADD / EDIT) */}
      
      {/* ADD ENTRY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 px-5 py-4">
              <span className="font-sans text-sm text-gray-900 dark:text-gray-50 font-semibold tracking-wide">
                Record New Flow
              </span>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-5 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                  Error: {formError}
                </div>
              )}

              {/* Description name */}
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Particular / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Provisions, Rent..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all"
                />
              </div>

              {/* Amount & Type row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Flow direction
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormType('expense')}
                      className={`py-1.5 rounded-lg text-xs font-sans font-medium transition-colors ${
                        formType === 'expense' 
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50'
                      }`}
                    >
                      Out (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('income')}
                      className={`py-1.5 rounded-lg text-xs font-sans font-medium transition-colors ${
                        formType === 'income' 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50'
                      }`}
                    >
                      In (+)
                    </button>
                  </div>
                </div>
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Category
                  </label>
                  <Select
                    value={formCategory}
                    onChange={(e) => {
                      setFormCategory(e.target.value);
                      if (e.target.value !== 'CUSTOM') {
                        setCustomCategory('');
                      }
                    }}
                    options={[
                      ...dynamicCategories.map(cat => ({ value: cat, label: cat })),
                      { value: 'CUSTOM', label: '+ Add Custom Category...' },
                    ]}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  />
                  {formCategory === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="Custom category name..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2 w-full px-3 py-2 bg-white dark:bg-gray-900 border border-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none shadow-sm"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Record Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50 text-sm font-sans font-medium text-gray-700 dark:text-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ENTRY MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 px-5 py-4">
              <span className="font-sans text-sm text-gray-900 dark:text-gray-50 font-semibold tracking-wide">
                Edit Flow Record
              </span>
              <button 
                onClick={cancelEdit}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-5 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                  Error: {formError}
                </div>
              )}

              {/* Description name */}
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Particular / Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>

              {/* Amount & Type row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Flow direction
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormType('expense')}
                      className={`py-1.5 rounded-lg text-xs font-sans font-medium transition-colors ${
                        formType === 'expense' 
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50'
                      }`}
                    >
                      Out (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('income')}
                      className={`py-1.5 rounded-lg text-xs font-sans font-medium transition-colors ${
                        formType === 'income' 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50'
                      }`}
                    >
                      In (+)
                    </button>
                  </div>
                </div>
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Category
                  </label>
                  <Select
                    value={formCategory}
                    onChange={(e) => {
                      setFormCategory(e.target.value);
                      if (e.target.value !== 'CUSTOM') {
                        setCustomCategory('');
                      }
                    }}
                    options={[
                      ...dynamicCategories.map(cat => ({ value: cat, label: cat })),
                      { value: 'CUSTOM', label: '+ Add Custom Category...' },
                    ]}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  />
                  {formCategory === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="Custom category name..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2 w-full px-3 py-2 bg-white dark:bg-gray-900 border border-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none shadow-sm"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Record Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50 text-sm font-sans font-medium text-gray-700 dark:text-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. PASSWORD PROMPT MODAL */}
      {isPasswordPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-800">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-base text-gray-900 dark:text-gray-50">
                    Password Protected PDF
                  </h3>
                  <p className="font-sans text-xs text-gray-500 dark:text-gray-400">
                    Enter the password to decrypt your statement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordPromptOpen(false);
                  setPendingPdfBuffer(null);
                  setPdfPassword('');
                  setPasswordError('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-5 space-y-5">
              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">
                  Document Password
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter PDF password..."
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordPromptOpen(false);
                    setPendingPdfBuffer(null);
                    setPdfPassword('');
                    setPasswordError('');
                  }}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-sans font-medium text-gray-700 dark:text-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-sans font-semibold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-60"
                >
                  {isUploading ? 'Decrypting...' : 'Unlock & Parse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
