# MCP Foundry — MCP Apps interactive host view

MCP Foundry registers an **official MCP Apps Tool + UI Resource pair** on `/mcp/foundry`:

- App tool: `open_foundry_app`
- UI resource: `ui://mcp-foundry/studio.html`
- Resource MIME type: `RESOURCE_MIME_TYPE` from `@modelcontextprotocol/ext-apps`.
- Embedded View: built as a **single self-contained HTML artifact** with Vite; no remote JS/CDN dependency at runtime.
- Source: `apps/index.html`, `apps/app.js`, `src/mcp.mjs`.

## What the View actually does

In an MCP Apps-capable host, call `open_foundry_app` to display the embedded workspace. The View uses the official `App.callServerTool` bridge—not direct browser access to Foundry cookies or credentials.

- **Public:** search real published servers and inspect published tool descriptions.
- **Owner-authenticated:** retrieve own servers through `list_my_servers`, create a new draft via `create_server`, and deliberately publish an existing tool-bearing draft with `publish_server`.
- Host permission prompts and authentication capability vary. A host that does not support MCP Apps sees the text output but does **not** display an embedded View.
- The app never includes, retrieves, persists or logs a personal API key. The host sends its existing authenticated MCP transport to the server.

## Security and compatibility

The View is a self-contained HTML resource. It calls the server only through the host-mediated MCP Apps bridge, inherits the server's owner-scoped tools and does not bypass quota, status, or read-only GET restrictions. Publishing triggers an explicit View confirmation; hosting clients may impose additional consent.

This integration uses the official extension's `registerAppTool` and `registerAppResource` helpers and does **not** create a competing runtime. The existing standalone Studio remains fully operational for hosts without MCP Apps.

The onchain or payment modules of unrelated Noetfield ventures are not exposed.

## Tests and deploy

```bash
npm install
npm run build:mcp-app
npm run check
npm test
```

CI tests bundling and the official MCP SDK. Production uses a multi-stage Dockerfile to build `dist/index.html` with dev tools excluded from the runtime image. The external SDK acceptance tests call `open_foundry_app`, list and read the `ui://` resource, and check that the bundled HTML is returned.

This is not evidence of a browser-interactive session in a named third-party host. That separately requires host-specific end-to-end verification and an installed user integration.

**Official references:** https://apps.extensions.modelcontextprotocol.io/api/documents/quickstart.html and https://apps.extensions.modelcontextprotocol.io/api/documents/testing-mcp-apps.html
