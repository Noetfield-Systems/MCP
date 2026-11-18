# MCP FOUNDRY

**Your API. Everywhere AI Works.** An independent commercial developer platform for building, hosting, testing, publishing, operating, and ultimately selling real Model Context Protocol integrations.

[Production application](https://mcp-foundry-web-production.up.railway.app) · [Public directory MCP](https://mcp-foundry-web-production.up.railway.app/mcp/foundry) · [Product strategy](docs/PRODUCT.md) · [Architecture](docs/ARCHITECTURE.md) · [100-initiative roadmap](docs/GROWTH-AND-ROADMAP.md)

## What is real now?
- Public premium website, developer copy/config, directory backed by PostgreSQL rather than fake listings.
- Authenticated customer workspace: create/read servers, add GET tool, OpenAPI JSON/YAML import (paste, upload or public HTTPS spec URL with preview before writes), real upstream test, publish private/public endpoint, create/revoke API keys, observed execution usage.
- Official MCP SDK v2, stateless Streamable HTTP and protocol 2026-07-28.
- Own public discovery server `/mcp/foundry` with anonymous read-only `search_servers`, `get_server_tools`.
- With `Authorization: Bearer fdy_...`: **Foundry itself is a builder MCP** with `list_my_servers`, `create_server`, `add_readonly_tool`, `import_openapi`, `test_readonly_tool`, `publish_server`, `get_server_usage`. Every management tool uses the authenticated account's tenant only. No anonymous write permissions.
- Published managed servers under `/mcp/:slug`; private servers require owner key.
- Dedicated PostgreSQL and Railway service; independent GitHub Actions live acceptance for health, API catalog, official SDK read-only discovery, plus full native builder and actual managed tool execution.
- Stripe subscription Checkout and signed webhook integration in code, **disabled** until production Stripe billing credentials, plan Price ID and signed webhook are configured. No payments, customers, or revenues are claimed from deployments or tests.

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
Your Studio can now rename and describe servers, edit/remove tools, unpublish a public or private endpoint instantly, and delete no-longer-needed MCP servers. Changes to a tool always return its server to draft until a deliberate republish. The published MCP endpoint and visible directory therefore reflect actual status, not stale UI promises.

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
