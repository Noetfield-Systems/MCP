# MCP Foundry — Commercial Launch Contract (17 November 2026)

## V3 order conversion — implemented pipeline boundaries
- Buyers can select API Agent Launch, Public API Quickstart, Private API Launch, Managed Care, Agency or Custom when submitting a consented proposal. Existing buyer emails are still deduplicated; repeat interest updates the selected package.
- Operator Desk offers editable proposal templates (CA$199 Quickstart, experimental CA$799 Launch, experimental CA$1,499 private integration). The operator confirms a specific scope/amount before creating the buyer-specific order URL. **Prices are starting hypotheses, not automated fixed offerings.**
- `pilot_orders.offer_type` persists the selected scoped offer; signed Stripe Checkout metadata includes it for reconciliation. This does not configure merchant credentials or claim a verified charge. A dedicated Quickstart Payment Link remains the known immediately purchasable offer.
- Buyer and invoice ownership must be verified before manually sharing a scoped payment link; downstream checkout is enabled only by actual Stripe merchant/webhook setup.
- The product now keeps its published endpoint serving an immutable snapshot during ordinary tool editing, and offers an optional owner-configured limited BYOK bearer on a fixed HTTPS host for **private** MCP integrations. Operator delivery acceptance remains a separate workflow.


## Strategy V3 scoped-offer amendment (18 November 2026)
The active **CA$199 Public API Quickstart Payment Link** remains available. The new **API Agent Launch** is an experimental **from CA$799** proposal-based service for one supported public HTTPS API, up to five curated GET tools, two agreed real workflow tests, one supported client handoff, a shareable install page and one bounded revision. This is **not a live CA$799 Stripe Checkout**; final scope, schedule and price require individual agreement. Private upstream keys, OAuth, writes, custom domains and ongoing maintenance are excluded until separately scoped and supported. `/connect` can generate a customer documentation "Use with AI" link for public servers only; it contains no credentials and is not proof of a successful install. The full plan is in [Strategy V3](STRATEGY-PRIORITIES-2026-11-18.md).

## Thesis
The practical buyer outcome is: **a founder or engineering team gives Foundry a public API or OpenAPI spec and receives a real, tested, portable MCP endpoint and verifiable execution history.** MCP Foundry is an independent product. It does not absorb SignalForge, SourceA, ARQANT, Fieldwork or Founder OS.

## Customer acquisition funnels
### Self-serve developer
External content / developer referral -> visit website -> sign up -> choose one verified-source starter -> run actual tool -> publish endpoint -> install in a compatible MCP client -> first non-test tool call -> weekly repeated calls -> decide on paid hosting.

### Custom implementation
Company visits /#implementation -> consents and submits specific API use case -> durable `pilot_leads` record -> operator qualifies scope and permissions -> written technical scope/price -> payment and confirmation through the intended Stripe product -> fulfillment and independent test evidence -> optional managed hosting.

### Portfolio cross-distribution
Each venture has its own product, customers, treasury and access rights. It can elect to expose a separate read-only API endpoint through the Foundry gateway. The Foundry records its own connector receipt, not the venture's customer payment or user identity.

## Offer strategy and actual merchant products

- Self-serve free tier: two draft/published servers; up to ten tools each; 500 managed executions per day per server.
- **Active one-time paid offer:** MCP Foundry — Public API Quickstart at **CA$199 total**, for one supported public HTTPS API, at most three read-only GET tools, one real upstream test and basic remote client handoff. Excludes private upstream keys, OAuth, write operations and enterprise SLAs. Unsupported sources receive a scope discussion or refund before delivery.
- Dedicated live Stripe Product ID `prod_VeLnamHWsrtYRA`, one-time Price ID `price_1Ud35uJ03eJkL57Jl6ZGx6LY` (19900 CAD minor units, price tax_behavior inclusive), live Payment Link ID `plink_1Ud36QJ03eJkL57J0AE4NTHo`. Independently read back as **active/livemode**: https://buy.stripe.com/5kQ7sMaLm81SeWSfPu1Nu0j.
- This Stripe-hosted Payment Link collects the customer's billing address and optional public documentation URL. No API secrets are requested. The external Stripe receipt is the source of truth for paid status. This Payment Link is separate from the app's per-lead quote checkout and does **not** automatically record a `pilot_orders` row without a configured and signed webhook. Do not count clicks as payments or fulfillment.
- Exact per-lead custom quotes: operator may create bespoke CAD/USD service orders via `/operator` and share opaque `/order/<token>` links. Automatic Checkout for these quote links requires dedicated Foundry Stripe restricted API credentials and signed webhook in Railway; until then the page accurately shows unavailable.
- Managed hosting subscription: not configured for production Checkout, no claimed $29/month subscriber. For high-value custom/private/OAuth work, use a separately priced scoped proposal.

## Tax and payment setup — observed gap, not a pretext to block free building

Stripe Tax readback on 2026-11-17 remained `pending` because the merchant's actual head-office address is missing. No active registration was established in this review. The public payment link has **automatic_tax disabled**, and the one-time amount is CA$199 as a fixed inclusive price; **do not** claim Stripe Tax is calculating, collecting or filing taxes. Company bookkeeping must identify whether and where GST/HST/PST registration and tax reporting are legally applicable, based on real corporate facts—not an invented registration. Future payment flows requiring automatic tax need live account address/registration verification. Free product, GitHub onboarding and real sales outreach continue.

All transactions must be independently verified in the Noetfield Stripe account. **No completed customer purchase, net revenue, tax remittance or service fulfillment has been verified yet**.

## Enquiry operations
- `POST /api/pilot-interest` requires contact consent, a valid work email and a real project brief; sends `202` with reference ID only after persistence, not on Stripe success.
- Fields: contact_name, email, company, website, project_brief, contact_consent, marketing_consent.
- One latest record per email avoids basic repeated submission duplication. No public read endpoint.
- `GET /api/admin/pilot-interest`, `GET /api/admin/overview` and scoped `PATCH /api/admin/pilot-interest/:id` use a dedicated strong `FOUNDRY_ADMIN_TOKEN` stored only in Railway. The browser Operator Desk at `/operator` holds the token only in page memory. No verified user identity is inferred from an unverified account email. With no token configured, private endpoints fail closed.
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

## Lifecycle operations
Owners can edit server name/description, edit/remove GET tools, unpublish endpoints, or delete servers. Every changed tool returns the server to draft. All operations are scoped to the authenticated account, exercised in the external MCP SDK acceptance suite, and make no claims about independent human customers.
