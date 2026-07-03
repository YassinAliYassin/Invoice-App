import React, { useState } from 'react';
import { BusinessProvider, useBusiness } from './context/BusinessContext';
import { AnalyticsModule } from './components/AnalyticsModule';
import { InvoiceModule } from './components/InvoiceModule';
import { QuotationModule } from './components/QuotationModule';
import { StatementModule } from './components/StatementModule';
import { InventoryModule } from './components/InventoryModule';
import { ClientModule } from './components/ClientModule';
import { SettingsModule } from './components/SettingsModule';
import {
  Sparkles,
  LayoutDashboard,
  FileSpreadsheet,
  FileCheck,
  Landmark,
  PackageCheck,
  Users2,
  SlidersHorizontal,
  CloudLightning,
  CloudOff,
  User,
  LogOut,
  Menu,
  X,
  Smartphone,
  Info
} from 'lucide-react';

type TabType = 'analytics' | 'invoices' | 'quotations' | 'statements' | 'inventory' | 'clients' | 'settings';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const {
    user,
    logInWithGoogle,
    logOutProcess,
    isSyncing,
    connectionMode
  } = useBusiness();

  // Navigation tabs configs
  const navigationItems = [
    { id: 'analytics', label: 'Dashboard & AI Advice', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices Register', icon: FileSpreadsheet },
    { id: 'quotations', label: 'Estimates & Quotes', icon: FileCheck },
    { id: 'statements', label: 'Ledger Statements', icon: Landmark },
    { id: 'inventory', label: 'Inventory Stock', icon: PackageCheck },
    { id: 'clients', label: 'Clients register', icon: Users2 },
    { id: 'settings', label: 'Corporate settings', icon: SlidersHorizontal },
  ] as const;

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsModule />;
      case 'invoices':
        return <InvoiceModule />;
      case 'quotations':
        return <QuotationModule />;
      case 'statements':
        return <StatementModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'clients':
        return <ClientModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <AnalyticsModule />;
    }
  };

  return (
    <div className="h-screen w-screen flex bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden selection:bg-blue-600/10 selection:text-blue-700">
      
      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm sm:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`fixed sm:relative inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-slate-300 flex flex-col border-r border-slate-800 shrink-0 transition-transform duration-200 transform sm:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
      }`}>
        {/* Branding & Logo */}
        <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
              I
            </div>
            <span className="text-lg font-black text-white tracking-tight italic">Invoicestack</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="sm:hidden p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="p-4 flex-1 flex flex-col gap-5 overflow-y-auto">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase px-3 tracking-wider mb-2 block font-mono">PRIMARY DIRECTORIES</span>
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-left outline-none text-xs font-medium cursor-pointer ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-400 font-bold border border-blue-500/10' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Info utility block */}
          <div className="mt-auto bg-slate-800/20 border border-slate-800/40 p-4 rounded-lg text-slate-400 text-[11px] leading-relaxed flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mobile-First Engine</span>
            </div>
            <p>Compatible with any phone or tablet. Scan items, print estimates and check ledger statements smoothly on the move.</p>
          </div>
        </div>

        {/* Bottom Cloud Sync Panel */}
        <div className="p-6 border-t border-slate-800">
          <div className="bg-slate-800/20 border border-slate-850 p-4 rounded-lg font-sans">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 font-mono">Cloud Sync Status</p>
            {connectionMode === 'firestore' ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold relative">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                Live & Synced
                {isSyncing && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute right-0" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                Offline Ledger Mode
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header toolbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0">
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 sm:hidden outline-none cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-2">
              <span>{navigationItems.find(n => n.id === activeTab)?.label}</span>
            </h2>
            
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-150 rounded-full px-3 py-1 gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoicestack Suite</span>
            </div>
          </div>

          {/* Sync status and User Account profile block */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-105 overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'Profile'} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div className="hidden md:block text-left text-xs leading-none">
                  <span className="block font-bold text-slate-700 truncate max-w-[140px] mb-0.5">{user.displayName || 'Enterprise User'}</span>
                  <span className="block text-[10px] text-slate-400 truncate max-w-[140px]">{user.email || 'Authorized'}</span>
                </div>
                <button
                  onClick={logOutProcess}
                  title="Terminate Session"
                  className="p-2 text-slate-450 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={logInWithGoogle}
                className="bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-blue-500/10"
              >
                <User className="w-3.5 h-3.5 text-white" />
                Google Session
              </button>
            )}
          </div>
        </header>

        {/* Primary Screen Module Panel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {renderActiveModule()}
        </div>
      </main>

    </div>
  );
};

export default function App() {
  return (
    <BusinessProvider>
      <AppContent />
    </BusinessProvider>
  );
}
