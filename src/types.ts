export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  userId: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  minStockLevel: number;
  taxRate: number; // default tax rate % for this item
  type?: "product" | "item" | "service"; // item classification
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  taxRate: number; // calculated tax rate %
  sku?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue";
  notes?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  issueDate: string;
  expiryDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "accepted" | "declined";
  notes?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  clientId: string;
  clientName?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string; // e.g., "Cash", "Bank Transfer", "Credit Card", "Paypal"
  reference?: string;
  userId: string;
  createdAt: string;
}

export interface BusinessSettings {
  userId: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  taxId: string; // VAT/GST registration number
  defaultCurrency: string;
  logoUrl?: string; // Company logo data URL (base64) or url
  brandColor?: string; // Preset or custom hex code for branding look
  defaultTaxRate?: number;
  overdueAlertTemplate?: string;
  emailTemplateSubject?: string;
  emailTemplateBody?: string;
  /** EmailJS service ID (e.g. service_xxx) for real outbound email */
  emailjsServiceId?: string;
  /** EmailJS template ID (e.g. template_xxx) */
  emailjsTemplateId?: string;
  /** EmailJS public key */
  emailjsPublicKey?: string;
  updatedAt?: string;
}

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "INR" | "AED" | "ZAR" | "NGN" | "KES" | "GHS" | "EGP" | "MAD" | "XOF";

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  JPY: "¥",
  INR: "₹",
  AED: "د.إ",
  ZAR: "R",
  NGN: "₦",
  KES: "KSh",
  GHS: "₵",
  EGP: "E£",
  MAD: "DH",
  XOF: "CFA"
};

export const CURRENCY_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.51,
  JPY: 157.8,
  INR: 83.5,
  AED: 3.67,
  ZAR: 18.25,
  NGN: 1500.0,
  KES: 129.5,
  GHS: 15.1,
  EGP: 47.8,
  MAD: 9.95,
  XOF: 605.0
};
