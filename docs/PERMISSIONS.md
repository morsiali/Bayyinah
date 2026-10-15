# Roles and permissions

Roles are per organization; a person may hold several. Enforcement is in `lib/services/*` on every request.

| Action | Preparer | Reviewer | Org admin | Platform admin* |
|---|:-:|:-:|:-:|:-:|
| View cases, Decision Passports, reports of own organization | ✓ | ✓ | ✓ | — |
| Download source documents / attachments of own organization | ✓ | ✓ | ✓ | — |
| Create case | ✓ | | | |
| Add source, run analysis, correct extraction | ✓ | | | |
| Run preparation agent | ✓ | | | |
| Record verification outcome | ✓ | | | |
| Submit for review / withdraw from review | ✓ | | | |
| Apply updated supplier reference to an open case | ✓ | | ✓ | |
| Reopen a closed case into a new version | ✓ | | ✓ | |
| Approve / reject / return / close inconclusive | | ✓ (not on cases they created) | | |
| Create, edit, review, deactivate supplier references | | | ✓ | |
| Invite members, revoke invitations, change roles, remove members, issue reset links | | | ✓ | |
| Organization name and retention settings | | | ✓ | |
| View organization audit trail | | | ✓ | |
| List organizations, suspend/reactivate | | | | ✓ |
| View aggregate metrics, failures (sanitized), usage | | | | ✓ |
| Change service limits | | | | ✓ |

\* Platform admins are provisioned only via `npm run platform-admin` on the server. They are not organization members and get no case content unless also invited to an organization as a normal member.

Rules that no role can override:

- The creator of a case can never record its review decision.
- Bank account changes and new beneficiaries cannot be approved without a recorded, confirmed independent verification on the current evidence version.
- The last active organization admin cannot be removed or demoted.
- Closed cases change only by reopening into a new version; earlier decisions are preserved.
- Neither the AI model nor the agent can approve, close, contact anyone, edit supplier details, grant access or move money.
