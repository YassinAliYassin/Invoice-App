import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Quotation, Client, InvoiceItem, CurrencyCode, CURRENCY_SYMBOLS } from '../types';
import { Plus, Trash2, Search, Calendar, FileText, Check, X, ArrowRight, ClipboardCheck, AlertCircle } from 'lucide-react';
import { DocumentTemplates } from './DocumentTemplates';

export const QuotationModule: React.FC = () => {
  const {
    quotations,
    clients,
    inventory,
    saveQuotation,
    removeQuotation,
    updateQuotationStatus,
    convertQuoteToInvoice,
    settings
  } = useBusiness();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedQuoteForPreview, setSelectedQuoteForPreview] = useState<Quotation | null>(null);

  // Form states
  const [clientId, setClientId] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('QT-' + Date.now().toString().slice(-5));
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 30 days
  const [currency, setCurrency] = useState<CurrencyCode>(settings.defaultCurrency as CurrencyCode || 'USD');
  const [notes, setNotes] = useState('');
  
  // Custom draft line item builder lists
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 1, price: 0, taxRate: 10 }
  ]);
  const [errorLocal, setErrorLocal] = useState('');

  const filteredQuotes = quotations.filter(q =>
    q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Line item picker helper
  const handleItemSelect = (index: number, itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      description: item.name,
      price: item.price,
      taxRate: item.taxRate || 10,
      sku: item.sku
    };
    setLineItems(updated);
  };

  const addLine = () => {
    setLineItems([...lineItems, { id: Date.now().toString(), description: "", quantity: 1, price: 0, taxRate: 10 }]);
  };

  const removeLine = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineValueChange = (index: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');

    if (!clientId) {
      setErrorLocal('Please pick a registered Client.');
      return;
    }

    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const validatedItems = lineItems.filter(i => i.description && i.quantity > 0 && i.price >= 0);
    if (validatedItems.length === 0) {
      setErrorLocal('Add at least 1 valid billing item.');
      return;
    }

    try {
      // Calculate subtotal and tax
      let subtotal = 0;
      let taxAmount = 0;
      validatedItems.forEach(item => {
        const itemSub = item.quantity * item.price;
        subtotal += itemSub;
        taxAmount += itemSub * (item.taxRate / 100);
      });

      const quotePayload = {
        id: "quote_" + Date.now().toString(),
        quotationNumber: quoteNumber,
        clientId,
        clientName: client.name,
        clientEmail: client.email,
        issueDate,
        expiryDate,
        items: validatedItems,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        currency,
        status: "draft" as const,
        notes
      };

      await saveQuotation(quotePayload);

      // Reset
      setClientId('');
      setQuoteNumber('QT-' + Date.now().toString().slice(-5));
      setNotes('');
      setLineItems([{ id: "1", description: "", quantity: 1, price: 0, taxRate: 10 }]);
      setShowAddForm(false);
    } catch (err: any) {
      setErrorLocal(err.message || 'Creating quotation failed.');
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 font-sans">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quotations & Proposals</h2>
          <p className="text-xs text-slate-500 font-sans">Draft professional business estimates, accept status pipelines, and convert to invoices in one click.</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-300 shadow-md cursor-pointer select-none active:scale-[0.98] ${
            showAddForm
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 shadow-rose-100/50'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-100 shadow-indigo-500/10'
          }`}
        >
          {showAddForm ? (
            <>
              <X className="w-4 h-4" />
              Close Form
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create New Quotation
            </>
          )}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-150 rounded-lg p-6 shadow-sm flex flex-col gap-4 max-w-4xl">
          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-2">Configure Quotation Proposal Sheet</h3>

          {errorLocal && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded p-3 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorLocal}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">Quote Code *</label>
              <input
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">Select Client Profile *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500"
                required
              >
                <option value="">-- Choose Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">Proposal Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500"
              >
                {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                  <option key={code} value={code}>
                    {code} ({symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">Proposal Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">Expiration date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Line item subform builder */}
          <div className="border border-zinc-150 rounded-lg p-4 bg-zinc-50/50 mt-2 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">Invoice Pricing Line Items</h4>
              <button
                type="button"
                onClick={addLine}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line Row
              </button>
            </div>

            {lineItems.map((line, idx) => (
              <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                {/* Inventory preset selection dropdown */}
                <div className="col-span-12 sm:col-span-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">Quick Product presets</span>
                  <select
                    onChange={(e) => handleItemSelect(idx, e.target.value)}
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none cursor-pointer"
                    defaultValue=""
                  >
                    <option value="">-- Choose Catalog Preset --</option>
                    {inventory.map(i => {
                      const prefix = i.type === 'service' ? '💼 [Service]' : i.type === 'item' ? '🔧 [Item]' : '📦 [Product]';
                      return (
                        <option key={i.id} value={i.id}>
                          {prefix} {i.name} ({i.currency} {i.price})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="col-span-6 sm:col-span-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">Description Row *</span>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => handleLineValueChange(idx, 'description', e.target.value)}
                    placeholder="E.g. Database Restruction"
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-1 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">Qty *</span>
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => handleLineValueChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none font-mono text-center"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">Price ({currency}) *</span>
                  <input
                    type="number"
                    value={line.price || ''}
                    onChange={(e) => handleLineValueChange(idx, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="120"
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none font-mono text-right"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-1 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">Tax %</span>
                  <input
                    type="number"
                    value={line.taxRate}
                    onChange={(e) => handleLineValueChange(idx, 'taxRate', parseInt(e.target.value) || 0)}
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none font-mono text-center"
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lineItems.length === 1}
                    className="text-xs text-red-400 hover:text-red-500 disabled:opacity-30 font-semibold"
                  >
                    Remove row
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-medium text-zinc-500 uppercase">Proposal Terms & Memo Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pricing reflects full technical stack rollout valid details. Offer valid for 30 consecutive calendar days."
              rows={2}
              className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 mt-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-550 transition-all cursor-pointer border border-transparent hover:border-slate-200 flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-100"
            >
              <Check className="w-3.5 h-3.5" />
              Issue Quotation Proposal
            </button>
          </div>
        </form>
      )}

      {/* Search Bar filter */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-400 focus-within:border-blue-500 w-full sm:max-w-md transition-all">
        <Search className="w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter proposals by code or customer..."
          className="text-xs w-full bg-transparent outline-none text-slate-700 font-sans"
        />
      </div>

      {/* Directory list of Issued Quotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredQuotes.map((q) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200">
            <div>
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                <div>
                  <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded leading-none">
                    {q.quotationNumber}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 font-sans">ISSUED: {q.issueDate}</p>
                </div>

                <div className="flex gap-1.5 items-center">
                  <span className={`text-[9px] font-bold uppercase p-1 px-2 rounded-full font-mono border ${
                    q.status === 'accepted' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                    q.status === 'declined' ? 'bg-red-50 border-red-100 text-red-650' :
                    'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    {q.status}
                  </span>
                  
                  <button
                    onClick={() => removeQuotation(q.id)}
                    className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                    title="Remove Quote"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[10px] text-slate-400 capitalize font-mono font-medium">CLIENT ACCOUNT</p>
                <h4 className="font-bold text-sm text-slate-800">{q.clientName}</h4>
                <p className="text-xs text-slate-500 truncate mt-0.5">{q.clientEmail}</p>
              </div>

              {/* Items summarized lists */}
              <div className="bg-slate-50/50 p-2.5 text-xs rounded-lg border border-slate-200 mb-4">
                <span className="text-[9px] uppercase font-mono font-semibold text-slate-400 tracking-wider">Line summary</span>
                <p className="truncate font-sans mt-0.5 text-slate-650">
                  {q.items.map(item => `${item.description} (x${item.quantity})`).join(', ')}
                </p>
              </div>

              <div className="flex justify-between items-baseline mb-4 text-xs font-sans">
                <span className="text-slate-400 font-mono font-semibold uppercase text-[10px]">Financial Total:</span>
                <div className="text-right">
                  <span className="font-mono font-black text-sm text-slate-800">
                    {q.currency} {q.total.toFixed(2)}
                  </span>
                  <p className="text-[9px] text-slate-400 font-mono leading-none">Tax incl: {q.currency} {q.taxAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Quote Action row */}
            <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-100 pt-4 mt-auto">
              <button
                onClick={() => setSelectedQuoteForPreview(q)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-600 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
              >
                <FileText className="w-4 h-4" />
                Customize Template
              </button>

              {q.status === 'draft' && (
                <>
                  <button
                    onClick={() => updateQuotationStatus(q.id, 'accepted')}
                    className="bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 text-emerald-700 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center transition-all cursor-pointer font-sans"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => updateQuotationStatus(q.id, 'declined')}
                    className="bg-red-50 border border-red-100 hover:bg-red-100/50 text-red-650 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center transition-all cursor-pointer font-sans"
                  >
                    Decline
                  </button>
                </>
              )}

              {q.status === 'accepted' && (
                <button
                  onClick={() => convertQuoteToInvoice(q.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans shadow-sm"
                >
                  Confirm Invoice
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredQuotes.length === 0 && (
          <div className="col-span-full border border-dashed border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center gap-2 bg-slate-50/50">
            <ClipboardCheck className="w-8 h-8 text-slate-300" />
            <h5 className="font-bold text-slate-700">No Proposals Logged</h5>
            <p className="text-xs leading-normal max-w-sm text-slate-400">Issue custom quotation rates with adjustable taxes to clients here. Convert accepted bids directly to drafts with a single button click.</p>
          </div>
        )}
      </div>

      {/* Print Document Template dialog */}
      {selectedQuoteForPreview && (
        <DocumentTemplates
          document={selectedQuoteForPreview}
          type="quotation"
          onClose={() => setSelectedQuoteForPreview(null)}
          businessProfile={settings}
        />
      )}

    </div>
  );
};
