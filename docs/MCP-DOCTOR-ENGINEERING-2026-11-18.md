# MCP Doctor — Engineering University, Sales Clinic & ICP Operating Standard
**SSOT extension** · 2026-11-18 · Internal operations · External website remains English-only.
This document is an applied engineering standard and commercial workflow, **not** proof of real paid customers or ten delivered MCP connectors.

## 0. Mission and commercial thesis
**MCP Foundry is a programmable clinic for helping existing software/API owners become useful to AI agents.** Our product is NOT a protocol fork, a 24/7 AgentOS, a library of fake customer references, a speculative token marketplace, or an undifferentiated OpenAPI wrapper.
Sell a task successfully accomplished in the customer's chosen AI client. The customer still owns its API, permissions, source data, account access and business rules. Foundry owns the tool definition, approved adapter, hosted service, verified test, compatibility handoff, operations and agreed support.

## 1. Correct mental model (teach every founder, sales operator and coding agent)
- API: an application interface. GitHub source can reveal an internal architecture; it does not confer a customer account or credentials.
- MCP server: presents **Tools** (callable actions), **Resources** (readable contextual data), and **Prompts** (reusable instructions), negotiated by the Host/Client over the protocol.
- Host/AI Agent: reasons, chooses tools, maintains its own workflow context. A remote MCP server is not an autonomous scheduler.
- Transport: 2026-07-28 HTTP core can be stateless. A stable URL is not a permanent TCP connection.
- Application state: Foundry persists account, server, tool, publish revision and execution metadata in PostgreSQL; third-party business data remains in the owner system. MCP does not back up that business database or reconstruct lost AI memory.
- SDK: use the official protocol implementation and conformance tests, not a hand-written parallel protocol.

### Public GitHub source versus authorization
Public repository and public docs are legitimate read/research inputs. Check their licenses **before copying or redistributing their code**. For an independent wrapper that only reads public vendor API data, use published terms/rate limits; proprietary, authenticated account data and write operations need the proper owner's API access. Don't pretend a public source tree is a production token. No invented approval gate for open-source observation and lawful independent integrations.

## 2. Codebase-to-agent inspection pipeline — internal reusable agent routine
**Input:** company website, GitHub repo and API reference if available, first target AI host, one customer job.  
**Output:** a versioned `INTEGRATION_BRIEF` containing source provenance, evidence links, an actionable first implementation path and a real negative-test plan.
1. Crawl publicly documented modules, SDK, OpenAPI schemas, GraphQL schema (if accessible), business object naming, example payloads and permitted authentication.
2. Identify current official MCP, first-party skills, nonofficial/community MCP, native agent interfaces and what they already do. Search updated official docs before asserting no MCP exists.
3. Map the customer's one task from natural-language request → permissioned data → exact source operation → expected result.
4. Candidate tools need explicit verb/noun names, narrow parameter schema, output requirements, source provenance and error taxonomy. Do not generate hundreds of tools from every API operation.
5. Restrict first unattended execution to read-only idempotent actions. Writes, invoices, subscriptions, payments and deletions require their independently tested permission/confirmation/idempotency contract.
6. If HTTP GET public endpoint fits existing Foundry importer, implement in native Studio/Builder. For GraphQL/POST/private OAuth or complex workflows, price the missing adapter separately and do NOT claim default GET Builder already supports it.
7. Test realistic positive, missing, invalid input, 401/403, 429, timeout, schema change and wrong-tenant cases.
8. Test a **named host/version/auth/transport** (e.g. an actual client in production). Record source response versus normalized tool result and observed invocation.
9. Publish a versioned snapshot; retain last-good revision; republish only after real test. Test rollback and reconnection.
10. Hand off a credential-free install guide and receive buyer acceptance. Optional monitoring and source-change maintenance are a separate care offer.

### Tool quality evaluation rubric
For each candidate tool score 0–2 on: user task specificity, semantic selection clarity, schema correctness, scope/authorization, upstream reliability, output usefulness, low cost of invocation, verifiable source citation, recoverability and client compatibility (20 total). A tool with unknown authorization cannot be sold as universally available. Score reflects human/agent review, not evidence of a successful production run.

## 3. The ten vertical playbooks are not ten claims of client deliveries
The public site [Ten Integration Blueprints](/blueprints) includes: product reviews, CX surveys, SMB e-commerce, print-on-demand, publishing, analytics, CRM/quotes, retail inventory, subscriptions, field service. Each is an engineerable **hypothesis** with acceptance; first-party GitHub/World Bank starters are the available real-source demos. Nothing identifies the ten researched prospects as buyers or partners.

## 4. Ten actual named organizations in research CRM
**Source of truth:** [data/researched-prospects.json](../data/researched-prospects.json).
Research completed with real company sites, API documentation and public outreach avenues. Not a contact list scraped for private emails. Each record records:
`company, segment, source API docs, current MCP evidence, specific pain hypothesis, two candidate tools, exact buyer role, partner/contact channel, proposed bounded offer, draft subject/message, rank`.
These are *prospective accounts*, not consented inbound enquiries and never imported into the `pilot_leads` table.

| Rank | Organization | Known current MCP context | Primary sales angle | First contact avenue |
|---|---|---|---|---|
| 1 | Judge.me | Judge.me Email has MCP; reviews scope not established by our research | Review/merchant proof workflow | Published technology partner email |
| 2 | SurveySparrow | API verified; native general MCP unconfirmed | Customer survey aggregate analysis | Official partners form |
| 3 | Ecwid | Store API verified; native MCP unconfirmed | Merchant catalog/stock lookup | Ecwid developer app programme |
| 4 | Printful | API verified; third-party MCP exists | Product/variant catalog agent workflow | Public developer support |
| 5 | Ghost CMS | Content/Admin APIs, community proposals | Read-only editorial discovery | Ghost community integration forum |
| 6 | Plausible Analytics | Sentry community MCP, official feature request | Accuracy/diagnostics for Stats queries | Public feedback and official contact |
| 7 | Teamleader Focus | Orbit MCP announced, distinct from Focus API | Authorized Focus CRM/quotes lookup | Marketplace team |
| 8 | Lightspeed Retail | Native AI features announced | Merchant-authorized multi-location stock reads | Developer partner channel |
| 9 | Recharge | Analytics MCP early-adopter already exists | Non-analytics subscription support reads | Official tech partner application |
| 10 | Jobber | Official MCP already launched | Targeted integration QA/vertical extension **only after gap** | Jobber Developer Center |

**Research-level prioritization:** P1 = #1–3, P2 = #4–7, P3 = #8–10. If native MCP already provides the proposed workflow, **drop or reposition the opportunity**. We do not approach Jobber offering "your first MCP" when they already run one.

## 5. Practical ICP discovery and negotiation
For every company, use its researched API docs, name its actual integration ecosystem and ask one question with a measurable task.
**Diagnostic opening:** “We saw your documented [SOURCE API]. Could a customer of [COMPANY] complete [TASK] in [NAMED AI CLIENT] without switching screens?”
**Current-state test:** Which user role? Frequency? API auth? Authorized source fields? Who currently does the job? Price of mistakes? Customer support load?
**Commercial pitch:** Offer two named task acceptance tests, at most 5 curated read tools, a named client integration and source-backed installation instructions; quote using existing Foundry packages.
**Objection: we already have MCP:** Acknowledge it explicitly and ask if they need third-party host compatibility QA, domain-specific tool curation, install docs or independent maintenance. If not, qualify out.
**Objection: AI can write MCP cheaply:** Agree. Explain that our price is outcome engineering, verification, distribution and bounded maintenance; show a real comparison.
**Follow-up:** Personalized first message, one substantive follow-up only when business correspondence is permissible; respect opt-outs. Do not send automated unsolicited mass emails. For Canadian commercial outreach, ensure applicable identification/unsubscribe and consent requirements are addressed.

### Concrete product packages (existing definitions retained)
- Free Builder: OpenAPI/GET path, supported quotas.
- CA$199 Quickstart: one supported public HTTPS API, max 3 GET tools, actual source test, basic handoff; real live payment link.
- From CA$799 Agent Launch: up to 5 curated public GETs, two task tests, named client, install page; scoped quote, not instant paid checkout.
- From CA$1499 Private Launch: authorization and customer-specific interface by separately validated scope.
- CA$79–149/mo Managed Care and Agency Pack: experimental scopes; no claim recurring checkout active.

## 6. Outreach CRM is operational, not another dashboard
Operator Desk has **research** table `prospect_accounts`, independent of consented `pilot_leads` and actual `pilot_orders`.
- A seeded researched account always starts `researched`; never automatically `contacted`.
- Statuses: researched → qualified → contacted → replied → discovery → proposal → won/lost/not_fit.
- Contacted or later requires a real email message reference, submission confirmation or other trace. Never write a fabricated receipt.
- Track operator notes, next action and public buyer evidence; export CSV via operator-authenticated endpoint.
- Contacting an organization does not imply a willing buyer or consent to marketing. Payment only from authenticated Stripe events, acceptance separately verified.
- No external email has been sent or partnership claimed merely by writing an outreach draft. Record true activity only after it occurs.

## 7. Marketing and credibility evidence ladder
1. **Source-backed Starter:** a publicly documented API, reproducible call and clear attribution, no affiliation.
2. **Verified Demo:** exact protocol/tool source output and named host test, redacted receipt + timestamp + repo/release reference.
3. **Customer Pilot:** real opt-in buyer, service scope, accepted task tests and payment state independently recorded.
4. **Client Case Study:** customer approval to use logo/testimonial and real before/after evidence.
Never label a research prospect as “Trusted by”, a simulated task as delivered, or an ordinary publicly accessible repo as a client endorsement.

**Web assets:** /solutions, /readiness (six-question no-login readiness and printable checklist), /blueprints (ten tasks, tagged truthfully), /developers, /#quickstart, /#implementation, /operator research CRM.
A high-value downloadable asset should solve a real buyer problem (assessment/checklist/test spec), not a generic introductory PDF demanding an email upfront. Email/contact consent is voluntary and recorded separately.

## 8. Reliability engineering / operational continuity
Use [RELIABILITY-AND-DELIVERY.md](RELIABILITY-AND-DELIVERY.md): persistent DB metadata does not equal an outage-proof link. Each service has client-host, authorization, upstream and Foundry failure domains. Monitor and categorize independently. Public GET may be safely retried only with bounded backoff; never replay billable writes without idempotency. Backups, RPO/RTO and SLA require verified drills and measured results before sales promises.

## 9. First 10 sales experiments and proof targets (not actual outcomes)
- Convert P1 research #1–3 into an informed outreach decision; send personally appropriate invitations only through documented paths; capture real activity receipts.
- Prepare one public API demo and one consented private API scoped proposal where technically relevant.
- For every offered quote, define source, tool selection, two task tests, named AI client, acceptance and authorized docs distribution.
- Measure real replied companies, qualified opportunity conversations, proposals, Stripe-paid purchases, delivery acceptance, repeat external tool calls and actual margin.
- Stop or modify an ICP when an official MCP already solves the job. Reuse successful integration patterns across prospects only with source access and licence respected.

## 10. Ongoing research / practice cadence
- Weekly: review current MCP spec and 3 competitor integration flows, run named client conformance, and test top buyer objections in live conversations.
- After every customer integration: score tool usefulness, delivery labor, source drift, failures and retention; update template quality from evidence.
- Monthly: re-audit researched companies for newly launched official MCP features. Each record stores the research date and claims are provisional.
- Do not build a public “university” full of unverified tutorials: publish compact, executable, source-backed lessons and a customer-ready evaluation report.

## Evidence sources (publicly re-check before commercial outreach)
Research URLs per company: `data/researched-prospects.json`. Product support: `docs/PRODUCT.md`, `docs/COMMERCIAL-LAUNCH.md`, `docs/STRATEGY-PRIORITIES-2026-11-18.md`, `docs/MCP-FOUNDRY-COMMERCIAL-CLINIC-2026-11-18.md`.
MCP: https://modelcontextprotocol.io/ · https://blog.modelcontextprotocol.io/posts/mcp-roadmap/
