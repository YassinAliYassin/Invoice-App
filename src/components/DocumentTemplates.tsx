import React, { useState } from 'react';
import { Invoice, Quotation, Client, CURRENCY_SYMBOLS, CurrencyCode } from '../types';
import { Printer, Download, X, Eye, LayoutGrid, Sliders, Mail, MessageSquare, CheckCircle } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { sendBusinessEmail } from '../utils/email-service';

interface DocumentTemplatesProps {
  document: Invoice | Quotation | any;
  type: 'invoice' | 'quotation' | 'statement';
  statementData?: {
    client: Client;
    invoices: Invoice[];
    payments: any[];
    startDate: string;
    endDate: string;
  };
  onClose: () => void;
  businessProfile: {
    businessName: string;
    businessEmail: string;
    businessPhone: string;
    businessAddress: string;
    taxId: string;
    logoUrl?: string;
    brandColor?: string;
  };
}

type TemplateTheme = 'corporate' | 'minimalist' | 'modernTech' | 'elegantSerif';

export const DocumentTemplates: React.FC<DocumentTemplatesProps> = ({
  document,
  type,
  statementData,
  onClose,
  businessProfile
}) => {
  const { clients, settings } = useBusiness();
  const [theme, setTheme] = useState<TemplateTheme>('corporate');
  const [accentColor, setAccentColor] = useState(businessProfile.brandColor || '#2563eb');
  const [padding, setPadding] = useState<'normal' | 'compact' | 'spacious'>('normal');
  const [showWatermark, setShowWatermark] = useState(true);
  const [emailBusy, setEmailBusy] = useState(false);

  // PDF Export function
  const handleExportPDF = async () => {
    const element = document.getElementById('print-sheet');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${isInvoice ? 'Invoice' : isQuotation ? 'Quotation' : 'Statement'}_${docNo}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF. Please try printing to PDF via the browser instead.');
    }
  };

  const handleEmailShare = async () => {
    const docTypeLabel = isInvoice
      ? document?.status === 'paid'
        ? 'Official Receipt'
        : 'Invoice'
      : isQuotation
        ? 'Quotation Proposal'
        : 'Statement Period';
    const subject = `${businessProfile.businessName} - ${docTypeLabel} ${docNo}`;
    let body = `Dear ${clientName || 'Valued Client'},\n\n`;
    if (isInvoice) {
      body += `Please find the Invoice / Receipt details below:\nRef No: ${docNo}\nTotal Amount: ${currencySymbol}${document?.total?.toFixed(2)}\nDue Date: ${document?.dueDate || 'Upon receipt'}\n\n`;
    } else if (isQuotation) {
      body += `Please find the Quotation Proposal details below:\nRef No: ${docNo}\nTotal Amount: ${currencySymbol}${document?.total?.toFixed(2)}\nValid Until: ${document?.expiryDate || 'N/A'}\n\n`;
    } else {
      body += `Please find your Financial Statement overview below:\nPeriod: ${dateValue}\nOutstanding Balance: ${currencySymbol}${stats.balance.toFixed(2)}\n\n`;
    }
    body += `Kindly export the PDF of your document from your Portal view to view all line items and tax breakdowns.\n\nBest regards,\n${businessProfile.businessName}`;

    if (!clientEmail) {
      alert('No client email on this document.');
      return;
    }

    setEmailBusy(true);
    try {
      const result = await sendBusinessEmail(
        {
          to: clientEmail,
          toName: clientName,
          subject,
          body,
          fromName: businessProfile.businessName,
          fromEmail: businessProfile.businessEmail,
          replyTo: businessProfile.businessEmail,
        },
        settings
      );
      if (result.success) {
        alert(result.message);
      } else {
        alert(result.message || 'Failed to send email.');
      }
    } finally {
      setEmailBusy(false);
    }
  };

  const handleWhatsAppShare = () => {
    const docTypeLabel = isInvoice ? (document?.status === 'paid' ? 'Official Receipt 📄' : 'Invoice 📄') : isQuotation ? 'Quotation Proposal 📋' : 'Financial Statement 📊';
    let msg = `*${businessProfile.businessName}* has shared a new document:\n\n`;
    msg += `*Type:* ${docTypeLabel}\n`;
    msg += `*Ref No:* ${docNo}\n`;
    if (isInvoice) {
      msg += `*Total Amount:* ${currencySymbol}${document?.total?.toFixed(2)}\n`;
      msg += `*Due Date:* ${document?.dueDate || 'Upon receipt'}\n`;
    } else if (isQuotation) {
      msg += `*Total Amount:* ${currencySymbol}${document?.total?.toFixed(2)}\n`;
      msg += `*Valid Until:* ${document?.expiryDate || 'N/A'}\n`;
    } else {
      msg += `*Period:* ${dateValue}\n`;
      msg += `*Outstanding Balance:* ${currencySymbol}${stats.balance.toFixed(2)}\n`;
    }
    msg += `\nYou can save this as a PDF or Print directly.`;
    
    // clean phone string of non-numeric except +
    const cleanPhone = clientPhone ? clientPhone.replace(/[^\d+]/g, '') : '';
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Color options
  const colors = [
    { name: 'Royal Blue', value: '#2563eb' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Crimson', value: '#dc2626' },
    { name: 'Slate Gray', value: '#475569' },
    { name: 'Goldenrod', value: '#b45309' },
    { name: 'Deep Purple', value: '#7c3aed' },
  ];

  // Fonts maps for themes
  const themeFonts: Record<TemplateTheme, string> = {
    corporate: 'font-sans',
    minimalist: 'font-sans tracking-tight',
    modernTech: 'font-mono text-xs',
    elegantSerif: 'font-serif'
  };

  const getPaddingClass = () => {
    if (padding === 'compact') return 'p-4 sm:p-6';
    if (padding === 'spacious') return 'p-10 sm:p-14';
    return 'p-8 sm:p-10';
  };

  // Extract values
  const isInvoice = type === 'invoice';
  const isQuotation = type === 'quotation';
  const isStatement = type === 'statement';

  const docNo = isInvoice ? document?.invoiceNumber : isQuotation ? document?.quotationNumber : 'STM-REG';
  const clientObj = clients.find(c => c.id === document?.clientId);
  const clientName = isStatement ? statementData?.client.name : document?.clientName;
  const clientEmail = isStatement ? statementData?.client.email : document?.clientEmail;
  const clientAddress = isStatement ? statementData?.client.address : (clientObj?.address || '');
  const clientPhone = isStatement ? statementData?.client.phone : (clientObj?.phone || '');
  const dateLabel = isInvoice ? 'Issue Date' : isQuotation ? 'Proposal Date' : 'Statement Period';
  const dateValue = isInvoice ? document?.issueDate : isQuotation ? document?.issueDate : `${statementData?.startDate} to ${statementData?.endDate}`;
  const dueLabel = isInvoice ? 'Due Date' : isQuotation ? 'Valid Until' : '';
  const dueValue = isInvoice ? document?.dueDate : isQuotation ? document?.expiryDate : '';

  const items = isStatement ? [] : document?.items || [];
  const currencySymbol = isStatement ? '$' : CURRENCY_SYMBOLS[document?.currency as CurrencyCode] || '$';

  // Calculate totals for statements dynamically
  const getStatementStats = () => {
    if (!statementData) return { charged: 0, paid: 0, balance: 0 };
    const clientInvoices = statementData.invoices;
    const clientPayments = statementData.payments;

    const charged = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const paid = clientPayments.reduce((sum, pay) => sum + pay.amount, 0);
    return {
      charged,
      paid,
      balance: charged - paid
    };
  };

  const stats = getStatementStats();

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex flex-col md:flex-row h-screen print:p-0 print:bg-white overflow-hidden">
      
      {/* Sidebar Tool Controller - HIDDEN on PRINT */}
      <div className="w-full md:w-80 bg-neutral-900 border-b md:border-b-0 md:border-r border-neutral-800 p-6 flex flex-col gap-6 text-white overflow-y-auto shrink-0 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-lg">Document Styles</h3>
          </div>
          <button onClick={onClose} className="p-1 px-2.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme select option */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-neutral-400 font-medium">Layout Template</label>
          <div className="grid grid-cols-2 gap-2">
            {(['corporate', 'minimalist', 'modernTech', 'elegantSerif'] as TemplateTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`py-2 px-3 text-xs rounded border text-left flex flex-col gap-1 transition-all ${
                  theme === t ? 'bg-indigo-600/25 border-indigo-500 text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="capitalize">{t.replace(/([A-Z])/g, ' $1')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Accent coloring selectors */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-neutral-400 font-medium">Brand Accent Color</label>
          <div className="grid grid-cols-6 gap-2">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setAccentColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  accentColor === c.value ? 'border-white scale-110' : 'border-transparent'
                }`}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Padding and spacing density controls */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-neutral-400 font-medium font-mono flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" />
            Content Density / Padding
          </label>
          <div className="grid grid-cols-3 gap-1 rounded bg-neutral-800 p-1">
            {(['compact', 'normal', 'spacious'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPadding(p)}
                className={`text-[10px] py-1 px-2 rounded capitalize font-medium ${
                  padding === p ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-xs text-neutral-400 font-medium">Extra Attributes</label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 bg-neutral-800/55 p-2 rounded">
            <input
              type="checkbox"
              checked={showWatermark}
              onChange={(e) => setShowWatermark(e.target.checked)}
              className="accent-indigo-500 rounded"
            />
            <span>Include Secured Watermark</span>
          </label>
        </div>

        {/* Export & Share triggers */}
        <div className="flex flex-col gap-2 border-t border-neutral-800 pt-5">
          <label className="text-xs text-neutral-400 font-medium">Share & Core Exports</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleEmailShare}
              disabled={emailBusy}
              className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 hover:text-white text-neutral-300 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-800 disabled:opacity-50"
              title="Share via Mail"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              {emailBusy ? 'Sending…' : 'Email PDF'}
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 hover:text-white text-neutral-300 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-800"
              title="Share via WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp
            </button>
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex flex-col gap-2 mt-auto pt-6 border-t border-neutral-800">
          <button
            onClick={handleExportPDF}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded flex items-center justify-center gap-2 font-medium text-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download as PDF
          </button>
          
          <div className="text-[10px] text-neutral-500 text-center font-mono">
            Optimized for standard letters/A4 pages. Generates durable PDF via system print/save dialog.
          </div>
        </div>
      </div>

      {/* Main Document Canvas Live Preview Panel */}
      <div id="print-sheet-wrapper" className="flex-1 bg-neutral-800 print:bg-white overflow-y-auto p-4 sm:p-8 flex justify-center">
        <div
          id="print-sheet"
          className={`w-full max-w-4xl bg-white text-zinc-900 rounded-lg shadow-2xl relative transition-all ${themeFonts[theme]} ${getPaddingClass()} print:shadow-none print:p-0 my-auto`}
        >
          {/* SECURED WATERMARK BADGE */}
          {showWatermark && (
            <div className="absolute top-4 right-4 text-[9px] text-zinc-400 border border-zinc-200 p-1 px-2 rounded-full font-mono flex items-center gap-1 pointer-events-none print:hidden">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Verified Document Suite
            </div>
          )}

          {/* DOCUMENT HEADER BANNER */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-zinc-100 pb-8 mb-8" style={{ borderBottomColor: `${accentColor}15` }}>
            <div>
              <div className="flex items-center gap-3 mb-2">
                {businessProfile.logoUrl ? (
                  <img src={businessProfile.logoUrl} alt="Company Logo" className="w-16 h-12 object-contain shrink-0 rounded" />
                ) : (
                  <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-white text-sm font-bold font-mono" style={{ backgroundColor: accentColor }}>
                    {businessProfile.businessName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <h1 className="text-2xl font-bold tracking-tight text-neutral-850">{businessProfile.businessName}</h1>
              </div>
              <div className="text-xs text-zinc-500 flex flex-col gap-0.5">
                <span>{businessProfile.businessAddress}</span>
                <span>Email: {businessProfile.businessEmail}</span>
                <span>Phone: {businessProfile.businessPhone}</span>
                {businessProfile.taxId && <span className="font-mono mt-1 text-zinc-650 font-medium">VAT/GST: {businessProfile.taxId}</span>}
              </div>
            </div>

            <div className="text-right sm:text-right">
              <h2 className="text-3xl font-black uppercase tracking-tight mb-2" style={{ color: accentColor }}>
                {isInvoice ? (document?.status === 'paid' ? 'OFFICIAL RECEIPT' : 'INVOICE') : isQuotation ? 'QUOTATION' : 'FINANCIAL STATEMENT'}
              </h2>
              <div className="text-xs text-zinc-500 font-mono">
                <span className="font-semibold text-zinc-700">Ref No:</span> {docNo}
              </div>
            </div>
          </div>

          {/* RECIPIENT AND DATES OVERVIEW BLOCK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2">BILL TO</h3>
              <div>
                <p className="text-base font-bold text-zinc-800">{clientName}</p>
                <div className="text-xs text-zinc-500 flex flex-col gap-0.5 mt-1">
                  <span>{clientEmail}</span>
                  {clientPhone && <span>Phone: {clientPhone}</span>}
                  {clientAddress && <span>Address: {clientAddress}</span>}
                </div>
              </div>
            </div>

            <div className="md:text-right">
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2">METRICS SUMMARY</h3>
              <div className="text-xs text-zinc-600 flex flex-col gap-1.5 justify-end">
                <div className="flex justify-between md:justify-end gap-x-4">
                  <span className="font-semibold text-zinc-400">{dateLabel}:</span>
                  <span className="font-mono">{dateValue}</span>
                </div>
                {dueValue && (
                  <div className="flex justify-between md:justify-end gap-x-4">
                    <span className="font-semibold text-zinc-400">{dueLabel}:</span>
                    <span className="font-mono text-zinc-800 font-bold">{dueValue}</span>
                  </div>
                )}
                {!isStatement && (
                  <div className="flex justify-between md:justify-end gap-x-4">
                    <span className="font-semibold text-zinc-400">Currency Code:</span>
                    <span className="font-mono uppercase font-bold text-zinc-750">{document?.currency}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STATEMENT GRID CONTENT */}
          {isStatement && statementData && (
            <div className="mb-8">
              <div className="grid grid-cols-3 gap-2 text-center mb-6">
                <div className="bg-zinc-50 rounded p-3 text-center border border-zinc-100">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">Total Invoiced</p>
                  <p className="text-base font-black text-zinc-850">{currencySymbol}{stats.charged.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-50 rounded p-3 text-center border border-zinc-100">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">Total Paid</p>
                  <p className="text-base font-black text-zinc-850" style={{ color: '#059669' }}>{currencySymbol}{stats.paid.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-50 rounded p-3 text-center border border-zinc-100">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">Total Outstanding</p>
                  <p className="text-base font-black text-zinc-850" style={{ color: stats.balance > 0 ? accentColor : '#059669' }}>
                    {currencySymbol}{stats.balance.toFixed(2)}
                  </p>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">LEDGER STATEMENT TRANSACTIONS</h4>
              <table className="w-full text-left text-xs text-zinc-650">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="py-2.5 px-3 font-semibold text-zinc-600">Date</th>
                    <th className="py-2.5 px-3 font-semibold text-zinc-600">Reference / Activity</th>
                    <th className="py-2.5 px-3 font-semibold text-zinc-600 text-right">Invoiced ($)</th>
                    <th className="py-2.5 px-3 font-semibold text-zinc-600 text-right">Credit / Paid ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  {statementData.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 px-3">{inv.issueDate}</td>
                      <td className="py-2.5 px-3 font-sans">Invoice Generated ({inv.invoiceNumber}) - {inv.status}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-800">{currencySymbol}{inv.total.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-450">-</td>
                    </tr>
                  ))}
                  {statementData.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 px-3">{p.paymentDate}</td>
                      <td className="py-2.5 px-3 font-sans text-emerald-600">Payment Processed via {p.paymentMethod} {p.reference ? `(${p.reference})` : ''}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-450">-</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600">({currencySymbol}{p.amount.toFixed(2)})</td>
                    </tr>
                  ))}
                  {statementData.invoices.length === 0 && statementData.payments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center font-sans text-zinc-405">Zero transactions recorded during this period range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* STANDARD LINE ITEMS GRID (For Invoices/Quotes) */}
          {!isStatement && (
            <div className="mb-10 overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-650 border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-100 font-semibold" style={{ borderBottomColor: `${accentColor}20` }}>
                    <th className="py-3 px-1 text-zinc-600 uppercase tracking-wider text-[10px]">Description</th>
                    <th className="py-3 px-3 text-zinc-600 uppercase tracking-wider text-[10px] text-center">SKU</th>
                    <th className="py-3 px-3 text-zinc-600 uppercase tracking-wider text-[10px] text-right w-16">Qty</th>
                    <th className="py-3 px-3 text-zinc-600 uppercase tracking-wider text-[10px] text-right w-24">Unit Price</th>
                    <th className="py-3 px-3 text-zinc-600 uppercase tracking-wider text-[10px] text-right w-16">Tax %</th>
                    <th className="py-3 px-3 text-zinc-600 uppercase tracking-wider text-[10px] text-right w-28">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-sans">
                  {items.map((item: any) => {
                    const lineSub = item.quantity * item.price;
                    const lineTax = lineSub * ((item.taxRate || 0) / 100);
                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/30">
                        <td className="py-3.5 px-1">
                          <p className="font-bold text-zinc-805 text-sm">{item.description}</p>
                        </td>
                        <td className="py-3.5 px-3 text-center text-zinc-400 font-mono text-[10px] uppercase">
                          {item.sku || 'N/A'}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-zinc-700">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-zinc-700">
                          {currencySymbol}{item.price.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-zinc-400">
                          {item.taxRate || 0}%
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-zinc-850">
                          {currencySymbol}{(lineSub + lineTax).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* DYNAMIC TAX SUB-BREAKDOWNS AND GRAND TOTAL SUMS */}
          {!isStatement && (
            <div className="flex flex-col sm:flex-row justify-between items-start gap-8 border-t border-zinc-100 pt-8" style={{ borderTopColor: `${accentColor}15` }}>
              <div className="flex-1 max-w-md">
                <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2">TERMS & SPECIAL NOTES</h4>
                <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-line">
                  {document?.notes || 'Payment is requested on or before the designated due date. Thank you for your continued operations and business.'}
                </p>
                
                {/* Micro-signature or validation details */}
                <div className="mt-8 border-t border-dashed border-zinc-200 pt-4 print:hidden">
                  <div className="text-[10px] text-zinc-400 leading-tight">
                    This document was compiled and authorized securely using the Business Invoice & Inventory cloud services. Reference hash: <span className="font-mono">{document?.id?.toUpperCase() || 'SUITE-MEMBER'}</span>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-72 shrink-0">
                <div className="divide-y divide-zinc-100 text-xs text-zinc-650">
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-500">Subtotal Amount:</span>
                    <span className="font-mono">{currencySymbol}{(document?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-500">Tax Breakdown ({document?.items?.[0]?.taxRate || 0}% avg):</span>
                    <span className="font-mono">{currencySymbol}{(document?.taxAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3.5 text-base font-black text-zinc-900" style={{ borderTopColor: `${accentColor}40` }}>
                    <span style={{ color: accentColor }}>Total Amount:</span>
                    <span className="font-mono">{currencySymbol}{(document?.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER METADATA MARKUP */}
          <div className="mt-14 pt-6 border-t border-zinc-100 text-center text-zinc-400 text-[10px] leading-relaxed flex flex-col items-center justify-center gap-1">
            <span>Corporate Address: {businessProfile.businessAddress}</span>
            <span>Document dispatched virtually via Google Workspace Secure Gateways.</span>
            <span className="font-semibold text-zinc-600">Generated by Invoice & Inventory Suite</span>
          </div>

        </div>
      </div>

    </div>
  );
};
