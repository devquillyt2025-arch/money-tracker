import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveTab, Entry, Bill, Goal, Debt, Account, PaymentHistory } from './types';
import Sidebar from './components/Sidebar';
import DashboardView from './components/views/DashboardView';
import ExpensesView from './components/views/ExpensesView';
import InvestmentsView from './components/views/InvestmentsView';
import DebtsView from './components/views/DebtsView';
import AccountsView from './components/views/AccountsView';
import GoalsView from './components/views/GoalsView';
import AnalyticsView from './components/views/AnalyticsView';
import SettingsView from './components/views/SettingsView';
import BillsView from './components/views/BillsView';
import BudgetsView from './components/views/BudgetsView';
import { Menu, Search, Clock, X } from 'lucide-react';

import { auth, googleAuthProvider } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { api } from './lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [userName, setUserName] = useState<string>('Dev');
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
  const [entries, setEntries] = useState<Entry[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goal, setGoal] = useState<Goal>({ name: 'Emergency Fund', targetAmount: 500000, currentAmount: 120000 });
  const [investmentsBalance, setInvestmentsBalance] = useState<number>(0);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const item = localStorage.getItem('searchHistory');
      return item ? JSON.parse(item) : [];
    } catch (e) {
      return [];
    }
  });

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const trimmed = searchQuery.trim();
      setSearchHistory(prev => {
        const newHistory = [trimmed, ...prev.filter(item => item !== trimmed)].slice(0, 5);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
        return newHistory;
      });
      setIsSearchFocused(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleHistorySelect = (query: string) => {
    setSearchQuery(query);
    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(item => item !== query)].slice(0, 5);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
    setIsSearchFocused(false);
  };

  const clearSearchHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const data = await api.getLedger();
          setUserName(data.user?.userName || 'Dev');
          setCategoryBudgets(data.user?.categoryBudgets || {});
          setInvestmentsBalance(data.user?.investmentsBalance || 0);
          
          let loadedEntries = data.entries || [];
          let loadedBills = data.bills || [];

          // --- Recurring Transaction Generator ---
          const today = new Date().toISOString().split('T')[0];
          let madeChanges = false;
          
          for (const bill of loadedBills) {
            if (bill.frequency && bill.frequency !== 'one-off' && bill.dueDate <= today) {
              let currentDate = bill.dueDate;
              
              while (currentDate <= today) {
                const newEntry = await api.createEntry({
                  name: bill.name,
                  amount: bill.amount,
                  category: bill.category,
                  type: 'expense',
                  date: currentDate
                });
                loadedEntries.unshift(newEntry);
                
                const d = new Date(currentDate);
                if (bill.frequency === 'weekly') d.setDate(d.getDate() + 7);
                else if (bill.frequency === 'bi-weekly') d.setDate(d.getDate() + 14);
                else if (bill.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
                else if (bill.frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
                else if (bill.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
                else d.setDate(d.getDate() + 1);
                
                currentDate = d.toISOString().split('T')[0];
              }

              if (currentDate !== bill.dueDate) {
                await api.updateBill(bill.id, { dueDate: currentDate, paid: false });
                bill.dueDate = currentDate;
                bill.paid = false;
                madeChanges = true;
              }
            }
          }

          if (madeChanges) {
             loadedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }

          setEntries(loadedEntries);
          setBills([...loadedBills]);
          setHoldings(data.holdings || []);
          setDebts(data.debts || []);
          setPaymentHistory(data.paymentHistory || []);
          setAccounts(data.accounts || []);
          if (data.goals && data.goals.length > 0) {
            setGoal(data.goals[0]);
            setGoalId(data.goals[0].id);
          } else {
            // Create default goal
            const defaultGoal = await api.createGoal({ name: 'Emergency Fund', targetAmount: 500000, currentAmount: 120000 });
            setGoal(defaultGoal);
            setGoalId(defaultGoal.id);
          }
        } catch (e) {
          console.error("Failed to fetch ledger", e);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  const updateUserName = async (name: string) => {
    setUserName(name);
    try {
      await api.updateUser({ userName: name });
    } catch (e) {
      console.error(e);
    }
  };

  const updateCategoryBudgets = async (budgets: Record<string, number>) => {
    setCategoryBudgets(budgets);
    try {
      await api.updateUser({ categoryBudgets: budgets });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddEntry = async (newEntry: Omit<Entry, 'id'>) => {
    try {
      const created = await api.createEntry(newEntry);
      setEntries(prev => [created, ...prev]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditEntry = async (id: string, updated: Partial<Entry>) => {
    try {
      const updatedEntry = await api.updateEntry(id, updated);
      setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updatedEntry } : e));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await api.deleteEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBillPaid = async (id: string) => {
    const targetBill = bills.find(b => b.id === id);
    if (!targetBill) return;
    try {
      const updated = await api.updateBill(id, { paid: !targetBill.paid });
      setBills(prev => prev.map(b => b.id === id ? { ...b, paid: updated.paid } : b));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateBill = async (id: string, updated: Partial<Bill>) => {
    try {
      const result = await api.updateBill(id, updated);
      setBills(prev => prev.map(b => b.id === id ? { ...b, ...result } : b));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBill = async (newBill: Omit<Bill, 'id' | 'paid'>) => {
    try {
      const created = await api.createBill({ ...newBill, paid: false });
      setBills(prev => [created, ...prev]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBill = async (id: string) => {
    try {
      await api.deleteBill(id);
      setBills(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDebt = async (newDebt: Omit<Debt, 'id'>) => {
    try {
      const created = await api.createDebt(newDebt);
      setDebts(prev => [created, ...prev]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDebt = async (id: string, updated: Partial<Debt>) => {
    try {
      const updatedDebt = await api.updateDebt(id, updated);
      setDebts(prev => prev.map(d => d.id === id ? { ...d, ...updatedDebt } : d));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDebt = async (id: string) => {
    try {
      await api.deleteDebt(id);
      setDebts(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddHolding = async (holding: any) => {
    try {
      const created = await api.createHolding(holding);
      setHoldings(prev => [...prev, created]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateHolding = async (id: string, updated: any) => {
    try {
      const updatedHolding = await api.updateHolding(id, updated);
      setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updatedHolding } : h));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteHolding = async (id: string) => {
    try {
      await api.deleteHolding(id);
      setHoldings(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPaymentHistory = async (payment: Omit<PaymentHistory, 'id'>) => {
    try {
      const created = await api.createPaymentHistory(payment);
      setPaymentHistory(prev => [...prev, created]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAccount = async (account: Omit<Account, 'id'>) => {
    const newAccount = await api.createAccount(account);
    setAccounts(prev => [...prev, newAccount]);
  };

  const handleUpdateAccount = async (id: string, updated: Partial<Account>) => {
    try {
      const updatedAccount = await api.updateAccount(id, updated);
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updatedAccount } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await api.deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const updateGoalAmount = async (newAmount: number) => {
    const updatedGoal = { ...goal, currentAmount: newAmount };
    setGoal(updatedGoal);
    if (goalId) {
      try {
        await api.updateGoal(goalId, { currentAmount: newAmount });
      } catch (e) {
        console.error(e);
      }
    }
  };
  
  const handleSetGoal = (g: Goal) => {
    // We only support partial updates to the primary goal for simplicity, or we can update the whole thing.
    setGoal(g);
    if (goalId) {
       api.updateGoal(goalId, g).catch(console.error);
    }
  };

  const handleResetData = () => {
    alert("Workspace reset is disabled in cloud-sync mode.");
  };

  const handleExportJSON = () => {
    const fullLedgerData = {
      version: "2.6.25",
      userName,
      entries,
      bills,
      debts,
      goal,
      investmentsBalance,
      holdings
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(fullLedgerData, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `ledger_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const header = "Date,Type,Category,Name,Amount\n";
    const csvContent = entries.map(e => `${e.date},${e.type},${e.category},"${e.name}",${e.amount}`).join('\n');
    const fullCsv = header + csvContent;

    const blob = new Blob([fullCsv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = `ledger-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  const handleImportJSON = (jsonDataString: string): boolean => {
    alert("JSON import is temporarily disabled while Cloud sync is active.");
    return false;
  };

  const filteredEntries = entries.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q) ||
      (e.date || '').includes(q)
    );
  });

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            entries={filteredEntries}
            bills={bills}
            goal={goal}
            investmentsBalance={investmentsBalance}
            accounts={accounts}
            debts={debts}
            holdings={holdings}
            userName={userName}
            categoryBudgets={categoryBudgets}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onAddEntryClick={() => setIsAddModalOpen(true)}
            onToggleBillPaid={handleToggleBillPaid}
          />
        );
      case 'transactions':
        return (
          <ExpensesView
            entries={filteredEntries}
            onAddEntry={handleAddEntry}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
            isAddModalOpen={isAddModalOpen}
            setIsAddModalOpen={setIsAddModalOpen}
          />
        );
      case 'bills':
        return (
          <BillsView
            bills={bills}
            onAddBill={handleAddBill}
            onUpdateBill={handleUpdateBill}
            onDeleteBill={handleDeleteBill}
          />
        );
      case 'investments':
        return (
          <InvestmentsView
            entries={entries}
            investmentsBalance={investmentsBalance}
            setInvestmentsBalance={async (bal) => {
              setInvestmentsBalance(bal);
              api.updateUser({ investmentsBalance: bal }).catch(console.error);
            }}
            onAddTransaction={handleAddEntry}
            holdings={holdings}
            onAddHolding={handleAddHolding}
            onUpdateHolding={handleUpdateHolding}
            onDeleteHolding={handleDeleteHolding}
          />
        );
      case 'accounts':
        return (
          <AccountsView
            accounts={accounts}
            entries={entries}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        );
      case 'debts':
        return (
          <DebtsView
            debts={debts}
            entries={entries}
            paymentHistory={paymentHistory}
            onAddDebt={handleAddDebt}
            onUpdateDebt={handleUpdateDebt}
            onDeleteDebt={handleDeleteDebt}
            onAddTransaction={handleAddEntry}
            onAddPaymentHistory={handleAddPaymentHistory}
          />
        );
      case 'goals':
        return (
          <GoalsView
            primaryGoal={goal}
            setPrimaryGoal={handleSetGoal}
            onAddTransaction={handleAddEntry}
          />
        );
      case 'budgets':
        return (
          <BudgetsView
            categoryBudgets={categoryBudgets}
            setCategoryBudgets={updateCategoryBudgets}
            entries={entries}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            entries={filteredEntries}
            bills={bills}
          />
        );
      case 'settings':
        return (
          <SettingsView
            userName={userName}
            setUserName={updateUserName}
            bills={bills}
            onAddBill={handleAddBill}
            onDeleteBill={handleDeleteBill}
            onResetData={handleResetData}
            onImportJSON={handleImportJSON}
            onExportJSON={handleExportJSON}
            onExportCSV={handleExportCSV}
            theme={theme}
            setTheme={setTheme}
          />
        );
      default:
        return <div>Protcol View Error</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
        <div className="text-blue-600 font-medium text-sm animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-2xl shadow-sm space-y-6 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-6 shadow-sm flex items-center justify-center">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <h1 className="text-2xl font-sans font-semibold text-gray-900 dark:text-gray-50">Sign in to Ledger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed">
            Manage your personal finances with a clean, clear overview.
          </p>
          <button
            onClick={handleSignIn}
            className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-gray-950 text-gray-900 dark:text-gray-50 font-sans flex flex-col lg:flex-row antialiased">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Mobile Top Navbar (Floating HUD) */}
      <header className="print:hidden lg:hidden h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded-md"></div>
            <span className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50">Ledger</span>
          </div>
        </div>
        <div></div>
      </header>

      {/* Main Panel Frame */}
      <main className="flex-1 lg:pl-[240px] print:pl-0 min-w-0 flex flex-col">
        {/* Global Search Header */}
        <header className="print:hidden h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-14 lg:top-0 z-20 flex items-center px-4 md:px-6 lg:px-8 shrink-0">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input 
              type="text" 
              placeholder="Search entries, categories, or dates..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm"
            />
            {/* Search History Dropdown */}
            <AnimatePresence>
              {isSearchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden z-50"
                >
                  {searchHistory.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800/50">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Searches</span>
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            clearSearchHistory(e as any);
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                      <ul>
                        {searchHistory.map((historyItem, idx) => (
                          <li key={idx}>
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleHistorySelect(historyItem);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
                            >
                              <Clock size={14} className="text-gray-400" />
                              <span>{historyItem}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800/50">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Common Queries</span>
                      </div>
                      <ul>
                        {['Food', 'Shopping', 'Investment', 'Bills'].map((query, idx) => (
                          <li key={idx}>
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleHistorySelect(query);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
                            >
                              <Search size={14} className="text-gray-400" />
                              <span>{query}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1200px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
