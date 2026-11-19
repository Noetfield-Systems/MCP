# MCP Foundry — GA v1.0 Release Execution Plan
**Canonical operating plan · 18 November 2026 · product: Noetfield-Systems/MCP only**
**Final result wanted:** a premium, credible, programmable MCP Foundry that customers can sign up for, self-serve, commission, pay, connect from named AI hosts, operate and trust. **Not** a promise that all 100 long-range actions ship before the initial commercial GA.

## Decision hierarchy and truth
1. Live code, processor receipts, external host calls and customer acceptance override previous strategy text.
2. [Canonical V3 100-action list + outcome-oriented ranks](GA-100-EXECUTION-LEDGER.md) takes precedence over the [historical 100-item capability backlog](GROWTH-AND-ROADMAP.md); previous numbers are preserved for traceability, not conflated.
3. Existing [commercial clinic strategy](MCP-FOUNDRY-COMMERCIAL-CLINIC-2026-11-18.md), [MCP Doctor](MCP-DOCTOR-ENGINEERING-2026-11-18.md), [sales clinic](SALES-CLINIC-PLAYBOOK.md), [reliability contract](RELIABILITY-AND-DELIVERY.md), [first 10 researched businesses](../data/researched-prospects.json) remain adopted.
4. Never merge this independent product with other ventures or construct a duplicate CRM, SDK, API builder, marketplace or OS.
5. Current Graphite UI remains; polish and unify existing pages without a style replacement. English-only public website and customer communication.

## 0. The immediate production incident — P0 / no fictional green status
**Issue #47:** https://github.com/Noetfield-Systems/MCP/issues/47
Latest examined production-facing main commit `970d6e2759d748925957b279d72b7988ac0359c1`: source CI PASS, **four separate production-facing GitHub acceptance workflows FAIL** (browser, SDK, multi-tenant, public-source starters). 502 "Application failed to respond" followed by timeouts. First observed /healthz returned 200 once, but downstream path gave 502. **Root cause unknown**. Do not attribute the incident to an individual code change without Railway logs.
- [ ] Retrieve Railway service/project/environment + currently settled deployment SHA, route-domain mapping and runtime/process logs (including prior successful deployment).
- [ ] Diagnose DB saturation/locks, schema startup behavior, process crashes, healthcheck behavior and proxy 502; retain accounts, orders and encryption settings.
- [ ] Restore the last compatible healthy release or deploy minimal verified fix; don't roll back database destructively.
- [ ] Verify `/healthz`, `/`, `/api/status`, `/readiness`, `/blueprints`, public MCP catalog, protected `/operator` and real client tool invocation; independently retry 5 external workflows for same settled SHA.
- [ ] Confirm the actual current service's BYOK and Stripe environment variable **presence/capability** (do not print values). Any unavailable premium offer remains scoped, while Stripe CA$199 hosted link is independent.
- [ ] Add an outage-failure note and test receipt. Only close #47 when external acceptance is green.

## 1. Product release definition — technical GA, not a sales quota
All relevant paths work in desktop and mobile on the **same** deployed code:
- [ ] **Visitor:** clean homepage/solutions/blueprints/readiness/docs/navigation/privacy/copy, no broken CTA or fabricated testimonials.
- [ ] **Buyer:** compare Free/CA$199/Launch/Private/Managed/Agency honestly; Quickstart hosted Stripe reachable; custom buyer lead saves in Postgres; operator can quote accurately. Verify actual payment status only via Stripe.
- [ ] **Self-service builder:** create account → confirm session → create/import permitted OpenAPI source → preview supported GETs → add/curate tools → real upstream source test → publish active revision → client connection guide → successful tool call → usage.
- [ ] **Native builder:** authenticate from a supported MCP client; create/import/test/publish using existing Foundry MCP tools; isolate account data.
- [ ] **Published revision:** edit new draft while previous published version stays online; atomic publish; rollback and readable revision evidence.
- [ ] **Private BYOK:** if configured, owner-controlled upstream key stored encrypted; one permitted host; never place keys in URLs; rotate/revoke and negative test. Mark unconfigured as unavailable rather than pretending success.
- [ ] **Support:** copyable redacted diagnostic receipt with error category, owner visibility, revision, source limitations and contact path; customer can understand auth/upstream/platform failures.
- [ ] **Marketing:** ten industry blueprints clearly marked proposals; only actual source-backed demos labeled as demos; case studies require true delivery + customer permission.
- [ ] **Operator CRM:** ten researched accounts persisted separately from consented enquiries/orders; stages editable with real contact receipts; CSV export access-limited; 3 drafted messages are not sent.
- [ ] **Recovery:** actual backup configuration inspected and one restore-to-isolated-target drill demonstrated; state and secrets handled appropriately.
- [ ] **Release trace:** current deployed SHA matches tested code, official registry metadata correct, changelog/rollback/operator runbook and real desktop/mobile screenshots.

**Technical GA does NOT depend on an arbitrary number of users, payments, third-party endorsements or an enterprise-only feature.** Commercial proof is a parallel milestone: 1 independently paid buyer + a separately accepted customer task + repeat real usage; never synthesize receipts.

## 2. Execution queue — next 30 concrete upgrades, in actual operating order
Rows are **pending verification or missing work**, not 30 unstarted greenfield projects. Keep at most three in flight.
| Order | Immediate owner | Exact upgrade / proof | V3 linkage | Acceptance |
|---:|---|---|---|---|
| 0 | Reliability | Restore stable Railway web and MCP endpoints, confirm deployment SHA | Incident #47 | External production workflow green for current SHA |
| 1 | QA | Re-test every core public URL and mobile/desktop, fix broken Graphite layout/CTA | 19,43,44 | Browser path and screenshot receipt |
| 2 | Product | Validate existing published snapshot, edit/publish/rollback, version readback | 12,22,66 | Live version A unaffected by editing draft B |
| 3 | Identity | Verify owner/session/API key tenant isolation and correct auth errors | 13,31,33,64 | Cross-tenant and revoked-key negatives |
| 4 | Commercial | Verify CA$199 hosted Stripe link and scope; no false purchase count | 3,4 | Actual hosted checkout link, scope and processor truth |
| 5 | Commercial | Verify custom quotation link, signed payment event and refund state | 4,6,36 | One authorized synthetic webhook test, distinct from real sales |
| 6 | Product | Verify optional lead forms, CRM persistence, operator-only access and CSV | 2,5,14 | Exact Postgres readback and consent boundary |
| 7 | Sales | Keep 20 researched businesses current with verifiable API/MCP status | 2,21 | 20 source-grounded target records; no fake contacted status |
| 8 | Sales | Review and send individually suitable 3 drafted partner enquiries; prepare 2 more | 2,6,49 | Real message IDs/partner submissions after legitimate send |
| 9 | Product | Test anonymous readiness and printable customer checklist | 8,18,43 | No email gate for assessment, correct paid path and no fake lead |
| 10 | QA | Test public GitHub and World Bank examples and one Web3 source against real API | 11,27,84 | Exact source response and documented limitations |
| 11 | QA | Test two *named AI hosts* with version/transport/auth documented | 9,16,31 | Independent host execution receipt, not SDK-only |
| 12 | Product | Persist verifiable client test/live origin and first-call evidence | 10,29,51 | No trial fixture counted as independent customer |
| 13 | Product | Shorten Builder journey, maintain desktop/mobile parity | 19,20,37 | User can import → test → publish → connect without reset |
| 14 | Engineering | Supported/unsupported OpenAPI operations and schema-error preflight | 18,34,74 | No silent unsupported import |
| 15 | Engineering | Limited upstream BYOK: environment readiness, revoke/rotate tests | 13,32,64 | Actual owner-scoped call and secret-free logs |
| 16 | Reliability | Error diagnosis, 429/timeout distinction and customer-safe advice | 17,35,40 | Explicit failure taxonomy and user action |
| 17 | Reliability | Real backup and isolated restore runbook; last-good MCP rollback | 12,66 | Restore drill with measured result |
| 18 | Product | Customer-owned shareable install page and embed snippet, no secrets | 15,49,52 | Real install tested and docs owner approves placement |
| 19 | Product | Test narrow use-case tool selection and evaluate realistic user tasks | 28,59,60 | At least two negative and positive cases per paid task |
| 20 | Sales | Sell eligible Quickstart/Launch scope; don't wait for extra feature gates | 1,3,6 | Independent payment when received; separate delivery receipt |
| 21 | Operations | Record delivery labor, processor fees, infra and upstream cost by order | 14,69 | Contribution-margin report from real work |
| 22 | Commercial | Publish customer-specific proposals and acceptance template | 1,5,21 | Agreed exact work scope + buyer signoff path |
| 23 | Sales | Implement repeatable first agency delivery and referral path | 21,48 | One actual repeat buyer, not a fake agency count |
| 24 | Reliability | Monitor source drift/change and send deduplicated customer alerts | 22,61,63 | Known spec-breaking change triggers useful action |
| 25 | Commercial | Trial bounded Managed Care only after clear service terms | 23,30,70 | First actual signed support/renewal outcome |
| 26 | Product | Make one reusable source-to-tool evaluation template based on buyer task | 28,59,80 | Second independently accepted deployment reduces delivery time |
| 27 | Distribution | Put approved “Use with AI” in customer-owned docs, then measure external installs/calls | 15,41,49 | Customer approval and external evidence |
| 28 | Product | Provide portable export and reproducible import/restore outside Foundry | 24,25,93 | New environment can execute same tools without secrets leakage |
| 29 | Management | Release v1.0 with acceptance report, publish plan for 30-day and quarterly expansion | 44,51,97 | Release SHA, successful external workflow, known limits published |

## 3. Subsequent release streams, preserving all 100 V3 actions
**Track B — P1 (#21–50):** repeatable agency package, spec diff, care contract, export/portability, custom domain, email/password recovery, high-signal task evals, differentiated live/test metrics, simple subscription, client OAuth, independent consumers, structured output, debugging, signed lifecycle, resumable Studio, request board, template cloning, status, registry attribution, appropriate directories and SEO, documentation/connection diagnostics, customer referrals and approved owner distribution.
**Track C — P2 (#51–80):** evidence-backed integration cards, publisher profiles and quality ranking, task-based discovery, verified publisher onboarding, customer feedback and cohorts, small composable tool packs, progressive discovery, useful alerts, clear quotas, circuit breakers, credential life cycle, restore, p95 attribution, redacted trace export, CLI thin on API, GitOps, complex schemas, Studio inspector and compatible MCP Apps, first funded write operation and one winning merchant/logistics vertical.
**Track D — P3 (#81–100):** specialized public data/DEX/developer workflows, customer-funded vertical focus, organization/role workspaces, SSO when contracted, metered billing with reconciled usage, publisher revenue share and optional Stripe Connect, external MCP imports, selected gateway aggregation, customer-owned deployment, benchmark edge hosting, private regions, protocol Tasks/events by real host needs, limited credit offers and eventually a two-sided integration network.

**No expansion items may change an unrelated Noetfield venture's brand or ownership.** Separate third-party customer data and integrations explicitly.

## 4. Six phases with verifiable exit criteria
### Phase A — Recover (blocking only broken functionality)
Stable production and truthful public status; 5 external workflows green or documented and fixed. **Not** a pretext to stop website content, quote preparation or self-serve features elsewhere.

### Phase B — Commercial GA
Working purchase and quote paths, onboarding, published MCP, one independent host demonstration, credible pricing and current limits. Release v1.0 once technical checks pass, regardless of revenue.

### Phase C — First verified sale and acceptance
A real company request → quote/CA$199 purchase → signed payment proof → actual delivered source tool and client test → customer acceptance, costs entered. Report money, not commits.

### Phase D — Adoption and care
Repeat non-fixture external calls, real docs distribution, optional signed Managed Care; quantify failure reduction and support economics.

### Phase E — Professional scale
Self-service improvements, auth/credential UX, conformance matrix, template re-use, reliability, partner delivery and tested backup/restore. Scope enterprise features to actual buyers.

### Phase F — Marketplace / platform
Only after independently observed supply, demand, paid repeat use and publisher economics: selective paid listings, metering/settlement, payouts, outside servers and ecosystem incentives.

## 5. Payment product truth
- **Free:** existing GET/OpenAPI Studio, under current quotas.
- **CA$199 Public API Quickstart:** active Stripe-hosted Payment Link, public HTTPS GET-only bounded offer.
- **From CA$799 Agent Launch:** scoped quote, not preconfigured instant checkout.
- **From CA$1,499 Private/BYOK:** only when actual source and environment auth scope are verified.
- **CA$79–149 monthly Care and CA$2,400 three-pack:** experiments, not automatically active recurring billing or contracted agencies.
- **Every sale:** source/host/capabilities and buyer eligibility; avoid claiming generic POST/OAuth/write support.

## 6. What NOT to rebuild or spend on ahead of revenue
Existing authenticated MCP-native Builder, public OpenAPI import, real source test, published revision snapshots, templates, diagnostics foundations, official Registry presence, Operator orders/lead pipeline, fixed CA$199 Stripe link, graphite site and ten industry blueprints. Also avoid creating a new general AgentOS, large template quantity claims, complex enterprise SSO/regions, x402/publisher payouts or token marketplaces absent customer task funding.

## 7. Weekly operator scorecard and explicit decisions
**Technical:** latest main SHA, settled production SHA, /healthz result, 5 external workflow results, zero/known customer-impact incidents, named-client successful tests, restore drill timestamp.
**Sales:** 20 researched accounts; no outreach automatically implied; 3 Gmail drafts created vs 0 verified sends; actual contacted/replies/qualified/proposal/paid/accepted, current processing fees, refunds, labor and margin.
**Product:** source-import → tool real test → publish → first named-client call, test/live origin, distinct independent organization and repeat usage.
**Priority heuristic:** customer-funded job + short evidence path + existing code reuse > generic feature count. Product may commercially launch before the first buyer; first sale is a validation metric, not a launch gate.

## 8. Dispatch rules for coding agent / operator
- First read main commit, [100-action ledger](GA-100-EXECUTION-LEDGER.md), existing source and Issue #47; don't duplicate shipped code.
- For each selected task: inspect exact file and tests → implement smallest compatible patch → run Node syntax and node:test CI → PR → merge with expected SHA after green → check live deployed SHA/host/browser/SDK → record evidence.
- In parallel, operator uses existing consented leads, researched-prospect CRM, scoped quotes and verified processor records. Never mark email drafts “sent.”
- Work on max three initiatives at once: **incident/reliability, actual revenue, user activation.**
- If real demand makes a later ranked item urgent, document evidence and execute it without artificial policy gates. Do not collapse tasks into a speculative redesign.
- On uncertainty about actual Railway secret/config, report precisely what is not known; avoid declaring service deploy succeeded from a GitHub PR alone.
