import emailjs from '@emailjs/browser';

export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  method: 'emailjs' | 'mailto' | 'none';
  message: string;
  error?: unknown;
}

/** Read EmailJS keys from Vite env (optional) and/or business settings. */
export function resolveEmailConfig(settings?: {
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
}): EmailConfig | null {
  const serviceId =
    settings?.emailjsServiceId?.trim() ||
    (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined)?.trim() ||
    '';
  const templateId =
    settings?.emailjsTemplateId?.trim() ||
    (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined)?.trim() ||
    '';
  const publicKey =
    settings?.emailjsPublicKey?.trim() ||
    (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined)?.trim() ||
    '';

  if (serviceId && templateId && publicKey) {
    return { serviceId, templateId, publicKey };
  }
  return null;
}

export function isEmailConfigured(settings?: {
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
}): boolean {
  return resolveEmailConfig(settings) !== null;
}

/**
 * Send email via EmailJS when configured.
 * Falls back to opening the user's mail client (mailto:) so sending always works.
 */
export async function sendBusinessEmail(
  params: SendEmailParams,
  settings?: {
    emailjsServiceId?: string;
    emailjsTemplateId?: string;
    emailjsPublicKey?: string;
    businessName?: string;
    businessEmail?: string;
  }
): Promise<SendEmailResult> {
  if (!params.to || !params.subject || !params.body) {
    return {
      success: false,
      method: 'none',
      message: 'Missing recipient, subject, or body.',
    };
  }

  const config = resolveEmailConfig(settings);
  if (config) {
    try {
      await emailjs.send(
        config.serviceId,
        config.templateId,
        {
          to_email: params.to,
          to_name: params.toName || params.to,
          from_name: params.fromName || settings?.businessName || 'Invoicestack',
          from_email: params.fromEmail || settings?.businessEmail || '',
          reply_to: params.replyTo || settings?.businessEmail || params.fromEmail || '',
          subject: params.subject,
          message: params.body,
          // Alternate template variable names used by common EmailJS templates
          email: params.to,
          name: params.toName || params.to,
          title: params.subject,
          content: params.body,
        },
        { publicKey: config.publicKey }
      );
      return {
        success: true,
        method: 'emailjs',
        message: `Email sent to ${params.to} via EmailJS.`,
      };
    } catch (error) {
      console.error('EmailJS Error:', error);
      // Fall through to mailto
      openMailto(params);
      return {
        success: true,
        method: 'mailto',
        message:
          'EmailJS failed; opened your mail app instead. Check EmailJS keys in Settings if this keeps happening.',
        error,
      };
    }
  }

  openMailto(params);
  return {
    success: true,
    method: 'mailto',
    message: `Opened mail app for ${params.to}. Configure EmailJS in Settings for one-click send.`,
  };
}

export function openMailto(params: SendEmailParams) {
  const href = `mailto:${encodeURIComponent(params.to)}?subject=${encodeURIComponent(
    params.subject
  )}&body=${encodeURIComponent(params.body)}`;
  window.open(href, '_blank', 'noopener,noreferrer');
}

/** Client-side payment reminder (works without the Express API / static hosting). */
export function generatePaymentReminder(input: {
  invoice: {
    invoiceNumber: string;
    dueDate: string;
    total: number;
    subtotal: number;
    taxAmount?: number;
    currency: string;
  };
  clientName: string;
  businessName?: string;
  businessEmail?: string;
  template?: string;
}): { subject: string; body: string } {
  const { invoice, clientName, businessName, businessEmail, template } = input;
  const currencySymbol =
    invoice.currency === 'USD'
      ? '$'
      : invoice.currency === 'EUR'
        ? '€'
        : invoice.currency === 'GBP'
          ? '£'
          : invoice.currency + ' ';

  const daysOverdue = invoice.dueDate
    ? Math.floor(
        (Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const subject = `Payment Reminder: Invoice ${invoice.invoiceNumber}`;

  if (template && template.includes('{')) {
    const amount = `${currencySymbol}${invoice.total.toFixed(2)}`;
    const body = template
      .replace(/\{clientName\}/g, clientName)
      .replace(/\{invoiceNumber\}/g, invoice.invoiceNumber)
      .replace(/\{totalAmount\}/g, amount)
      .replace(/\{businessName\}/g, businessName || 'Our Company')
      .replace(/\{dueDate\}/g, invoice.dueDate);
    return { subject, body };
  }

  let urgencyNote = '';
  if (daysOverdue > 30) {
    urgencyNote =
      'This invoice is now over 30 days overdue. Please prioritize payment to avoid further action.';
  } else if (daysOverdue > 7) {
    urgencyNote =
      'We notice this payment is overdue. Please arrange payment at your earliest convenience.';
  } else {
    urgencyNote =
      "We hope you're satisfied with our services. Please process this payment at your convenience.";
  }

  const body = `Dear ${clientName},

I hope this message finds you well.

This is a friendly reminder regarding invoice ${invoice.invoiceNumber} for ${currencySymbol}${invoice.total.toFixed(2)}, which was due on ${invoice.dueDate}.

${urgencyNote}

Invoice Summary:
- Invoice Number: ${invoice.invoiceNumber}
- Due Date: ${invoice.dueDate}
- Amount Due: ${currencySymbol}${invoice.total.toFixed(2)}
- Subtotal: ${currencySymbol}${invoice.subtotal.toFixed(2)}
- Tax: ${currencySymbol}${(invoice.taxAmount || 0).toFixed(2)}

If you have already processed this payment, please disregard this reminder and accept our thanks.

For any questions or to discuss payment arrangements, please don't hesitate to contact us.

Best regards,
${businessName || 'Our Company'}
${businessEmail || ''}

---
This is an automated reminder generated by Invoicestack.`;

  return { subject, body };
}

/** Client-side financial insights (static-hosting safe). */
export function generateFinancialAdvice(input: {
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  invoicesCount: number;
  clientsCount: number;
  lowStockCount: number;
}): { summary: string; recommendations: string[] } {
  const {
    totalRevenue,
    totalPaid,
    totalOutstanding,
    invoicesCount,
    clientsCount,
    lowStockCount,
  } = input;

  const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;
  const recommendations: string[] = [];

  let summary = '';
  if (collectionRate >= 80) {
    summary = `Excellent cash flow health with ${collectionRate.toFixed(1)}% collection rate. Your business shows strong payment realization. Focus on growth and maintaining current client relationships.`;
  } else if (collectionRate >= 60) {
    summary = `Moderate cash flow with ${collectionRate.toFixed(1)}% collection rate. Some improvement needed in payment collection processes. Review outstanding invoices and follow-up procedures.`;
  } else {
    summary = `Cash flow needs attention with only ${collectionRate.toFixed(1)}% collection rate. Immediate action required on overdue accounts. Consider implementing stricter payment terms or collection procedures.`;
  }

  if (totalOutstanding > totalRevenue * 0.3 && totalRevenue > 0) {
    recommendations.push(
      '**Urgent:** Outstanding receivables exceed 30% of revenue. Implement an aggressive collection strategy and consider early payment discounts.'
    );
  }
  if (lowStockCount > 0) {
    recommendations.push(
      `**Inventory Alert:** ${lowStockCount} items are below minimum stock levels. Schedule reordering to avoid stockouts.`
    );
  }
  if (clientsCount < 5 && invoicesCount > 10) {
    recommendations.push(
      '**Diversification:** High invoice volume with few clients increases risk. Focus on acquiring new clients.'
    );
  }
  if (collectionRate < 70) {
    recommendations.push(
      '**Payment Terms:** Review and tighten credit terms. Consider deposits or shorter windows for new clients.'
    );
  }
  if (totalRevenue > 0 && invoicesCount > 0) {
    const avg = totalRevenue / invoicesCount;
    recommendations.push(
      `**Average Invoice:** $${avg.toFixed(2)} per invoice. Consider upselling or bundling to increase transaction value.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      '**Growth:** Maintain current performance. Consider expanding services or entering new markets.'
    );
    recommendations.push(
      '**Efficiency:** Automate invoice reminders and payment tracking to reduce admin overhead.'
    );
  }

  return { summary, recommendations };
}

/** @deprecated use sendBusinessEmail */
export const sendInvoiceEmail = async (
  serviceId: string,
  templateId: string,
  publicKey: string,
  params: Record<string, unknown>
) => {
  try {
    const response = await emailjs.send(serviceId, templateId, params, {
      publicKey,
    });
    return { success: true, response };
  } catch (error) {
    console.error('EmailJS Error:', error);
    return { success: false, error };
  }
};
