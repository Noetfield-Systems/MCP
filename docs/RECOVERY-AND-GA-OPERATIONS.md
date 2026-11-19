# Recovery, Payment and GA Operations — Evidence Standard
**Applies to MCP Foundry only · 2026-11-18 · internal operator runbook**

## Incident recovery and current live status
- The previous 502 incident was resolved with [PR #50](https://github.com/Noetfield-Systems/MCP/pull/50), which removed an app startup dependency on a missing CRM research data file.
- The production-facing acceptance suite for SHA `c1acfa0709a57cd68a6f678e52e742c211a59df4` had five successful workflows: code CI, external MCP, multi-tenant, source-backed starters and Chromium. Evidence in GitHub Actions; Railway service verification should always be tied to the actual settled live SHA.
- Do not reuse this status to claim that a future release has passed. Confirm the live deployment and run results again for each build.

## Backup / restore truth
**Real automated isolated drill:** `scripts/isolated-postgres-restore-drill.mjs` and [Disposable PostgreSQL Backup and Restore Acceptance](../.github/workflows/disposable-postgres-restore.yml).
1. GitHub Actions launches its own PostgreSQL 16 service, not Railway customer data.
2. The script accepts only a local admin database `postgres` using `DRILL_ADMIN_URL`.
3. It creates two randomly named throwaway databases, initializes **actual Foundry schema**, saves a source-backed fake CI server and a **not-paid** order fixture, runs actual `pg_dump` archive creation and actual `pg_restore` into the separate target.
4. It compares real tables, customer account/managed server published snapshot and order state using SQL; reports dump SHA-256 and size, **no secrets**.
5. It forcibly cleans up both disposable databases and the backup archive.
This is real restoration software exercised against an isolated test instance, **not** proof that Railway production backups exist.

### Separate production backup verification (still required)
- [ ] Locate the actual MCP Foundry Railway project and **the specific PostgreSQL service**; do not alter a similarly named service or another venture.
- [ ] Check provider backup policy and retention, independent restore export access, encryption and effective storage responsibility.
- [ ] Check the last real production backup's completion timestamp and recoverability without disclosing a raw database URL in chat or CI logs.
- [ ] Restore a **snapshot copy to a separate protected staging database**, never a production overwrite; verify accounts, published snapshot/revision, owner permissions, paid order statuses, encrypted secrets existence and usable login as applicable.
- [ ] Time the actual operation to establish a measured restore point and recovery duration before promising an RPO/RTO or contractual SLA.
- [ ] Prepare a recovery path for DB encryption keys; restored ciphertext is not usable without matching encryption configuration.
No invented backup schedule, guaranteed uptime, recovery interval or success report.

## Paid order lifecycle
The supported distinct stages are:
`offered -> checkout_pending -> paid -> fulfilled` (or `failed` / `refunded`).
- **Offered:** only a quote, no payment and no acceptance.
- **Checkout pending:** a Stripe Checkout Session exists; an opened link is not a paid order.
- **Paid:** the signed Stripe event's session id, amount, currency and order metadata match the operator-created order.
- **Fulfilled:** paid order *and* actual delivery test/release reference, actual customer acceptance record reference and who approved it; now persisted with timestamp. Customer acceptance is not inferred from an operator button, source test or customer silence.
- **Refunded:** signed processor refund event; an acceptance record never overrides the refund state.

The standalone CA$199 Payment Link is distinct from custom scoped order tokens. Its payment results must be reconciled with the merchant account and customer/order mapping rather than erroneously presumed to be a `pilot_orders` payment.

## Named AI host compatibility
[Host acceptance matrix](HOST-COMPATIBILITY-ACCEPTANCE.md) documents Cursor, VS Code and Claude Code install formats with explicit evidence tiers. Config generation and SDK v2 E2E are not proof that a named installed desktop or CLI client invoked a tool. Two named host executions remain separate GA acceptance items until attached real redacted receipts.

## Go-live smoke on each release
- [ ] Confirm `main` SHA and settled Railway SHA match.
- [ ] Run `npm run check`, `npm test` and disposable restore CI.
- [ ] Exercise `/healthz`, `/api/status`, `/`, `/solutions`, `/readiness`, `/blueprints`, `/connect`, `/operator` in a real browser.
- [ ] Test public and private auth semantics, valid source-backed MCP GET, schema negatives, owner and cross-tenant negatives.
- [ ] Verify existing CA$199 hosted payment link and proposed custom order via **test-mode** Stripe event; never create bogus livemode sales.
- [ ] Review source license and public demo attribution, public-only marketing claims and appropriate customer logo permissions.
- [ ] Retain last-good release reference and document rollback compatibility before announcing GA.

## Actual commercial milestones (no manufactured evidence)
The researched 10 API accounts are not customers. Messages drafted or sent are separate from replies, contracted projects, verified processor payment, customer acceptance and independently returning real client use. Report each at its own stage.
