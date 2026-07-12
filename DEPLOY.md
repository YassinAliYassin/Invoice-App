# Deploy Invoicestack

## Prerequisites

- Node.js 18+
- Firebase CLI (`npm i -g firebase-tools`)
- Logged in: `firebase login`
- Project: `invoice-stack-yassin-app` (see `.firebaserc`)

## Firebase Auth (required for cloud accounts)

1. [Firebase Console](https://console.firebase.google.com/) → project **invoice-stack-yassin-app**
2. **Authentication → Sign-in method**
3. Enable **Email/Password**
4. Optionally enable **Google**
5. Add production domain under **Authorized domains**

## EmailJS (optional, real outbound email)

1. Sign up at [emailjs.com](https://www.emailjs.com/)
2. Add an **Email Service** (Gmail, Outlook, etc.)
3. Create a **Template** with variables:
   - `{{to_email}}`
   - `{{to_name}}`
   - `{{from_name}}`
   - `{{subject}}`
   - `{{message}}`
4. Copy **Service ID**, **Template ID**, **Public Key**
5. Either:
   - Paste them in **Corporate settings → Email Delivery**, or
   - Set in `.env` / hosting env:
     ```
     VITE_EMAILJS_SERVICE_ID=service_xxx
     VITE_EMAILJS_TEMPLATE_ID=template_xxx
     VITE_EMAILJS_PUBLIC_KEY=xxx
     ```
6. Rebuild after changing `VITE_*` env vars (`npm run build:client`)

Without EmailJS, **Send** still works via the user’s mail app (`mailto:`).

## Deploy to Firebase Hosting

```bash
cd Invoice-App
npm install
npm run deploy
```

This builds the Vite client into `dist/` and deploys **hosting + Firestore rules**.

Hosting-only:

```bash
npm run deploy:hosting
```

Firestore rules only:

```bash
npm run deploy:rules
```

After deploy, the app is served as a static SPA. Reminder drafting and financial advice run **in the browser** (no Express required). For local API routes (`/api/*`), use:

```bash
npm run build && npm start
# http://localhost:3001
```

## Production checklist

- [ ] Email/Password auth enabled
- [ ] Hosting domain authorized for Firebase Auth
- [ ] Firestore rules deployed
- [ ] EmailJS configured (optional)
- [ ] Company profile filled in Settings after first login
