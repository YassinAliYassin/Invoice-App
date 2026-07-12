import React, { useMemo, useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useNav } from '../context/NavContext';
import { StatCard } from './ui/StatCard';
import { PageHeader } from './ui/PageHeader';
import {
  BarChart3,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Circle,
  Sparkles,
  Users2,
  FileSpreadsheet,
  FileCheck,
  Wallet,
  Clock3,
  TrendingUp,
  Plus,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { generateFinancialAdvice } from '../utils/email-service';

export const AnalyticsModule: React.FC = () => {
  const {
    invoices,
    payments,
    clients,
    inventory,
    quotations,
    settings,
    user,
  } = useBusiness();
  const { goTo, setOpenQuickCreate } = useNav();
  const [adviceSummary, setAdviceSummary] = useState('');
  const [adviceBullets, setAdviceBullets] = useState<string[]>([]);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');
  const [dismissOnboarding, setDismissOnboarding] = useState(() => {
    try {
      return localStorage.getItem('invoicestack_onboarding_done') === '1';
    } catch {
      return false;
    }
  });

  const totalRevenue = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = Math.max(0, totalRevenue - totalPaid);
  const lowStockItems = inventory.filter(
    (i) => (i.type || 'product') !== 'service' && i.quantity <= i.minStockLevel
  );
  const quotePipeline = quotations.reduce((s, q) => s + q.total, 0);
  const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

  const formatAmount = (num: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: settings.defaultCurrency || 'USD',
      maximumFractionDigits: 0,
    }).format(num);

  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const overdueCount = invoices.filter((i) => {
    if (i.status === 'paid') return false;
    return (
      i.status === 'overdue' ||
      (i.status === 'sent' &&
        i.dueDate < new Date().toISOString().split('T')[0])
    );
  }).length;
  const draftCount = invoices.filter((i) => i.status === 'draft').length;

  // Last 6 months cash bars from invoice issue dates
  const monthBars = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; invoiced: number; paid: number }[] =
      [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({
        key,
        label: d.toLocaleString(undefined, { month: 'short' }),
        invoiced: 0,
        paid: 0,
      });
    }
    invoices.forEach((inv) => {
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.invoiced += inv.total;
    });
    payments.forEach((pay) => {
      const d = new Date(pay.paymentDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.paid += pay.amount;
    });
    const max = Math.max(1, ...months.map((m) => Math.max(m.invoiced, m.paid)));
    return months.map((m) => ({
      ...m,
      invH: Math.max(4, (m.invoiced / max) * 100),
      paidH: Math.max(4, (m.paid / max) * 100),
    }));
  }, [invoices, payments]);

  const recentActivity = useMemo(() => {
    const items: {
      id: string;
      type: string;
      title: string;
      meta: string;
      amount?: number;
      tone: string;
    }[] = [];
    invoices.slice(0, 8).forEach((i) =>
      items.push({
        id: i.id,
        type: 'invoice',
        title: i.invoiceNumber,
        meta: `${i.clientName} · ${i.status}`,
        amount: i.total,
        tone:
          i.status === 'paid'
            ? 'bg-emerald-50 text-emerald-600'
            : i.status === 'overdue'
              ? 'bg-red-50 text-red-600'
              : 'bg-blue-50 text-blue-600',
      })
    );
    quotations.slice(0, 6).forEach((q) =>
      items.push({
        id: q.id,
        type: 'quote',
        title: q.quotationNumber,
        meta: `${q.clientName} · ${q.status}`,
        amount: q.total,
        tone: 'bg-indigo-50 text-indigo-600',
      })
    );
    payments.slice(0, 6).forEach((p) =>
      items.push({
        id: p.id,
        type: 'payment',
        title: `Payment ${p.paymentMethod}`,
        meta: `${p.clientName || 'Client'} · ${p.paymentDate}`,
        amount: p.amount,
        tone: 'bg-emerald-50 text-emerald-600',
      })
    );
    return items.slice(0, 8);
  }, [invoices, quotations, payments]);

  const topClients = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> =
      {};
    invoices.forEach((inv) => {
      if (!map[inv.clientId]) {
        map[inv.clientId] = { name: inv.clientName, total: 0, count: 0 };
      }
      map[inv.clientId].total += inv.total;
      map[inv.clientId].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices]);

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    setErrorLocal('');
    setAdviceSummary('');
    setAdviceBullets([]);
    try {
      try {
        const resp = await fetch('/api/financial-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stats: {
              totalRevenue,
              totalPaid,
              totalOutstanding,
            },
            invoicesCount: invoices.length,
            clientsCount: clients.length,
            lowStockItems: lowStockItems.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              minStockLevel: i.minStockLevel,
            })),
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setAdviceSummary(data.summary);
          setAdviceBullets(data.recommendations || []);
          return;
        }
      } catch {
        /* offline */
      }
      const local = generateFinancialAdvice({
        totalRevenue,
        totalPaid,
        totalOutstanding,
        invoicesCount: invoices.length,
        clientsCount: clients.length,
        lowStockCount: lowStockItems.length,
      });
      setAdviceSummary(local.summary);
      setAdviceBullets(local.recommendations);
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoadingAdvice(false);
    }
  };

  // Auto-run insights once when data exists
  useEffect(() => {
    if (invoices.length > 0 && !adviceSummary && !loadingAdvice) {
      handleGetAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices.length]);

  const profileReady =
    Boolean(settings.businessName && settings.businessName !== 'My Business') &&
    Boolean(settings.businessEmail);
  const setupSteps = [
    {
      id: 'profile',
      label: 'Company profile',
      done: profileReady,
      tab: 'settings' as const,
    },
    {
      id: 'clients',
      label: 'Add a client',
      done: clients.length > 0,
      tab: 'clients' as const,
    },
    {
      id: 'catalog',
      label: 'Add inventory',
      done: inventory.length > 0,
      tab: 'inventory' as const,
    },
    {
      id: 'quote',
      label: 'Create a quotation',
      done: quotations.length > 0,
      tab: 'quotations' as const,
    },
    {
      id: 'invoice',
      label: 'Issue an invoice',
      done: invoices.length > 0,
      tab: 'invoices' as const,
    },
  ];
  const setupDone = setupSteps.filter((s) => s.done).length;
  const showOnboarding = !dismissOnboarding && setupDone < setupSteps.length;

  const firstName =
    user?.displayName?.split(' ')[0] ||
    settings.businessName?.split(' ')[0] ||
    'there';

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        badge="Command center"
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${firstName}`}
        subtitle={
          settings.businessName && settings.businessName !== 'My Business'
            ? `${settings.businessName} · real-time cash, quotes & collections`
            : 'Your modern billing workspace — invoices, quotations, and insights in one place.'
        }
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => goTo('quotations')}>
              <FileCheck className="w-4 h-4" />
              Quotations
            </button>
            <button type="button" className="btn-primary" onClick={() => setOpenQuickCreate(true)}>
              <Plus className="w-4 h-4" />
              New document
            </button>
          </>
        }
      />

      {showOnboarding && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white p-6 sm:p-7 shadow-xl animate-slide-up">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -left-8 bottom-0 w-40 h-40 rounded-full bg-indigo-400/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight">Launch checklist</h3>
                <p className="text-sm text-blue-100/80 mt-1 max-w-md">
                  Finish setup to unlock the full sales pipeline — quotes, invoices, and
                  collections.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-white/10 border border-white/10 px-2.5 py-1 rounded-full">
                {setupDone}/{setupSteps.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDismissOnboarding(true);
                  localStorage.setItem('invoicestack_onboarding_done', '1');
                }}
                className="text-[11px] text-blue-200 hover:text-white underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="relative w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full transition-all duration-500"
              style={{ width: `${(setupDone / setupSteps.length) * 100}%` }}
            />
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {setupSteps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goTo(step.tab)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition-all cursor-pointer ${
                  step.done
                    ? 'bg-white/10 text-white/70'
                    : 'bg-black/20 border border-white/10 hover:bg-white/10 text-white'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-blue-200 shrink-0" />
                )}
                <span className={step.done ? 'line-through' : 'font-semibold'}>
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Gross invoiced"
          value={formatAmount(totalRevenue)}
          hint={`${invoices.length} invoices`}
          icon={Receipt}
          tone="brand"
          onClick={() => goTo('invoices')}
        />
        <StatCard
          label="Cash collected"
          value={formatAmount(totalPaid)}
          hint={`${collectionRate.toFixed(0)}% collection`}
          icon={Wallet}
          tone="success"
          onClick={() => goTo('invoices')}
        />
        <StatCard
          label="Outstanding"
          value={formatAmount(totalOutstanding)}
          hint={overdueCount ? `${overdueCount} overdue` : 'All clear'}
          icon={Clock3}
          tone={totalOutstanding > 0 ? 'danger' : 'default'}
          onClick={() => goTo('invoices')}
        />
        <StatCard
          label="Quote pipeline"
          value={formatAmount(quotePipeline)}
          hint={`${quotations.length} quotations`}
          icon={FileCheck}
          tone="warning"
          onClick={() => goTo('quotations')}
        />
      </div>

      {/* Status pills + quick links */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Draft inv.', value: draftCount, tab: 'invoices' as const },
          { label: 'Paid', value: paidCount, tab: 'invoices' as const },
          { label: 'Overdue', value: overdueCount, tab: 'invoices' as const },
          { label: 'Quotes', value: quotations.length, tab: 'quotations' as const },
          { label: 'Clients', value: clients.length, tab: 'clients' as const },
          { label: 'SKUs', value: inventory.length, tab: 'inventory' as const },
          {
            label: 'Low stock',
            value: lowStockItems.length,
            tab: 'inventory' as const,
          },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => goTo(s.tab)}
            className="badge bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-700 cursor-pointer shadow-sm"
          >
            {s.label}: {s.value}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Cashflow chart */}
        <div className="card-modern p-6 xl:col-span-2 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cash momentum</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Invoiced vs collected · last 6 months
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Invoiced
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Paid
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-44 px-1">
            {monthBars.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div
                    className="w-[38%] max-w-[18px] rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 shadow-sm shadow-blue-500/20 transition-all"
                    style={{ height: `${m.invH}%` }}
                    title={`Invoiced ${formatAmount(m.invoiced)}`}
                  />
                  <div
                    className="w-[38%] max-w-[18px] rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500/20 transition-all"
                    style={{ height: `${m.paidH}%` }}
                    title={`Paid ${formatAmount(m.paid)}`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, collectionRate)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-600 tabular-nums">
              {collectionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Pipeline */}
        <div className="card-modern p-6 animate-slide-up">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Sales pipeline</h3>
          <p className="text-xs text-slate-400 mb-5">Quote → invoice → cash</p>
          <div className="space-y-4">
            {[
              {
                label: 'Quotations open',
                value: quotations.filter((q) => q.status === 'draft' || q.status === 'sent')
                  .length,
                amount: quotations
                  .filter((q) => q.status === 'draft' || q.status === 'sent')
                  .reduce((s, q) => s + q.total, 0),
                color: 'bg-indigo-500',
                tab: 'quotations' as const,
              },
              {
                label: 'Accepted quotes',
                value: quotations.filter((q) => q.status === 'accepted').length,
                amount: quotations
                  .filter((q) => q.status === 'accepted')
                  .reduce((s, q) => s + q.total, 0),
                color: 'bg-violet-500',
                tab: 'quotations' as const,
              },
              {
                label: 'Unpaid invoices',
                value: invoices.filter((i) => i.status !== 'paid').length,
                amount: totalOutstanding,
                color: 'bg-amber-500',
                tab: 'invoices' as const,
              },
              {
                label: 'Paid invoices',
                value: paidCount,
                amount: totalPaid,
                color: 'bg-emerald-500',
                tab: 'invoices' as const,
              },
            ].map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={() => goTo(row.tab)}
                className="w-full text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 group-hover:text-blue-700">
                    {row.label}
                  </span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {row.value} · {formatAmount(row.amount)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full ${row.color} rounded-full transition-all`}
                    style={{
                      width: `${Math.min(
                        100,
                        (row.amount / Math.max(totalRevenue || quotePipeline || 1, 1)) * 100 +
                          (row.value > 0 ? 8 : 0)
                      )}%`,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo('quotations')}
            className="mt-5 w-full btn-secondary !justify-between"
          >
            Manage quotations
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top clients */}
        <div className="card-modern p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Top clients</h3>
            <button
              type="button"
              onClick={() => goTo('clients')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              View all
            </button>
          </div>
          <div className="space-y-1">
            {topClients.map((c, idx) => (
              <div
                key={c.name + idx}
                className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-extrabold text-slate-600">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-400">{c.count} invoices</p>
                </div>
                <span className="text-sm font-extrabold text-slate-800 tabular-nums">
                  {formatAmount(c.total)}
                </span>
              </div>
            ))}
            {topClients.length === 0 && (
              <div className="py-10 text-center">
                <Users2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">No client revenue yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create a quotation or invoice to populate this board.
                </p>
                <button
                  type="button"
                  onClick={() => goTo('clients')}
                  className="btn-primary mt-4"
                >
                  Add client
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="card-modern p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
            <TrendingUp className="w-4 h-4 text-slate-300" />
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {recentActivity.map((a) => (
              <div
                key={a.type + a.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.tone}`}
                >
                  {a.type === 'quote' ? (
                    <FileCheck className="w-4 h-4" />
                  ) : a.type === 'payment' ? (
                    <Wallet className="w-4 h-4" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{a.title}</p>
                  <p className="text-[11px] text-slate-400 truncate capitalize">{a.meta}</p>
                </div>
                {a.amount !== undefined && (
                  <span className="text-xs font-bold text-slate-700 tabular-nums">
                    {formatAmount(a.amount)}
                  </span>
                )}
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-xs text-center text-slate-400 py-10">
                Activity will appear as you create quotes, invoices, and payments.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Smart advisor */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white p-6 sm:p-7 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">Smart business advisor</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rule-based insights on cash, risk, and inventory health.
              </p>
            </div>
          </div>
          <button
            onClick={handleGetAdvice}
            disabled={loadingAdvice}
            className="btn-primary !bg-blue-500 hover:!bg-blue-400"
          >
            {loadingAdvice ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh insights
              </>
            )}
          </button>
        </div>

        {errorLocal && (
          <div className="bg-red-500/15 border border-red-400/30 text-red-200 rounded-xl p-3 text-xs mb-4">
            {errorLocal}
          </div>
        )}

        {(adviceSummary || adviceBullets.length > 0) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            {adviceSummary && (
              <div>
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                  Executive summary
                </span>
                <p className="text-sm text-slate-200 leading-relaxed mt-1.5">
                  {adviceSummary}
                </p>
              </div>
            )}
            {adviceBullets.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                  Recommended actions
                </span>
                <ul className="mt-2 space-y-2">
                  {adviceBullets.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-slate-300 leading-relaxed flex gap-2"
                    >
                      <span className="text-blue-400 font-bold shrink-0">{idx + 1}.</span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: bullet.replace(
                            /\*\*(.*?)\*\*/g,
                            '<strong class="text-white">$1</strong>'
                          ),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!adviceSummary && !adviceBullets.length && !loadingAdvice && (
          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-700 rounded-2xl">
            Click refresh to generate cashflow and risk recommendations.
          </div>
        )}

        {lowStockItems.length > 0 && (
          <div className="mt-4 flex items-start gap-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-400/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {lowStockItems.length} inventory item(s) below minimum stock — review in
              Inventory.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
