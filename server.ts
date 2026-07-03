import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // Initialize server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // --- API Routes ---

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiReady: !!ai });
  });

  // Gemini-powered Email Reminder Generator
  app.post("/api/generate-reminder", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API client is not initialized. Please ensure GEMINI_API_KEY is configured." });
      }

      const { invoice, client, businessName } = req.body;
      if (!invoice || !client) {
        return res.status(400).json({ error: "Missing required invoice or client details" });
      }

      const currencySymbol = invoice.currency === "USD" ? "$" : invoice.currency === "EUR" ? "€" : invoice.currency === "GBP" ? "£" : invoice.currency;

      const prompt = `Write a polite, professional payment reminder email for an overdue invoice.
Here are the details:
- Business/Sender Name: ${businessName || "Our Company"}
- Client Name: ${client.name}
- Invoice Number: ${invoice.invoiceNumber}
- Due Date: ${invoice.dueDate}
- Total Amount Due: ${currencySymbol}${invoice.total.toFixed(2)} (including taxes)
- Subtotal: ${currencySymbol}${invoice.subtotal.toFixed(2)}
- Tax Amount: ${currencySymbol}${(invoice.taxAmount || 0).toFixed(2)}

The tone should be professional and encouraging. Draft both a subject line and the email body.
Return the output strictly in JSON format as defined by the schema:
{
  "subject": "Email subject string",
  "body": "Complete email body string with newlines"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING, description: "The email subject line" },
              body: { type: Type.STRING, description: "The email body markup or text content" }
            },
            required: ["subject", "body"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from AI");
      }

      const result = JSON.parse(text);
      res.json(result);
    } catch (error: any) {
      console.error("Error generating reminder:", error);
      res.status(500).json({ error: error.message || "Failed to generate reminder" });
    }
  });

  // Gemini-powered Financial Advisor & AI Analytics Analyst
  app.post("/api/financial-advice", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API client is not initialized. Please ensure GEMINI_API_KEY is configured." });
      }

      const { stats, invoicesCount, clientsCount, lowStockItems } = req.body;

      const prompt = `Analyze the current financial health of this small business and provide 3-4 professional, actionable insights and business strategy recommendations.
Business Metrics:
- Total Invoiced (Revenue): ${stats.totalRevenueFormatted || stats.totalRevenue}
- Total Received Paid (Cashflow): ${stats.totalPaidFormatted || stats.totalPaid}
- Total Outstanding Balance (Arrears): ${stats.totalOutstandingFormatted || stats.totalOutstanding}
- Active Quotations: ${stats.quotationsCount || 0}
- Active Client Count: ${clientsCount || 0}
- Total Invoices Generated: ${invoicesCount || 0}
- Number of Low Stock/Alert Products: ${lowStockItems ? lowStockItems.length : 0}

Ensure your feedback is empathetic but realistic, guiding them on tax obligations, cash flow collection, inventory restocking, and optimization.
Return the output strictly in JSON format matching the schema:
{
  "summary": "A 2-3 sentence visual summary of overall business performance",
  "recommendations": [
    "A crisp individual bullet recommendation with bold focus terms"
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "Executive summary" },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of actionable growth and collection steps"
              }
            },
            required: ["summary", "recommendations"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text from AI analytics");
      }

      const result = JSON.parse(text);
      res.json(result);
    } catch (error: any) {
      console.error("Error checking advisory:", error);
      res.status(500).json({ error: error.message || "Failed to analyze financials" });
    }
  });

  // Mock Email Dispatcher
  app.post("/api/send-email", (req, res) => {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing required parameter 'to', 'subject', or 'body'." });
    }

    console.log(`[MOCK EMAIL SENT] to: ${to}, subject: ${subject}`);
    // Simulate immediate success
    res.json({ success: true, message: `Email successfully drafted & virtually dispatched to ${to}` });
  });

  // --- Express Static & Vite Middleware Integration ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to boot full-stack server:", err);
});
