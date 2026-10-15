# Security and privacy

## What is stored

| Data | Where | Notes |
|---|---|---|
| Accounts: name, email, bcrypt password hash, last sign-in | Database | Passwords never stored or logged in clear |
| Memberships, roles, invitations (token **hashes** only) | Database | Invitation/reset tokens are single-use and expiring |
| Supplier references and every prior version | Database | Actor, time and reason recorded per version |
| Case evidence: pasted text, uploaded PDFs, extracted text | Database + `STORAGE_DIR` | Files outside the web root, served only to org members |
| Extracted fields, corrections (original + corrected), findings | Database | |
| Verification records and optional attachments | Database + `STORAGE_DIR` | |
| Decisions, agent runs, tool executions, audit events | Database | Append-only from the application's point of view |
| Model call metadata: provider, model, duration, tokens, status | Database | No prompt or document content |

## What is processed externally

Only when an AI provider key is configured, and only when a preparer clicks **Run analysis**: the case's readable source text (up to the configured character limit) and a minimal supplier context — supplier name, expected beneficiary name, **last four characters** of the reference account, recorded email **domain**, usual currency. The case page names the provider and model before analysis runs. With no key, analysis runs locally and nothing leaves the server.

Nothing else is sent anywhere: no analytics, no email, no messaging, no link fetching.

## Retention and deletion

- Each organization sets a retention period (30–3650 days, default 365). `npm run retention` removes stored files and document text from cases closed longer than that; case metadata, decisions and audit records remain.
- Account or organization deletion is an operator task (database) in this version; no self-service deletion UI.

## Controls implemented

- Server-side authorization on every page and API call (membership + role + organization scope); navigation is not a security boundary.
- Organization isolation: every query is scoped by the caller's verified membership; another organization's record id behaves as "not found".
- Separation of duties: case creators can never record the decision on their own case.
- Stale-version protection on decisions (evidence version + revision checks), optimistic concurrency on transitions.
- Signed HTTP-only `SameSite=Lax` session cookies (`Secure` on https), Origin checks on state-changing requests, login throttling, sessions revoked on password reset.
- File validation by content (magic bytes), size limits, randomised storage keys, `nosniff`, no inline rendering of uploads; document text is rendered as plain text only.
- Prompt-injection defence by capability, not wording: source text is wrapped as untrusted data, outputs must match a strict Zod schema, quotes must exist in the source, and neither the model nor the agent has any tool that can approve, close, contact anyone, edit supplier data or move money.
- Sensitive-data masking: reference accounts shown as last-4 outside the edit form and agent outputs; audit records store field names, not values.
- Safe errors with reference IDs; logs exclude document content, passwords, tokens and keys.
- Security headers (`X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies).

Not claimed: tamper-proof storage, regulatory compliance, penetration-tested status.

## Pre-launch privacy and legal checklist

- [ ] Legal review of the privacy notice and terms (current text is a **draft** and says so on the page), including the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021) and any sector rules that apply to customers.
- [ ] Identify the data controller/processor roles between you and each customer organization; sign a data processing agreement.
- [ ] Review the chosen AI provider's data-processing, retention and cross-border transfer terms; record the decision.
- [ ] Decide hosting location (in-country vs. abroad) and document it.
- [ ] Define retention defaults and deletion procedures with customers.
- [ ] Incident response contact and breach-notification procedure.
- [ ] Confirm the product name/trademark and domain availability (not checked).
- [ ] Independent security review before handling real customer data.

## Future capability (not implemented)

Customer-content support access for platform staff would require explicit, time-limited customer authorization, separate audit, and a visible banner to the customer. It is intentionally absent.
