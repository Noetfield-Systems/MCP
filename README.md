## Judge.me read-only Shopify pilot (in development)

Dedicated merchant OAuth with `read_products read_reviews`, two read-only MCP tools and an account-bound private `/mcp/judgeme` endpoint are implemented on the feature branch. Until the provider credentials and a real development-store consent flow are tested, this is **not** a live integration or partner approval. [Merchant setup](docs/JUDGEME-INSTALL.md) · [QA matrix and submission artifacts](docs/JUDGEME-QA.md).

# MCP FOUNDRY

**Your API. Everywhere AI Works.** An independent commercial developer platform for building, hosting, testing, publishing, operating, and ultimately selling real Model Context Protocol integrations.

[Production application](https://mcp-foundry-web-production.up.railway.app) · [Public directory MCP](https://mcp-foundry-web-production.up.railway.app/mcp/foundry) · [Product strategy](docs/PRODUCT.md) · [Architecture](docs/ARCHITECTURE.md) · [Strategy V3: commercial and execution priorities](docs/STRATEGY-PRIORITIES-2026-11-18.md) · [legacy 100-initiative backlog](docs/GROWTH-AND-ROADMAP.md)

## GA acceptance: customer delivery, real restore drill and named hosts (18 Nov 2026)

- [Customer-accepted delivery](src/order-acceptance.mjs) is now separate from verified Stripe payment: an operator must provide a nontrivial real source-backed delivery reference, actual customer sign-off reference and approver before a paid scoped order can be marked fulfilled. The order and acceptance are recorded in PostgreSQL. No new customer or transaction is inferred.
- [Disposable PostgreSQL restore drill](.github/workflows/disposable-postgres-restore.yml) uses actual `pg_dump` and `pg_restore` between two isolated local PostgreSQL databases, with read-back of published MCP definitions and unpaid fixture order; **not** a substitute for verifying Railway production backup/retention.
- [Named AI host compatibility](docs/HOST-COMPATIBILITY-ACCEPTANCE.md): Cursor, VS Code and Claude Code configurations plus evidence tiers; config generation and SDK smoke are **not** proof of installed host runtime success.
- [Recovery and GA operator runbook](docs/RECOVERY-AND-GA-OPERATIONS.md) defines production backup verification, signed payment, buyer acceptance and release gates.
- Real Chromium production acceptance now additionally exercises `/readiness` and `/blueprints` in responsive route parity and verifies assessment without forced contact/marketing opt-ins.

## Final v1.0 execution — canonically ranked, not 100 launch blockers

- [GA Release Execution Plan (30 ordered upgrades + 6 delivery phases)](docs/GA-RELEASE-EXECUTION-2026-11-18.md).
- [Complete Strategy V3 100-action execution ledger](docs/GA-100-EXECUTION-LEDGER.md) preserves all original ranks, acceptance criteria, previous-backlog mappings and conservative status/evidence triage.
- [P0 Production Incident — repeated 502/timeouts](https://github.com/Noetfield-Systems/MCP/issues/47) precedes any claim of a green current production release. Source CI PASS is not live acceptance.
- **Technical GA is independent of first revenue:** first verified paid project and accepted external usage are parallel commercial targets, not artificial launch blockers.
- Work in at most 3 lanes: service recovery, buyer/order conversion and external client activation. Keep current graphite UI and existing Stripe Quickstart flow.

## Active publication vs draft editing (18 November 2026)
Published MCP servers now serve an **immutable tool snapshot**. New tools, edits, OpenAPI imports and revision restores change the editable draft without removing the live server. An explicit Publish transaction creates the next version and switches it atomically; Unpublish still disables an endpoint. API responses expose `published_revision` and `has_unpublished_changes`; the Marketplace and public directory display only published definitions.

## Limited private upstream API key (BYOK)
In the existing [Connections settings](/oauth) workspace, owners can configure **one AES-256-GCM encrypted upstream bearer key** for an exact public HTTPS API origin. All draft tools for that server must use that host; only private, owner-authenticated MCP calls may inject the key. There are no redirects or secret-bearing public documentation links. Set `FOUNDRY_UPSTREAM_ENCRYPTION_KEY` to a long random **64-character hex secret** in the actual Railway service to enable; until then the UI stays disabled. Save/rotate/revoke deliberately unpublishes that server for retesting before republish. This is not arbitrary OAuth, private-network access or shared end-user auth.

## Orders and pricing
V3 routes the public Launch proposal, CA$199 Quickstart, private API request and agency/care enquiry into separately classified buyer records. Operator Desk can use scoped quote presets to create actual, buyer-specific order URLs. An offered quote is not a paid sale; per-quote Checkout requires Foundry Stripe secret plus signed webhook configuration. Existing CA$199 hosted Stripe Payment Link remains independent and active per its merchant record. Do not count unverified transactions as collected revenue.


## Strategy V3 — API Agent Launch and customer distribution (18 Nov 2026)
Our commercial wedge is the **working AI integration delivered to an API business and its users**, not OpenAPI conversion alone. The live CA$199 Public API Quickstart remains available as-is. **API Agent Launch** is an experimental **from CA$799** individually scoped service proposal (not an enabled fixed checkout), covering supported public GET tools, two agreed use cases, a tested client handoff and an optional customer-docs "Use with AI" installation link. The authenticated MCP-native Builder is already available at `/mcp/foundry`; don't duplicate it. See the complete [advisor V3 / 100-action mapping](docs/STRATEGY-PRIORITIES-2026-11-18.fa.md) and its English decision summary.

## Commercial Clinic V4 — buyer outcomes, reliability and distribution (18 Nov 2026)
The current product is an independent **AI-access integration service**, not a generic promise to convert every website. The [Commercial Clinic strategic blueprint](docs/MCP-FOUNDRY-COMMERCIAL-CLINIC-2026-11-18.md) documents 10 hypothetical buyer scenarios, competitor patterns, bounded offers, honest current limits and a revenue-first operating scorecard. The [Sales Clinic Playbook](docs/SALES-CLINIC-PLAYBOOK.md) defines diagnostic selling, qualification, negotiation and service acceptance. The [Reliability and Delivery Contract](docs/RELIABILITY-AND-DELIVERY.md) separates stored PostgreSQL state from MCP transport sessions, third-party source uptime and unverified backup/SLA promises.

**New customer acquisition asset:** [Free API Agent Readiness Assessment](https://mcp-foundry-web-production.up.railway.app/readiness) (route added on this branch; only call it live once deployed): no registration needed, six-step browser-only self-assessment, 12-point printable checklist and an optional consented enquiry through the **existing** pilot lead pipeline. This does not automatically create a paid order. Existing CA$199 Quickstart and scoped from CA$799 Launch stay unchanged.

## ICP Research CRM & Solution Blueprints (18 Nov 2026)
- [Twenty real researched API business accounts](data/researched-prospects.json) with public API docs, contact channels, native MCP position and individual outreach drafts. **Research records are not customer endorsements, active leads, messages sent, or paid contracts.**
- [Private Operator Desk](https://mcp-foundry-web-production.up.railway.app/operator) now has an operator-protected prospect CRM backed by the existing Foundry PostgreSQL service. Research rows are upserted only once and never overwrite manual outreach stages. CSV export is operator-protected; marking `contacted` requires a recorded real contact receipt.
- [Ten industry Solution Blueprints](https://mcp-foundry-web-production.up.railway.app/blueprints) (route introduced in this release) explain candidate tools, customer task and acceptance, without pretending client projects exist.
- [MCP Doctor engineering and commercial manual](docs/MCP-DOCTOR-ENGINEERING-2026-11-18.md) converts study into a reusable codebase inspection, tool-curation, evaluation and buyer-discovery practice.

## What is real now?
- Public premium website, developer copy/config, directory backed by PostgreSQL rather than fake listings.
- Authenticated customer workspace: create/read servers, add GET tool, OpenAPI JSON/YAML import (paste, upload or public HTTPS spec URL with preview before writes), real upstream test, publish private/public endpoint, create/revoke API keys, observed execution usage.
- Official MCP SDK v2, stateless Streamable HTTP and protocol 2026-07-28.
- Own public discovery server `/mcp/foundry` with anonymous read-only `search_servers`, `get_server_tools`.
- With `Authorization: Bearer fdy_...`: **Foundry itself is a builder MCP** with `list_my_servers`, `create_server`, `add_readonly_tool`, `import_openapi`, `test_readonly_tool`, `publish_server`, `get_server_usage`. Every management tool uses the authenticated account's tenant only. No anonymous write permissions.
- Published managed servers under `/mcp/:slug`; private servers require owner key.
- Dedicated PostgreSQL and Railway service; independent GitHub Actions live acceptance for health, API catalog, official SDK read-only discovery, plus full native builder and actual managed tool execution.
- A **live one-time CA$199 public API Quickstart** is available through a dedicated Stripe-hosted Payment Link; Foundry's separate custom-order Checkout and recurring subscriptions require merchant credentials/webhook setup. A live purchase link is not evidence of a successful charge, customer or revenue. See [Commercial Launch](docs/COMMERCIAL-LAUNCH.md).

## Commercial and builder growth surfaces

Foundry now has focused, English-only paths for [business API owners](https://mcp-foundry-web-production.up.railway.app/solutions), [Web3 and onchain data builders](https://mcp-foundry-web-production.up.railway.app/web3), and [developers, agencies and community partners](https://mcp-foundry-web-production.up.railway.app/collaborate). These pages use the same isolated Foundry product and authenticated Studio—no other Noetfield venture is merged.

Two additional source-backed onboarding templates use **DEX Screener's public read-only API** and the **World Bank public country metadata API**. Provider rate limits and terms apply; these are examples, not a claim of API-provider sponsorship or a customer deployment.

A first-party opportunity pipeline stores consented, role-specific enquiries in PostgreSQL; only the private Operator Desk can read or qualify them. Partner interest is separate from pilot implementation enquiries, Stripe-paid orders, and verified active developers. See [Commercial growth playbook](docs/GO-TO-MARKET-MCP-2026.md).

## Starting locally
Use Node.js 22 and PostgreSQL.

```sh
cp .env.example .env
npm install
npm run check
npm test
DATABASE_URL='postgresql://...' PORT=3000 npm start
```

The backend never silently uses an in-memory customer database. `/healthz` checks real PostgreSQL connectivity. For production deployment see [docs/DEPLOY.md](docs/DEPLOY.md). Secrets belong in infrastructure, not Git.

## Build in two ways
**Browser** — open Studio, register, create server, import or add GET tool, test and publish.

**From an MCP client** — register in Studio and generate an API key in the API keys tab; then attach `https://mcp-foundry-web-production.up.railway.app/mcp/foundry` with Bearer authentication. The authenticated tool list enables natural-language server creation, importing and publishing. Public discovery requires no key.

## Fastest path to a working MCP server
1. Create a free account in [Studio](https://mcp-foundry-web-production.up.railway.app/#studio).
2. Choose one real-source GitHub / Hacker News starter template. This atomically creates an owned draft server with the appropriate tool and schema.
3. Open **Test**, run the example input against the live upstream API, then **Publish** and copy your own remote MCP URL.
4. For a custom API integration, use the public [implementation enquiry](https://mcp-foundry-web-production.up.railway.app/#implementation). It stores the requested scope and permission to contact; it is not a checkout or an invented paid order.

See [Commercial Launch Contract](docs/COMMERCIAL-LAUNCH.md) for the qualified lead workflow and the verified-payment boundary. [Privacy notice](https://mcp-foundry-web-production.up.railway.app/privacy).

## Official MCP Registry distribution
The canonical remote-only manifest is [server.json](server.json), also served unchanged from [the live manifest](https://mcp-foundry-web-production.up.railway.app/server.json) and [well-known discovery](https://mcp-foundry-web-production.up.railway.app/.well-known/mcp/server.json).
The workflow [publish-registry.yml](.github/workflows/publish-registry.yml) uses the official publisher pinned to v1.8.1, Sigstore artifact verification, GitHub Actions OIDC and an exact official Registry API readback. No long-lived GitHub PAT or fictional npm package is required. An unsuccessful Registry action does **not** affect the existing production MCP endpoint or customer tools.
Verify a listed release only via the real Registry API record for `io.github.Noetfield-Systems/mcp-foundry` (version `0.1.0`). A GitHub manifest, passing unit tests or a CI run that never reached the readback stage are not proof of registry publication.

## Manage the full lifecycle
Your Studio can now rename and describe servers, edit/remove tools, unpublish a public or private endpoint instantly, and delete no-longer-needed MCP servers. Changing a tool stages an editable draft while the last published revision stays live. Explicit republish swaps to the tested draft; Unpublish and Delete deliberately revoke access. The directory lists only published tool snapshots.

## Private commercial operations
[Operator Desk](https://mcp-foundry-web-production.up.railway.app/operator) shows genuine account/server usage counts and consented implementation enquiry records. Configure a long random `FOUNDRY_ADMIN_TOKEN` in the Railway service (never in GitHub), then enter it once into the Desk. The token stays in page memory and is not stored in browser storage. Lead status is an operator classification, not a paid receipt. Without the secret the endpoint fails closed.

## OAuth connections and MCP Apps\n\nA constrained GitHub OAuth authorization-code PKCE connector exists for explicitly private MCP servers with encrypted server-side tokens. It remains disabled until a dedicated Foundry GitHub OAuth App client ID/secret and an AES-GCM encryption key are configured. No third-party consent or live account connection is simulated. See [OAuth Connections](docs/OAUTH-CONNECTIONS.md).\n\nThe Foundry MCP endpoint also implements the official MCP Apps Tool + UI Resource extension and returns a self-contained interactive host View. It requires a compatible MCP Apps host. See [MCP Apps](docs/MCP-APPS.md).\n\n## Premium product experience and 100-question acceptance

The premium public site is an evolution of the original dark Foundry visual identity, not a replacement landing page. It now includes an intelligible source API → guarded build/test → remote MCP workflow, three production-grounded product use cases, full public FAQ, polished responsive UI, accessible skip/focus/mobile navigation, live gateway health, and actionable directory MCP URL copy.

**[Read the full 10-persona / 100-question answer matrix](docs/UX-100-QUESTION-REVIEW.md).** All 100 items have candid answers and explicit SHIPPED / IMPROVED / PARTIAL / NOT_YET / NEXT statuses. Personas are simulated evaluation perspectives, never presented as real interviewed customers.

CI exercises the new HTML semantics and coverage, and an independent Chromium workflow checks desktop/mobile, responsive overflow, FAQ, menu access, live API starter, successful test, publish, connection config, authenticated analytics and safe deletion. Public screenshots are attached as CI artifacts so visual changes are auditable.

## Portfolio boundaries
MCP Foundry owns its customer experiences, MCP hosting, private tenant state and commercial billing. Other Noetfield ventures (SignalForge, SourceA, ARQANT, Fieldwork and others) remain independent providers whose external APIs can be wrapped through consented adapters. It never assumes ownership of their data, customers, agent runtime or treasury.

## Commercial proof
Launch and CI are not commercial validation. Targets are first independent external developer-installed working MCP endpoint, repeat customer use and independently verified paid pilot. See [execution issues](https://github.com/Noetfield-Systems/MCP/issues).
