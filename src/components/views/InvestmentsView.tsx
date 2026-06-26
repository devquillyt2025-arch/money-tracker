import React, { useState, useEffect } from 'react';
import { Entry } from '../../types';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Briefcase, 
  Layers,
  ArrowUpRight,
  ShieldAlert,
  PlusCircle,
  X
} from 'lucide-react';

interface InvestmentHolding {
  id: string;
  name: string;
  category: 'Equity' | 'Mutual Fund' | 'Gold/Commodities' | 'Govt Debt' | 'Cash Equivalent';
  investedAmount: number;
  currentValue: number;
  units?: number;
}

interface InvestmentsViewProps {
  entries: Entry[];
  investmentsBalance: number;
  setInvestmentsBalance: (balance: number) => void;
  onAddTransaction: (entry: Omit<Entry, 'id'>) => void;
  holdings: InvestmentHolding[];
  onAddHolding: (holding: Omit<InvestmentHolding, 'id'>) => void;
  onUpdateHolding: (id: string, updated: Partial<InvestmentHolding>) => void;
  onDeleteHolding: (id: string) => void;
}

export default function InvestmentsView({
  entries,
  investmentsBalance,
  setInvestmentsBalance,
  onAddTransaction,
  holdings,
  onAddHolding,
  onUpdateHolding,
  onDeleteHolding
}: InvestmentsViewProps) {
  
  // Keep investmentsBalance in sync with the total currentValue of holdings
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
  const totalCurrent = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGain = totalCurrent - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  useEffect(() => {
    // Update the parent's investment state so the Dashboard stats are perfectly calculated
    setInvestmentsBalance(totalCurrent);
  }, [totalCurrent, setInvestmentsBalance]);

  // Form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<InvestmentHolding['category']>('Equity');
  const [formInvested, setFormInvested] = useState('');
  const [formCurrent, setFormCurrent] = useState('');
  const [formError, setFormError] = useState('');

  // Recording SIP purchase trigger states
  const [isLogSIPOpen, setIsLogSIPOpen] = useState(false);
  const [sipName, setSipName] = useState('Nifty 50 Index SIP Contribution');
  const [sipAmount, setSipAmount] = useState('35000');

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const invested = parseFloat(formInvested);
    const current = parseFloat(formCurrent);

    if (!formName.trim()) {
      setFormError('Please input a valid asset instrument name.');
      return;
    }
    if (isNaN(invested) || invested <= 0 || isNaN(current) || current <= 0) {
      setFormError('Amounts must be positive values.');
      return;
    }

    try {
      onAddHolding({
        name: formName.trim(),
        category: formCategory,
        investedAmount: Math.round(invested),
        currentValue: Math.round(current)
      });

      onAddTransaction({
        name: `Asset Buy: ${formName.trim()}`,
        category: 'Investment',
        amount: Math.round(invested),
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      });

      setFormName('');
      setFormInvested('');
      setFormCurrent('');
      setIsAddOpen(false);
    } catch (e) {
      console.error(e);
      setFormError('Failed to create holding.');
    }
  };

  const handleDeleteHolding = async (id: string, name: string, val: number) => {
    if (confirm(`Do you wish to liquidate ${name} from your portfolio tracking? This will remove it from the visual records.`)) {
      try {
        onDeleteHolding(id);
        
        onAddTransaction({
          name: `Asset Liquidation: ${name}`,
          category: 'Investment',
          amount: Math.round(val),
          type: 'income',
          date: new Date().toISOString().split('T')[0]
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLogSIP = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(sipAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      for (const h of holdings) {
        if (h.category === 'Mutual Fund') {
          onUpdateHolding(h.id, {
            investedAmount: h.investedAmount + amt,
            currentValue: h.currentValue + amt
          });
        }
      }

      onAddTransaction({
        name: sipName,
        category: 'Investment',
        amount: Math.round(amt),
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      });

      setIsLogSIPOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Category Colors
  const getCatColor = (category: InvestmentHolding['category']) => {
    switch (category) {
      case 'Equity': return '#E0BD7D'; // Gold
      case 'Mutual Fund': return '#6FAE98'; // Sage
      case 'Gold/Commodities': return '#A8895A'; // Bronze
      case 'Govt Debt': return '#8B8680'; // Muted
      default: return '#3A3E46';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER ROW */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <span className="font-sans text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Portfolio Monitor
          </span>
          <h1 className="font-sans font-semibold text-xl text-gray-900 dark:text-gray-50 mt-0.5 tracking-tight">
            Asset & Investments Desk
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsLogSIPOpen(true)}
            className="flex items-center gap-2 text-sm font-sans text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:bg-blue-900/40 font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Percent size={16} /> Execute SIP
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 text-sm font-sans text-white bg-blue-600 hover:bg-blue-700 font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} /> Allocate Asset
          </button>
        </div>
      </div>

      {/* 2. OVERVIEW ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Cost Basis */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl flex flex-col justify-between">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Portfolio Cost Basis
          </span>
          <div className="mt-2 flex flex-col gap-1">
            <span className="font-sans text-2xl font-bold text-gray-900 dark:text-gray-50">
              ₹{totalInvested.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-sans font-medium uppercase tracking-wider mt-1">
              <Briefcase size={12} /> Active Capital At Work
            </div>
          </div>
        </div>

        {/* Current Market valuation */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl flex flex-col justify-between">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Current Market Valuation
          </span>
          <div className="mt-2 flex flex-col gap-1">
            <span className="font-sans text-2xl font-bold text-gray-900 dark:text-gray-50">
              ₹{totalCurrent.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-blue-600 font-sans font-medium uppercase tracking-wider mt-1">
              <Layers size={12} /> Priced via live ledger
            </div>
          </div>
        </div>

        {/* Absolute Performance Yield */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 rounded-2xl flex flex-col justify-between">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Total Capital Gain / Yield
          </span>
          <div className="mt-2 flex flex-col gap-1">
            <span className={`font-sans text-2xl font-bold ${totalGain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalGain >= 0 ? '+' : ''}₹{totalGain.toLocaleString('en-IN')}
            </span>
            <div className={`flex items-center gap-1 text-xs font-sans font-medium mt-1 ${totalGain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalGain >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{totalGainPercent.toFixed(2)}% absolute ROI</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. HOLDINGS GRID */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-800/50/50 flex justify-between items-center">
          <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
            Asset Holdings Ledger
          </h3>
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            {holdings.length} active positions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800/50 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-sans bg-white dark:bg-gray-900">
                <th className="py-3 px-5 font-semibold">Asset Instrument</th>
                <th className="py-3 px-5 font-semibold">Category</th>
                <th className="py-3 px-5 font-semibold text-right">Invested</th>
                <th className="py-3 px-5 font-semibold text-right">Market Value</th>
                <th className="py-3 px-5 font-semibold text-right">Gain / Loss</th>
                <th className="py-3 px-5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-sans text-sm">
              {holdings.map((hold) => {
                const gain = hold.currentValue - hold.investedAmount;
                const gainPct = hold.investedAmount > 0 ? (gain / hold.investedAmount) * 100 : 0;
                return (
                  <tr key={hold.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50/50 transition-colors">
                    <td className="py-4 px-5 text-gray-900 dark:text-gray-50 font-semibold">
                      <div>
                        {hold.name}
                        {hold.units && (
                          <span className="block font-sans text-[10px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                            QTY: {hold.units} units
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs">
                      <span 
                        className="px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider font-semibold"
                        style={{ 
                          color: getCatColor(hold.category), 
                          borderColor: `${getCatColor(hold.category)}33`,
                          backgroundColor: `${getCatColor(hold.category)}0D`
                        }}
                      >
                        {hold.category}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
                      ₹{hold.investedAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-5 text-right text-gray-900 dark:text-gray-50 font-bold">
                      ₹{hold.currentValue.toLocaleString('en-IN')}
                    </td>
                    <td className={`py-4 px-5 text-right font-semibold ${gain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      <div>{gain >= 0 ? '+' : ''}₹{gain.toLocaleString('en-IN')}</div>
                      <span className="text-[10px] opacity-80">{gainPct.toFixed(1)}%</span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => handleDeleteHolding(hold.id, hold.name, hold.currentValue)}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:text-red-400 rounded-md hover:bg-gray-100 dark:bg-gray-800 transition-colors"
                        title="Liquidate/Remove holding"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {holdings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                    No active assets registered. Allocate capital above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODALS */}

      {/* SIP MODAL */}
      {isLogSIPOpen && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 px-5 py-4">
              <span className="font-sans text-sm text-gray-900 dark:text-gray-50 font-semibold tracking-wide">
                Execute SIP Injection
              </span>
              <button onClick={() => setIsLogSIPOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLogSIP} className="p-5 space-y-5 font-sans">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 text-blue-700 dark:text-blue-400 text-xs rounded-xl leading-relaxed">
                <ShieldAlert size={16} className="inline mr-1 text-blue-600 mb-0.5" />
                This executes your recurring Index SIP allocation of <b className="text-blue-700 dark:text-blue-400 font-semibold">₹35,000</b>. It will increase the principal balance of mutual funds and debit from your monthly accounts.
              </div>
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  SIP Label Particular
                </label>
                <input
                  type="text"
                  value={sipName}
                  onChange={(e) => setSipName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                />
              </div>
              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogSIPOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50 text-sm font-sans font-medium text-gray-700 dark:text-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Execute SIP Buy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE ASSET MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 px-5 py-4">
              <span className="font-sans text-sm text-gray-900 dark:text-gray-50 font-semibold tracking-wide">
                Allocate Capital Desk
              </span>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddHolding} className="p-5 space-y-5 font-sans">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                  Error: {formError}
                </div>
              )}

              {/* Asset Name */}
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Asset Instrument / Stock / Fund Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apple, Index Fund, Physical Gold..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all"
                />
              </div>

              {/* Asset Class */}
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                  Asset Class Classification
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-gray-900 dark:text-gray-50 outline-none transition-all"
                >
                  <option value="Equity">Direct Shares / Equity</option>
                  <option value="Mutual Fund">Mutual Fund Portfolio</option>
                  <option value="Gold/Commodities">Commodities / Physical Gold</option>
                  <option value="Govt Debt">Government Bonds / Fixed Yield</option>
                  <option value="Cash Equivalent">Cash / Liquid Reserves</option>
                </select>
              </div>

              {/* Invested and Current value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Invested Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Principal value"
                    value={formInvested}
                    onChange={(e) => setFormInvested(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1.5">
                    Current Valuation (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Latest value"
                    value={formCurrent}
                    onChange={(e) => setFormCurrent(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl font-sans text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Help tip */}
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed italic">
                * Note: Registering an asset will automatically log a corresponding acquisition item under 'Investment' in your primary Ledger feed to balance your book flows.
              </p>

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50 text-sm font-sans font-medium text-gray-700 dark:text-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Save Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
