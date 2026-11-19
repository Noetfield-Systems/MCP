# Named MCP Host Acceptance — Cursor, VS Code and Claude Code
**MCP Foundry GA · 2026-11-18 · source-backed configuration and explicit test evidence**

## Evidence tiers
- `CONFIG_GENERATED`: valid-looking configuration for a named host; does **not** prove the host accepted it.
- `SDK_EXTERNAL_CALL`: the official MCP SDK connected to production and invoked a source-backed tool. This verifies protocol, **not** that a named desktop program ran.
- `NAMED_HOST_VERIFIED`: a real installed host/version discovered and invoked the tool, with timestamped redacted proof and a matching Foundry-side successful invocation.
- `CUSTOMER_ACCEPTED`: the customer themselves ran the agreed task and explicitly acknowledged successful delivery.

Do not promote a connector to `NAMED_HOST_VERIFIED` just because Cursor/Claude/VS Code config JSON was generated. **As of this authoring: named GUI/CLI runtime proof remains outstanding unless independently attached.**

## Current provider-specific paths
| AI Host | Public server install | Private service | Official config spec | Current confidence |
|---|---|---|---|---|
| Cursor | project `.cursor/mcp.json` with `mcpServers[name].url` pointing to HTTPS `/mcp/{slug}` | header support varies by host version; keep keys only in private user config | https://cursor.com/docs/mcp | `CONFIG_GENERATED` |
| VS Code (Copilot) | project `.vscode/mcp.json` with `servers[name]={type:'http',url:'...'}` | supported HTTP headers in appropriate secret-handling environment; never commit bearer credentials | https://code.visualstudio.com/docs/agents/reference/mcp-configuration | `CONFIG_GENERATED` |
| Claude Code | `claude mcp add --transport http <name> https://.../mcp/<slug>` | explicit host-managed auth/header; does not automatically inherit Foundry owner secrets | https://code.claude.com/docs/en/mcp | `CONFIG_GENERATED` |
| Official MCP SDK v2 | Streamable HTTP directly to `/mcp/{slug}` | owner-scoped bearer key | repo `scripts/live-smoke.mjs` and successful workflow | `SDK_EXTERNAL_CALL` if same live SHA verified |

## Required real client acceptance
Record for each target integration, without screenshots of secrets:
1. Target customer account, endpoint slug (no shared owner token), deployed SHA and published revision.
2. Exact host name/build, operating system, transport and auth mode.
3. Freshly add/enable host integration using current installation docs.
4. Confirm actual host enumerates tools and correct names/descriptions (not from source code alone).
5. Invoke a narrow read-only tool from the host with a fresh realistic task. Record upstream status/source and client-observed output, timestamp and non-sensitive event reference.
6. Repeat negative case (wrong parameter / unauthorized account), verify clear safe error.
7. Match a real Foundry-side invocation without confusing CI tests, demo calls, browser preview or retry loops with external paying use.
8. Customer acceptance message references the task, result and any agreed limitations. Only then mark scoped **paid** order fulfilled in the operator desk.

**Sample receipt (no invented values):**
```json
{
  "product": "MCP Foundry",
  "evidence_tier": "NAMED_HOST_VERIFIED",
  "host": "Cursor|VS Code|Claude Code",
  "host_version": "<actual installed version>",
  "deployed_sha": "<read from Railway live service>",
  "server_slug": "<real published server>",
  "tool_name": "<actual discovered tool>",
  "tool_call_utc": "<actual timestamp>",
  "source": "<authorized upstream API>",
  "foundry_event_reference": "<actual tenant-readable event>",
  "redacted_host_evidence_url": "<actual screenshot/log>",
  "customer_acceptance_reference": "<actual signoff, if any>"
}
```
A blank template is not evidence and must never be published as a delivered customer case study.

## Safe configuration rules
- Never place private tokens or Bearer secrets inside a public docs link or screenshot.
- This site only generates configuration; it cannot remotely install software or verify that a customer has a specific AI host logged in.
- For public read-only endpoint tests, use existing source-backed examples; if a host requires OAuth and Foundry only offers an owner bearer key for that endpoint, state the limitation rather than promise universal compatibility.
- Retest after major host/SDK/protocol changes. Do not claim “compatible everywhere” based on one source-driven SDK test.

## Acceptance ownership
Technical QA owns independently reproduced SDK and host checks. Customer Delivery owns customer signoff. Operations owns live deployment/revision/trace and verified Stripe payment. The customer retains the authoritative data and account permissions. No unrelated portfolio ventures are involved.
