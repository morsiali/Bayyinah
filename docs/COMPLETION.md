# Completion matrix

Labels: **IMPLEMENTED AND VERIFIED** (exercised by automated tests that passed in the build environment) · **IMPLEMENTED BUT NOT VERIFIED** · **BLOCKED BY EXTERNAL CONFIGURATION** · **NOT IMPLEMENTED**.

Test environment: Linux container, Node 22, SQLite, Chromium (Playwright 1.56). Unit/integration: Vitest against a real SQLite test database. End-to-end: production build (`next build && next start`) driven by Playwright.

| Capability | Status | How tested | Dependency / remaining |
|---|---|---|---|
| Public website (purpose, users, request types, workflow, AI limits, labelled fictional example, privacy/terms) | IMPLEMENTED AND VERIFIED | E2E crawler: every reachable link, HTTP status, console errors, blank-page check | Legal review of draft privacy/terms |
| In-browser request check on the homepage | IMPLEMENTED AND VERIFIED | E2E `public.spec` | — |
| Registration, sign-in, sign-out, sessions | IMPLEMENTED AND VERIFIED | Integration + E2E live flow | — |
| Password recovery | IMPLEMENTED AND VERIFIED (admin-issued link); self-service link is written to the server log | Integration (token single-use, sessions revoked) | No email delivery in this version — add an email provider to send self-service links |
| Organization onboarding (creator = first admin) | IMPLEMENTED AND VERIFIED | E2E live flow | — |
| Invitations: expiring, single-use, email-bound | IMPLEMENTED AND VERIFIED | Integration + E2E | Links are shared manually (by design) |
| Role changes, removal, last-admin protection | IMPLEMENTED AND VERIFIED | Integration | — |
| Role-specific workspaces + workspace/organization selectors | IMPLEMENTED AND VERIFIED | E2E crawl as 5 identities; E2E reviewer denied admin page | — |
| Server-side authorization, cross-organization isolation | IMPLEMENTED AND VERIFIED | Integration + E2E (other org gets 404/403) | DB-level RLS not added (app-layer enforcement) |
| Private document storage and access | IMPLEMENTED AND VERIFIED | Integration (org-scoped keys/queries); E2E download links | Local disk; use a backed-up volume |
| Supplier references, version history, review status, case snapshots | IMPLEMENTED AND VERIFIED | Integration + E2E | — |
| Updated reference → new case version, invalidating analysis/verification/review | IMPLEMENTED AND VERIFIED | Integration | — |
| Sources: pasted text, text-based PDF (10 MB, content-sniffed) | IMPLEMENTED AND VERIFIED | Integration (generated PDFs, fake PDF rejected) | — |
| Unreadable/scanned PDFs → no fake analysis | IMPLEMENTED AND VERIFIED | Integration | OCR out of scope |
| AI analysis with strict schema, one repair attempt, citation verification | IMPLEMENTED AND VERIFIED with Abacus RouteLLM `gpt-5.4-mini` | E2E live flow run with the real model; `npm run eval` 8/8 labelled cases | Anthropic and OpenAI adapters: IMPLEMENTED BUT NOT VERIFIED (no keys available) |
| Local rules analyzer (no provider configured) | IMPLEMENTED AND VERIFIED | Unit tests; eval 8/8 | Pattern-based; less capable than a model |
| Deterministic rules (IBAN, account, name, domain, required fields, channel, currency, amount, type, reference review) | IMPLEMENTED AND VERIFIED | Unit tests | IBAN lengths for 20 countries |
| Extraction corrections with original preserved; material corrections re-run rules | IMPLEMENTED AND VERIFIED | Integration | — |
| Bounded agent: 7 tools, validation, authorization, version checks, idempotent tasks, limits, execution records, trace UI | IMPLEMENTED AND VERIFIED | Integration (idempotency, limits, stop conditions) + E2E | Orchestration is a fixed policy; the model is not used to choose tools |
| Human verification records (+ optional attachment) | IMPLEMENTED AND VERIFIED | Integration + E2E | — |
| Submit / withdraw / return / reopen | IMPLEMENTED AND VERIFIED | Integration | — |
| Separate reviewer, confirmed-verification prerequisite, stale-approval rejection | IMPLEMENTED AND VERIFIED | Integration + E2E | — |
| Audit trail (append-only in app) | IMPLEMENTED AND VERIFIED | Integration + E2E | Not tamper-proof storage |
| Printable report (save as PDF via browser) | IMPLEMENTED AND VERIFIED | E2E | — |
| Platform operations (orgs, suspend/reactivate, metrics, failures, usage, limits, activity) without case content | IMPLEMENTED AND VERIFIED | Integration + E2E crawl | Cost shown as token totals; apply your provider's prices |
| Data retention configuration + purge job | IMPLEMENTED AND VERIFIED | Integration (purge keeps decisions and audit) + E2E settings page | Schedule `npm run retention` daily |
| Demo Mode (5 scenarios, 3 personas, reset, isolated) | IMPLEMENTED AND VERIFIED | E2E + static isolation test | — |
| Docker deployment files | IMPLEMENTED BUT NOT VERIFIED | — | Docker not available in build environment |
| Live deployment, domain, HTTPS | BLOCKED BY EXTERNAL CONFIGURATION | — | Needs your server/domain; steps in OPERATIONS.md |
| Arabic interface with RTL | NOT IMPLEMENTED | — | UI is English (per project decision); Arabic content is accepted, analyzed and displayed with LTR isolation for identifiers |
| Backups/restore | Documented, NOT VERIFIED | — | Test restore before pilot |

## Known limitations

- English interface only; Arabic request text is supported.
- No email sending (invitation and reset links are shared manually; self-service reset links go to the server log).
- Login throttling is in-memory per process.
- SQLite is suitable for a single-server pilot; use PostgreSQL for multiple instances.
- The local analyzer is pattern-based. Configure a model provider for real use.
- The AI evaluation set is small and hand-written; it checks explicit expectations and is not an accuracy measurement.

## Readiness

**Development complete; deployed locally only.** Ready for a **controlled pilot, subject to**: deployment with HTTPS, a configured and contractually reviewed AI provider, tested backup/restore, legal review of privacy/terms, and an independent security review.
