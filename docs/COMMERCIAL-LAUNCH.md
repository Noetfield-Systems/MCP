# MCP Foundry — Commercial Launch Contract (17 November 2026)

## Thesis
The practical buyer outcome is: **a founder or engineering team gives Foundry a public API or OpenAPI spec and receives a real, tested, portable MCP endpoint and verifiable execution history.** MCP Foundry is an independent product. It does not absorb SignalForge, SourceA, ARQANT, Fieldwork or Founder OS.

## Customer acquisition funnels
### Self-serve developer
External content / developer referral -> visit website -> sign up -> choose one verified-source starter -> run actual tool -> publish endpoint -> install in a compatible MCP client -> first non-test tool call -> weekly repeated calls -> decide on paid hosting.

### Custom implementation
Company visits /#implementation -> consents and submits specific API use case -> durable `pilot_leads` record -> operator qualifies scope and permissions -> written technical scope/price -> payment and confirmation through the intended Stripe product -> fulfillment and independent test evidence -> optional managed hosting.

### Portfolio cross-distribution
Each venture has its own product, customers, treasury and access rights. It can elect to expose a separate read-only API endpoint through the Foundry gateway. The Foundry records its own connector receipt, not the venture's customer payment or user identity.

## Offer strategy
Initial **hypotheses**, not active bills:
- Self-serve free tier: 2 draft/published servers; 10 tools each; 500 daily executions per server.
- One-time custom setup pilot: evaluate a $199 starting quote for a very narrow GET-only existing API, delivered with external MCP SDK receipt. Larger OAuth, private data, production SLA and write tools require a larger scoped proposal.
- Managed hosting experiment: $29/month for small usage, not yet configured as a live Stripe plan. Prices and usage must be adjusted to proven infra costs and customer interest.
- Later premium: volume/enterprise plans, OAuth delegation, private service connectivity, verification, white-label and marketplace creator payouts.

## Current checkout boundary
The connected Noetfield Stripe account has existing unrelated portfolio products and Payment Links; these are **not MCP Foundry products** and must not be relabeled. Direct account readback on 2026-11-17 showed Tax settings status `pending` with a missing head-office field and no Tax registrations. Do not claim that automatic tax, a new MCP Stripe Price, or a new collection flow is configured. The implementation enquiry form collects no money. Production subscription checkout stays disabled without dedicated Stripe credentials, a Price ID and a signed webhook. This is a specific real configuration gap, not a reason to pause the free product or buyer discovery.

## Enquiry operations
- `POST /api/pilot-interest` requires contact consent, a valid work email and a real project brief; sends `202` with reference ID only after persistence, not on Stripe success.
- Fields: contact_name, email, company, website, project_brief, contact_consent, marketing_consent.
- One latest record per email avoids basic repeated submission duplication. No public read endpoint.
- `GET /api/admin/pilot-interest` is limited to authenticated account emails explicitly listed in private `FOUNDRY_ADMIN_EMAILS` deployment variable. Without that variable, it is intentionally not accessible. Configure via Railway once an authorized operator identity is selected. Do not invent a Founder email.
- When updating to Fieldwork, use a consented connector and a durable event; do not silently copy leads across venture databases.
- No automatic email or booked consultation is claimed until a real messaging integration and receipt exist.
- Privacy notice: `/privacy`.

## Launch measurements
1. Visitors and qualitative sources — not equivalent to signed-in users.
2. Account creation, template start, server created, real test success, endpoint published.
3. External MCP client installs (only when observed) and real client tool calls.
4. Repeated weekly non-test invocations and average/p95 latency.
5. Qualified, consented pilot leads, scopes accepted and independently confirmed actual payments.
6. Margin per verified outcome after upstream and hosting costs.

## Seven-day distribution experiments
1. Publish two documented customer-type walkthroughs showing safe read-only API-to-MCP with reproducible GitHub API calls.
2. Invite public API founders and engineering leads to test the one-click source-backed starter.
3. Run 10 targeted developer interviews and capture objection categories (auth, import accuracy, hosting, pricing, discoverability).
4. Offer five narrowly scoped MCP implementation pilots (quote after evaluating real requirements).
5. Follow up with genuinely interested respondents using consent and relevant examples. Use Fieldwork as the separately owned sourcing and relationship system.
6. Track signup-to-first-live-test conversion and failure rate without fake analytics.
7. Only expand into writes, OAuth or marketplace splitting after a demonstrated customer need and proven safe execution.

## Immediate acceptance (P0)
- Production merged SHA and Railway service `SUCCESS`.
- Live browser and SDK discovery pass, and PostgreSQL health check succeeds.
- Temporary test account can create a starter, run real upstream tool, create private server, publish it, connect with SDK, execute and read persisted usage, then delete the account.
- Public pilot form rejects unconsented submissions and accepts/returns a durable ID on a real, voluntarily submitted customer request.
- Checkout is shown as unavailable until verified billing configuration exists.
