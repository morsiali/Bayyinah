# Three-minute demonstration

Setup: `npm run db:reset` then `npm run dev`. Use two browser windows (one private).

**0:00 — Public entry (20 s).** Open `/`. Point out the purpose line and the request check card: choose *Bank account change* → *Use a fictional example* → *Check request*. Hover a finding — its exact words light up in the text. “Indicators, not a verdict.”

**0:20 — Preparer (60 s).** Sign in as `omar@alwaha.example`. *Verification waiting for you* shows the Gulf Supplies case. Open it: source on the left with highlighted quotes, Decision Passport in the middle (request, findings with *Explain this finding*, differences table — account and domain differ), next action on the right. Open the agent trace: seven allow-listed tools, it created one task and is *waiting for a person*. Click *Record verification outcome*: the reference phone comes from the supplier file, not the email. Choose *Not confirmed*, add a note, tick the attestation, record. Back on the case, *Submit for review*.

**1:20 — Reviewer (45 s).** In the second window sign in as `sara@alwaha.example`. *Review cases* lists Gulf Supplies and Emirates Tech. Open Gulf Supplies: *Approve* is blocked (“Supplier confirmed through a reference channel” is unmet). Write a rationale and *Reject* → confirm. Open *Report*: case ID, evidence version, verification record, reviewer, rationale, and the notice that it is not a safety certificate.

**2:05 — Admin and audit (35 s).** Sign in as `layla@alwaha.example` → *Manage organization*. *Suppliers*: version history and “Reference information reviewed by the business”. *Members*: create a single-use invitation link; try to remove the only admin — blocked. *Audit trail*: every step just taken, by whom.

**2:40 — Platform operations (20 s).** Sign in as `ops@bayyinah.example` → `/platform`: organizations, status, volumes, failures — and no documents or bank details. Close with Demo Mode at `/demo` for prospects who should not see live data.
