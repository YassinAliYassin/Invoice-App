# Invoicestack

Full invoice, quotation, inventory, and client suite with **signup / login**, multi-user isolation, EmailJS outbound mail, and Firebase Hosting deploy.

## Features

- **Auth** — email/password signup & login, Google (cloud), password reset, local multi-user fallback
- **Invoices** — create/edit, mark sent/paid, overdue auto-flag, payments, PDF, email reminders
- **Quotations** — create/edit, mark sent/accept/decline, convert to invoice
- **Clients & inventory** — full CRUD + stock adjust
- **Statements & analytics** — ledger views + smart financial insights
- **Email** — EmailJS one-click send, or mail-app fallback
- **Settings** — branding, tax, currency, EmailJS keys

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Auth modes

| Mode | When | Accounts |
|------|------|----------|
| **Cloud** | Real Firebase config | Email/password + Google; Firestore sync |
| **Local** | No Firebase | Browser accounts (hashed passwords) |

Enable **Email/Password** under Firebase Console → Authentication → Sign-in method.

## Email (EmailJS)

Configure in **Settings → Email Delivery**, or via env (see `.env.example`):

```
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

Template variables: `to_email`, `to_name`, `from_name`, `subject`, `message`.

## Deploy

See [DEPLOY.md](./DEPLOY.md).

```bash
npm run deploy          # hosting + firestore rules
npm run deploy:hosting  # static SPA only
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Express + Vite) :3001 |
| `npm run build` | Client + Node server → `dist/` |
| `npm run build:client` | Static SPA only (Firebase Hosting) |
| `npm start` | Production Express server |
| `npm run lint` | TypeScript check |
| `npm run deploy` | Build client + Firebase deploy |
