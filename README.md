# MCP FOUNDRY

**Your API. Everywhere AI Works.** An independent commercial developer platform for building, hosting, testing, publishing, operating, and ultimately selling real Model Context Protocol integrations.

[Production application](https://mcp-foundry-web-production.up.railway.app) · [Public directory MCP](https://mcp-foundry-web-production.up.railway.app/mcp/foundry) · [Product strategy](docs/PRODUCT.md) · [Architecture](docs/ARCHITECTURE.md) · [100-initiative roadmap](docs/GROWTH-AND-ROADMAP.md)

## What is real now?
- Public premium website, developer copy/config, directory backed by PostgreSQL rather than fake listings.
- Authenticated customer workspace: create/read servers, add GET tool, OpenAPI JSON import, real upstream test, publish private/public endpoint, create/revoke API keys, observed execution usage.
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

## Portfolio boundaries
MCP Foundry owns its customer experiences, MCP hosting, private tenant state and commercial billing. Other Noetfield ventures (SignalForge, SourceA, ARQANT, Fieldwork and others) remain independent providers whose external APIs can be wrapped through consented adapters. It never assumes ownership of their data, customers, agent runtime or treasury.

## Commercial proof
Launch and CI are not commercial validation. Targets are first independent external developer-installed working MCP endpoint, repeat customer use and independently verified paid pilot. See [execution issues](https://github.com/Noetfield-Systems/MCP/issues).
