import React, { useState, useEffect, useCallback } from 'react';
import {
  History, Search, Filter, Download, Trash2, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, RefreshCw, X, AlertTriangle, ChevronDown
} from 'lucide-react';
import { api } from '../../lib/api';
import Select from '../Select';

interface LogEntry {
  id: string;
  userId: string;
  timestamp: string;
  module: string;
  action: string;
  entityId?: string | null;
  entityName?: string | null;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  status: string;
  details?: string | null;
}

const MODULE_COLORS: Record<string, string> = {
  Accounts: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Transactions: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Bills: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  Debts: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  Investments: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  Goals: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Budgets: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  Settings: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  System: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
};

const MODULES = ['all', 'Accounts', 'Transactions', 'Bills', 'Debts', 'Investments', 'Goals', 'Budgets', 'Settings', 'System'];

function formatValue(val: any): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }
  return String(val);
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function DiffRow({ label, old: oldVal, next: newVal }: { label: string; old: any; next: any }) {
  const oldStr = formatValue(oldVal);
  const newStr = formatValue(newVal);
  if (oldStr === newStr) return null;
  return (
    <div className="flex flex-wrap gap-1 items-center text-xs font-sans mt-1">
      <span className="text-gray-500 dark:text-gray-400 font-medium">{label}:</span>
      <span className="line-through text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">{oldStr}</span>
      <span className="text-gray-400 dark:text-gray-500">→</span>
      <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded font-medium">{newStr}</span>
    </div>
  );
}

export default function ActivityLogView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Clear dialog
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearPeriod, setClearPeriod] = useState<string>('all');
  const [clearConfirmed, setClearConfirmed] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Expanded log detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getDateRange = () => {
    const now = new Date();
    if (dateRange === '7d') {
      const from = new Date(now); from.setDate(from.getDate() - 7);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (dateRange === '30d') {
      const from = new Date(now); from.setDate(from.getDate() - 30);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (dateRange === '90d') {
      const from = new Date(now); from.setDate(from.getDate() - 90);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (dateRange === 'today') {
      const from = new Date(now); from.setHours(0, 0, 0, 0);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    return {};
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page, limit: LIMIT };
      if (moduleFilter !== 'all') params.module = moduleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.q = search.trim();
      const range = getDateRange();
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;

      const data = await api.getActivityLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [page, moduleFilter, statusFilter, search, dateRange]);

  useEffect(() => {
    setPage(1);
  }, [moduleFilter, statusFilter, search, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Module', 'Action', 'Entity', 'Status', 'Old Value', 'New Value', 'Details'];
    const rows = logs.map(l => [
      formatTimestamp(l.timestamp),
      l.module,
      l.action,
      l.entityName || '',
      l.status,
      l.oldValue ? JSON.stringify(l.oldValue) : '',
      l.newValue ? JSON.stringify(l.newValue) : '',
      l.details || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleClearLogs = async () => {
    if (!clearConfirmed) return;
    setClearing(true);
    try {
      const days = clearPeriod === 'all' ? undefined : parseInt(clearPeriod);
      await api.deleteActivityLogs(days);
      setShowClearModal(false);
      setClearConfirmed(false);
      setClearPeriod('all');
      fetchLogs();
    } catch (e: any) {
      setError(e?.message || 'Failed to clear logs.');
    } finally {
      setClearing(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="max-w-5xl mx-auto space-y-3">

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <h1 className="font-sans font-semibold text-lg text-gray-900 dark:text-gray-50 tracking-tight leading-none">
          Activity Log
        </h1>
        {!loading && (
          <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-sans font-medium rounded-full border border-gray-200 dark:border-gray-700 leading-none">
            {total.toLocaleString()}
          </span>
        )}
      </div>

      {/* ── Single-surface toolbar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 shadow-sm">

        {/* Search — expands to fill available space */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search actions, entities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-sans text-gray-900 dark:text-gray-50 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
          />
        </div>

        {/* Separator */}
        <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700 shrink-0" />

        {/* Filters group — always horizontal, never wrap individually */}
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            options={MODULES.map(m => ({ value: m, label: m === 'all' ? 'All Modules' : m }))}
            className="h-9 px-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'success', label: '✓ Success' },
              { value: 'failure', label: '✗ Failed' },
            ]}
            className="h-9 px-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <Select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
            ]}
            className="h-9 px-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Right actions — separator + icon buttons */}
        <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700 shrink-0" />

        {/* Refresh */}
        <button
          onClick={fetchLogs}
          title="Refresh"
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          <RefreshCw size={15} />
        </button>

        {/* Export dropdown */}
        <div className="relative group shrink-0">
          <button className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium font-sans">
            <Download size={14} />
            Export
            <ChevronDown size={13} />
          </button>
          <div className="absolute right-0 top-full mt-1.5 w-38 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-30 overflow-hidden hidden group-hover:block">
            <button onClick={handleExportCSV} className="w-full text-left px-4 py-2.5 text-sm font-sans text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Export as CSV
            </button>
            <button onClick={handleExportJSON} className="w-full text-left px-4 py-2.5 text-sm font-sans text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Export as JSON
            </button>
          </div>
        </div>

        {/* Clear */}
        <button
          onClick={() => { setShowClearModal(true); setClearConfirmed(false); }}
          className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium font-sans shrink-0"
        >
          <Trash2 size={14} />
          Clear
        </button>

      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm font-sans">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Log List */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-sans">Loading activity logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-dashed rounded-2xl">
            <History size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="font-sans font-medium text-gray-500 dark:text-gray-400">No activity logs found</p>
            <p className="font-sans text-sm text-gray-400 dark:text-gray-500 mt-1">Actions you take will appear here</p>
          </div>
        ) : (
          logs.map(log => {
            const isExpanded = expandedId === log.id;
            const moduleCls = MODULE_COLORS[log.module] || MODULE_COLORS.System;
            const hasDiff = log.oldValue || log.newValue;

            const diffKeys = new Set([
              ...Object.keys(log.oldValue || {}),
              ...Object.keys(log.newValue || {}),
            ]);

            return (
              <div
                key={log.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  className="w-full text-left p-4 flex items-start gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  {/* Status icon */}
                  <div className="shrink-0 mt-0.5">
                    {log.status === 'success'
                      ? <CheckCircle size={17} className="text-emerald-500" />
                      : <XCircle size={17} className="text-red-500" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full border font-sans ${moduleCls}`}>
                        {log.module}
                      </span>
                      <span className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50">
                        {log.action}
                      </span>
                    </div>

                    {log.entityName && (
                      <p className="font-sans text-sm text-gray-600 dark:text-gray-300">
                        {log.entityName}
                      </p>
                    )}

                    {/* Quick diff preview (first changed field) */}
                    {hasDiff && !isExpanded && (() => {
                      const firstKey = [...diffKeys][0];
                      if (!firstKey) return null;
                      const ov = log.oldValue?.[firstKey];
                      const nv = log.newValue?.[firstKey];
                      if (ov === nv) return null;
                      return (
                        <div className="flex items-center gap-1.5 mt-1 text-xs font-sans text-gray-500 dark:text-gray-400">
                          <span className="capitalize">{firstKey}:</span>
                          {ov !== undefined && <span className="line-through text-red-500">{formatValue(ov)}</span>}
                          {ov !== undefined && nv !== undefined && <span>→</span>}
                          {nv !== undefined && <span className="text-green-600 dark:text-green-400 font-medium">{formatValue(nv)}</span>}
                          {diffKeys.size > 1 && <span className="text-gray-400">+{diffKeys.size - 1} more</span>}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-right">
                    <p className="font-sans text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </p>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
                    <div className="mt-3 space-y-1">
                      {hasDiff && [...diffKeys].map(key => (
                        <div key={key}>
                          <DiffRow
                            label={key}
                            old={log.oldValue?.[key]}
                            next={log.newValue?.[key]}
                          />
                        </div>
                      ))}
                      {log.details && (
                        <p className="text-xs font-sans text-gray-500 dark:text-gray-400 mt-2 italic">{log.details}</p>
                      )}
                      {log.entityId && (
                        <p className="text-xs font-sans text-gray-400 dark:text-gray-500 mt-1">ID: {log.entityId}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm font-sans text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages} ({total.toLocaleString()} entries)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Clear Logs Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 dark:bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-xl">
                  <Trash2 size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-gray-900 dark:text-gray-50">Clear Activity Logs</h3>
                  <p className="font-sans text-xs text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setShowClearModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-sans text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Delete logs</label>
                <Select
                  value={clearPeriod}
                  onChange={e => { setClearPeriod(e.target.value); setClearConfirmed(false); }}
                  options={[
                    { value: 'all', label: 'All logs' },
                    { value: '30', label: 'Older than 30 days' },
                    { value: '90', label: 'Older than 90 days' },
                    { value: '180', label: 'Older than 180 days' },
                    { value: '365', label: 'Older than 365 days' },
                  ]}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl font-sans"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearConfirmed}
                  onChange={e => setClearConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-red-600 rounded"
                />
                <span className="font-sans text-sm text-gray-700 dark:text-gray-300">
                  I understand this will permanently delete the selected logs
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 font-sans text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLogs}
                disabled={!clearConfirmed || clearing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-sans text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearing ? 'Clearing…' : 'Clear Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
