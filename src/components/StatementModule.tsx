import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Filter, Landmark, SlidersHorizontal } from 'lucide-react';
import { DocumentTemplates } from './DocumentTemplates';
import { formatMoney } from '../utils/export';

export const StatementModule: React.FC = () => {
  const { clients, invoices, payments, settings } = useBusiness();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 30 days ago
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showStatementPrint, setShowStatementPrint] = useState(false);
  const currency = settings.defaultCurrency || 'USD';

  const applyRange = (days: number) => {
    setEndDate(new Date().toISOString().split('T')[0]);
    setStartDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Filter invoices for client within range
  const filteredClientInvoices = invoices.filter(inv => {
    if (inv.clientId !== selectedClientId) return false;
    const invDate = new Date(inv.issueDate);
    return invDate >= new Date(startDate) && invDate <= new Date(endDate);
  });

  // Filter payments for client within range
  const clientPayIds = payments.filter(pay => {
    if (pay.clientId !== selectedClientId) return false;
    const payDate = new Date(pay.paymentDate);
    return payDate >= new Date(startDate) && payDate <= new Date(endDate);
  });

  // Calculate stats
  const totalBilled = filteredClientInvoices.reduce((sum, i) => sum + i.total, 0);
  const totalCredited = clientPayIds.reduce((sum, p) => sum + p.amount, 0);
  const balanceOutstanding = totalBilled - totalCredited;

  return (
    <div className="flex flex-col gap-6 font-sans">

      {/* Header Info */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Client Statements & Ledgers</h2>
        <p className="text-xs text-slate-500">Review billing ledgers, summarize transaction credits, and generate printable statements for single clients.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step 1: Select Client & Filter range Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">Statement Parameters</h3>
          </div>

          <div className="flex flex-col gap-3">
            {/* Pick Client */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase">Select Target Client</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="border border-slate-200 p-2.5 rounded-lg text-xs outline-none bg-slate-50 hover:bg-white focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">-- Choose Account --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Start date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* End date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[30, 60, 90, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => applyRange(d)}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer border border-slate-200"
                >
                  {d === 365 ? '1Y' : `${d}d`}
                </button>
              ))}
            </div>
          </div>

          {selectedClientId && (
            <button
              onClick={() => setShowStatementPrint(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-white" />
              Customize Print Template
            </button>
          )}
        </div>

        {/* Step 2: Statement Details Sheet view */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2 flex flex-col gap-6">
          {!selectedClientId ? (
            <div className="text-center py-20 text-slate-400 font-sans flex flex-col justify-center items-center gap-2">
              <Landmark className="w-10 h-10 text-slate-300" />
              <h4 className="font-bold text-slate-705">Account Statement Builder</h4>
              <p className="text-xs max-w-sm leading-relaxed text-slate-400">Pick a corporate client and define dates range to render dynamic ledger logs, tracking total in-flow vs arrears statements.</p>
            </div>
          ) : (
            <>
              {/* Profile card summary */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 p-1 px-2.5 rounded-full uppercase font-mono border border-blue-100">Statement for:</span>
                  <h3 className="text-lg font-bold text-slate-800 leading-snug mt-2">{selectedClient?.name}</h3>
                  <p className="text-xs text-slate-500">{selectedClient?.email} &bull; {selectedClient?.company}</p>
                </div>
                <div className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-205 p-2.5 rounded-lg text-right">
                  <span className="font-semibold text-slate-505 font-sans">Statement range:</span>
                  <p className="text-slate-600 mt-0.5">{startDate} to {endDate}</p>
                </div>
              </div>

              {/* Dynamic Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-lg text-center font-sans">
                  <span className="text-[9px] font-mono uppercase font-bold text-slate-400 tracking-wider">Total Billed Amt</span>
                  <p className="text-lg font-bold text-slate-800 mt-1">{formatMoney(totalBilled, currency)}</p>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-lg text-center font-sans">
                  <span className="text-[9px] font-mono uppercase font-bold text-emerald-500 tracking-wider font-sans">Total Credits Received</span>
                  <p className="text-lg font-bold text-emerald-600 mt-1">{formatMoney(totalCredited, currency)}</p>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-lg text-center font-sans">
                  <span className="text-[9px] font-mono uppercase font-bold text-slate-400 tracking-wider">Arrears Balance</span>
                  <p className={`text-lg font-bold mt-1 ${balanceOutstanding > 0 ? 'text-red-650' : 'text-emerald-600'}`}>
                    {formatMoney(balanceOutstanding, currency)}
                  </p>
                </div>
              </div>

              {/* Transaction Tables */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-3">Reconciled Statements Table</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-650 border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px] text-slate-400 font-mono">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Transaction details</th>
                        <th className="py-2.5 px-3 text-right">Debit ($)</th>
                        <th className="py-2.5 px-3 text-right">Credit / Paid ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredClientInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50/20">
                          <td className="py-2.5 px-3">{inv.issueDate}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-700">Corporate Invoice Generated ({inv.invoiceNumber})</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">${inv.total.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                        </tr>
                      ))}

                      {clientPayIds.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/20">
                          <td className="py-2.5 px-3">{p.paymentDate}</td>
                          <td className="py-2.5 px-3 font-sans text-emerald-600">Reconciled Payment via {p.paymentMethod}</td>
                          <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">(${p.amount.toFixed(2)})</td>
                        </tr>
                      ))}

                      {filteredClientInvoices.length === 0 && clientPayIds.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 font-sans">No transactions recorded for this client within range.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Sheet view modal trigger */}
      {showStatementPrint && selectedClient && (
        <DocumentTemplates
          document={{}}
          type="statement"
          statementData={{
            client: selectedClient,
            invoices: filteredClientInvoices,
            payments: clientPayIds,
            startDate,
            endDate
          }}
          onClose={() => setShowStatementPrint(false)}
          businessProfile={settings}
        />
      )}

    </div>
  );
};
