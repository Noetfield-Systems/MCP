# MCP Foundry — canonical product thesis (2026-11-17)

## What we are building
**MCP Foundry — Your API. Everywhere AI Works.** A standalone commercial product for creating, running, testing, distributing, analyzing, and ultimately monetizing interoperable MCP endpoints. The repository `Noetfield-Systems/MCP` is its source of truth. Noetfield is portfolio owner, not the product identity.

**Jobs-to-be-done:** “I have a functioning API/service. I want AI clients to use it as approved, observable tools, without building and operating protocol infrastructure.” Primary buyer: developer-founder, SaaS API owner, agency engineer, platform engineer. Secondary buyer: operator of a portfolio of AI ventures and builders supplying tools to agent ecosystems. Our first wedge is **hosted OpenAPI GET-to-MCP + direct endpoint + live test + usage**; do not enter the 3,000-connector-count competition prematurely.

## Product portfolio
1. Studio: import OpenAPI, manual tool authoring, schema editor, versioned server draft/publish, live test, API keys.
2. Remote Hosting: per-server Streamable HTTP endpoints via official MCP v2 SDK (2026-07-28 with supported older stateless clients).
3. Public Directory: real customer-published listings, discoverable by Foundry's own MCP server.
4. Gateway: per-tenant authentication and scoped execution, bounded read-only GET tools, quota, error handling.
5. Observability: successful / failed tools, latency, timestamp and principal when available; tool calls are not customer counts.
6. Developer Experience: guide, copyable configuration, examples, versioning and repeatable deployments.
7. Commerce: Free plan. Subscription checkout integration enabled only with real Stripe secret + Price ID + signed webhook. Revenue recognized only from Stripe reconciliation.
8. **Next:** OAuth connection broker, writes with explicit scopes and idempotency, MCP Apps native UI, run replay, private hosting and self-host exporter.
9. **Expansion:** verified Registry publication, ecosystem marketplace, creator earnings with Stripe Connect (requires actual beneficiary onboarding), usage-based billing, enterprise SSO, A2A/x402 as separate adapters.

## Target experience
A user signs up; creates a server; pastes an OpenAPI JSON plus public HTTPS base URL; imports limited GET operations; tests using live endpoint; publishes; copies `/mcp/:slug`; client discovers tools; calls use tenant-owned server; usage is shown. Private servers use bearer keys. No simulated data, fake customers, or fabricated checkout.

## UX contract
Public site English-first, purposeful editorial typography, premium dark slate + violet/amber visuals, high contrast, desktop and mobile parity. Workspace pages: Servers, Tool Designer, OpenAPI Import, Test Playground, Keys, Usage, Billing. Public pages: Platform, Live Directory, Studio, Developers, Pricing. Human-readable text; never replace a commercial product with a game, empty AI-themed dashboard or synthetic activity.

## North-star and funnels
**North star: weekly externally successful tool invocations in customer-owned published servers.** Supporting:
- Acquisition: qualified developers, signup conversion, source channels, onboarding started.
- Activation: first server created, first GET successfully tested, endpoint published, first external client call.
- Retention: active server owners and repeated real external calls week over week.
- Revenue: real independently reconciled collected money, paying organizations, net revenue, infrastructure cost per verified tool outcome.
- Quality: 2xx share, p95 latency, tool failure attribution, abuse events and canceled customer tasks.
- Reliability: deployed SHA, tests, database availability, retry outcomes, last successful smoke test.

## Pricing experiments (not committed customer prices)
Free: 2 servers, max 10 tools/server, 500 tool calls per server/day.
Pro: higher server/tool limits, 25,000 daily tool calls/server, configurable subscription Price ID.
Done-for-you MCP implementation: pilot quote $199 one-time + optional $29/month operation. These are hypotheses, not existing orders. No synthetic Stripe events as revenue.
Expansion: negotiated enterprise support, API partnerships, hosted private endpoints and high-volume plans. Underlying upstream API costs are customer responsibility.

## First launch
Days 0–2: deployed app + Postgres, tested authentication, real OpenAPI tool, publish, MCP list/call, persisted events.
Days 3–7: 10 external developer interviews, 5 installed endpoints, first partner/pilot offer, documentation, independent receipt.
Days 8–14: first paid pilot, onboarding friction fixes, source-backed templates, public examples, key usage and quotas.
Days 15–30: OAuth connection flow, MCP Apps first interactive view, metered billing, Registry publishing and export paths.
**Acceptance is observed outcome, not the existence of a PR/issue.**

## Anti-drift and venture independence
Founder OS → Company OS → AgentOS/Runway → Verifier owns internal agent work orchestration. MCP Foundry is a **commercial product** with its own customer tenancy and billing. Fieldwork owns relationship intelligence. SignalForge owns market data / research. SourceA owns verification. ARQANT owns agent economy. An adapter can expose a venture tool with delegated authority, never import its DB or secrets into this product or merge their product roadmaps.
