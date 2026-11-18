# MCP Foundry — Strategy V3 / Execution Priorities (18 November 2026)

> **Canonical decision summary.** The complete, advisor-supplied 100-action prioritized backlog and its V2 mapping is preserved verbatim in [STRATEGY-PRIORITIES-2026-11-18.fa.md](STRATEGY-PRIORITIES-2026-11-18.fa.md). This English summary aligns public English-only implementation and operator execution; it does not claim customer traction, paid sales, private API support, or completed unshipped features.

## Product and commercial thesis
**Your API. Everywhere AI Works.** MCP Foundry sells the outcome of launching an API for real use in compatible AI clients: a curated set of useful tools, tested hosted endpoint, client connection, shareable install instructions, and explicit handoff. OpenAPI conversion alone is not defensible against Fern / Speakeasy.

**Independent product boundary:** Foundry owns its API integrations, customer tenancy, billing, publisher/distribution and support. Founder OS, Company OS, Fieldwork, SourceA, SignalForge, ARQANT, BuildRelay and other portfolio ventures are not merged; only permissioned source adapters may integrate.

**Separate funnels, simultaneously active from day one:**
1. **API businesses / SaaS owners** with their own users, who buy a working AI-facing integration.
2. **Development / automation agencies** that can repeatedly commission integrations for clients.
3. **Self-serve builders**, who create from Studio or Foundry's existing authenticated MCP Builder. Free usage does not prove willingness to buy service work.
4. **Web3 / onchain data API owners**, as a specialized read-only research/data vertical, not a wallet/trading or token venture.

## Offers, exact state and scope
| Offer | Proposed price CAD | Status / treatment | Delivery boundary |
|---|---:|---|---|
| Free Builder | Free | Existing | Existing app quotas and supported GET/OpenAPI capabilities |
| Public API Quickstart | CA$199 one-time | Existing Stripe Payment Link per COMMERCIAL-LAUNCH.md; do not infer a paid customer | 1 supported public HTTPS API, up to 3 GET tools, one actual source test, basic client configuration handoff |
| API Agent Launch | **From CA$799**, experimental | **New scoped proposal, not a live instant checkout or guaranteed fixed-price package** | Up to 5 supported public GET tools, 2 agreed use-case tests, one compatible target client, hosted endpoint, shareable install page and bounded revision |
| Private API Launch | **From CA$1,499**, experimental | Quote only; upstream credential support not generally shipped | One selected upstream and method of auth; separately scope implementation, permissions and delivery |
| Managed Care | **CA$79–149/month**, experimental | Quote only; not a running subscription | Contract changes, bounded uptime checks, limited fixes/maintenance, renewal terms and support ceiling |
| Agency Pack | CA$2,400 for three qualifying launches (experiment) | Quoted commercial experiment only | Individually scoped customers and isolated tenants; no implied agency agreement |

The existing CA$199 checkout stays available and must not be delayed while building larger offers. **Quickstart remains narrow** to protect service margin. Payment click ≠ payment; real payment receipt ≠ accepted delivery; count only independently reconciled outcomes.

## Highest-impact roadmap (20 immediate priorities)
The complete 100-item ranked roadmap is in the linked attached source document; reference rank numbers below are **from V3**, not the unrelated 100-item GitHub legacy roadmap.

1. Sell scoped API Agent Launch through an honest request-for-proposal path.
2. Identify 20 relevant API-owner and agency buyer prospects with specific use cases.
3. Make the existing CA$199 Quickstart scope/checkout unmistakable.
4. Link verified processor receipts to orders, initially manually when needed; then signed webhook.
5. Produce a reusable customer brief + delivery acceptance checklist.
6. Quote out-of-scope work specifically, without pretending a configured checkout exists.
7. Surface and demonstrate the **existing** MCP-native create/import/test/publish tools.
8. Offer a safe public-source pre-signup test without confusing demonstrations with usage.
9. Prove one real client connection; label client/host compatibility precisely.
10. Record first real external tool-call receipt, test/live origin and principal when known.
11. Publish three scenario-based reproducible examples, not invented customer stories.
12. Separate **draft revision** from immutable **published revision**; publish atomically and support rollback.
13. Support one narrowly scoped customer-controlled upstream key flow only when supported/tested.
14. Record real received payments, refunds, delivery hours and direct costs.
15. Offer a **shareable public install page + embeddable docs link** that never contains credentials.
16. Record supported client/version/transport/auth combinations actually tested.
17. Diagnose client/upstream/schema/platform errors with specific remedies.
18. Enhance existing OpenAPI preview with clear supported vs unsupported operations.
19. Shorten existing Studio journey to select → test → publish → connect.
20. Activate ten independent builders with help at the actual observed failure point.

## Four growth loops
- **Customer API distribution:** deliver integration → customer adds approved "Use with AI" to their docs → users install → real calls → owner gains a new distribution channel.
- **Agency repeatability:** bounded paid pilot → reusable template → client #2 → lower delivery hours and higher agency repeat orders.
- **Self-serve:** existing Studio or MCP-native Builder → verified external call → shareable template/install → new builder.
- **Learning:** failed real task → classified cause → small fix → retested use case → reduced recurring support.

## Operating rules
- Never rebuild a feature already in main just to claim a new milestone. The native MCP Builder, JSON/YAML OpenAPI import, test, publish, usage, source-backed starter templates and base install generator already exist.
- Keep current graphite UI; no speculative redesign or fake integration data.
- Maximum three concurrent deliverables: one sale/fulfillment, one activation/removal of friction, one reusable distribution asset.
- Suggested effort allocation: 50% sales/delivery, 30% observed friction and fixes, 20% repeatable assets; adapt to actual orders.
- Stage a new feature when a verified paid use case moves its expected outcome ahead, not because of an arbitrary N-user or N-month gate.
- Do not interpret sample calls, CI fixtures, page views, raw invocations or visits as distinct customers; instrument client-verified use when feasible.
- Usage-based billing requires a reliable, deduplicated, recoverable event record; do not charge from a best-effort event table until verified.
- Upstream private API credential authorization and client-to-Foundry auth are different layers. Keep credentials out of public links, docs snippets, URLs and error details.
- Provide commercially viable services from day one without falsely representing unconfigured recurring billing, OAuth support, or an external host not actually tested.
- Smithery migration is a **bounded subcampaign** under general connection diagnostics; official direct URLs often eliminate the need for paid migration.

## 72-hour execution, not 100 blockers
- **0–6h:** Clarify Quickstart and Launch scope; ensure buyer has a working CTA; present existing native AI Builder.
- **6–24h:** Verify and demonstrate one real supported integration, select 20 permission-respecting target buyers, prepare five tailored proposals.
- **24–48h:** Make a shareable docs install link, preserve verified connection receipts, begin approved commercial follow-up.
- **48–72h:** Deliver qualified orders; otherwise fix the main observed connect-to-first-call failure. Reuse what the delivery teaches.

## Thirty-day hypotheses (not achieved metrics)
20–40 well-qualified prospects; 8 relevant conversations; 4 concrete proposals; 2–4 paid and accepted projects; 10 independently activated developers; 4 returning customer organizations. Count separately:
- **Meaningful retained use:** independent external organizations with successful non-test execution on multiple days; infrequent high-value use reported separately.
- **Contribution margin:** actually collected and not-refunded revenue net of relevant tax/processor fees, direct infrastructure/upstream and delivery/support labor. This is not company net profit.

## Source of truth
1. Product code and production receipts take precedence over aspirational prose.
2. [PRODUCT.md](PRODUCT.md), [COMMERCIAL-LAUNCH.md](COMMERCIAL-LAUNCH.md), [GO-TO-MARKET-MCP-2026.md](GO-TO-MARKET-MCP-2026.md) define current implementation/commercial boundaries.
3. The complete V3 advisor text [STRATEGY-PRIORITIES-2026-11-18.fa.md](STRATEGY-PRIORITIES-2026-11-18.fa.md) supplies all 100 priority rows, justifications and V2 mapping. It is a **proposed** roadmap, not proof of 100 shipped features.
4. Keep [GROWTH-AND-ROADMAP.md](GROWTH-AND-ROADMAP.md) as historical existing backlog, with V3 overriding **priority order**, not erasing documented progress.
