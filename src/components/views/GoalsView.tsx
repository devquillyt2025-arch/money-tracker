import React, { useState, useEffect, useMemo } from 'react';
import { Goal, Entry } from '../../types';
import { 
  Target, 
  Plus, 
  Trash2, 
  DollarSign, 
  ArrowRight, 
  Calendar, 
  CheckCircle, 
  Layers,
  ChevronRight,
  ShieldCheck,
  X,
  Check,
  Pin
} from 'lucide-react';
import Select from '../Select';

interface AuxiliaryGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
}

interface GoalsViewProps {
  primaryGoal: Goal;
  setPrimaryGoal: (goal: Goal) => void;
  onAddTransaction: (entry: Omit<Entry, 'id'>) => void;
}

export default function GoalsView({
  primaryGoal,
  setPrimaryGoal,
  onAddTransaction
}: GoalsViewProps) {
  
  // Auxiliary goals loaded from localStorage
  const [auxGoals, setAuxGoals] = useState<AuxiliaryGoal[]>(() => {
    const saved = localStorage.getItem('ledger_auxiliary_goals');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: "aux-1",
        name: "Liquid Emergency Safety Vault",
        targetAmount: 200000,
        currentAmount: 180000,
        deadline: "2026-12-31",
        category: "Safety"
      },
      {
        id: "aux-2",
        name: "Offshore Real Estate Deposit",
        targetAmount: 1500000,
        currentAmount: 650000,
        deadline: "2027-06-30",
        category: "Assets"
      },
      {
        id: "aux-3",
        name: "Supercharged Workstation Pool",
        targetAmount: 120000,
        currentAmount: 85000,
        deadline: "2026-09-15",
        category: "Equipment"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('ledger_auxiliary_goals', JSON.stringify(auxGoals));
  }, [auxGoals]);

  // Form states
  const [pinnedGoalId, setPinnedGoalId] = useState<string | null>('primary');
  const [isEditPrimaryOpen, setIsEditPrimaryOpen] = useState(false);
  const [primaryName, setPrimaryName] = useState(primaryGoal.name);
  const [primaryTarget, setPrimaryTarget] = useState(String(primaryGoal.targetAmount));
  const [primaryCurrent, setPrimaryCurrent] = useState(String(primaryGoal.currentAmount));
  const [primaryDeadline, setPrimaryDeadline] = useState(primaryGoal.deadline || '');

  const [isAddAuxOpen, setIsAddAuxOpen] = useState(false);
  const [editingAuxId, setEditingAuxId] = useState<string | null>(null);
  const [auxName, setAuxName] = useState('');
  const [auxTarget, setAuxTarget] = useState('');
  const [auxCurrent, setAuxCurrent] = useState('');
  const [auxDeadline, setAuxDeadline] = useState('2026-12-31');
  const [auxCategory, setAuxCategory] = useState('Assets');
  const [auxError, setAuxError] = useState('');

  const openAddAuxModal = () => {
    setEditingAuxId(null);
    setAuxName('');
    setAuxTarget('');
    setAuxCurrent('');
    setAuxDeadline('2026-12-31');
    setAuxCategory('Assets');
    setIsAddAuxOpen(true);
  };

  // Contribution State
  const [isContribOpen, setIsContribOpen] = useState(false);
  const [contribType, setContribType] = useState<'primary' | string>('primary'); // 'primary' or auxGoal.id
  const [contribAmount, setContribAmount] = useState('');
  const [contribError, setContribError] = useState('');

  const handleUpdatePrimary = (e: React.FormEvent) => {
    e.preventDefault();
    const tgt = parseFloat(primaryTarget);
    const cur = parseFloat(primaryCurrent);

    if (!primaryName.trim() || isNaN(tgt) || tgt <= 0 || isNaN(cur) || cur < 0) {
      return;
    }

    setPrimaryGoal({
      ...primaryGoal,
      name: primaryName.trim(),
      targetAmount: Math.round(tgt),
      currentAmount: Math.round(cur),
      deadline: primaryDeadline || undefined
    });
    setIsEditPrimaryOpen(false);
  };

  const handleAddAux = (e: React.FormEvent) => {
    e.preventDefault();
    setAuxError('');

    const tgt = parseFloat(auxTarget);
    const cur = parseFloat(auxCurrent);

    if (!auxName.trim()) {
      setAuxError('Please input a target name.');
      return;
    }
    if (isNaN(tgt) || tgt <= 0 || isNaN(cur) || cur < 0) {
      setAuxError('Amounts must be valid positive numbers.');
      return;
    }
    if (cur > tgt) {
      setAuxError('Starting Amount cannot exceed Target Amount.');
      return;
    }

    const newAux: AuxiliaryGoal = {
      id: editingAuxId || `aux-${Date.now()}`,
      name: auxName.trim(),
      targetAmount: Math.round(tgt),
      currentAmount: Math.round(cur),
      deadline: auxDeadline,
      category: auxCategory
    };

    if (editingAuxId) {
      setAuxGoals(auxGoals.map(g => g.id === editingAuxId ? newAux : g));
    } else {
      setAuxGoals([...auxGoals, newAux]);
    }

    setAuxName('');
    setAuxTarget('');
    setAuxCurrent('');
    setEditingAuxId(null);
    setIsAddAuxOpen(false);
  };

  const handleDeleteAux = (id: string) => {
    if (confirm('Delete this savings target allocation? Current values will not be returned to cash records.')) {
      setAuxGoals(auxGoals.filter(g => g.id !== id));
    }
  };

  const handleContribSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContribError('');

    const amt = parseFloat(contribAmount);
    if (isNaN(amt) || amt <= 0) {
      setContribError('Enter a positive contribution amount.');
      return;
    }

    if (contribType === 'primary') {
      // Primary Goal Contribution
      setPrimaryGoal({
        ...primaryGoal,
        currentAmount: primaryGoal.currentAmount + amt
      });

      // Log as ledger transaction (expense -> going into savings asset)
      onAddTransaction({
        name: `Cap Contrib: ${primaryGoal.name}`,
        category: 'Investment',
        amount: Math.round(amt),
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      });

    } else {
      // Auxiliary Goal Contribution
      const targetAux = auxGoals.find(g => g.id === contribType);
      if (!targetAux) return;

      const updated = auxGoals.map(g => {
        if (g.id === contribType) {
          return { ...g, currentAmount: g.currentAmount + amt };
        }
        return g;
      });
      setAuxGoals(updated);

      // Log transaction
      onAddTransaction({
        name: `Cap Contrib: ${targetAux.name}`,
        category: 'Investment',
        amount: Math.round(amt),
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
    }

    setContribAmount('');
    setIsContribOpen(false);
  };

  const sortedGoals = useMemo(() => {
    const arr = [
      { ...primaryGoal, id: 'primary', category: 'Primary Accumulation Target', isPrimary: true },
      ...auxGoals.map(g => ({ ...g, isPrimary: false }))
    ];
    if (!pinnedGoalId) return arr;
    const pinned = arr.find(g => g.id === pinnedGoalId);
    const unpinned = arr.filter(g => g.id !== pinnedGoalId);
    return pinned ? [pinned, ...unpinned] : arr;
  }, [primaryGoal, auxGoals, pinnedGoalId]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <span className="font-semibold uppercase tracking-wider text-sm text-gray-500 mb-3 block">
            Capital Targets Board
          </span>
          <h1 className="font-sans font-semibold text-xl text-gray-900 dark:text-gray-50 mt-0.5 tracking-tight">
            Active Financial Goals
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setContribType('primary');
              setIsContribOpen(true);
            }}
            className="flex items-center gap-2 text-sm font-sans text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:bg-blue-900/40 font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Layers size={16} /> Contribute
          </button>
          <button
            onClick={openAddAuxModal}
            className="flex items-center gap-2 text-sm font-sans text-white bg-blue-600 hover:bg-blue-700 font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} /> Initialize Goal
          </button>
        </div>
      </div>

      {/* 2. UNIFIED DASHBOARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedGoals.map((g) => {
          const isPinned = pinnedGoalId === g.id;
          const isPrimary = g.isPrimary;
          const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
          const isCompleted = pct >= 100;
          
          let requiredDailySavings: number | null = null;
          let remainingDays: number | null = null;
          if (isPinned && g.deadline && g.currentAmount < g.targetAmount) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadlineDate = new Date(g.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            const diffTime = deadlineDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
              remainingDays = diffDays;
              requiredDailySavings = (g.targetAmount - g.currentAmount) / diffDays;
            }
          }

          return (
            <div 
              key={g.id}
              className={`bg-white dark:bg-gray-900 border transition-all duration-300 ease-in-out shadow-sm hover:shadow-lg rounded-2xl relative overflow-hidden ${
                isPinned ? 'col-span-1 sm:col-span-2 lg:col-span-3 p-6' : 'col-span-1 py-4 px-6'
              } ${
                !isPinned && isCompleted
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:border-blue-800'
              }`}
            >
              {/* Pin Button common to both layouts */}
              <div className="absolute top-3 right-3 z-20 flex gap-2 items-center">
                {isPinned && (
                  <button
                    onClick={() => {
                      if (isPrimary) {
                        setPrimaryName(primaryGoal.name);
                        setPrimaryTarget(String(primaryGoal.targetAmount));
                        setPrimaryCurrent(String(primaryGoal.currentAmount));
                        setIsEditPrimaryOpen(true);
                      } else {
                        setAuxName(g.name);
                        setAuxTarget(String(g.targetAmount));
                        setAuxCurrent(String(g.currentAmount));
                        setAuxDeadline(g.deadline || '');
                        setAuxCategory(g.category || 'Assets');
                        setEditingAuxId(g.id);
                        setIsAddAuxOpen(true);
                      }
                    }}
                    className="text-xs font-sans text-gray-500 dark:text-gray-400 hover:text-blue-600 border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:border-blue-800 hover:bg-gray-50 transition-colors duration-200 dark:hover:bg-gray-800/80 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg font-medium"
                  >
                    Edit Parameters
                  </button>
                )}
                <div 
                  onClick={() => setPinnedGoalId(prev => prev === g.id ? null : g.id)}
                  className={`p-1.5 rounded-full transition-colors duration-200 cursor-pointer ${
                    isPinned ? 'bg-gray-100 text-blue-600 dark:bg-gray-800' : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-800'
                  }`}
                  title={isPinned ? "Unpin Goal" : "Pin Goal"}
                >
                  <Pin size={18} className={isPinned ? 'fill-blue-600' : ''} />
                </div>
              </div>

              {isPinned ? (
                /* EXPANDED PINNED LAYOUT */
                <div className="flex flex-col h-full w-full">
                  <div className="flex justify-between items-start">
                    <div className="pr-20">
                      <span className="font-sans text-xs text-blue-600 uppercase tracking-widest font-bold block mb-1">
                        {g.category}
                      </span>
                      <div className="flex flex-col gap-1 mt-1.5">
                        <h2 className="font-sans font-bold text-2xl text-gray-900 dark:text-gray-50 flex items-center gap-3">
                          {g.name}
                          {g.deadline && (
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
                              <Calendar size={14} /> {g.deadline}
                            </span>
                          )}
                        </h2>
                        {requiredDailySavings !== null && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            Requires <span className="font-bold text-gray-900 dark:text-gray-50">₹{Math.ceil(requiredDailySavings).toLocaleString('en-IN')}</span>/day savings to hit target in {remainingDays} days
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex justify-center md:justify-start relative shrink-0">
                      <div className="relative w-24 h-24 md:w-[120px] md:h-[120px]">
                        <svg viewBox="0 0 120 120" className="transform -rotate-90 w-full h-full">
                          <circle cx="60" cy="60" r="52" strokeWidth="12" className="stroke-gray-100 dark:stroke-gray-800 fill-none" />
                          <circle
                            cx="60" cy="60" r="52" strokeWidth="12"
                            className="stroke-blue-600 fill-none transition-all duration-1000 ease-out"
                            strokeDasharray="326.7"
                            strokeDashoffset={326.7 - (326.7 * pct) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-sans text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                            {pct}%
                          </span>
                          <span className="font-sans text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mt-0.5">
                            Funded
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 mb-2">
                        <div>
                          <span className="block font-sans text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                            Accumulated Balance
                          </span>
                          <span className="font-sans text-3xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                            ₹{g.currentAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="sm:text-right">
                          <span className="block font-sans text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                            Target Capital
                          </span>
                          <span className="font-sans text-xl font-semibold text-gray-700 dark:text-gray-300">
                            ₹{g.targetAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 relative">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="relative mt-6 pt-2 pb-1 border-t border-gray-100 dark:border-gray-800/50">
                        <div className="flex w-full justify-between text-xs text-gray-500 mt-2 relative z-10">
                          {[25, 50, 75, 100].map(milestone => {
                            const isReached = pct >= milestone;
                            return (
                              <div key={milestone} className="flex flex-col items-center">
                                <div 
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                                    isReached ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  {isReached ? <Check size={12} strokeWidth={3} /> : `${milestone}%`}
                                </div>
                                <span className={`mt-1 ${isReached ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                                  ₹{Math.round(g.targetAmount * (milestone / 100)).toLocaleString('en-IN')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="absolute top-5 left-4 right-4 h-[2px] bg-gray-100 dark:bg-gray-800 -z-10" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* COMPACT LAYOUT */
                <div className="flex flex-col h-full justify-between pt-1">
                  <div className="flex justify-between items-start">
                    <div className="overflow-hidden pr-8">
                      <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                        {g.category}
                      </span>
                      <h4 
                        className="font-sans font-semibold text-gray-900 dark:text-gray-50 mt-2 truncate whitespace-nowrap overflow-hidden text-ellipsis"
                        title={g.name}
                      >
                        {g.name}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-3 shrink-0">
                    {isPrimary ? (
                      <button
                        onClick={() => {
                          setPrimaryName(primaryGoal.name);
                          setPrimaryTarget(String(primaryGoal.targetAmount));
                          setPrimaryCurrent(String(primaryGoal.currentAmount));
                          setIsEditPrimaryOpen(true);
                        }}
                        className="text-xs font-sans font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 px-2 py-1 rounded"
                        title="Edit primary goal parameters"
                      >
                        Edit
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setAuxName(g.name);
                          setAuxTarget(String(g.targetAmount));
                          setAuxCurrent(String(g.currentAmount));
                          setAuxDeadline(g.deadline || '');
                          setAuxCategory(g.category || 'Assets');
                          setEditingAuxId(g.id);
                          setIsAddAuxOpen(true);
                        }}
                        className="text-xs font-sans font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 px-2 py-1 rounded"
                        title="Edit goal"
                      >
                        Edit
                      </button>
                    )}
                    <span className="text-gray-200 dark:text-gray-700">|</span>
                    <button
                      onClick={() => {
                        setContribType(g.id);
                        setContribAmount('');
                        setIsContribOpen(true);
                      }}
                      className="text-xs font-sans font-medium text-blue-600 hover:text-blue-800 dark:text-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 px-2 py-1 rounded"
                      title="Contribute to goal"
                    >
                      Deposit
                    </button>
                    {!isPrimary && (
                      <>
                        <span className="text-gray-200 dark:text-gray-700">|</span>
                        <button
                          onClick={() => handleDeleteAux(g.id)}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors cursor-pointer focus:ring-2 focus:ring-red-500 rounded p-1"
                          title="Delete goal"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Progress details */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between items-center font-sans text-xs font-medium">
                      <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Progress</span>
                      <span className={isCompleted ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-900 dark:text-gray-50'}>
                        ₹{g.currentAmount.toLocaleString('en-IN')} / ₹{g.targetAmount.toLocaleString('en-IN')} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {g.deadline && (
                      <div className="flex justify-between items-center w-full mt-4">
                        <span className="text-gray-500 text-xs">Target by: {g.deadline}</span>
                        {!isCompleted && Math.round(g.targetAmount - g.currentAmount) > 0 && (
                          <span className="text-gray-500 text-xs">₹{Math.round((g.targetAmount - g.currentAmount))} remaining</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. MODALS */}

      {/* EDIT PRIMARY MODAL */}
      {isEditPrimaryOpen && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 px-5 py-4">
              <span className="font-sans text-sm text-gray-900 dark:text-gray-50 font-semibold tracking-wide">
                Edit Primary Target
              </span>
              <button onClick={() => setIsEditPrimaryOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdatePrimary} className="p-5 space-y-5 font-sans">
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Goal / Fund Name
                </label>
                <input
                  type="text"
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Target Capital (₹)
                  </label>
                  <input
                    type="number"
                    value={primaryTarget}
                    onChange={(e) => setPrimaryTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Current Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={primaryCurrent}
                    onChange={(e) => setPrimaryCurrent(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={primaryDeadline}
                  onChange={(e) => setPrimaryDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>
              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditPrimaryOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50 text-sm font-sans font-medium text-gray-700 dark:text-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTRIBUTE CAPITAL MODAL */}
      {isContribOpen && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 px-5 py-4">
              <span className="font-sans text-sm text-gray-900 dark:text-gray-50 font-semibold tracking-wide">
                Contribute to Goal
              </span>
              <button onClick={() => setIsContribOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleContribSubmit} className="p-5 space-y-5 font-sans">
              {contribError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 font-medium">
                  {contribError}
                </div>
              )}

              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Destination Fund
                </label>
                <Select
                  value={contribType}
                  onChange={(e) => setContribType(e.target.value)}
                  options={[
                    { value: 'primary', label: `Primary: ${primaryGoal.name} (₹${primaryGoal.currentAmount.toLocaleString('en-IN')})` },
                    ...auxGoals.map(g => ({ value: g.id, label: `${g.name} (₹${g.currentAmount.toLocaleString('en-IN')})` })),
                  ]}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Deposit Contribution Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
                Note: Depositing savings capital will add a recorded expenditure entry named 'Cap Contrib' in your core transactions ledger.
              </p>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsContribOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50 text-sm font-sans font-medium text-gray-700 dark:text-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Deposit Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INITIALIZE AUXILIARY GOAL MODAL */}
      {isAddAuxOpen && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 px-5 py-4">
              <span className="font-sans text-sm text-gray-900 dark:text-gray-50 font-semibold tracking-wide">
                {editingAuxId ? 'Edit Auxiliary Goal' : 'Initialize Auxiliary Goal'}
              </span>
              <button onClick={() => setIsAddAuxOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddAux} className="p-5 space-y-6 font-sans">
              {auxError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 font-medium">
                  {auxError}
                </div>
              )}

              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Savings Goal Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Next-gen Compute Cluster..."
                  value={auxName}
                  onChange={(e) => setAuxName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-y-0 gap-x-6">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Target Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100000"
                    value={auxTarget}
                    onChange={(e) => setAuxTarget(e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border ${auxError.includes('Amount') ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'} focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all`}
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Starting Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={auxCurrent}
                    onChange={(e) => setAuxCurrent(e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border ${auxError.includes('Amount') ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'} focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-y-0 gap-x-6">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Category
                  </label>
                  <Select
                    value={auxCategory}
                    onChange={(e) => setAuxCategory(e.target.value)}
                    options={[
                      { value: 'Assets', label: 'Assets' },
                      { value: 'Safety', label: 'Safety/Emergency' },
                      { value: 'Equipment', label: 'Equipment' },
                      { value: 'Travel', label: 'Travel' },
                    ]}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={auxDeadline}
                    onChange={(e) => setAuxDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddAuxOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50 text-sm font-sans font-medium text-gray-700 dark:text-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
