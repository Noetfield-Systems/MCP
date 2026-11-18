# MCP Foundry — Commercial Clinic & Strategic Blueprint
**Decision date:** 2026-11-18 · **Status:** strategy + implementation contract, not evidence of completed sales  
**Product:** Independent MCP Foundry (Noetfield Systems Inc.) · **Public copy:** English-only

## 1. What the product is and is not
**Positioning:** *Make your API useful to AI agents. Tested, hosted, and ready for your customers.*
Foundry builds and operates **customer-permissioned, agent-facing integrations** over existing systems; MCP is the interface protocol, not a permanently running agent or a replacement for the source API. The source retains business logic, account authorization and data authority. The MCP describes exposed tools/resources/prompts and their invocation contract. The host/agent decides which to call. Protocol revision 2026-07-28 uses stateless HTTP core; persistent business state is application-managed, not implicit transport session state.

**Anti-commodity thesis:** A generic OpenAPI-to-MCP converter is easy to reproduce. The defensible deliverable is *curated tool design + working customer data access + tested named host + verified outcome + install/distribution + support*. Never pitch "we convert any website" or "one MCP works everywhere without configuration."

## 2. Evidence boundary — actual platform inventory
Verified in repository README, schema and server routes, not an independent revenue audit:
- Existing: browser builder and authenticated MCP-native builder; public HTTPS GET/OpenAPI JSON/YAML preview/import; live test; published managed endpoints; tenant accounts; keys; Postgres persistence; observed tool events; directory; source-backed starters; shareable public install; independent smoke workflows.
- PostgreSQL stores accounts, hashed sessions and API keys, servers, draft tools, published snapshots/revisions, invocation outcome metadata, enquiries, orders and scoped credential ciphertext where configured. It **does not** automatically snapshot a customer's source database, preserve model memory, or guarantee recovery from upstream vendor outages.
- Existing paid path: CA$199 Quickstart Stripe Payment Link. A live link does not prove collection or delivery. Existing free Studio remains accessible. From CA$799 Agent Launch, from CA$1,499 Private Launch, CA$79–149/month Care and the CA$2,400/three agency experiment are **scoped hypotheses** rather than independently paid subscriptions.
- Limits requiring honest scoping: public GET first; private credentials narrower and configuration-dependent; OAuth third-party GitHub flow configured only with dedicated secrets; generic writes, strong per-user delegated OAuth and contractual uptime guarantees are not universally available. Verify exact source and client capability for each order.
- **No claimed independent paid customer, revenue, agency partner, or external retention until separately evidenced.**

## 3. Competitive intelligence: copy working business patterns, not protected assets
| Vendor | Observed public pattern | Adaptation / counter-position | Do not misrepresent |
|---|---|---|---|
| Speakeasy | OpenAPI-to-MCP generation, custom tool names/scopes, eval and managed gateway | Curated outcome-oriented tool selection, tested handoff and specific customer use cases | No exclusive claim on automatic generation |
| Pipedream | Broad app catalog; per-user managed OAuth and refresh; hosted actions/triggers | Diagnose authorization as product value; ship narrow permissioned customer-controlled auth once proven | Never claim 3,000+ connectors in Foundry |
| Zapier MCP | Distribution through an established app ecosystem; usage-metered actions | Piggyback on **customer-owned** product docs: “Use with AI” and guided install | Never claim wide host interoperability without tests |
| Workato | Reuse enterprise recipes as governed agent-executable operations | Value is existing business actions, not 1:1 API endpoint count | Avoid rebuilding full enterprise orchestration |
| Kong | Gateway layer: authentication, policy, rate limits, logs, aggregation | Outcome receipts, versioned publishing and troubleshooting | Don't claim enterprise gateway parity |
| Cloudflare | Inexpensive remote MCP hosting and application state primitives | Sell operator expertise/service continuity rather than bare compute | Low-cost hosting is commodity |
| Fern | API documentation → discoverable tools and hosted interface | Embed install paths in the **customer's** documentation, not only our directory | Don't imply publication grants users |
| n8n | AI clients can interact with existing workflow systems through MCP | Offer narrow workflow wrappers via approved adapters if customer needs them | Foundry is not a 24/7 workflow scheduler |
| Official MCP Registry | Metadata discovery + verified publisher namespace | Publish only with Registry API readback; link official install directions | Listing ≠ activation |
| Composio | Prebuilt toolkits and user connection management | Focus on API-owner distribution and domain-specific outcomes | Avoid connector-count war |

Primary references (recheck quarterly):  
https://www.speakeasy.com/docs/standalone-mcp/overview  
https://pipedream.com/connect  
https://help.zapier.com/hc/en-us/articles/48308034391821-What-is-Zapier-MCP  
https://www.workato.com/agentic/mcp  
https://developer.konghq.com/mcp/  
https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/  
https://buildwithfern.com/learn/mcp-generator/get-started/quickstart  
https://n8n.io/mcp/  
https://github.com/modelcontextprotocol/registry  
https://docs.composio.dev/docs/composio-connect

## 4. Ten prospective customer scenarios (personas, NOT named live prospects)
All tools shown are illustrative **scoped design proposals**, not shipped connectors. `R` = read-only candidate using supported public GET if actually available; `A` = authenticated source; `W` = writing/mutation, separately engineered.

| Rank | Buyer / target company | Costly recurring problem | Candidate tools | Acceptance / business benefit | Commercial fit |
|---|---|---|---|---|---|
| 1 | B2B SaaS with public developer API | Users struggle to query its product from AI assistants | `find_customer` R/A, `get_plan` R/A, `list_invoices` A | Named host retrieves correct approved account details; published install page | Agent Launch / Custom |
| 2 | E-commerce SaaS with product catalog API | Support repeatedly answers stock/spec questions | `find_products` R, `get_stock` R/A, `get_shipping_policy` R | Correct catalog results across 20 representative queries; fewer manual handoffs | Quickstart or Launch |
| 3 | Agency maintaining clients' APIs | Custom AI integrations repeatedly rebuilt | `get_catalog` R, `fetch_order` A, `quote_status` A | Two repeatable deployments without cross-tenant data leak | Agency Pack |
| 4 | Shipping/logistics API provider | Partners ask for order/ETA status across systems | `track_shipment` A, `get_service_region` R | Correct eligible shipment updates at designated client | Scoped Custom |
| 5 | Real-estate data platform | Agents cannot query permitted listings reliably | `search_listings` R/A, `get_listing` R/A | No invented availability; source freshness visible | Agent Launch |
| 6 | Inventory / parts distributor | Search of SKU and compatibility consumes staff time | `lookup_sku` R/A, `check_compatibility` R/A | Agent picks valid SKU in reference cases | Agent Launch |
| 7 | Accounting / invoicing software | Bookkeepers manually cross-reference invoices and balances | `list_open_invoices` A, `get_invoice` A, `draft_reminder` W | Account-scoped read accuracy first; writes only after confirmation | Private Custom |
| 8 | Recruitment / staffing SaaS | Repetitive candidate/job status lookup | `search_public_jobs` R, `get_application_status` A | Access only to authorized candidate; no cross-user leakage | Public pilot then Private |
| 9 | Insurance brokerage software vendor | Staff look up policy/product documents manually | `search_approved_products` R/A, `get_document` A | Current licensed content, approved roles; no unauthorized recommendations | High-touch Custom |
| 10 | Onchain analytics API business | Analysts need normalized market and protocol data | `market_overview` R, `pool_liquidity` R, `asset_metadata` R | 20 reproducible data queries with source/freshness | Launch / licensed API usage |

**First 20 actual prospect selection:** prioritize #1–3 (existing documented API, reachable technical founder, customer-facing documentation). Reserve #10 for a niche distribution experiment; don't substitute crypto hobby traffic for actual external paying API owners. Targeted prospects must be researched and entered individually, not invented as contacted.

## 5. Sales packages as customer outcomes — commercial contract
| Offer | Buyer promise | Bounded scope | Price/status |
|---|---|---|---|
| Free Builder | Self-create and test a read-only endpoint | Existing free quota and capabilities | Free, existing |
| Public API Quickstart | “Put one simple public API in an AI client” | One eligible public HTTPS API, 3 GET tools, one real upstream test, basic install guide | CA$199 one time, existing Stripe link |
| API Agent Launch | “Launch one practical agent-facing use case for your customers” | One public API, up to 5 curated GET tools, 2 agreed task tests, one named client handoff, shareable install page, bounded revision | From CA$799 scoped proposal only |
| Private API Launch | “Connect permissioned business data without spreading credentials” | One upstream, auth design and access test priced explicitly; phase gated **by actual technical requirement** | From CA$1,499 experimental quote |
| Managed Care | “Keep a paid deployment working as source APIs evolve” | Agreed checking schedule, incident triage, revisions and support ceilings; no blanket SLA | CA$79–149/mo proposed, not live recurring checkout |
| Agency 3-Pack | “Ship repeatable customer integrations” | 3 scoped qualifying launches, separate tenants, acceptance per client | CA$2,400 experiment/quote |

**Protect gross margin:** track estimated setup hours, actual delivery hours, target contribution, third-party API cost and support time *per project*. Quote authenticated/writable custom work separately. Never sell unavailable write/OAuth capabilities as included.

## 6. Discovery clinic / consultation protocol
1. Ask: “What customer task currently requires a person to switch apps or copy data?”
2. Ask: “Who performs it, how often, and what does one failure cost?”
3. Ask: “Do you own the API, and what read/write permissions can you authorize?”
4. Confirm the single *job-to-be-done*: user message, expected tool calls, expected output.
5. Inspect API docs / OpenAPI, auth, rate limit, sample response and ownership. Label unsupported operations explicitly.
6. Run one representative test with authorized sample data. Classify: eligible GET now / scoped private work / no fit.
7. Name exactly one client/host + required auth/transport combination; verify that combination.
8. Select a bounded package; issue a fixed scope with test cases and clear exclusions.
9. Deliver in Foundry, have the customer execute and accept the case in their client.
10. Place a public **credential-free** “Use with AI” guide on the customer's own docs, with approval.
11. Offer optional maintenance and establish who owns source API changes.
12. Record actual work hours, Stripe receipts, accepted delivery, repeat external use and margin.

**Value hypothesis formula:** monthly hours saved = eligible task count × observed minutes saved / 60, multiplied by verified loaded labor rate; also track increased adoption or reduced integration churn. These are discovery estimates until measured, not guaranteed savings.

## 7. Demand-generation assets and funnel
**Don't launch a generic 30-page “What is MCP” PDF.** Low-intent developer education doesn't identify a purchaser. Instead:
- A **no-login AI Agent Readiness Assessment** on our /solutions path: self-assess source API, customer job, documentation, auth and deployment constraints; outputs short action plan and route into either current Quickstart or scoped Launch.
- A genuinely useful **12-point customer API-to-Agent launch checklist** (HTML print/save as PDF) with example test cases, ownership and launch considerations. Keep it ungated to build trust; ask for email *only* when the visitor requests a tailored review/consultation. Explicit separate marketing opt-in.
- A source-backed sample showing `OpenAPI → tool selection → actual upstream test → named client → install docs`. Never fake partners or testimonials.
- A 1-page technical brief for agency outreach, with cost, scope and first-client acceptance.

**Acquisition paths:** direct API-founder outreach; agency referrals; GitHub README and issue discussions where invited; partner docs links; technical case articles; official Registry verified listing. Track UTM/source and actual lead state when consented.
**Lead states:** visitor → assessment completed (anonymous) → opted-in enquiry → qualified API → proposed scope → paid via processor → delivery accepted → active external usage → renewed support. Every transition requires a real event, no synthetic activation.

## 8. Operational reliability and recoverability promise
See [RELIABILITY-AND-DELIVERY.md](RELIABILITY-AND-DELIVERY.md) for explicit RPO/RTO targets (proposed until measured), failure handling, snapshots, backups, auth boundaries, tool-level receipts, API-change monitoring and incident contracts. Under 2026-07-28, MCP HTTP sessions are stateless; **app state and recoverability are separate design responsibilities**.

## 9. The priority roadmap: revenue first, proof before expansion
**0–72 hours:** fix database bootstrap ordering; add qualification/readiness asset, clear path to CA$199 checkout and scoped Launch; verify one full external client execution; prepare 20 researched prospects and 5 tailored offers; attribute delivered acceptance and actual payment.
**Days 4–14:** deliver first eligible paid work; publish 2 reproducible source-backed demonstrations; diagnose activation failures; sell agency repeat path; finish and test one permissioned private upstream pattern when a qualified buyer needs it.
**Days 15–30:** turn actual failure patterns into tool curation/evals, retry+timeout taxonomy, published revision rollback, client compatibility matrix, support contracts and margins. Test recurrence with independent customers.
**Days 31–90:** package the best-performing vertical workflow as a reusable template + sales proof; consider enhanced OAuth, automated source-contract checks, per-user consent and metered billing where paid pull exists. Only launch marketplace payouts when two-sided marketplace demand exists.

### Operating concurrency
At most 3 active loops: (1) sale/delivery, (2) customer activation and defects, (3) reusable template/docs acquisition asset. Founder OS orchestration, external venture runtimes and their treasuries remain independent.

## 10. Scorecard with no vanity proxies
- **Commercial:** collected/reconciled CAD; number of *independent* paying organizations; accepted deliveries; contribution margin (net of direct labor, fees, infra/upstream).
- **Product:** proportion from registration → actual upstream test → publish → *named external client* non-test call; time-to-first-value; repeat organizations/week.
- **Reliability:** availability from external probes; 95th percentile latency; error attribution (client/auth/schema/upstream/platform); reverts; restore test age; unresolved source API changes.
- **Growth:** opted-in qualified leads by ICP/channel; proposal acceptance; agency repeat deployments; customer-owned documentation installs with evidence.
- **Do not count:** page views as leads, test fixtures as users, live Payment Links as collected revenue, marketplace listing as distribution, or CI pass as guaranteed availability.

## References and continuity
- Product baseline: [PRODUCT.md](PRODUCT.md); price/processor truth: [COMMERCIAL-LAUNCH.md](COMMERCIAL-LAUNCH.md); v3 prioritization: [STRATEGY-PRIORITIES-2026-11-18.md](STRATEGY-PRIORITIES-2026-11-18.md)
- This document refines GTM, buyer discovery, ICP and defensibility; it does **not** supersede the existing 100-action backlog or silently replace platform requirements.
- MCP 2026-07-28: https://blog.modelcontextprotocol.io/posts/2026-07-28/
- Official security reference: https://modelcontextprotocol.io/docs/learn/security
