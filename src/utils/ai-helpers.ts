/**
 * AI Helpers for Invoicestack
 * Ready for Hermes / SolidAI integration
 * 
 * Future features:
 * - Auto-generate invoice line items from natural language description
 * - Smart tax/risk suggestions
 * - Financial insights summary
 * - Convert voice notes or WhatsApp messages to invoices
 */

export interface AIInvoiceSuggestion {
  description: string;
  quantity: number;
  rate: number;
  confidence?: number;
}

export async function suggestInvoiceItems(prompt: string, businessContext?: any): Promise<AIInvoiceSuggestion[]> {
  // TODO: Integrate with Hermes local agent or SolidAI API
  // For now, return smart mock suggestions based on prompt keywords
  
  const lowerPrompt = prompt.toLowerCase();
  const suggestions: AIInvoiceSuggestion[] = [];

  if (lowerPrompt.includes('web') || lowerPrompt.includes('site') || lowerPrompt.includes('development')) {
    suggestions.push(
      { description: 'Website Design & Development', quantity: 1, rate: 850, confidence: 0.9 },
      { description: 'UI/UX Consultation', quantity: 3, rate: 120, confidence: 0.85 }
    );
  }

  if (lowerPrompt.includes('consult') || lowerPrompt.includes('strategy')) {
    suggestions.push(
      { description: 'Business Strategy Session', quantity: 2, rate: 250, confidence: 0.8 }
    );
  }

  if (lowerPrompt.includes('marketing') || lowerPrompt.includes('social')) {
    suggestions.push(
      { description: 'Digital Marketing Campaign Setup', quantity: 1, rate: 450, confidence: 0.75 }
    );
  }

  // Default fallback
  if (suggestions.length === 0) {
    suggestions.push(
      { description: prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt, quantity: 1, rate: 150, confidence: 0.6 }
    );
  }

  return suggestions;
}

export function generateInvoiceSummary(invoices: any[], quotations: any[]): string {
  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  
  const openAmount = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);

  return `Revenue: $${totalRevenue.toFixed(2)} | Open: $${openAmount.toFixed(2)} | Active Quotations: ${quotations.length}`;
}

// Placeholder for future Hermes integration
export async function callHermesAgent(endpoint: string, payload: any) {
  // e.g. fetch to local Hermes server at 100.75.107.78:8000 or via Tailscale
  console.log('Hermes integration point ready:', endpoint, payload);
  return { status: 'ready', message: 'Connect to Hermes for full AI power' };
}
