import React, { useState, useRef, useEffect } from 'react';
import { Bill } from '../../types';
import { DEFAULT_CATEGORIES } from '../../initialData';
import { 
  User, 
  Settings, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  Plus, 
  Check, 
  X,
  FileText,
  AlertTriangle,
  Info,
  Moon,
  Sun
} from 'lucide-react';

interface SettingsViewProps {
  userName: string;
  setUserName: (name: string) => void;
  categoryBudgets: Record<string, number>;
  setCategoryBudgets: (budgets: Record<string, number>) => void;
  bills: Bill[];
  onAddBill: (bill: Omit<Bill, 'id' | 'paid'>) => void;
  onDeleteBill: (id: string) => void;
  onResetData: () => void;
  onImportJSON: (jsonData: string) => boolean;
  onExportJSON: () => void;
  onExportCSV: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function SettingsView({
  userName,
  setUserName,
  categoryBudgets,
  setCategoryBudgets,
  bills,
  onAddBill,
  onDeleteBill,
  onResetData,
  onImportJSON,
  onExportJSON,
  onExportCSV,
  theme,
  setTheme
}: SettingsViewProps) {
  
  const [profileName, setProfileName] = useState(userName);
  const [isNameSaved, setIsNameSaved] = useState(false);

  // Form states for adding a recurring bill
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>(categoryBudgets);
  const [isBudgetsSaved, setIsBudgetsSaved] = useState(false);

  const [isAddingBill, setIsAddingBill] = useState(false);
  const [billName, setBillName] = useState('');
  const [billDueDate, setBillDueDate] = useState('Monthly, 15th');
  const [billAmount, setBillAmount] = useState('');
  const [billCategory, setBillCategory] = useState('Bills & Subscription');
  const [billError, setBillError] = useState('');

  useEffect(() => {
    setLocalBudgets(categoryBudgets);
  }, [categoryBudgets]);

  const handleSaveBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryBudgets(localBudgets);
    setIsBudgetsSaved(true);
    setTimeout(() => setIsBudgetsSaved(false), 2000);
  };

  // JSON Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    setUserName(profileName.trim());
    setIsNameSaved(true);
    setTimeout(() => setIsNameSaved(false), 2000);
  };

  const handleAddBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBillError('');

    const amt = parseFloat(billAmount);
    if (!billName.trim()) {
      setBillError('Please enter a bill name.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setBillError('Amount must be a positive number.');
      return;
    }

    onAddBill({
      name: billName.trim(),
      billingDay: 1,
      cycle: 'monthly',
      amount: Math.round(amt),
      category: billCategory
    });

    setBillName('');
    setBillAmount('');
    setIsAddingBill(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = onImportJSON(content);
      if (success) {
        setImportStatus({ type: 'success', message: 'Ledger data imported successfully. Core rehydrated!' });
      } else {
        setImportStatus({ type: 'error', message: 'Failed to import. Invalid JSON schema for Ledger.' });
      }
      setTimeout(() => setImportStatus({ type: null, message: '' }), 5000);
    };
    reader.readAsText(file);
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetClick = () => {
    if (confirm('CRITICAL WARN: This will delete ALL custom entries, assets, goals, and recurring bills, returning the system to preloaded mock defaults. Do you wish to proceed?')) {
      onResetData();
      setProfileName('Dev');
      alert('Workspace reset successfully.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. HEADER ROW */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700/60">
        <div>
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            SYSTEM_PREFERENCES_DESK
          </span>
          <h1 className="font-sans font-medium text-lg text-gray-900 dark:text-gray-50 mt-0.5">
            Settings & Control Panel
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: General Preferences & Subscriptions (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* A. User Profile Name & Theme Toggle */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-[8px] space-y-6">
            <div>
              <h3 className="font-sans font-medium text-xs text-gray-900 dark:text-gray-50 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/40 pb-2 flex items-center gap-2">
                <User size={13} className="text-blue-600 dark:text-blue-400" /> Profile Configuration
              </h3>

              <form onSubmit={handleSaveName} className="flex gap-4 items-end mt-4">
                <div className="flex-1 max-w-sm">
                  <label className="block font-sans text-[10px] uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                    Ledger Owner Identity Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[#E0BD7D] rounded-[6px] text-xs text-gray-900 dark:text-gray-50 outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-700 text-xs font-sans font-medium text-gray-900 dark:text-gray-50 rounded-[6px] flex items-center gap-1.5 transition-colors"
                >
                  {isNameSaved ? (
                    <>
                      <Check size={12} className="text-green-600 dark:text-green-400" /> SAVED_SYNC
                    </>
                  ) : (
                    'UPDATE_NAME'
                  )}
                </button>
              </form>
            </div>

            <div>
              <h3 className="font-sans font-medium text-xs text-gray-900 dark:text-gray-50 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/40 pb-2 flex items-center gap-2">
                <Settings size={13} className="text-blue-600 dark:text-blue-400" /> Category Budgets Configuration
              </h3>
              
              <form onSubmit={handleSaveBudgets} className="mt-4 space-y-4">
                {DEFAULT_CATEGORIES.map(cat => (
                  <div key={cat} className="flex gap-4 items-center">
                    <label className="w-40 font-sans text-xs text-gray-700 dark:text-gray-300">
                      {cat} Limit
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

            <div>
              <h3 className="font-sans font-medium text-xs text-gray-900 dark:text-gray-50 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/40 pb-2 flex items-center gap-2">
                <Settings size={13} className="text-blue-600 dark:text-blue-400" /> Visual Theme
              </h3>
              
              <div className="flex items-center gap-4 mt-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-[6px] transition-colors ${
                    theme === 'light' 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  <Sun size={16} /> <span className="font-sans text-sm font-medium">Light Mode</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-[6px] transition-colors ${
                    theme === 'dark' 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  <Moon size={16} /> <span className="font-sans text-sm font-medium">Dark Mode</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ledger Backups & Diagnostics (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* A. Ledger Backup & Restore */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-[8px] space-y-4">
            <h3 className="font-sans font-medium text-xs text-gray-900 dark:text-gray-50 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/40 pb-2 flex items-center gap-2">
              <Download size={13} className="text-blue-600 dark:text-blue-400" /> Ledger Data Backups
            </h3>

            {/* Help tip */}
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Export your personal finance transactions, assets, and liability configurations to a single self-contained JSON file. Maintain physical copies for trading journal logs, or export your transaction entries to CSV for external analysis.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={onExportJSON}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-700 rounded-[6px] font-sans text-[10px] text-gray-900 dark:text-gray-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download size={12} className="text-blue-600 dark:text-blue-400" /> DOWNLOAD_JSON
              </button>
              
              <button
                onClick={onExportCSV}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-700 rounded-[6px] font-sans text-[10px] text-gray-900 dark:text-gray-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download size={12} className="text-green-600 dark:text-green-400" /> DOWNLOAD_CSV
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="col-span-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-700 rounded-[6px] font-sans text-[10px] text-gray-900 dark:text-gray-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload size={12} className="text-green-600 dark:text-green-400" /> UPLOAD_JSON
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
            </div>

            {importStatus.type && (
              <div className={`p-2 rounded text-[10px] font-sans leading-relaxed border ${
                importStatus.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400' 
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
              }`}>
                {importStatus.type === 'success' ? 'SUCCESS: ' : 'ERROR: '} {importStatus.message}
              </div>
            )}
          </div>

          {/* B. Hard reset controls */}
          <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-[8px] space-y-3">
            <h3 className="font-sans font-medium text-xs text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-600 dark:text-red-400" /> Danger Zone preferences
            </h3>
            
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Resetting will clear the local client database cache. All user custom ledger configurations and transactions will be wiped forever.
            </p>

            <button
              onClick={handleResetClick}
              className="w-full py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800/30 text-xs font-sans text-red-600 dark:text-red-400 font-semibold rounded-[6px] flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw size={12} /> RESTORE_SYSTEM_DEFAULTS
            </button>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-[8px] text-[10px] text-gray-500 dark:text-gray-500 leading-relaxed flex gap-2 font-sans">
            <Info size={14} className="shrink-0 text-gray-500 dark:text-gray-400 mt-0.5" />
            <p>
              Data is stored fully inside the client's local storage sandbox. No remote server tracking, cookies, or telemetry is active. Securely offline.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
