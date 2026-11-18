# MCP Foundry v0.1.0 — Native MCP Builder (official launch)

**MCP Foundry** lets developers turn existing public HTTPS GET APIs into remotely hosted Model Context Protocol servers, test them against real data, publish them, and operate them from a dedicated workspace.

**Live product:** https://mcp-foundry-web-production.up.railway.app

**Developer docs:** https://mcp-foundry-web-production.up.railway.app/developers

**Official MCP Registry identity:** `io.github.Noetfield-Systems/mcp-foundry`

**Official Registry record:** https://registry.modelcontextprotocol.io/v0.1/servers/io.github.Noetfield-Systems%2Fmcp-foundry/versions/0.1.0

## What ships
- Remote **Streamable HTTP** MCP gateway using the official SDK, with anonymous discovery and authenticated owner-specific management tools.
- Customer studio: create, import OpenAPI JSON GET operations, test real upstream responses, publish/unpublish, edit or delete managed MCP servers.
- Public directory backed by published database records.
- Three documented public API starter templates, portable endpoint config, API key issuance and revocation, and external-client installation guide.
- Persistent PostgreSQL accounts, servers, tools, usage events, consented implementation enquiries and first-party account activation receipts.
- Private operator dashboard showing only observed account activation, real usage and qualified lead status.
- External SDK acceptance jobs checking real GET execution, private publishing, lifecycle, isolation, published Registry manifest and cleanup of disposable test accounts.

## Try it
1. Open the live site and register for free.
2. Choose a source-backed template or import your own public OpenAPI JSON.
3. Run a real tool test; publish your MCP endpoint.
4. Install the endpoint with a compatible MCP client and make your first tool invocation.
5. For a scoped custom implementation, submit the separate project brief via the site's implementation enquiry form.

The documented generic configuration example is subject to individual client's current remote-MCP support.

## Proof and limits
The product is live and registered in the official MCP Registry; publication success is independently confirmed by registry readback in GitHub Actions. Executions use public-domain HTTPS GET only with DNS/IP restrictions, request timeouts and response size caps.

An upstream API can rate-limit callers. MCP Foundry does **not** claim cross-provider OAuth, write-action execution, marketplace payouts or paid subscriber activity at this release. Customer payments are not claimed. Stripe subscription Checkout requires separately configured merchant credentials, prices and signed webhooks.

The app is a standalone product from Noetfield Systems Inc. It does not merge ownership of SignalForge, ARQANT, SourceA or the portfolio's agent runtimes.

## Feedback
Use [GitHub Issues](https://github.com/Noetfield-Systems/MCP/issues) for reproducible integration bugs and requests, or the website's [implementation enquiry](https://mcp-foundry-web-production.up.railway.app/#implementation) for a scoped commercial pilot.
