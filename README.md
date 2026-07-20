# Invoicestack

**Modern billing OS for SMEs** — Full-featured invoice, quotation, inventory, client management, statements, and analytics suite.

Built for African businesses (Zimbabwe focus) with local-first + cloud sync via Firebase. Ready for AI agent integration (Hermes / SolidAI).

![Invoicestack Preview](https://via.placeholder.com/800x400?text=Invoicestack+Dashboard+Preview)

## Features

### Core Modules
- **Invoices** — Create, edit, send, mark paid/overdue, partial payments, PDF export, email
- **Quotations** — Proposals, convert to invoice, status tracking
- **Clients** — Full CRM directory with history
- **Inventory** — Products/services, stock tracking, auto-adjust
- **Statements** — Client ledgers & payment history
- **Analytics** — Dashboards, insights, revenue trends, open items
- **Settings** — Branding, tax rates, currency (ZWL/USD), EmailJS config

### Auth & Sync
- Email/password + Google signup/login
- Local browser vault (no Firebase) or full Firestore cloud sync
- Multi-user isolation

### Email & Documents
- EmailJS one-click send (or mailto: fallback)
- Professional PDF generation with company branding
- Quick create modal (press **C** anywhere)

## Tech Stack
- React 19 + Vite + TypeScript
- Tailwind CSS + Lucide icons + Framer Motion
- Firebase (Auth + Firestore)
- Express server for production
- jsPDF + html2canvas for exports
- EmailJS for outbound mail

## Quick Start (Local)

```bash
git clone https://github.com/YassinAliYassin/Invoice-App.git
cd Invoice-App
npm install
npm run dev
```

Open http://localhost:3001

## Auth Modes

| Mode       | Use Case                  | Data                  |
|------------|---------------------------|-----------------------|
| **Cloud**  | Real multi-device sync    | Firebase Firestore    |
| **Local**  | Private / offline testing | Browser localStorage  |

Enable Email/Password in Firebase Console → Authentication.

## AI & Agent Integration (Roadmap)

Invoicestack is designed for agentic workflows:
- Hermes AI integration for auto-generating invoice line items from descriptions
- Smart financial insights & risk scoring
- WhatsApp/Telegram dispatch of invoices/statements (via ESCC agents)
- Voice-to-invoice or vibe-coding new templates

See `solidai-platform` and Hermes agent repos for related tooling.

## Configuration

### EmailJS (Recommended for real emails)
Set in Settings or `.env`:
```
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
```

### Firebase
- Project: `invoice-stack-yassin-app` (see `.firebaserc`)
- Deploy rules: `npm run deploy:rules`

## Deployment

See [DEPLOY.md](./DEPLOY.md) for Firebase Hosting + full production setup.

Quick deploy:
```bash
npm run deploy
```

Also deployable to Vercel (SPA mode).

## Scripts

| Command              | Description                          |
|----------------------|--------------------------------------|
| `npm run dev`        | Dev server (tsx server.ts)           |
| `npm run build`      | Full build (client + server)         |
| `npm run build:client` | Static SPA only (Firebase/Vercel)  |
| `npm start`          | Production server                    |
| `npm run lint`       | TypeScript check                     |
| `npm run deploy`     | Build + Firebase deploy (hosting + rules) |

## Contributing & Roadmap

- Next: Hermes AI invoice assistant integration
- Better mobile UX & PWA support
- Payment gateway (e.g. Paynow / Stripe for ZW)
- Multi-company / team workspaces

Built by Solid Solutions (solidsolutions.africa) for practical African tech.

---

**License:** MIT
