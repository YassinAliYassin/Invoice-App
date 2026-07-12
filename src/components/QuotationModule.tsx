import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Quotation, InvoiceItem, CurrencyCode, CURRENCY_SYMBOLS } from '../types';
import {
  Plus,
  Trash2,
  Search,
  FileText,
  Check,
  X,
  ArrowRight,
  ClipboardCheck,
  AlertCircle,
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  Mail,
  Loader2,
} from 'lucide-react';
import { DocumentTemplates } from './DocumentTemplates';
import { downloadCsv } from '../utils/export';
import { sendBusinessEmail, isEmailConfigured } from '../utils/email-service';

export const QuotationModule: React.FC = () => {
  const {
    quotations,
    clients,
    inventory,
    saveQuotation,
    removeQuotation,
    updateQuotationStatus,
    convertQuoteToInvoice,
    settings,
  } = useBusiness();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'draft' | 'sent' | 'accepted' | 'declined'
  >('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedQuoteForPreview, setSelectedQuoteForPreview] =
    useState<Quotation | null>(null);

  const [clientId, setClientId] = useState('');
  const [quoteNumber, setQuoteNumber] = useState(
    'QT-' + Date.now().toString().slice(-5)
  );
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    (settings.defaultCurrency as CurrencyCode) || 'USD'
  );
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      price: 0,
      taxRate: settings.defaultTaxRate || 10,
    },
  ]);
  const [errorLocal, setErrorLocal] = useState('');
  const [successLocal, setSuccessLocal] = useState('');
  const [emailBusyId, setEmailBusyId] = useState<string | null>(null);

  const flashSuccess = (msg: string) => {
    setSuccessLocal(msg);
    setTimeout(() => setSuccessLocal(''), 3500);
  };

  const filteredQuotes = quotations.filter((q) => {
    const matchesSearch =
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || q.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleItemSelect = (index: number, itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      description: item.name,
      price: item.price,
      taxRate: item.taxRate || 10,
      sku: item.sku,
    };
    setLineItems(updated);
  };

  const addLine = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        price: 0,
        taxRate: settings.defaultTaxRate || 10,
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineValueChange = (
    index: number,
    field: keyof InvoiceItem,
    val: string | number
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: val };
    setLineItems(updated);
  };

  const resetForm = () => {
    setEditingId(null);
    setClientId('');
    setQuoteNumber('QT-' + Date.now().toString().slice(-5));
    setIssueDate(new Date().toISOString().split('T')[0]);
    setExpiryDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    setCurrency((settings.defaultCurrency as CurrencyCode) || 'USD');
    setNotes('');
    setLineItems([
      {
        id: '1',
        description: '',
        quantity: 1,
        price: 0,
        taxRate: settings.defaultTaxRate || 10,
      },
    ]);
    setShowAddForm(false);
    setErrorLocal('');
  };

  const openCreate = () => {
    resetForm();
    setShowAddForm(true);
  };

  const openEdit = (q: Quotation) => {
    if (q.status === 'accepted' || q.status === 'declined') {
      setErrorLocal(
        'Accepted or declined quotations cannot be edited. Duplicate it instead.'
      );
      return;
    }
    setEditingId(q.id);
    setClientId(q.clientId);
    setQuoteNumber(q.quotationNumber);
    setIssueDate(q.issueDate);
    setExpiryDate(q.expiryDate);
    setCurrency((q.currency as CurrencyCode) || 'USD');
    setNotes(q.notes || '');
    setLineItems(
      q.items.length
        ? q.items
        : [
            {
              id: '1',
              description: '',
              quantity: 1,
              price: 0,
              taxRate: settings.defaultTaxRate || 10,
            },
          ]
    );
    setShowAddForm(true);
    setErrorLocal('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');

    if (!clientId) {
      setErrorLocal('Please pick a registered client for this quotation.');
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const validatedItems = lineItems.filter(
      (i) => i.description && i.quantity > 0 && i.price >= 0
    );
    if (validatedItems.length === 0) {
      setErrorLocal('Add at least 1 valid line item.');
      return;
    }

    try {
      let subtotal = 0;
      let taxAmount = 0;
      validatedItems.forEach((item) => {
        const itemSub = item.quantity * item.price;
        subtotal += itemSub;
        taxAmount += itemSub * (item.taxRate / 100);
      });

      const existing = editingId
        ? quotations.find((q) => q.id === editingId)
        : null;

      await saveQuotation({
        id: editingId || 'quote_' + Date.now().toString(),
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
        status: (existing?.status || 'draft') as Quotation['status'],
        notes,
      });

      flashSuccess(
        editingId
          ? `Quotation ${quoteNumber} updated.`
          : `Quotation ${quoteNumber} created.`
      );
      resetForm();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Creating quotation failed.';
      setErrorLocal(msg);
    }
  };

  const duplicateQuotation = async (q: Quotation) => {
    const copyNum = 'QT-' + Date.now().toString().slice(-6);
    await saveQuotation({
      id: 'quote_' + Date.now().toString(),
      quotationNumber: copyNum,
      clientId: q.clientId,
      clientName: q.clientName,
      clientEmail: q.clientEmail,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      items: q.items,
      subtotal: q.subtotal,
      taxAmount: q.taxAmount,
      total: q.total,
      currency: q.currency,
      status: 'draft',
      notes: q.notes
        ? `Duplicated from ${q.quotationNumber}. ${q.notes}`
        : `Duplicated from ${q.quotationNumber}.`,
    });
    flashSuccess(`Duplicated as quotation ${copyNum}`);
  };

  const exportQuotationsCsv = () => {
    downloadCsv(
      `quotations-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Quotation #',
        'Client',
        'Email',
        'Issue Date',
        'Expiry Date',
        'Status',
        'Currency',
        'Subtotal',
        'Tax',
        'Total',
      ],
      quotations.map((q) => [
        q.quotationNumber,
        q.clientName,
        q.clientEmail,
        q.issueDate,
        q.expiryDate,
        q.status,
        q.currency,
        q.subtotal.toFixed(2),
        q.taxAmount.toFixed(2),
        q.total.toFixed(2),
      ])
    );
    flashSuccess('Quotations exported to CSV.');
  };

  const emailQuotation = async (q: Quotation) => {
    if (!q.clientEmail) {
      setErrorLocal('This quotation has no client email.');
      return;
    }
    setEmailBusyId(q.id);
    setErrorLocal('');
    try {
      const lines = q.items
        .map(
          (i) =>
            `  - ${i.description}: ${i.quantity} × ${q.currency} ${i.price.toFixed(2)}`
        )
        .join('\n');
      const subject = `${settings.businessName || 'Quotation'} — ${q.quotationNumber}`;
      const body = `Dear ${q.clientName},

Please find our quotation details below.

Quotation: ${q.quotationNumber}
Issue date: ${q.issueDate}
Valid until: ${q.expiryDate}
Status: ${q.status}

Line items:
${lines}

Subtotal: ${q.currency} ${q.subtotal.toFixed(2)}
Tax: ${q.currency} ${q.taxAmount.toFixed(2)}
Total: ${q.currency} ${q.total.toFixed(2)}

${q.notes ? `Notes:\n${q.notes}\n\n` : ''}We look forward to working with you.

Best regards,
${settings.businessName || ''}
${settings.businessEmail || ''}
${settings.businessPhone || ''}
`;
      const result = await sendBusinessEmail(
        {
          to: q.clientEmail,
          toName: q.clientName,
          subject,
          body,
          fromName: settings.businessName,
          fromEmail: settings.businessEmail,
          replyTo: settings.businessEmail,
        },
        settings
      );
      if (result.success) {
        if (q.status === 'draft') {
          await updateQuotationStatus(q.id, 'sent');
        }
        flashSuccess(result.message);
      } else {
        setErrorLocal(result.message || 'Failed to send quotation email.');
      }
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : 'Email failed.');
    } finally {
      setEmailBusyId(null);
    }
  };

  const handleConvert = async (quoteId: string) => {
    await convertQuoteToInvoice(quoteId);
    flashSuccess('Quotation converted to a draft invoice.');
  };

  const stats = {
    total: quotations.length,
    draft: quotations.filter((q) => q.status === 'draft').length,
    sent: quotations.filter((q) => q.status === 'sent').length,
    accepted: quotations.filter((q) => q.status === 'accepted').length,
    declined: quotations.filter((q) => q.status === 'declined').length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            Sales pipeline
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Quotations
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Create proposals, email clients, track acceptance, convert to invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportQuotationsCsv}
            disabled={quotations.length === 0}
            className="btn-secondary disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => (showAddForm ? resetForm() : openCreate())}
            className={showAddForm ? 'btn-secondary !text-rose-600 !border-rose-200' : 'btn-primary'}
          >
            {showAddForm ? (
              <>
                <X className="w-4 h-4" />
                Close
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                New quotation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All', value: stats.total, cls: 'bg-slate-100 text-slate-700' },
          { label: 'Draft', value: stats.draft, cls: 'bg-slate-50 text-slate-500' },
          { label: 'Sent', value: stats.sent, cls: 'bg-blue-50 text-blue-700' },
          {
            label: 'Accepted',
            value: stats.accepted,
            cls: 'bg-emerald-50 text-emerald-700',
          },
          {
            label: 'Declined',
            value: stats.declined,
            cls: 'bg-red-50 text-red-600',
          },
        ].map((s) => (
          <span
            key={s.label}
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${s.cls}`}
          >
            {s.label}: {s.value}
          </span>
        ))}
      </div>

      {successLocal && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successLocal}
        </div>
      )}

      {errorLocal && !showAddForm && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded p-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorLocal}</span>
          <button
            type="button"
            onClick={() => setErrorLocal('')}
            className="ml-auto font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-zinc-150 rounded-lg p-6 shadow-sm flex flex-col gap-4 max-w-4xl"
        >
          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-2">
            {editingId ? 'Edit Quotation' : 'New Quotation'}
          </h3>

          {errorLocal && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded p-3 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorLocal}</span>
            </div>
          )}

          {clients.length === 0 && (
            <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-lg p-3 text-xs">
              Add a client first under <strong>Clients register</strong>, then
              create a quotation for them.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">
                Quotation number *
              </label>
              <input
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500"
                required
              >
                <option value="">-- Choose client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">
                Currency
              </label>
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
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">
                Issue date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-zinc-500 uppercase">
                Valid until
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="border border-zinc-150 rounded-lg p-4 bg-zinc-50/50 mt-2 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
                Quotation line items
              </h4>
              <button
                type="button"
                onClick={addLine}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Add line
              </button>
            </div>

            {lineItems.map((line, idx) => (
              <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">
                    From inventory
                  </span>
                  <select
                    onChange={(e) => handleItemSelect(idx, e.target.value)}
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none cursor-pointer"
                    defaultValue=""
                  >
                    <option value="">-- Catalog item --</option>
                    {inventory.map((i) => {
                      const prefix =
                        i.type === 'service'
                          ? '💼'
                          : i.type === 'item'
                            ? '🔧'
                            : '📦';
                      return (
                        <option key={i.id} value={i.id}>
                          {prefix} {i.name} ({i.currency} {i.price})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="col-span-6 sm:col-span-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">
                    Description *
                  </span>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) =>
                      handleLineValueChange(idx, 'description', e.target.value)
                    }
                    placeholder="E.g. Website redesign"
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-1 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">
                    Qty *
                  </span>
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) =>
                      handleLineValueChange(
                        idx,
                        'quantity',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none font-mono text-center"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">
                    Price ({currency}) *
                  </span>
                  <input
                    type="number"
                    value={line.price || ''}
                    onChange={(e) =>
                      handleLineValueChange(
                        idx,
                        'price',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="120"
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none font-mono text-right"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-1 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">
                    Tax %
                  </span>
                  <input
                    type="number"
                    value={line.taxRate}
                    onChange={(e) =>
                      handleLineValueChange(
                        idx,
                        'taxRate',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="border border-zinc-200 bg-white rounded p-1.5 text-xs outline-none font-mono text-center"
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lineItems.length === 1}
                    className="text-xs text-red-400 hover:text-red-500 disabled:opacity-30 font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-medium text-zinc-500 uppercase">
              Terms &amp; notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Offer valid for 30 days. Payment terms on acceptance."
              rows={2}
              className="border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 mt-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={resetForm}
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
              {editingId ? 'Save quotation' : 'Create quotation'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-400 focus-within:border-blue-500 w-full sm:max-w-md transition-all">
          <Search className="w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotations by number or client..."
            className="text-xs w-full bg-transparent outline-none text-slate-700 font-sans"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
          {(
            ['all', 'draft', 'sent', 'accepted', 'declined'] as const
          ).map((stat) => (
            <button
              key={stat}
              onClick={() => setFilterStatus(stat)}
              className={`py-1 px-3 text-[10px] rounded-md uppercase font-bold transition-all cursor-pointer ${
                filterStatus === stat
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {stat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredQuotes.map((q) => (
          <div
            key={q.id}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                <div>
                  <span className="font-mono text-xs text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded leading-none">
                    {q.quotationNumber}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 font-sans">
                    ISSUED: {q.issueDate} · VALID TO: {q.expiryDate}
                  </p>
                </div>

                <div className="flex gap-1.5 items-center">
                  <span
                    className={`text-[9px] font-bold uppercase p-1 px-2 rounded-full font-mono border ${
                      q.status === 'accepted'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : q.status === 'declined'
                          ? 'bg-red-50 border-red-100 text-red-650'
                          : q.status === 'sent'
                            ? 'bg-blue-50 border-blue-100 text-blue-600'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {q.status}
                  </span>

                  <button
                    onClick={() => duplicateQuotation(q)}
                    className="p-1 rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                    title="Duplicate quotation"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {q.status !== 'accepted' && q.status !== 'declined' && (
                    <button
                      onClick={() => openEdit(q)}
                      className="p-1 rounded text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                      title="Edit quotation"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete quotation ${q.quotationNumber}?`
                        )
                      ) {
                        removeQuotation(q.id);
                      }
                    }}
                    className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                    title="Delete quotation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[10px] text-slate-400 capitalize font-mono font-medium">
                  CLIENT
                </p>
                <h4 className="font-bold text-sm text-slate-800">
                  {q.clientName}
                </h4>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {q.clientEmail}
                </p>
              </div>

              <div className="bg-slate-50/50 p-2.5 text-xs rounded-lg border border-slate-200 mb-4">
                <span className="text-[9px] uppercase font-mono font-semibold text-slate-400 tracking-wider">
                  Line items
                </span>
                <p className="truncate font-sans mt-0.5 text-slate-650">
                  {q.items
                    .map((item) => `${item.description} (x${item.quantity})`)
                    .join(', ')}
                </p>
              </div>

              <div className="flex justify-between items-baseline mb-4 text-xs font-sans">
                <span className="text-slate-400 font-mono font-semibold uppercase text-[10px]">
                  Quotation total
                </span>
                <div className="text-right">
                  <span className="font-mono font-black text-sm text-slate-800">
                    {q.currency} {q.total.toFixed(2)}
                  </span>
                  <p className="text-[9px] text-slate-400 font-mono leading-none">
                    Tax: {q.currency} {q.taxAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 mt-auto">
              {(q.status === 'draft' || q.status === 'sent') && (
                <div className="flex flex-wrap gap-2">
                  {q.status === 'draft' && (
                    <button
                      onClick={() => updateQuotationStatus(q.id, 'sent')}
                      className="flex-1 min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Mark as Sent
                    </button>
                  )}
                  <button
                    onClick={() => updateQuotationStatus(q.id, 'accepted')}
                    className="flex-1 min-w-[80px] bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={() => updateQuotationStatus(q.id, 'declined')}
                    className="flex-1 min-w-[80px] bg-red-50 border border-red-100 hover:bg-red-100 text-red-650 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setSelectedQuoteForPreview(q)}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-600 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
                >
                  <FileText className="w-4 h-4" />
                  Preview &amp; Print
                </button>

                <button
                  onClick={() => emailQuotation(q)}
                  disabled={emailBusyId === q.id}
                  className="flex-1 bg-white hover:bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title={
                    isEmailConfigured(settings)
                      ? 'Email via EmailJS'
                      : 'Open in mail app'
                  }
                >
                  {emailBusyId === q.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  Email client
                </button>

                {q.status === 'accepted' && (
                  <button
                    onClick={() => handleConvert(q.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans shadow-sm"
                  >
                    Convert to Invoice
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredQuotes.length === 0 && (
          <div className="col-span-full border border-dashed border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center gap-2 bg-slate-50/50">
            <ClipboardCheck className="w-8 h-8 text-slate-300" />
            <h5 className="font-bold text-slate-700">No quotations yet</h5>
            <p className="text-xs leading-normal max-w-sm text-slate-400">
              Create a quotation for a client, email it, track acceptance, then
              convert it to an invoice in one click.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-700"
            >
              Create first quotation
            </button>
          </div>
        )}
      </div>

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
