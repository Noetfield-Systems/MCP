# MCP Foundry — Verified Agent Launch execution plan (22 November 2026)

## Canonical priority
This plan extends the existing Builder, versioned publishing, Operator CRM, OAuth settings, managed MCP execution, client installer, first-party MCP Apps prototype and existing CA$199 Stripe Quickstart. It does not rebuild or silently expand those features, merge venture data, or introduce another paid service.

### Delivery sequence and observable state

| Rank | Capability | This release | Independent follow-up acceptance |
|---|---|---|---|
| 1 | Integration Passport | Public published-only passport + safe API with evidence boundaries | Third-party host receipts and owner opt-in public verification |
| 2 | Agent Launch Kit | Unified owner testing, connection and commercial handoff; reuses Studio import/publish | Real buyer delivery and documented client handoff |
| 3 | MCP Doctor 2.0 | Public configuration inspection + owner-restricted observed error recommendations | Authenticated network Inspector handshake against approved host |
| 4 | AI Agent Test Lab | Up to five bounded owner-selected GET tests; durable sanitized receipt history | Host-specific end-to-end test suite with stable fixtures |
| 5 | API Distribution Kit | Shareable passport + existing credential-free docs installation helper | Customer-owned docs embed and attribution proof |
| 6 | Provider Partner Portal | Existing /collaborate and scoped provider offers; dedicated workflow not yet shipped | Partner onboarding/permissions and partner-approved directory case |
| 7 | API Change Watch | On-demand schema signature / drift detection and explicit owner baseline acceptance | Cost-bounded scheduled monitoring and change notification |
| 8 | Smart Tool Curator | Deterministic ranking of curated GET tools with review-required flag | Reproducible task evaluations, not rankings without client tasks |
| 9 | Agency Workspace | Existing /team collaboration and separated accounts; consolidated agency billing not shipped | Real agency manages multiple independently authorized customers |
| 10 | Usage & Revenue Intelligence | Existing observed tool-event diagnostics, funnel and real payment boundary | Independent customer/organization attribution and reconciled gross margin |
| 11 | Interactive MCP Apps | First-party MCP App artifact already in repo; no new host claims | Actual host compatibility acceptance and polished visual application |
| 12 | Managed Auth Broker | Existing narrow GitHub/Judge.me integrations, not generic OAuth brokerage | One selected provider, delegated consent, renewal, revocation and cross-tenant tests |

## End-user entry points
- Agent Launch: /launch
- Public Integration Passport: /passport?server=EXISTING-PUBLISHED-SLUG
- Owner test lab: /launch → Load my servers → select tool → JSON arguments → Run selected GET tests
- Public Doctor: /launch → Diagnose the public configuration
- Customer documentation: /connect?server=EXISTING-PUBLISHED-SLUG
- Existing Studio: /#studio
- Existing paid Quickstart: /#quickstart

## Data and safety contracts
- Public Passports include only public, published snapshot name, revision, bounded tool names/descriptions and parameter names/types. Never include tool URLs, API credentials, tokens or private draft state.
- Public Doctor inspects only Foundry-stored public metadata; does NOT claim to have completed a remote MCP handshake, vulnerability scan, or independent certification.
- Owner tests call existing guardedManagedGet (same upstream authorization, public HTTPS/DNS pinning, no redirects, request timeout and 256-KiB response cap). Max five GET cases per batch and 40 receipts per server per rolling day.
- Only categorical outcomes, duration, schema **keys and types** (not values), SHA-256 schema fingerprints and time are persisted. Never store response bodies, URLs, query parameters, customer PII or credentials in receipts.
- First passing shape records an owner baseline. Subsequent divergence is shown, not auto-accepted. Explicit authenticated owner action with matching latest shape fingerprint is needed to rebaseline. Publishing a new tool revision is a separate action in Studio.
- The existing tool_events table is observational; unit tests, synthetic traffic, generated links or copied client configurations never count as real customers, revenue or partner approval.
- No background workers, cron services, new databases or recurring charges are introduced.

## Release checks
1. npm run check && npm test.
2. Run application using the existing Railway PostgreSQL; /healthz and /launch and /passport serve HTTP 200.
3. Anonymous /api/passports/UNKNOWN and /api/doctor/UNKNOWN return not-found; anonymous owner GET/POST return 401. A private published server never yields a public passport.
4. Sign in with an ephemeral account, create a server from a real public API template, run owner tests, read actual stored receipts, publish public, verify published-only Passport and Doctor without credentials.
5. Edit a draft without publishing; Passport continues showing original published snapshot. Validate that no token, upstream URL or request arguments appear in public Passport.
6. Run with a valid public API response, then deliberately select a changed schema fixture and observe contract drift; approve baseline only after inspecting the shape difference.
7. Verify /connect host config in an independently executing MCP client. Unit/schema checks alone do not imply host compatibility.
8. Check responsive browser navigation, text wrapping and accessible forms on mobile + desktop. Observe actual links, not just HTML.
9. Assert no fabricated merchant logos, partner approvals, verified revenue or customer/user counts.

## Commercial outcomes to measure, not fabricate
- Qualified API owners reaching a first bounded live test
- Owner workspaces reaching a published server and a documented external client execution
- Consented requests for CA$199 Quickstart and negotiated Launch services
- Real processor-reconciled receipts and independently accepted customer delivery
- Repeat customers and contribution margin after third-party/API execution costs

### Reference benchmarks
- Official MCP Inspector: https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector
- Official MCP Apps: https://github.com/modelcontextprotocol/ext-apps
- Arcade (runtime authorization): https://www.arcade.dev/blog/ai-agent-integration-platforms/
- Managed integration patterns: https://nango.dev/blog/best-mcp-servers-for-agent-api-integrations/

This is a release ledger and implementation contract. Unshipped future capabilities remain clearly marked; no projected capabilities are represented as implemented.
