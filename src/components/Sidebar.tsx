import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Target,
  BarChart3,
  Settings,
  Menu,
  X,
  CreditCard,
  FileText,
  Landmark,
  Wallet
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isMobileOpen, 
  setIsMobileOpen 
}: SidebarProps) {
  
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard, section: 'General' },
    { id: 'accounts' as ActiveTab, label: 'Bank Accounts', icon: Landmark, section: 'General' },
    { id: 'transactions' as ActiveTab, label: 'Transactions', icon: Receipt, section: 'General' },
    { id: 'bills' as ActiveTab, label: 'Subscriptions', icon: FileText, section: 'General' },
    { id: 'investments' as ActiveTab, label: 'Investments', icon: TrendingUp, section: 'General' },
    { id: 'debts' as ActiveTab, label: 'Debt & Loans', icon: CreditCard, section: 'General' },
    { id: 'goals' as ActiveTab, label: 'Goals', icon: Target, section: 'General' },
    { id: 'budgets' as ActiveTab, label: 'Budgets', icon: Wallet, section: 'General' },
    { id: 'analytics' as ActiveTab, label: 'Analytics', icon: BarChart3, section: 'Tools' },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings, section: 'Tools' },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  const renderNavSection = (sectionName: string, items: typeof navItems) => {
    return (
      <div key={sectionName} className="mb-6">
        <h3 className="px-3 mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 dark:text-gray-500">
          {sectionName}
        </h3>
        <div className="space-y-1">
          {items.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-all duration-150 text-left font-sans ${
                  isActive 
                    ? 'bg-white dark:bg-gray-900 text-blue-600 font-semibold shadow-sm border border-gray-100 dark:border-gray-800/50' 
                    : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50 hover:bg-gray-200/50 border border-transparent'
                }`}
              >
                <Icon 
                  size={16} 
                  className={`transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}`} 
                />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const sections = ['General', 'Tools'];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        id="app-sidebar"
        className={`print:hidden fixed top-0 bottom-0 left-0 z-50 flex flex-col w-[240px] bg-[#F4F5F7] dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 transform lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-gray-200 dark:border-gray-800/60">
          <div className="flex items-center gap-2.5">
            {/* Logo */}
            <div className="w-6 h-6 bg-blue-600 rounded-md shrink-0 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <span className="font-sans font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
              Ledger
            </span>
          </div>
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="p-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-50 lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {sections.map(section => 
            renderNavSection(section, navItems.filter(item => item.section === section))
          )}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-[#F4F5F7] dark:bg-gray-950 text-[11px] text-gray-400 dark:text-gray-500 flex flex-col gap-1 font-medium">
          <div className="flex justify-between items-center">
            <span>System Status</span>
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-600"></div> Nominal</span>
          </div>
          <div className="flex justify-between">
            <span>Database</span>
            <span>Cloud Sync</span>
          </div>
        </div>
      </aside>
    </>
  );
}
