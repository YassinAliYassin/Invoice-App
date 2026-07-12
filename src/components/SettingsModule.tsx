import React, { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { CurrencyCode, CURRENCY_SYMBOLS } from '../types';
import { Building2, Save, Mail, CheckCircle, Sliders, AlertCircle, Upload, Trash2, Palette, Image as ImageIcon, Send } from 'lucide-react';
import { isEmailConfigured } from '../utils/email-service';

const BRAND_PRESETS = [
  { name: 'Classic Blue', hex: '#2563eb' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'African Amber', hex: '#d97706' },
  { name: 'Royal Purple', hex: '#7c3aed' },
  { name: 'Corporate Indigo', hex: '#4f46e5' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Charcoal Noir', hex: '#374151' }
];

const DEFAULT_OVERDUE_TEMPLATE =
  `Dear {clientName},\n\nThis is a professional friendly reminder that Invoice {invoiceNumber} for the amount of {totalAmount} remains outstanding. Please resolve transfer on priority.\n\nBest regards,\n{businessName}`;

export const SettingsModule: React.FC = () => {
  const { settings, saveSettings, user } = useBusiness();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const [businessName, setBusinessName] = useState(settings.businessName || '');
  const [businessEmail, setBusinessEmail] = useState(settings.businessEmail || user?.email || '');
  const [businessPhone, setBusinessPhone] = useState(settings.businessPhone || '');
  const [businessAddress, setBusinessAddress] = useState(settings.businessAddress || '');
  const [taxId, setTaxId] = useState(settings.taxId || '');
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>((settings.defaultCurrency as CurrencyCode) || 'USD');
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(settings.defaultTaxRate || 10);
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '');
  const [brandColor, setBrandColor] = useState<string>(settings.brandColor || '#2563eb');
  const [overdueAlertTemplate, setOverdueAlertTemplate] = useState(
    settings.overdueAlertTemplate || DEFAULT_OVERDUE_TEMPLATE
  );
  const [emailjsServiceId, setEmailjsServiceId] = useState(settings.emailjsServiceId || '');
  const [emailjsTemplateId, setEmailjsTemplateId] = useState(settings.emailjsTemplateId || '');
  const [emailjsPublicKey, setEmailjsPublicKey] = useState(settings.emailjsPublicKey || '');

  // Keep form in sync when cloud/local settings load or update
  useEffect(() => {
    setBusinessName(settings.businessName || '');
    setBusinessEmail(settings.businessEmail || user?.email || '');
    setBusinessPhone(settings.businessPhone || '');
    setBusinessAddress(settings.businessAddress || '');
    setTaxId(settings.taxId || '');
    setDefaultCurrency((settings.defaultCurrency as CurrencyCode) || 'USD');
    setDefaultTaxRate(settings.defaultTaxRate || 10);
    setLogoUrl(settings.logoUrl || '');
    setBrandColor(settings.brandColor || '#2563eb');
    setOverdueAlertTemplate(settings.overdueAlertTemplate || DEFAULT_OVERDUE_TEMPLATE);
    setEmailjsServiceId(settings.emailjsServiceId || '');
    setEmailjsTemplateId(settings.emailjsTemplateId || '');
    setEmailjsPublicKey(settings.emailjsPublicKey || '');
  }, [settings, user?.email]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) { // limit 800kb to stay within storage limits
      setErrorLocal('Please upload a smaller logo image under 800KB for maximum compatibility.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
      setErrorLocal('');
    };
    reader.onerror = () => {
      setErrorLocal('Failed to read logo image data. Try another file format.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setLogoUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorLocal('');

    if (!businessName || !businessEmail) {
      setErrorLocal('Please input valid Company Profile values (Name & Email are required).');
      return;
    }

    try {
      await saveSettings({
        businessName,
        businessEmail,
        businessPhone,
        businessAddress,
        taxId,
        defaultCurrency,
        defaultTaxRate,
        overdueAlertTemplate,
        logoUrl,
        brandColor,
        emailjsServiceId: emailjsServiceId.trim(),
        emailjsTemplateId: emailjsTemplateId.trim(),
        emailjsPublicKey: emailjsPublicKey.trim(),
      });

      setSuccessMsg('Corporate presets synchronized successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorLocal(err.message || "Failed to update Settings context.");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-4xl font-sans">
      <div className="flex items-center gap-2.5 border-b border-slate-105 pb-4 mb-6">
        <Building2 className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Company Profile & Default Presets</h2>
          <p className="text-xs text-slate-400 mt-1">Configure corporate branding parameters, tax IDs, default currency triggers and printout terms details.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-xs rounded-lg mb-6 flex items-center gap-2 font-sans">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorLocal && (
        <div className="bg-red-50 border border-red-200 text-red-650 p-3 text-xs rounded-lg mb-6 flex items-center gap-2 font-sans">
          <AlertCircle className="w-4 h-4" />
          <span>{errorLocal}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 font-sans">
        
        {/* Core details row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase">Registered Company Name *</span>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 transition-all font-sans"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase">Corporate Email Address *</span>
            <input
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              className="border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 transition-all font-sans"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase">Business Hotline Telephone</span>
            <input
              type="text"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              className="border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 transition-all font-sans"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase">VAT / GST ID Number</span>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="VAT-US-990123"
              className="border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* Home adress info */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono font-semibold text-slate-400 uppercase">Registered Corporate HQ physical Address</span>
          <textarea
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            rows={2}
            className="border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 transition-all resize-none"
          />
        </div>

        {/* Brand Identity Customization */}
        <div className="border-t border-slate-100 pt-5 flex flex-col gap-4 animate-fadeIn">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5 animate-pulse">
            <Palette className="w-4 h-4 text-blue-600" />
            Corporate Identity & Brand Styling
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            {/* Logo upload field */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono font-semibold text-slate-400 uppercase">Company Logo Image</span>
              <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
                {logoUrl ? (
                  <div className="relative w-24 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                    <img src={logoUrl} alt="Company Logo" className="max-w-full max-h-full object-contain p-1" />
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition cursor-pointer"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <ImageIcon className="w-5 h-5 mb-1" />
                    <span className="text-[9px] font-mono leading-none">No Logo</span>
                  </div>
                )}
                
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 rounded-lg text-xs font-bold transition cursor-pointer self-start border border-slate-200">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 font-sans leading-tight">Supported layouts: PNG, JPEG or SVG. File size limits to under 800KB.</p>
                </div>
              </div>
            </div>

            {/* Color Customizer */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono font-semibold text-slate-400 uppercase">Brand Theme Accent Color</span>
              
              <div className="flex flex-wrap gap-2 mb-2">
                {BRAND_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setBrandColor(p.hex)}
                    className="w-7 h-7 rounded-lg border border-slate-200 shadow-sm transition hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                  >
                    {brandColor.toLowerCase() === p.hex.toLowerCase() && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-md inline-block" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg max-w-xs">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer outline-none bg-transparent"
                />
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase leading-none">Custom Accent Color Hex</span>
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="text-xs font-mono font-bold text-slate-700 outline-none w-24 bg-transparent uppercase mt-0.5"
                    placeholder="#2563EB"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global default multipliers presets */}
        <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-blue-600" />
            Global Defaults Configuration
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono font-semibold text-slate-400">Default Currency Settings</span>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value as CurrencyCode)}
                className="border border-slate-205 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 cursor-pointer"
              >
                {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                  <option key={code} value={code}>
                    {code} ({symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono font-semibold text-slate-400">Default Tax Multiplier percentage (%)</span>
              <input
                type="number"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(parseInt(e.target.value) || 0)}
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Automated prompt template configurations */}
        <div className="border-t border-slate-100 pt-5 flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-blue-600" />
            Default Overdue Mailer Template Presets
          </span>
          <p className="text-[10px] text-slate-400">This template acts as a baseline guideline context for automated drafting. Keep bracket variables such as <strong className="font-mono text-slate-500">{"{clientName}"}</strong>, <strong className="font-mono text-slate-400">{"{invoiceNumber}"}</strong>, <strong className="font-mono text-slate-400">{"{totalAmount}"}</strong> completely intact!</p>
          
          <textarea
            value={overdueAlertTemplate}
            onChange={(e) => setOverdueAlertTemplate(e.target.value)}
            rows={5}
            className="border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg p-3 text-xs outline-none focus:border-blue-500 transition-all leading-relaxed font-mono"
          />
        </div>

        {/* EmailJS outbound email */}
        <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Send className="w-4 h-4 text-blue-600" />
            Email Delivery (EmailJS)
          </span>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Optional. Create a free account at{' '}
            <a
              href="https://www.emailjs.com/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 font-semibold underline"
            >
              emailjs.com
            </a>
            , add an email service + template with variables{' '}
            <code className="font-mono text-slate-500">to_email</code>,{' '}
            <code className="font-mono text-slate-500">subject</code>,{' '}
            <code className="font-mono text-slate-500">message</code>, then paste IDs below.
            Without EmailJS, reminders open your default mail app instead.
          </p>

          <div
            className={`text-[11px] rounded-lg px-3 py-2 border ${
              isEmailConfigured({ emailjsServiceId, emailjsTemplateId, emailjsPublicKey }) ||
              isEmailConfigured(settings)
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}
          >
            {isEmailConfigured({ emailjsServiceId, emailjsTemplateId, emailjsPublicKey }) ||
            isEmailConfigured(settings)
              ? 'EmailJS looks configured — invoice reminders will send in-app.'
              : 'EmailJS not configured yet — mail app fallback is active.'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                Service ID
              </span>
              <input
                type="text"
                value={emailjsServiceId}
                onChange={(e) => setEmailjsServiceId(e.target.value)}
                placeholder="service_xxxxxxx"
                className="border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 font-mono"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                Template ID
              </span>
              <input
                type="text"
                value={emailjsTemplateId}
                onChange={(e) => setEmailjsTemplateId(e.target.value)}
                placeholder="template_xxxxxxx"
                className="border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 font-mono"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                Public Key
              </span>
              <input
                type="text"
                value={emailjsPublicKey}
                onChange={(e) => setEmailjsPublicKey(e.target.value)}
                placeholder="xxxxxxxxxxxx"
                className="border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 font-mono"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 flex justify-end font-sans">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Synchronize Parameters Preset
          </button>
        </div>

      </form>
    </div>
  );
};
