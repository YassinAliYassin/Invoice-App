import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Sparkles, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Users, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

export const AnalyticsModule: React.FC = () => {
  const { invoices, payments, clients, inventory, settings } = useBusiness();
  const [adviceSummary, setAdviceSummary] = useState('');
  const [adviceBullets, setAdviceBullets] = useState<string[]>([]);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  // 1. Calculate stats aggregates
  const totalRevenue = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = Math.max(0, totalRevenue - totalPaid);
  const lowStockItems = inventory.filter(i => i.quantity <= i.minStockLevel);

  // Formatting helpers
  const formatAmount = (num: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.defaultCurrency || 'USD' }).format(num);
  };

  // Generate top clients breakdown
  const clientRevenueMap: Record<string, { name: string; total: number; count: number }> = {};
  invoices.forEach(inv => {
    if (!clientRevenueMap[inv.clientId]) {
      clientRevenueMap[inv.clientId] = { name: inv.clientName, total: 0, count: 0 };
    }
    clientRevenueMap[inv.clientId].total += inv.total;
    clientRevenueMap[inv.clientId].count += 1;
  });

  const sortedClients = Object.values(clientRevenueMap).sort((a, b) => b.total - a.total).slice(0, 5);

  // Trigger Gemini AI advisor report
  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    setErrorLocal('');
    setAdviceSummary('');
    setAdviceBullets([]);

    try {
      const resp = await fetch('/api/financial-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stats: {
            totalRevenueFormatted: formatAmount(totalRevenue),
            totalPaidFormatted: formatAmount(totalPaid),
            totalOutstandingFormatted: formatAmount(totalOutstanding),
            totalRevenue,
            totalPaid,
            totalOutstanding,
            quotationsCount: invoices.filter(i => i.status === 'draft').length
          },
          invoicesCount: invoices.length,
          clientsCount: clients.length,
          lowStockItems: lowStockItems.map(i => ({ name: i.name, quantity: i.quantity, minStockLevel: i.minStockLevel }))
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Failed to fetch AI feedback");
      }

      setAdviceSummary(data.summary);
      setAdviceBullets(data.recommendations || []);
    } catch (err: any) {
      setErrorLocal(err.message || 'Connecting to Gemini strategist failed.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  // Bar chart computation
  const invoicesReceivedRatio = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">

      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Financial Analytics</h2>
          <p className="text-xs text-slate-500">Analyze aggregate balances, client invoices density, and generate smart business suggestions with Gemini.</p>
        </div>
      </div>

      {/* Grid panels of aggregates metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Gross Invoiced Balance</span>
            <p className="text-xl font-black text-slate-900 mt-1">{formatAmount(totalRevenue)}</p>
            <span className="text-[10px] text-slate-500 font-sans mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              Total bill sheets generated
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
            $
          </div>
        </div>

        {/* Cash in flow */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Credits Liquid Received</span>
            <p className="text-xl font-black text-emerald-600 mt-1">{formatAmount(totalPaid)}</p>
            <span className="text-[10px] text-slate-500 font-sans mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              Cash received & cleared
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
            ✔
          </div>
        </div>

        {/* Outstanding arrears */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Outstanding Receivables</span>
            <p className="text-xl font-black text-red-600 mt-1">{formatAmount(totalOutstanding)}</p>
            <span className="text-[10px] text-slate-500 font-sans mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              Unpaid client balances
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 font-bold">
            !
          </div>
        </div>

        {/* Low inventory alert */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Critical Inventory Items</span>
            <p className="text-xl font-black mt-1 text-slate-900">{lowStockItems.length} Bins</p>
            <span className="text-[10px] text-slate-500 font-sans mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              Low stocking alert level items
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 font-bold">
            ⛟
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Visual Charts & Stats interpretation Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Gross Cashflow Distribution</h3>
          
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between items-baseline text-xs mb-1 font-mono font-medium text-slate-500">
                <span>Invoiced Realization rate (Cash Liquidation)</span>
                <span className="font-bold text-emerald-600">{invoicesReceivedRatio.toFixed(1)}% Completed</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                <div style={{ width: `${invoicesReceivedRatio}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${100 - invoicesReceivedRatio}%` }} className="bg-rose-400 h-full opacity-65" />
              </div>
            </div>

            {/* Render stylish visual SVG Bar Charts */}
            <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 flex flex-col gap-4">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Monthly Summary Overview</span>
              
              <div className="flex items-end justify-around h-32 pt-4 font-mono">
                <div className="flex flex-col items-center gap-2">
                  <div style={{ height: `${Math.min(100, (totalRevenue / (totalRevenue || 1)) * 80)}px` }} className="w-8 bg-blue-500 rounded-t shadow-sm" />
                  <span className="text-[10px] text-slate-400">Total Invoiced</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div style={{ height: `${Math.min(100, (totalPaid / (totalRevenue || 1)) * 80)}px` }} className="w-8 bg-emerald-500 rounded-t shadow-sm" />
                  <span className="text-[10px] text-emerald-605 font-bold">Paid</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div style={{ height: `${Math.min(100, (totalOutstanding / (totalRevenue || 1)) * 80)}px` }} className="w-8 bg-red-400 rounded-t shadow-sm" />
                  <span className="text-[10px] text-red-500 font-bold">Arrears</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TOP Client Accounts contribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Top Performing Client Channels</h3>
          
          <div className="divide-y divide-slate-100">
            {sortedClients.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-105 flex items-center justify-center text-xs font-bold text-slate-600">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">{item.name}</span>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">{item.count} Invoices processed</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-black text-slate-700">
                  {formatAmount(item.total)}
                </span>
              </div>
            ))}

            {sortedClients.length === 0 && (
              <p className="text-xs text-center text-slate-400 py-12">Submit invoices to populate cashflow distribution analyses.</p>
            )}
          </div>
        </div>

      </div>

      {/* GEMINI DUPLEX ADVISORY REPORT BLOCK */}
      <div className="bg-[#0F172A] text-white rounded-xl p-6 border border-slate-800 flex flex-col gap-5 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
            <div>
              <h3 className="font-bold text-base">Gemini Business Strategic Advisor</h3>
              <p className="text-xs text-slate-450 text-slate-405">Retrieves real-time intelligence reviews mapping stock re-order thresholds, unpaid collectibles rates, and liquidity optimization.</p>
            </div>
          </div>

          <button
            onClick={handleGetAdvice}
            disabled={loadingAdvice}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2 px-4 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all outline-none cursor-pointer"
          >
            {loadingAdvice ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Retrieving Advice...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Analyze Performance Report
              </>
            )}
          </button>
        </div>

        {/* Local Error feedback */}
        {errorLocal && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 rounded p-3 text-xs leading-normal">
            {errorLocal}
          </div>
        )}

        {/* Strategic results panel */}
        {(adviceSummary || adviceBullets.length > 0) && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            {adviceSummary && (
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-wider">Executive summary review</span>
                <p className="text-xs text-slate-300 leading-relaxed mt-1 font-sans">{adviceSummary}</p>
              </div>
            )}

            {adviceBullets.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-wider">Actionable Business recommendations / Steps</span>
                <ul className="flex flex-col gap-2">
                  {adviceBullets.map((bullet, idx) => (
                    <li key={idx} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                      <span className="text-blue-500 font-bold shrink-0 font-mono">{idx + 1}.</span>
                      <span className="font-sans" dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!adviceSummary && !adviceBullets.length && !loadingAdvice && (
          <div className="text-center py-6 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-lg">
            No report analyzed yet. Click "Analyze Performance Report" to evaluate cashflow positions with Gemini.
          </div>
        )}
      </div>

    </div>
  );
};
