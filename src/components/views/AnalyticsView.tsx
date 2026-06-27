import React, { useState, useMemo } from 'react';
import { Entry, Bill } from '../../types';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Flame, 
  Percent, 
  Layers,
  ArrowUpRight,
  TrendingDown,
  Info,
  Calendar,
  Printer
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';
import Select from '../Select';

interface AnalyticsViewProps {
  entries: Entry[];
  bills: Bill[];
}

const HeatmapShape = (props: any) => {
  const { cx, cy, payload, maxDailyAmount } = props;
  const amount = payload.amount || 0;
  
  // Calculate intensity based on amount vs max
  const intensity = maxDailyAmount > 0 ? amount / maxDailyAmount : 0;
  
  let fill = '#374151'; // empty day color for dark mode (will override with opacity below)
  let opacity = 0.1;
  
  if (amount > 0) {
     fill = '#6FAE98'; // using our primary green shade
     opacity = Math.max(0.2, intensity); 
  }
  
  return (
    <rect 
      x={cx - 15} 
      y={cy - 15} 
      width={30} 
      height={30} 
      fill={fill} 
      fillOpacity={opacity}
      rx={4}
    />
  );
};

export default function AnalyticsView({ entries, bills = [] }: AnalyticsViewProps) {
  // Extract all unique months from entries
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    entries.forEach(e => {
      if (e.date && e.date.length >= 7) {
        months.add(e.date.substring(0, 7));
      }
    });
    const sorted = Array.from(months).sort((a, b) => b.localeCompare(a));
    // Default to at least one month if empty
    return sorted.length > 0 ? sorted : ["2026-06"];
  }, [entries]);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0]);

  // --- CALCULATIONS ---
  const currentMonthPrefix = selectedMonth;
  
  // Compute previous month
  const previousMonthPrefix = useMemo(() => {
    const [yearStr, monthStr] = currentMonthPrefix.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    return `${y}-${m.toString().padStart(2, '0')}`;
  }, [currentMonthPrefix]);
  
  const totalBillsAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);

  // 1. Total & Monthly Cashflows
  const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + (e.amount || 0), 0) + totalBillsAmount;
  
  const currentMonthIncome = entries
    .filter(e => e.type === 'income' && e.date.startsWith(currentMonthPrefix))
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const currentMonthExpense = entries
    .filter(e => e.type === 'expense' && e.date.startsWith(currentMonthPrefix))
    .reduce((sum, e) => sum + (e.amount || 0), 0) + totalBillsAmount;

  // 2. Savings Rate: (Income - Expense) / Income
  const totalSavings = totalIncome - totalExpense;
  const totalSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  
  const currentMonthSavings = currentMonthIncome - currentMonthExpense;
  const currentMonthSavingsRate = currentMonthIncome > 0 ? (currentMonthSavings / currentMonthIncome) * 100 : 0;

  // 3. Average Monthly Burn (Expense) over the active months in dataset
  const expensesByMonth: Record<string, number> = {};
  entries.filter(e => e.type === 'expense').forEach(e => {
    const month = e.date.substring(0, 7);
    expensesByMonth[month] = (expensesByMonth[month] || 0) + (e.amount || 0);
  });

  const uniqueMonths = Array.from(new Set(Object.keys(expensesByMonth)));
  const totalMonthsCount = Math.max(1, uniqueMonths.length);
  const avgMonthlyBurn = totalExpense / totalMonthsCount;
  
  // Chart Data Preparation
  const sortedMonths = uniqueMonths.sort();
  const chartData = sortedMonths.map(month => ({
    month,
    historical: expensesByMonth[month] + totalBillsAmount, // include recurring bills in historical view
    projected: null as number | null
  }));

  // Simple linear regression: y = mx + b for trend projection
  let m = 0;
  let b = sortedMonths.length > 0 
    ? (sortedMonths.reduce((sum, m) => sum + expensesByMonth[m], 0) / sortedMonths.length) + totalBillsAmount 
    : 0; // fallback to average

  if (sortedMonths.length > 1) {
    const n = sortedMonths.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    sortedMonths.forEach((month, index) => {
      const y = expensesByMonth[month] + totalBillsAmount;
      sumX += index;
      sumY += y;
      sumXY += index * y;
      sumX2 += index * index;
    });

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator !== 0) {
      m = (n * sumXY - sumX * sumY) / denominator;
      b = (sumY - m * sumX) / n;
    }
  }

  const lastMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : currentMonthPrefix;
  
  const projectedData = [];
  let currentYear = parseInt(lastMonth.substring(0, 4));
  let currentM = parseInt(lastMonth.substring(5, 7));

  for (let i = 1; i <= 3; i++) {
    currentM++;
    if (currentM > 12) {
      currentM = 1;
      currentYear++;
    }
    const nextMonthStr = `${currentYear}-${currentM.toString().padStart(2, '0')}`;
    
    const nextIndex = sortedMonths.length - 1 + i;
    let projectedValue = m * nextIndex + b;
    projectedValue = Math.max(0, projectedValue); // floor at 0

    projectedData.push({
      month: nextMonthStr,
      historical: null,
      projected: projectedValue
    });
  }

  // Connect junction
  if (chartData.length > 0) {
    chartData[chartData.length - 1].projected = chartData[chartData.length - 1].historical;
  }

  const finalChartData = [...chartData, ...projectedData];

  // 4. Category-wise expenditure (for June 2026)
  const categoriesList = Array.from(new Set([
    'Food & Grocery',
    'Shopping',
    'Travel',
    'Bills & Subscription',
    'Investment',
    'Miscellaneous',
    ...entries.map(e => e.category)
  ]));

  // Calculate historical proportion for each category to estimate next month's breakdown
  const nextMonthProjectedTotal = projectedData[0]?.projected || 0;
  const historicalTotalForProportions = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0) + (totalBillsAmount * Math.max(1, sortedMonths.length));
  
  const projectedCategoryData = categoriesList.map(cat => {
    const catTotal = entries
      .filter(e => e.type === 'expense' && e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    const catBillsTotal = bills
      .filter(b => (b.category || 'Bills & Subscription') === cat || (cat === 'Bills & Subscription' && !b.category))
      .reduce((sum, b) => sum + (b.amount || 0), 0);
      
    const catHistoricalTotal = catTotal + (catBillsTotal * Math.max(1, sortedMonths.length));
    const proportion = historicalTotalForProportions > 0 ? catHistoricalTotal / historicalTotalForProportions : 0;
    
    return { name: cat, projected: Math.round(nextMonthProjectedTotal * proportion) };
  }).filter(c => c.projected > 0).sort((a, b) => b.projected - a.projected);

  const categoryExpenses = categoriesList.map(cat => {
    let amount = entries
      .filter(e => e.type === 'expense' && e.category === cat && e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Add bills belonging to this category (case insensitive mapping or just equal mapping)
    // Default formCategory for bills was 'Housing' or 'Bills & Subscription'
    const catBillsAmount = bills
      .filter(b => (b.category || 'Bills & Subscription') === cat || (cat === 'Bills & Subscription' && !b.category))
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    amount += catBillsAmount;

    return { name: cat, amount };
  }).sort((a, b) => b.amount - a.amount);

  const categoryComparisonData = categoriesList.map(cat => {
    let currentAmount = entries
      .filter(e => e.type === 'expense' && e.category === cat && e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);

    let previousAmount = entries
      .filter(e => e.type === 'expense' && e.category === cat && e.date.startsWith(previousMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);

    const catBillsAmount = bills
      .filter(b => (b.category || 'Bills & Subscription') === cat || (cat === 'Bills & Subscription' && !b.category))
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    currentAmount += catBillsAmount;
    previousAmount += catBillsAmount;

    return { name: cat, 'Current Month': currentAmount, 'Previous Month': previousAmount };
  }).filter(c => c['Current Month'] > 0 || c['Previous Month'] > 0);

  const maxExpenseCategory = categoryExpenses[0];

  // 5. Category-wise expenditure percentages
  const categoryWithPercentages = categoryExpenses.map(c => {
    const pct = currentMonthExpense > 0 ? (c.amount / currentMonthExpense) * 100 : 0;
    return { ...c, percentage: pct };
  });

  // 6. Heatmap Data (Current Month Spending Intensity)
  const currentYearInt = parseInt(currentMonthPrefix.split('-')[0], 10);
  const currentMonthInt = parseInt(currentMonthPrefix.split('-')[1], 10);
  const daysInCurrentMonth = new Date(currentYearInt, currentMonthInt, 0).getDate();
  const firstDayOfWeek = new Date(currentYearInt, currentMonthInt - 1, 1).getDay();

  const dailySpending: Record<number, number> = {};
  for(let i=1; i<=daysInCurrentMonth; i++) dailySpending[i] = 0;
  
  // Distribute one-off expenses
  entries.filter(e => e.type === 'expense' && e.date.startsWith(currentMonthPrefix)).forEach(e => {
    const day = parseInt(e.date.split('-')[2], 10);
    if(day) dailySpending[day] += (e.amount || 0);
  });
  
  // Distribute bills across their exact due dates, or average out? Let's just put them on their due dates
  bills.forEach(b => {
    // If bill has a dueDate (1-31), we add it to that day
    let dueDay = b.billingDay || 1;
    dueDay = Math.min(dueDay, daysInCurrentMonth);
    dailySpending[dueDay] += (b.amount || 0);
  });

  const heatmapData = [];
  let currentWeek = 0;
  let maxDailyAmount = 0;
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    const dateStr = `${currentMonthPrefix}-${i.toString().padStart(2, '0')}`;
    const dayOfWeek = (firstDayOfWeek + i - 1) % 7;
    const amount = dailySpending[i] || 0;
    if (amount > maxDailyAmount) maxDailyAmount = amount;
    
    heatmapData.push({
      day: i,
      x: dayOfWeek,
      y: currentWeek, // We will reverse Y axis so week 0 is at top
      amount: amount,
      date: dateStr,
    });
    
    if (dayOfWeek === 6) {
      currentWeek++;
    }
  }

  // 7. Trend of Income vs. Expenses (Last 6 months)
  const incomeByMonth: Record<string, number> = {};
  entries.filter(e => e.type === 'income').forEach(e => {
    const month = e.date.substring(0, 7);
    incomeByMonth[month] = (incomeByMonth[month] || 0) + (e.amount || 0);
  });

  const trendChartData = useMemo(() => {
    const list = [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10);

    for (let i = 5; i >= 0; i--) {
      let curM = m - i;
      let curY = y;
      if (curM <= 0) {
        curM += 12;
        curY -= 1;
      }
      
      const monthPrefix = `${curY}-${curM.toString().padStart(2, '0')}`;
      list.push({
        month: monthPrefix,
        Income: incomeByMonth[monthPrefix] || 0,
        Expense: (expensesByMonth[monthPrefix] || 0) + totalBillsAmount,
      });
    }
    return list;
  }, [selectedMonth, incomeByMonth, expensesByMonth, totalBillsAmount]);

  // Category visual themes matching our palette
  const getCategoryColor = (name: string) => {
    switch (name) {
      case 'Food & Grocery': return '#6FAE98'; // Sage
      case 'Shopping': return '#E0BD7D'; // Gold
      case 'Travel': return '#D08077'; // Terracotta
      case 'Bills & Subscription': return '#8B8680'; // Muted
      case 'Investment': return '#A8895A'; // Gold/Brown
      default: return '#3A3E46'; // Grey
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <span className="font-sans text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
            Diagnostics Engine
          </span>
          <h1 className="font-sans font-semibold text-xl text-gray-900 dark:text-gray-50 mt-0.5 tracking-tight">
            Capital Analytics
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            options={availableMonths.map(month => {
              const [y, m] = month.split('-');
              const date = new Date(parseInt(y), parseInt(m) - 1);
              const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
              return { value: month, label };
            })}
            className="print:hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium"
          />
          <button 
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-50 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-xl font-sans text-sm font-medium transition-colors"
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      {/* 2. STAT CARDS METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Core Savings Rate */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-medium">
            Savings Rate ({new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1).toLocaleString('default', { month: 'short', year: 'numeric' })})
          </span>
          <span className="font-sans text-2xl font-bold text-green-600 dark:text-green-400 block mt-2">
            {currentMonthSavingsRate.toFixed(1)}%
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mt-1.5">
            Lifetime Avg: {totalSavingsRate.toFixed(1)}%
          </p>
        </div>

        {/* Avg Monthly Capital Burn */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-medium">
            Avg Monthly Capital Burn
          </span>
          <span className="font-sans text-2xl font-bold text-red-600 dark:text-red-400 block mt-2">
            ₹{Math.round(avgMonthlyBurn).toLocaleString('en-IN')}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mt-1.5">
            Spanning {totalMonthsCount} Accounting Months
          </p>
        </div>

        {/* Net Cashflow positive index */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-medium">
            Cashflow Gain (June)
          </span>
          <span className={`font-sans text-2xl font-bold block mt-2 ${currentMonthSavings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {currentMonthSavings >= 0 ? '+' : ''}₹{currentMonthSavings.toLocaleString('en-IN')}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mt-1.5">
            Income ₹{currentMonthIncome.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Peak Expenditure Category */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
          <span className="font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-medium">
            Peak Outflow Category
          </span>
          <span className="font-sans text-lg font-bold text-gray-900 dark:text-gray-50 block mt-2 truncate">
            {maxExpenseCategory?.amount > 0 ? maxExpenseCategory.name : 'N/A'}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mt-1.5 truncate">
            {maxExpenseCategory?.amount > 0 ? `₹${maxExpenseCategory.amount.toLocaleString('en-IN')} Outflowed` : 'No expenses logged'}
          </p>
        </div>
      </div>

      {/* 3. DETAILED DIAGNOSTICS ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Horizontal burn charts (8 cols) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm xl:col-span-8 space-y-6">
          <div className="border-b border-gray-200 dark:border-gray-800 pb-3 flex justify-between items-center">
            <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
              Category Burn Breakdown ({new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1).toLocaleString('default', { month: 'short', year: 'numeric' })})
            </h3>
            <span className="font-sans font-medium text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Total Outflow: ₹{currentMonthExpense.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-5">
            {categoryWithPercentages.map((item, index) => {
              const color = getCategoryColor(item.name);
              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-baseline text-sm font-sans">
                    <span className="text-gray-900 dark:text-gray-50 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {item.name}
                    </span>
                    <span className="font-sans font-semibold text-gray-900 dark:text-gray-50">
                      ₹{item.amount.toLocaleString('en-IN')} <span className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 ml-1">({item.percentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                  
                  {/* Flat horizontal bar gauge */}
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Transactions (4 cols) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm xl:col-span-4 flex flex-col">
          <div className="border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
            <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
              Top 5 Transactions (Current Month)
            </h3>
          </div>

          <div className="flex-1 space-y-4">
            {entries
              .filter(e => e.type === 'expense' && e.date.startsWith(currentMonthPrefix))
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)
              .map((transaction, index) => (
                <div key={transaction.id || index} className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800/50 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-sans font-medium text-sm text-gray-900 dark:text-gray-50">
                      {transaction.name}
                    </span>
                    <span className="font-sans text-xs text-gray-500 dark:text-gray-400">
                      {transaction.category} • {transaction.date}
                    </span>
                  </div>
                  <span className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50">
                    ₹{transaction.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
          </div>

          <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm rounded-xl flex gap-3 shadow-sm">
            <Info size={18} className="shrink-0 text-blue-600 mt-0.5" />
            <p className="leading-relaxed font-medium">
              Ledger aggregates and weights your capital burn indicators. Maintain a lifetime savings rate of <b className="text-blue-700 dark:text-blue-400 font-bold">30%+</b> to assure consistent portfolio expansion.
            </p>
          </div>
        </div>
      </div>

      {/* 4. CURRENT VS PREVIOUS MONTH COMPARISON */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-3 mb-6 flex justify-between items-center">
          <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
            Monthly Burn Comparison: June vs May
          </h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryComparisonData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontFamily: 'Inter',
                  fontSize: '12px'
                }}
                itemStyle={{ color: '#F9FAFB' }}
                formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter' }} />
              <Bar dataKey="Previous Month" fill="#8B8680" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Current Month" fill="#6FAE98" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 5. INCOME VS EXPENSES TREND */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-800 pb-3 mb-6 flex justify-between items-center">
            <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
              Income vs. Expenses Trend (Last 6 Months)
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontFamily: 'Inter',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#F9FAFB' }}
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter' }} />
                <Line 
                  type="monotone" 
                  dataKey="Income" 
                  name="Income" 
                  stroke="#6FAE98" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6FAE98', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Expense" 
                  name="Expense" 
                  stroke="#D08077" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#D08077', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. SPENDING INTENSITY HEATMAP */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-800 pb-3 mb-6 flex justify-between items-center">
            <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
              Daily Spending Intensity (Current Month)
            </h3>
          </div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <XAxis 
                  type="category" 
                  dataKey="x" 
                  name="Day" 
                  tickFormatter={(val) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][val]} 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="y" 
                  name="Week" 
                  reversed
                  tick={false}
                  tickLine={false}
                  axisLine={false}
                />
                <ZAxis type="number" dataKey="amount" range={[100, 100]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3', stroke: '#374151', opacity: 0.2 }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontFamily: 'Inter',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#F9FAFB' }}
                  formatter={(value: number, name: string, props: any) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
                  labelFormatter={(label: any, payload: any[]) => payload[0]?.payload?.date || 'Date'}
                />
                <Scatter 
                  data={heatmapData} 
                  shape={<HeatmapShape maxDailyAmount={maxDailyAmount} />} 
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PROJECTIONS ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 6. EXPENSE PROJECTIONS CHART */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-800 pb-3 mb-6 flex justify-between items-center">
            <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
              Capital Burn Projection (3-Month Forecast)
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={finalChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontFamily: 'Inter',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#F9FAFB' }}
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter' }} />
                <Line 
                  type="monotone" 
                  dataKey="historical" 
                  name="Historical Expense" 
                  stroke="#6FAE98" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6FAE98', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="projected" 
                  name="Projected Expense" 
                  stroke="#A8895A" 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#A8895A', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. PROJECTED CATEGORY BREAKDOWN */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col">
          <div className="border-b border-gray-200 dark:border-gray-800 pb-3 mb-6 flex justify-between items-center">
            <h3 className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 uppercase tracking-wide">
              Projected Category Breakdown (Next Month)
            </h3>
          </div>
          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectedCategoryData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Inter' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'Inter' }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontFamily: 'Inter',
                    fontSize: '12px'
                  }}
                  cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                  itemStyle={{ color: '#F9FAFB' }}
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Projected Amount']}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                />
                <Bar 
                  dataKey="projected" 
                  name="Projected Expense"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                >
                  {projectedCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
