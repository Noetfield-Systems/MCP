# MCP Foundry — Buyer Discovery, Packaging and Negotiation Playbook
**Working sales kit, 2026-11-18.** Internal English-language copy. No invented testimonials, customer references, pricing benchmarks or implied customer consent.

## 1. The first conversation: diagnose a job, not a protocol
**Opening:** “Which task do your customers repeatedly do in your product that an AI assistant should be able to complete?”
**Probe:** “What is the exact input, the authoritative data source, and the output a customer would accept?”
**Economic discovery:** “How many times/week does it occur, who does it, how long does it take now, and what is the error cost?”
**Technical discovery:** “Can your team authorize the API? Do you have a documented public GET endpoint, OpenAPI spec, or a private account-scoped service?”
**Install path:** “Which AI assistant do your customers already use? Would you put a ‘Use with AI’ install link in your existing docs?”
**Decision:** If a client-facing repeatable use case + accessible API + named buyer exist, propose a two-task tested launch; otherwise offer short discovery to find a task. Don't pitch "MCP conversion" to a nontechnical buyer.

## 2. Ten customer-specific discovery angles
| Persona | Outreach opening / probable pain | First proof to ask for |
|---|---|---|
| SaaS API founder | “Could a user ask their assistant for your product data instead of copying it from a dashboard?” | Approved public API doc and one recurring user query |
| E-commerce platform | “How often do customers ask product/spec/availability questions that an assistant could retrieve from your own source?” | Catalog sample, source freshness, 10 representative product questions |
| Software agency | “How many client teams need the same tested AI-access layer and how much time do you spend rebuilding handoffs?” | One willing pilot client, source API and realistic delivery timeline |
| Logistics API provider | “Do partners lose time asking for shipment status that your API already knows?” | Valid tracking API and permission model |
| Real-estate data company | “What listing data can a user's assistant access within your publication rights?” | Approved listing schema and usage license |
| Parts/inventory software | “Are SKU compatibility and inventory lookups repeated in support and sales?” | Sample stock API with precise identifiers |
| Accounting platform | “Can approved staff read open invoice data safely without switching systems?” | Per-user permission model; no write/payment claim |
| Staffing software | “Could employers query public vacancies and candidates access only their own application status?” | Public job API and candidate privacy scope |
| Insurance software vendor | “Which approved policy metadata can agents retrieve without offering regulated advice?” | Approved source/version and authorization |
| Onchain analytics API | “Could analysts ask their assistant for your correctly timestamped market data?” | Licensed API endpoint, source/version/freshness rules |

These are **illustrative buyer personas**, not identified prospects or evidence that they need/want the service.

## 3. Qualification rubric (quick scoring, not a gate on offering help)
Score 0 / 1 / 2 for each:
- Repeatable important task: none / vague / specific and frequent.
- Reachable economic buyer: none / influencer / decision maker.
- Source access: unavailable / permissions unclear / owned-authorized API.
- Agent distribution: no target / target host / customer docs placement or user workflow confirmed.
- Ability to pay: speculative / discussed / agrees to paid bounded pilot.
**8–10:** offer scoped Launch. **5–7:** define one task + small paid discovery or Quickstart if public GET fits. **0–4:** show free checklist/Studio and collect opt-in only. These are internal prioritization heuristics, not statistical predictive scores.

## 4. Proposal outline for actual customer (editable template)
**Subject:** AI-ready integration for [PRODUCT] — [ONE CUSTOMER TASK]

- **Business job:** [customer's words, with original user question].
- **Authorized source:** [owner + API reference + rate limits and data rights].
- **Deliverables:** [N curated tools, endpoint, one named AI client, two exact tests, install instructions].
- **Acceptance tests:** Given [valid account input], tool returns [expected data/format] and fails safely on [invalid or unauthorized input].
- **Boundaries:** public GET / private credentials / write operations / human confirmation, explicitly marked included or excluded.
- **Price and payment:** [CAD quote], [scope], [processor], [milestone acceptance], taxes as applicable and accurately stated.
- **Support:** [included correction window, owner of upstream changes, whether recurring care is quoted].
- **Transfer:** [client config with no secrets in shared link], [source ownership and permitted install-doc publication].
- **Outcome metric:** first *external client* successful call and verified user/task benefit, not a claim of revenue uplift.
- **Next action:** purchase actual Quickstart only if eligible, or accept scoped proposal.

## 5. Objection handling / negotiation
**“Our engineer can build MCP in an hour.”** “They may be able to build the initial server. Our paid value is selection of usable tools, validated client installation, troubleshooting and maintaining a working integration as your source changes. We should compare delivery time and outcome, not code-generation time.”
**“Do we need this? Our API already exists.”** “Not necessarily. If no customer task benefits from AI access, don't buy it yet. We can test a single real use case before committing to broader rollout.”
**“Will this work with every AI client?”** “MCP interoperability helps, but host transport/auth support differs. We quote and test one named client first, then add others when verified.”
**“Can you execute payments or change records?”** “The current standard package is read-only. Writes require explicit scopes, confirmed intended side effects and an independently scoped implementation.”
**“Why is there a monthly fee?”** “Only if you want monitoring, managed changes and bounded support. The source API may change independently of the MCP endpoint; maintenance is optional and defined.”
**“Can I own my tools/data?”** “You retain ownership and authorization of your source API/data. Foundry operates its hosted tool definitions under the agreed service terms. Export/self-host terms must be agreed, not implied if tooling is unshipped.”
**“Send me a PDF first.”** “Use our 12-point printable API-to-Agent checklist without signup. For a specific implementation proposal, share your authorized API reference and exact task.”

## 6. Commercial funnel with measurable receipts
Website solution page -> **readiness self-assessment** (anonymous, local processing) -> optional contact consent -> saved lead in existing `pilot_leads` -> source eligibility verification -> scoped quote -> confirmed processor payment -> deployment + client acceptance -> customer-owned docs install -> measured external tool use -> optional Care.
The assessment is never a credit-score/compliance evaluation and never causes a paid order automatically.

**Two fast outreach variants (personalize, no spam):**
- SaaS founder: “I looked at [public developer documentation]. Could we test a small integration that lets an AI assistant complete [specific existing customer lookup]? Foundry delivers a working named-client test and shareable install guide; we can scope it against one real task.”
- Agency: “If [client's service] already offers a documented API, we can deliver a repeatable, isolated MCP endpoint with acceptance tests. I can outline one bounded pilot before discussing a three-client package.”

## 7. Sales operations
Record qualified prospect only after genuine research and permitted contact. CRM fields: owner, company, product URL, API doc, specific customer job, technical contact, rights, timing, service offer, value hypothesis, lead state, quote, processor receipt, delivery evidence, real external usage, next action. Use the existing Foundry opportunity/lead tables; Fieldwork may consume consented integration events but remains separately owned.
Week 1 target experiments (NOT results): research 20 API owners/agencies, start 5 personal relevant conversations, deliver 2 source-backed demos, request 3 technical discovery calls, close the first eligible paid Quickstart/Launch if qualified. Report funnel conversion and cash collected without fake counts.

## 8. Pricing strategy after actual deliveries
For each package, capture delivery time, hourly internal cost, infrastructure, upstream charges, payment fees, support time and refund rate. Increase/segment price only from actual observed margin and buyer willingness; don't copy competitors' listed price blindly. Look for reusable vertical patterns that cut delivery hours while retaining useful agent behavior.
