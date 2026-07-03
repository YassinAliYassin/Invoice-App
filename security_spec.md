# Firestore Security Specification

This document details the Zero-Trust attribute-based access control rules for the Business Document & Inventory Suite application.

## 1. Data Invariants
- Each Client, Invoice, Quotation, InventoryItem, Payment, and Settings document must belong to a specific authenticated user (`userId`).
- A user can only access (read/write/delete) their own documents: `resource.data.userId == request.auth.uid` or `incoming.userId == request.auth.uid`.
- Sensitive billing and profile details (PII) must be protected. Client lists cannot be blanket scraped; query enforcements apply.
- Specific actions on invoices (e.g., status shifts between `draft`, `sent`, `paid`, `overdue`) require validating modifications.
- Numeric quantities (pricing, quantities, and tax rates) must maintain logical boundaries (e.g., prices >= 0, stock levels >= 0, tax rates between 0 and 100).
- Timestamps (e.g., `createdAt` and `updatedAt`) must align with standard server timestamps (`request.time`).

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads attempt to break authorization, bypass schema checks, escalate permissions, or poison resources:

1. **Identity Spoofing (Client Create)**: Bypassing ownership checks by supplying a different user's ID as the owner.
2. **PII Blanket Scraping**: Attempting to query another user's client list without proper authentication filters.
3. **Negative Inventory Pricing**: Injecting negative values into product inventory prices to cause billing corruption.
4. **Denial-of-Wallet Path Poisoning**: Attempting to insert extremely large strings (100KB+) as ID paths to bloat system indexes.
5. **System Field Escalation**: Trying to modify the `userId` in `settings` documents to gain control of another business's parameters.
6. **Immutability Bypass**: Altering an invoice's `createdAt` timestamp post-creation.
7. **Illegal Status Transitions**: Forcing an invoice directly to "paid" without a valid payment record or modifying terminal fields of locked invoices.
8. **Malicious Ghost Fields (Shadow Update)**: Sending fields not present in the schema to poison search indexes.
9. **Null Auth Exploits**: Reading collection items with unauthenticated sessions while mimicking a standard client query.
10. **Spoofed Email Access**: Mocking verification tags (e.g. `email_verified: false`) to bypass admin restrictions.
11. **Negative Stock Levels**: Creating a product document with negative quantity attributes.
12. **Tax Rate Overflow**: Setting default tax rates exceeding 100% to break calculations.

## 3. Security Rule Implementations & Test Strategy
All requests that violate these schemas will be rejected with an explicit `PERMISSION_DENIED` status on the server side.
Rules are written with:
- `isValidId(id)` validations.
- `isSignedIn()` with verified emails.
- Strict `affectedKeys().hasOnly([...])` branches during state updates.
