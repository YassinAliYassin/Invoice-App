import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Invoice, InvoiceItem, CurrencyCode, CURRENCY_SYMBOLS } from '../types';
import { Plus, Trash2, Search, FileText, Send, CreditCard, Eye, AlertCircle, RefreshCw, X, Check, Pencil, CheckCircle2, Loader2, Download, Copy } from 'lucide-react';
import { DocumentTemplates } from './DocumentTemplates';
import {
  generatePaymentReminder,
  sendBusinessEmail,
  isEmailConfigured,
} from '../utils/email-service';
import { downloadCsv } from '../utils/export';

export const InvoiceModule: React.FC = () => {
  const {
    invoices,
    clients,
    inventory,
    saveInvoice,
    removeInvoice,
    updateInvoiceStatus,
    recordPayment,
    payments,
    settings
  } = useBusiness();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<Invoice | null>(null);

  // Form states
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-' + Date.now().toString().slice(-5));
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 15 Days
  const [currency, setCurrency] = useState<CurrencyCode>(settings.defaultCurrency as CurrencyCode || 'USD');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 1, price: 0, taxRate: settings.defaultTaxRate || 10 }
  ]);

  // Payment record subform modal state
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payRef, setPayRef] = useState('');

  // AI-Reminder Dialog states
  const [aiReminderInvoice, setAiReminderInvoice] = useState<Invoice | null>(null);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [aiDraftSubject, setAiDraftSubject] = useState('');
  const [aiDraftBody, setAiDraftBody] = useState('');
  const [emailStatusMessage, setEmailStatusMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');
  const [successLocal, setSuccessLocal] = useState('');

  const flashSuccess = (msg: string) => {
    setSuccessLocal(msg);
    setTimeout(() => setSuccessLocal(''), 3500);
  };

  // Core filter logic
  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          i.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || i.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Load selected stock specs
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

  const resetForm = () => {
    setEditingId(null);
    setClientId('');
    setInvoiceNumber('INV-' + Date.now().toString().slice(-5));
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setCurrency((settings.defaultCurrency as CurrencyCode) || 'USD');
    setNotes('');
    setLineItems([{ id: '1', description: '', quantity: 1, price: 0, taxRate: settings.defaultTaxRate || 10 }]);
    setShowAddForm(false);
    setErrorLocal('');
  };

  const openCreate = () => {
    resetForm();
    setShowAddForm(true);
  };

  const openEdit = (inv: Invoice) => {
    if (inv.status === 'paid') {
      setErrorLocal('Paid invoices cannot be edited. Create a credit note workflow manually if needed.');
      return;
    }
    setEditingId(inv.id);
    setClientId(inv.clientId);
    setInvoiceNumber(inv.invoiceNumber);
    setIssueDate(inv.issueDate);
    setDueDate(inv.dueDate);
    setCurrency((inv.currency as CurrencyCode) || 'USD');
    setNotes(inv.notes || '');
    setLineItems(
      inv.items.length
        ? inv.items
        : [{ id: '1', description: '', quantity: 1, price: 0, taxRate: settings.defaultTaxRate || 10 }]
    );
    setShowAddForm(true);
    setErrorLocal('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');

    if (!clientId) {
      setErrorLocal('Please pick a registered customer.');
      return;
    }

    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const validatedItems = lineItems.filter(i => i.description && i.quantity > 0 && i.price >= 0);
    if (validatedItems.length === 0) {
      setErrorLocal('Add at least 1 valid line item.');
      return;
    }

    try {
      let subtotal = 0;
      let taxAmount = 0;
      validatedItems.forEach(item => {
        const itemSub = item.quantity * item.price;
        subtotal += itemSub;
        taxAmount += itemSub * (item.taxRate / 100);
      });

      const existing = editingId ? invoices.find((i) => i.id === editingId) : null;

      const invoicePayload = {
        id: editingId || 'inv_' + Date.now().toString(),
        invoiceNumber,
        clientId,
        clientName: client.name,
        clientEmail: client.email,
        issueDate,
        dueDate,
        items: validatedItems,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        currency,
        status: (existing?.status || 'draft') as Invoice['status'],
        notes
      };

      await saveInvoice(invoicePayload);
      flashSuccess(editingId ? `Invoice ${invoiceNumber} updated.` : `Invoice ${invoiceNumber} created.`);
      resetForm();
    } catch (err: any) {
      setErrorLocal(err.message || 'Invoice generation error');
    }
  };

  const duplicateInvoice = async (inv: Invoice) => {
    const copy: Omit<Invoice, 'userId' | 'createdAt' | 'updatedAt'> = {
      ...inv,
      id: 'inv_' + Date.now().toString(),
      invoiceNumber: 'INV-' + Date.now().toString().slice(-6),
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      notes: inv.notes
        ? `Duplicated from ${inv.invoiceNumber}. ${inv.notes}`
        : `Duplicated from ${inv.invoiceNumber}.`,
    };
    await saveInvoice(copy);
    flashSuccess(`Duplicated as ${copy.invoiceNumber}`);
  };

  const exportInvoicesCsv = () => {
    downloadCsv(
      `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Invoice #',
        'Client',
        'Email',
        'Issue Date',
        'Due Date',
        'Status',
        'Currency',
        'Subtotal',
        'Tax',
        'Total',
        'Paid',
        'Balance',
      ],
      invoices.map((i) => {
        const paid = payments
          .filter((p) => p.invoiceId === i.id)
          .reduce((s, p) => s + p.amount, 0);
        return [
          i.invoiceNumber,
          i.clientName,
          i.clientEmail,
          i.issueDate,
          i.dueDate,
          i.status,
          i.currency,
          i.subtotal.toFixed(2),
          i.taxAmount.toFixed(2),
          i.total.toFixed(2),
          paid.toFixed(2),
          (i.total - paid).toFixed(2),
        ];
      })
    );
    flashSuccess('Invoices exported to CSV.');
  };

  // Trigger Smart Reminder Draft
  const handleDraftAiReminder = async (invoice: Invoice) => {
    setAiReminderInvoice(invoice);
    setIsAiDrafting(true);
    setErrorLocal('');
    setAiDraftSubject('');
    setAiDraftBody('');
    setEmailStatusMessage('');

    const client = clients.find((c) => c.id === invoice.clientId);
    const clientName = client?.name || invoice.clientName;

    try {
      // Prefer server API when available; fall back to client-side draft
      try {
        const resp = await fetch('/api/generate-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoice,
            client: client || { name: clientName },
            businessName: settings.businessName,
            businessEmail: settings.businessEmail,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setAiDraftSubject(data.subject);
          setAiDraftBody(data.body);
          return;
        }
      } catch {
        /* static hosting or offline — use local generator */
      }

      const draft = generatePaymentReminder({
        invoice,
        clientName,
        businessName: settings.businessName,
        businessEmail: settings.businessEmail,
        template: settings.overdueAlertTemplate,
      });
      setAiDraftSubject(draft.subject);
      setAiDraftBody(draft.body);
    } finally {
      setIsAiDrafting(false);
    }
  };

  // Real EmailJS send (or mailto fallback)
  const handleSendEmail = async () => {
    if (!aiReminderInvoice || !aiDraftSubject || !aiDraftBody) return;
    setIsSendingEmail(true);
    setErrorLocal('');
    setEmailStatusMessage('');

    try {
      const result = await sendBusinessEmail(
        {
          to: aiReminderInvoice.clientEmail,
          toName: aiReminderInvoice.clientName,
          subject: aiDraftSubject,
          body: aiDraftBody,
          fromName: settings.businessName,
          fromEmail: settings.businessEmail,
          replyTo: settings.businessEmail,
        },
        settings
      );

      if (result.success) {
        setEmailStatusMessage(result.message);
        if (aiReminderInvoice.status === 'draft') {
          await updateInvoiceStatus(aiReminderInvoice.id, 'sent');
        }
      } else {
        setErrorLocal(result.message || 'Dispatch failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send email.';
      setErrorLocal(msg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Save payments registry
  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentInvoice || payAmount <= 0) return;

    try {
      await recordPayment({
        id: "pay_" + Date.now().toString(),
        invoiceId: activePaymentInvoice.id,
        invoiceNumber: activePaymentInvoice.invoiceNumber,
        clientId: activePaymentInvoice.clientId,
        clientName: activePaymentInvoice.clientName,
        amount: payAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: payMethod,
        reference: payRef
      });

      // Clear
      setActivePaymentInvoice(null);
      setPayAmount(0);
      setPayRef('');
    } catch (err: any) {
      setErrorLocal(err.message || "Recording payment failed");
    }
  };

  return (
    <div className="flex flex-col gap-6">

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="badge bg-blue-50 text-blue-700 border border-blue-100 mb-2">
            Billing
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoices</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Create bills, collect payments, chase overdue balances, export reports.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportInvoicesCsv}
            disabled={invoices.length === 0}
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
                New invoice
              </>
            )}
          </button>
        </div>
      </div>

      {successLocal && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successLocal}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4 max-w-4xl">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
            {editingId ? 'Edit Invoice' : 'Configure Client Invoice Details'}
          </h3>

          {errorLocal && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded p-3 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorLocal}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Invoice Number *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Select Client Profile *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 bg-white"
                required
              >
                <option value="">-- Choose Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Billing Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 bg-white cursor-pointer"
              >
                {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                  <option key={code} value={code}>
                    {code} ({symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Lines subform */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 mt-2 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Invoice Billing Items</h4>
              <button
                type="button"
                onClick={addLine}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Billing Line Row
              </button>
            </div>

            {lineItems.map((line, idx) => (
              <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase">Add registered catalog item</span>
                  <select
                    onChange={(e) => handleItemSelect(idx, e.target.value)}
                    className="border border-slate-205 bg-white rounded-lg p-1.5 text-xs outline-none cursor-pointer"
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
                  <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase">Service/Product Description *</span>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => handleLineValueChange(idx, 'description', e.target.value)}
                    placeholder="E.g. Full Cloud Setup Services"
                    className="border border-slate-205 bg-white rounded-lg p-1.5 text-xs outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-1 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-450 font-mono uppercase">Qty *</span>
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => handleLineValueChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="border border-slate-205 bg-white rounded-lg p-1.5 text-xs outline-none font-mono text-center focus:border-blue-500"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase">Price ({currency}) *</span>
                  <input
                    type="number"
                    value={line.price || ''}
                    onChange={(e) => handleLineValueChange(idx, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="100.00"
                    className="border border-slate-205 bg-white rounded-lg p-1.5 text-xs outline-none font-mono text-right focus:border-blue-500"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-1 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase">Tax %</span>
                  <input
                    type="number"
                    value={line.taxRate}
                    onChange={(e) => handleLineValueChange(idx, 'taxRate', parseInt(e.target.value) || 0)}
                    className="border border-slate-205 bg-white rounded-lg p-1.5 text-xs outline-none font-mono text-center focus:border-blue-500"
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lineItems.length === 1}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                  >
                    Delete row
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-medium text-slate-500 uppercase">Billing Terms, Payment Details or Custom Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Full payment due in 15 business days. Please wire transfers strictly to routing check number."
              rows={2}
              className="border border-slate-205 bg-slate-50 hover:bg-white focus:bg-white rounded p-2 text-xs outline-none focus:border-blue-500 transition-all resize-none font-sans"
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
              {editingId ? 'Save Invoice Changes' : 'Issue & Register Invoice'}
            </button>
          </div>
        </form>
      )}

      {/* Filter and search group rows */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-400 focus-within:border-blue-500 w-full sm:max-w-md transition-all">
          <Search className="w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices by number or client name..."
            className="text-xs w-full bg-transparent outline-none text-slate-700 font-sans"
          />
        </div>

        {/* Filter status buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((stat) => (
            <button
              key={stat}
              onClick={() => setFilterStatus(stat)}
              className={`py-1 px-3 text-[10px] rounded-md uppercase font-bold transition-all cursor-pointer ${
                filterStatus === stat ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {stat}
            </button>
          ))}
        </div>
      </div>

      {/* Directory of Invoices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInvoices.map((i) => {
          const registeredPayments = payments.filter(p => p.invoiceId === i.id);
          const totalPaid = registeredPayments.reduce((sum, p) => sum + p.amount, 0);
          const outstandingBal = i.total - totalPaid;
          const isOverdue = new Date(i.dueDate) < new Date() && i.status !== 'paid';

          return (
            <div key={i.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200">
              <div>
                <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-md leading-none">
                      {i.invoiceNumber}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">ISSUED: {i.issueDate}</p>
                  </div>

                  <div className="flex gap-1.5 items-center">
                    <span className={`text-[9px] font-bold uppercase p-1 px-2 rounded-full font-mono border ${
                      i.status === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                      isOverdue || i.status === 'overdue' ? 'bg-red-50 border-red-100 text-red-600' :
                      totalPaid > 0 && outstandingBal > 0 ? 'bg-amber-50 border-amber-100 text-amber-700' :
                      i.status === 'sent' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                      'bg-slate-50 border-slate-205 text-slate-500'
                    }`}>
                      {i.status === 'paid'
                        ? 'Paid'
                        : totalPaid > 0 && outstandingBal > 0
                          ? 'Partial'
                          : isOverdue
                            ? 'Overdue'
                            : i.status}
                    </span>

                    <button
                      onClick={() => duplicateInvoice(i)}
                      className="p-1 rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                      title="Duplicate Invoice"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {i.status !== 'paid' && (
                      <button
                        onClick={() => openEdit(i)}
                        className="p-1 rounded text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        title="Edit Invoice"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete invoice ${i.invoiceNumber}?`)) removeInvoice(i.id);
                      }}
                      className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">CLIENT ACCOUNT</p>
                  <h4 className="font-bold text-sm text-slate-800 leading-tight">{i.clientName}</h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{i.clientEmail}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">DUE DATE: <strong className="text-slate-650">{i.dueDate}</strong></p>
                </div>

                {/* Amount detail list */}
                <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-4 font-sans">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-semibold font-mono tracking-wider">Invoiced</span>
                    <p className="font-mono text-xs font-bold text-slate-700">{i.currency} {i.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-semibold font-mono tracking-wider">Paid</span>
                    <p className="font-mono text-xs font-bold text-emerald-605">{i.currency} {totalPaid.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-semibold font-mono tracking-wider">Balance</span>
                    <p className={`font-mono text-xs font-bold ${outstandingBal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {i.currency} {outstandingBal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoices Action buttons */}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 mt-auto">
                {/* Status pipeline */}
                {i.status !== 'paid' && (
                  <div className="flex gap-2">
                    {i.status === 'draft' && (
                      <button
                        onClick={() => updateInvoiceStatus(i.id, 'sent')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Mark as Sent
                      </button>
                    )}
                    {(i.status === 'sent' || i.status === 'overdue' || i.status === 'draft') && (
                      <button
                        onClick={() => updateInvoiceStatus(i.id, 'paid')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark as Paid
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedInvoiceForPreview(i)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview & Print
                  </button>

                  {outstandingBal > 0 && (
                    <button
                      onClick={() => {
                        setActivePaymentInvoice(i);
                        setPayAmount(outstandingBal);
                      }}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Record Payment
                    </button>
                  )}
                </div>

                {outstandingBal > 0 && (
                  <button
                    onClick={() => handleDraftAiReminder(i)}
                    className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                    Draft AI Email Reminder
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-zinc-200 rounded-lg p-12 text-center flex flex-col items-center justify-center gap-2 bg-zinc-50/50">
            <FileText className="w-8 h-8 text-zinc-300" />
            <h5 className="font-bold text-zinc-750">No Invoices Located</h5>
            <p className="text-xs leading-normal max-w-sm text-zinc-400">Generate professional billing statements with automated calculations of taxes and discounts for corporate registers.</p>
          </div>
        )}
      </div>

      {/* 1. Record Payment Popup Dialog Modal */}
      {activePaymentInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-slate-900">Record Credit Transaction</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">Recording funds received toward Invoice {activePaymentInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setActivePaymentInvoice(null)} className="text-slate-400 hover:text-slate-650 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPaymentSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-medium text-slate-505">Amount Received ({activePaymentInvoice.currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="border border-slate-205 bg-slate-50 focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-medium text-slate-505">Payment Methodology</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="border border-slate-205 bg-slate-50 rounded-lg p-2 text-xs"
                >
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                  <option value="Cash">Cash Ledger</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Paypal">Paypal Wallet</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-medium text-slate-505">Transaction Reference Code / Memo</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="TXN-9012384"
                  className="border border-slate-205 bg-slate-50 focus:bg-white rounded-lg p-2.5 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActivePaymentInvoice(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 hover:bg-slate-55 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Apply Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Smart Overdue Email Reminder Assistant Drawer */}
      {aiReminderInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-pulse" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Smart Overdue Mailer</h3>
                  <p className="text-xs text-slate-500">Overdue Reminders dynamically customized based on invoice specifics.</p>
                </div>
              </div>
              <button onClick={() => setAiReminderInvoice(null)} className="text-slate-400 hover:text-slate-655 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            {/* Error alerts */}
            {errorLocal && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded p-3 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorLocal}</span>
              </div>
            )}

            {/* Success emails */}
            {emailStatusMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded p-3 text-xs">
                {emailStatusMessage}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-mono">Dispatched Destination:</span>
                <p className="text-xs font-bold text-slate-750">{aiReminderInvoice.clientEmail}</p>
              </div>

              {isAiDrafting ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500 text-xs font-mono">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                  <span>Analyzing overdue balances, compiling tax allocations, and drafting professional copy...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 font-mono">Mail Subject Line:</label>
                    <input
                      type="text"
                      value={aiDraftSubject}
                      onChange={(e) => setAiDraftSubject(e.target.value)}
                      className="border border-slate-205 rounded-lg p-2 text-xs font-bold outline-none font-sans focus:border-blue-500 hover:border-slate-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 font-mono">Mail Body Copy:</label>
                    <textarea
                      value={aiDraftBody}
                      onChange={(e) => setAiDraftBody(e.target.value)}
                      rows={10}
                      className="border border-slate-205 rounded-lg p-2.5 text-xs outline-none font-mono leading-relaxed whitespace-pre focus:border-blue-500 hover:border-slate-300"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-4 gap-3 flex-wrap">
              <div className="text-[10px] text-slate-400 font-mono max-w-[220px] leading-relaxed">
                {isEmailConfigured(settings)
                  ? 'EmailJS configured — one-click send'
                  : 'No EmailJS keys — opens your mail app (configure in Settings)'}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setAiReminderInvoice(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isAiDrafting || isSendingEmail || !aiDraftSubject}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isSendingEmail
                    ? 'Sending…'
                    : isEmailConfigured(settings)
                      ? 'Send Email'
                      : 'Open in Mail App'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER SHEET WRAPPER COMPONENT TEMPLATES FOR PRINTOUT */}
      {selectedInvoiceForPreview && (
        <DocumentTemplates
          document={selectedInvoiceForPreview}
          type="invoice"
          onClose={() => setSelectedInvoiceForPreview(null)}
          businessProfile={settings}
        />
      )}

    </div>
  );
};
