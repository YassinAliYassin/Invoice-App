import React, { useEffect } from 'react';
import { BusinessProvider, useBusiness } from './context/BusinessContext';
import { NavProvider, useNav, AppTab } from './context/NavContext';
import { AuthPage } from './components/AuthPage';
import { AnalyticsModule } from './components/AnalyticsModule';
import { InvoiceModule } from './components/InvoiceModule';
import { QuotationModule } from './components/QuotationModule';
import { StatementModule } from './components/StatementModule';
import { InventoryModule } from './components/InventoryModule';
import { ClientModule } from './components/ClientModule';
import { SettingsModule } from './components/SettingsModule';
import { QuickCreateModal } from './components/QuickCreateModal';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileCheck,
  Landmark,
  PackageCheck,
  Users2,
  SlidersHorizontal,
  User,
  LogOut,
  Menu,
  X,
  Loader2,
  AlertCircle,
  Plus,
  Cloud,
  HardDrive,
  Sparkles,
  Bell,
} from 'lucide-react';

const LoadingScreen: React.FC = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center gradient-mesh gap-4">
    <div className="relative">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-600/30">
        I
      </div>
      <div className="absolute -inset-2 rounded-3xl bg-blue-500/20 blur-xl -z-10 animate-pulse" />
    </div>
    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      Loading Invoicestack…
    </div>
  </div>
);

const navigationItems: {
  id: AppTab;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
  group: string;
}[] = [
  { id: 'analytics', label: 'Dashboard', short: 'Overview & insights', icon: LayoutDashboard, group: 'Main' },
  { id: 'invoices', label: 'Invoices', short: 'Billing & payments', icon: FileSpreadsheet, group: 'Sales' },
  { id: 'quotations', label: 'Quotations', short: 'Proposals & estimates', icon: FileCheck, group: 'Sales' },
  { id: 'clients', label: 'Clients', short: 'Customer directory', icon: Users2, group: 'Sales' },
  { id: 'statements', label: 'Statements', short: 'Client ledgers', icon: Landmark, group: 'Finance' },
  { id: 'inventory', label: 'Inventory', short: 'Products & services', icon: PackageCheck, group: 'Finance' },
  { id: 'settings', label: 'Settings', short: 'Brand & email', icon: SlidersHorizontal, group: 'System' },
];

const AppShell: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { activeTab, setActiveTab, setOpenQuickCreate } = useNav();
  const {
    user,
    loading,
    logOutProcess,
    isSyncing,
    connectionMode,
    errorLog,
    clearError,
    invoices,
    quotations,
  } = useBusiness();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        setOpenQuickCreate(true);
      }
      if (e.key === 'Escape') setOpenQuickCreate(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpenQuickCreate]);

  if (loading && !user) return <LoadingScreen />;
  if (!user) return <AuthPage />;
  if (loading) return <LoadingScreen />;

  const openCount =
    invoices.filter((i) => i.status !== 'paid').length +
    quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length;

  const renderModule = () => {
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

  const groups = ['Main', 'Sales', 'Finance', 'System'];
  const activeMeta = navigationItems.find((n) => n.id === activeTab);

  return (
    <div className="h-screen w-screen flex gradient-mesh text-slate-800 font-sans overflow-hidden selection:bg-blue-600/15 selection:text-blue-800">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm sm:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed sm:relative inset-y-0 left-0 z-50 w-[272px] gradient-sidebar text-slate-300 flex flex-col border-r border-white/5 shrink-0 transition-transform duration-300 ease-out sm:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/30 text-sm">
              I
            </div>
            <div>
              <p className="text-[15px] font-extrabold text-white tracking-tight leading-none">
                Invoicestack
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Modern billing OS</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 mb-2">
          <button
            type="button"
            onClick={() => {
              setOpenQuickCreate(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 font-bold text-xs py-2.5 hover:bg-blue-50 transition-all cursor-pointer shadow-lg shadow-black/20"
          >
            <Plus className="w-4 h-4" />
            Quick create
            <kbd className="ml-1 text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              C
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {groups.map((group) => {
            const items = navigationItems.filter((n) => n.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-white/10 text-white shadow-inner border border-white/10'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                              : 'bg-white/5 text-slate-400 group-hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                            {item.label}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{item.short}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-300 mb-1.5">
              {connectionMode === 'firestore' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  Cloud sync
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  Local vault
                </>
              )}
              {isSyncing && (
                <Loader2 className="w-3 h-3 animate-spin text-emerald-400 ml-auto" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {connectionMode === 'firestore'
                ? 'Live multi-device ledger via Firebase.'
                : 'Private browser accounts — enable Auth for cloud sync.'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-16 px-4 sm:px-8 flex items-center justify-between shrink-0 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 sm:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 truncate">
                  {activeMeta?.label}
                </h2>
                {openCount > 0 && activeTab === 'analytics' && (
                  <span className="badge bg-amber-50 text-amber-700 border border-amber-100">
                    {openCount} open
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                {activeMeta?.short}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setOpenQuickCreate(true)}
              className="hidden sm:inline-flex btn-primary !py-2"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>

            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-100/80 border border-slate-200/60 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
              <Sparkles className="w-3 h-3 text-blue-500" />
              Pro suite
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden flex items-center justify-center border border-white shadow-sm">
                {'photoURL' in user && user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="hidden md:block text-left text-xs leading-tight max-w-[140px]">
                <span className="block font-bold text-slate-800 truncate">
                  {user.displayName || 'User'}
                </span>
                <span className="block text-[10px] text-slate-400 truncate">
                  {user.email || ''}
                </span>
              </div>
              <button
                onClick={() => logOutProcess()}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {errorLog && (
            <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl p-3.5 shadow-sm animate-slide-up">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{errorLog}</span>
              <button
                type="button"
                onClick={clearError}
                className="text-red-400 hover:text-red-700 font-bold cursor-pointer px-1"
              >
                ✕
              </button>
            </div>
          )}
          <div className="animate-fade-in max-w-[1400px] mx-auto">{renderModule()}</div>
        </div>
      </main>

      <QuickCreateModal />
    </div>
  );
};

const AppContent: React.FC = () => (
  <NavProvider>
    <AppShell />
  </NavProvider>
);

export default function App() {
  return (
    <BusinessProvider>
      <AppContent />
    </BusinessProvider>
  );
}
