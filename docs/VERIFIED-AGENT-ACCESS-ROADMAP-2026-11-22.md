# MCP Foundry — Ranked execution program (22 November 2026)

## Real baseline (evidence)
- Repository: Noetfield-Systems/MCP; Railway app and its dedicated Postgres are currently deployed; previous independent production SDK, live browser, multi-tenant and public API starter acceptance returned PASS after restoring these services (2026-11-22).
- Existing in main: real authenticated Builder, GET-only OpenAPI conversion and live test, versioned public/private publish, server keys, marketplace, diagnostics, host install generator, operator CRM and quoted orders. Do not rebuild these.
- Existing CA$199 Quickstart Stripe Payment Link is a commercial offer, not a receipt of money. No actual paying account may be inferred.
- Judge.me OAuth source code merged but real provider credentials, store installation and merchant QA evidence are not present. Do not block unrelated product work on provider approval.
- The Foundry product has independent commercial tenancy. No unrelated venture data, customer records, OAuth secrets or wallet balances are copied into it.

## Execution order and exact success criteria

| Rank | Capability | Reuse / delta | Evidence required before calling live | Stage |
|---|---|---|---|---|
| 1 | Integration Passport | Public read-only evidence-tiered page for published definitions and recorded invocations; no badges unless independent evidence exists | Real public server /api/passport readback; private server 404; source tests | Phase 1 |
| 2 | MCP Doctor 2.0 | Definition checks + categorized source-observed errors and repair CTA; never arbitrary SSRF or credential probing | 200 for public, 404 for private, error reproduction and tests | Phase 1 |
| 3 | Agent Launch Kit | Use existing template → draft → actual upstream GET test → explicit publish → host install and passport, with fail-closed errors | Browser acceptance, actual external MCP call, real DB record | Phase 1 |
| 4 | Distribution Kit | Install page and marketplace now link to evidence; add embeddable audited source-specific attribution in later release | Real outbound click → consented install → signed usage records, not inferred installation | Phase 1 partial |
| 5 | Agent Test Lab | Persist per-tool test cases and strict expected response assertions; no unreviewed writes | Automated regression pass and failure on actual source changes | Next |
| 6 | API Change Watch | Store source contract fingerprint, alert owner when changed, no fake uptime SLAs | Real contract changes + notification receipt | Next |
| 7 | Smart Tool Curator | Select 2–5 valuable GET tools from imported schemas; existing import remains source | Measured reduction in failed first-use steps; customer test | Next |
| 8 | Provider Partner Portal | Provider-owned integration pages, installs and review requests; preserve authorization | Provider-managed or explicitly consented real account | Next |
| 9 | Agency Workspace | Cross-customer isolation, invitations/roles and bounded multi-client rollout; no shared account state | Multi-tenant isolation + independent organization authorization | Later |
| 10 | Usage & Revenue Intelligence | Genuine external tool-call recurrence, infrastructure costs and reconciled payment events | Real customer receipts + reliable source event classification | Later |
| 11 | Interactive MCP Apps | Use existing ext-apps app bundle with real review/catalog data; host-specific UI compatibility | Captured running MCP App on actual compatible host | Later |
| 12 | Managed Auth Broker | Expand existing single-host BYOK and GitHub OAuth to provider-scoped read-only grants | Merchant consent, secure renewal, revocation and isolation | Later, provider-specific |
| 13 | Agent Channel OS | Attribution from customer docs / agent distribution → verified use; no proof by pageview | Independent, consented attribution and connected real calls | Later |
| 14 | Self-Healing Integrations | Diff upstream contracts; propose Draft; tests before explicit publish; preserve published snapshot | Reproducible break→safe draft→passing tests→atomic cutover | Later |
| 15 | Investor Evidence Dashboard | Protected aggregated outcome metrics: activation, retained independent orgs, reconciliation, latency, costs | Proven data lineage and confidentiality; no demo metrics presented as real | Later |

## Rollout policy
- Independent CI, PostgreSQL restore and real production browser/MCP acceptance must pass before a phase is declared deployed.
- No simulated users, revenue, fake provider approvals or unverifiable compatibility badges.
- New public routes are English-first and read-only until publisher consent.
- Keep app DB and customer tenancy independent from Fieldwork, Founder OS, ARQANT, Shopify trial store and the Judge.me pilot.
- No new paid service or model gateway is a prerequisite. Keep the single web service and existing dedicated DB.
- Actual outreach, client activations and paid receipts are parallel business outcomes; a technical PR never substitutes for them.

## Phase 2 implementation delta (MCP Test Lab)
- Owner-protected /lab uses existing Foundry account, server, source execution and provider authorization.
- POST /api/lab/servers/:id/checks executes up to five bounded GETs and stores real outcomes and response shape signatures in PostgreSQL. Owner receives a categorical result and duration, never a stored URL/body/query/secret.
- GET /api/lab/servers/:id returns tenant-scoped test receipts, accepted schema shapes, observed MCP execution summary and remedial recommendations. Anonymous and cross-account clients are rejected.
- POST /api/lab/servers/:id/baselines/:toolId/accept requires matching latest successful schema hash and explicit owner action; it never republishes a server.
- POST /api/lab/curate supplies deterministic, review-required tool recommendations; not AI authorship or automatic publication.
- New /lab page is linked from Agent Launch. No new service, OAuth provider, database instance or cron.
- The Change Watch is on-demand now; scheduled checks and notifications remain unshipped. Investor attribution, agency billing, generic OAuth brokerage and production MCP App visual host checks still require specific implementation and evidence.

## OpenAPI source contract comparison (incremental)
The Test Lab checks actual source response shape. A separate owner-approved public OpenAPI watch now pins the GET-operation schema from a validated HTTPS spec URL and explicitly compares later changes; it does not poll in the background or fetch authenticated provider specifications. Selected import permits deliberate choice of GET operations before Test → Publish. No external host compatibility, paid buyer, provider integration or uptime is inferred.

## Phase 3 — owner-scoped Agency Portfolio v1
The owner-only `/agency` page groups this account's existing servers under manually supplied client labels, with per-server recorded calls, published revision and collaborator counts and explicit host handoff links. `/api/agency/portfolio` and `/api/agency/servers/:id/client-label` reuse PostgreSQL tenancy and authentication. Client labels do not establish verified customer relationships, invoices, independent organizations, cross-account access or transferred ownership. Multi-organization billing and verified agency customers are future work.
