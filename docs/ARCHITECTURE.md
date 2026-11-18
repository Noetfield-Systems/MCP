# MCP Foundry architecture and operating contract

## Current release implementation (v0.1)
- Node.js 22 / Express 5
- Official MCP TypeScript SDK v2: `@modelcontextprotocol/server` + `@modelcontextprotocol/node`
- PostgreSQL: durable accounts, sessions, servers, tools, API keys (SHA-256 hashes, shown once), invocation telemetry, Stripe webhook event deduplication
- Public directory: `GET /api/catalog`, `POST /mcp/foundry`
- Managed customer MCP: `POST /mcp/:slug`; SDK supplies 2026-07-28 and legacy stateless support
- Import: customer-supplied OpenAPI JSON; only GET operations and path/query params; no generic write execution.
- Tool safety: public HTTPS port 443 only; DNS resolves public IPv4; pinned resolver, no redirects, 8s timeout, 256 KiB limit; per-IP coarse throttle and per-server daily call quota.
- Onboarding: email + strong password and HttpOnly SameSite session cookie; origin check for browser writes; private MCP bearer-key requirement.
- Billing: subscription Checkout session creation and signed, idempotent webhooks; requires correct env vars, no fake checkout mode.
- CI: node syntax + node:test; deployment health endpoint calls DB.
- State is **not** in memory; DATABASE_URL is mandatory. No customer data is borrowed from an unrelated venture.

## Data flow
Client/Host -> HTTPS /mcp/:slug -> published-server lookup -> permission check -> official MCP handler -> Zod validation -> URL template with enumerated params -> safely pinned HTTPS upstream -> bounded response -> persistent usage event -> MCP tool result.

Control plane -> authenticated /api/* -> PostgreSQL -> same persistent server schema.
Stripe -> signed /api/stripe/webhook -> event idempotency -> subscription status -> account plan. Never infer collection from client redirect.

## Boundaries and limitations
- Production-ready for **basic GET tools** only after external smoke and config verification. Not yet support: writable tools, secrets-managed upstream OAuth, separate paid publisher accounts, resource subscriptions, long-running jobs, arbitrary OpenAPI references or proxying user-supplied hostnames in tool call arguments.
- Public GET endpoints are intentionally open; quotas bound exposure but an owner may still face upstream usage costs.
- Template/snapshot/screenshot/placeholder never counts as a deployed endpoint or customer.
- Current front end displays a clearly marked illustrative analytics chart; workspace usage is calculated from actual DB events.
- The server manifest is a local distribution metadata endpoint. Official Registry publication requires a separate signed push and registry read-back; metadata alone does not imply listing.
- Verify TLS and proxies in Railway. Set `PUBLIC_URL` and `NODE_ENV=production`. Set `DATABASE_URL` to the isolated app database. For billing also set all three: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` and register production webhook URL.

## Required next hardening before scale
1. Add native OAuth 2.1 consent and resource-server discovery for per-customer write permissions.
2. Add tenant role management, verified email and password reset, credential revocation and secure session rotation.
3. Add fully automatic DNS/redirect regression tests, network egress boundary and audit sampling.
4. Add versioned immutable published tool manifests; currently publishing works by toggling draft and republishing, but not immutable snapshots.
5. Add request-level idempotency and explicit human confirmation on all future write operations, payments and external side effects.
6. Migrate to Stripe billing meters/Metronome as demand justifies usage fees; connect payouts only after payee onboarding.
7. Track external independent MCP SDK conformance tests on every production commit and exclude artificial test accounts from conversion metrics.
8. Add consented venture adapters to SignalForge, SourceA, ARQANT, Fieldwork; no cross-tenant/shared secrets.

## Service routes
`/healthz` true DB health; `/api/status` capabilities; `/api/auth/*` customer account;
`/api/servers` CRUD create/list; `/api/servers/:id/tools` registration; `/api/servers/:id/import-openapi`; `/api/servers/:id/publish`; `/api/tools/:id/test`; `/api/servers/:id/usage`; `/api/keys`; `/api/billing/checkout`; `/api/stripe/webhook`; `/api/catalog`; `/mcp/foundry`; `/mcp/:slug`.
