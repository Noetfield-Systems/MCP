# MCP Foundry — 10 buyer personas × 100 acceptance questions

**Assessment date:** 2026-11-17 (Vancouver). **Method:** simulated role-based product audit against the inspected repository, previously verified GitHub/Railway/official Registry evidence, and the premium-UX change set. These are **not interviews with ten real people**. “SHIPPED” refers to established code/observed release; “IMPROVED” refers to code in this UX upgrade, which must pass CI and deployed acceptance; “PARTIAL” means restricted operation; “NOT_YET” is not marketed as available; “NEXT” is an outcome goal, not done.

## Executive acceptance

The core product is usable: real remote GET MCP tools, ownership, authentication, publish/unpublish, official discovery and persisted execution. The premium changes improve comprehension, navigation, first-run experience and truthful status. The major unresolved commercial/product areas are **actual paid buyers and live Stripe configuration**, OAuth/private upstream connections, team RBAC, write operations, immutable audit/export, enterprise SLA and full MCA Apps support. They are recorded without pretending they were delivered.

## 01 · First-time independent developer

1. **Where do I start?**  
   **Answer — SHIPPED:** Open Studio, register, select the Hacker News starter, test, then publish. The starter builds a real draft server with one GET tool.

2. **Do I need a credit card?**  
   **Answer — SHIPPED:** No. Free workspace creation and starter tool execution do not require a card; optional paid Checkout is not currently configured.

3. **Can I avoid designing JSON by hand?**  
   **Answer — PARTIAL:** Yes for the built-in public API starters. Custom tools can use declared parameters or JSON/YAML OpenAPI import, with a read-only tool preview. A full visual schema editor remains future work.

4. **Will a starter call a genuine API?**  
   **Answer — SHIPPED:** Yes. Hacker News and GitHub examples call the corresponding public endpoints. Upstream rate limits or failures can still occur.

5. **Where do I see my first successful test?**  
   **Answer — SHIPPED:** Studio's Test tab returns the actual response or error; the observed activation checklist marks success after the server operation finishes.

6. **What do I publish?**  
   **Answer — SHIPPED:** An HTTPS Streamable HTTP endpoint at /mcp/{slug}; you choose Public or Private visibility.

7. **Can I copy a working connection template?**  
   **Answer — SHIPPED:** Published server overview offers Copy client config. Exact fields still depend on your MCP client.

8. **What if I make a naming mistake?**  
   **Answer — SHIPPED:** New Server suggests a normalized slug from the name; you can edit it. The global slug must be unique.

9. **Is the product usable on a phone?**  
   **Answer — SHIPPED:** Mobile responsive layout and real Chromium viewport testing are included. Some complex developer editing is more comfortable on desktop.

10. **Where can I ask for help?**  
   **Answer — SHIPPED:** The public developer guide, GitHub Issues and scoped implementation enquiry form provide documented paths; live human support SLA is not promised.

## 02 · SaaS API founder and owner

11. **Can Foundry wrap my existing SaaS API?**  
   **Answer — PARTIAL:** Yes for publicly reachable HTTPS GET operations, with manual registration or JSON/YAML OpenAPI import, including a guarded public spec URL. It is not a universal authenticated proxy yet.

12. **Does it accept a YAML OpenAPI file?**  
   **Answer — SHIPPED:** The import wizard accepts OpenAPI JSON/YAML pasted text, local .json/.yaml/.yml files and public HTTPS specification URLs. It previews supported GET tools without writing to the workspace. OAuth/private upstreams are not supported.

13. **Will it import POST/PUT/PATCH/DELETE?**  
   **Answer — NOT_YET:** No. This release deliberately supports read-only GET operations; unsafe write actions and payment execution are not available.

14. **How are operation names determined?**  
   **Answer — SHIPPED:** The importer translates safe GET operations into MCP tool names and uses their parameters, names and descriptions where supported.

15. **How are dynamic parameters represented?**  
   **Answer — SHIPPED:** Only declared path/query arguments of supported simple types may alter the constructed request. Hidden arbitrary target URLs are not accepted.

16. **Can my endpoint be private?**  
   **Answer — SHIPPED:** Yes; the customer's private MCP URL requires an authorized Foundry bearer key, independent of the login session cookie.

17. **What happens after updating a tool?**  
   **Answer — SHIPPED:** The server is marked draft. Its endpoint stops being published until you explicitly republish it.

18. **Can I use my brand's domain?**  
   **Answer — NOT_YET:** Foundry hosts under its current service domain. Customer-managed domains are planned, not a shipped feature.

19. **Are upstream API bills included?**  
   **Answer — SHIPPED:** No usage-fee assumption is made. Your upstream provider's terms and costs remain your responsibility.

20. **Can I export my MCP package?**  
   **Answer — NOT_YET:** An npm/package export and self-host generator are roadmap items; this release exposes hosted remote endpoints.

## 03 · AI agent and MCP host developer

21. **Does Foundry expose an MCP server itself?**  
   **Answer — SHIPPED:** Yes. /mcp/foundry provides public directory discovery and authenticated Builder tools.

22. **How do I discover available public servers?**  
   **Answer — SHIPPED:** Use search_servers on Foundry's public MCP endpoint or search the live site directory.

23. **Can my AI agent create a draft server?**  
   **Answer — SHIPPED:** Yes via authenticated create_server, restricted to the API-key owner's workspace.

24. **Can my agent import my OpenAPI?**  
   **Answer — SHIPPED:** Yes using the authenticated import_openapi tool with source JSON and a vetted public base URL.

25. **Can my agent test a real tool?**  
   **Answer — SHIPPED:** Yes via test_readonly_tool; the upstream response or network error is surfaced.

26. **Can it publish a private server?**  
   **Answer — SHIPPED:** Yes via publish_server visibility=private with an authenticated bearer key. An anonymous client cannot publish.

27. **Can my client call a published tool?**  
   **Answer — SHIPPED:** Yes via the Streamable HTTP endpoint and official MCP SDK, as verified in independent external test runs.

28. **Which MCP protocol version is used?**  
   **Answer — SHIPPED:** The runtime declares protocol 2026-07-28 with official SDK v2; generic client installation may vary by host.

29. **Does Foundry appear in the official Registry?**  
   **Answer — SHIPPED:** Yes, io.github.Noetfield-Systems/mcp-foundry v0.1.0, independently verified by Registry readback.

30. **Does it have MCP Apps interactive extensions?**  
   **Answer — NOT_YET:** Not yet. The responsive Studio is a web app, while MCP Apps embedded host UI is a future capability.

## 04 · Security engineer

31. **Can a tool call localhost?**  
   **Answer — SHIPPED:** No. Target checks reject localhost, internal hosts and literal private IP targets.

32. **Can DNS rebinding reach an internal IP?**  
   **Answer — PARTIAL:** Outbound execution resolves and pins vetted public IPv4 with a guarded lookup; proxy/network egress policies remain an additional defense to develop.

33. **Can a tool follow redirects to another host?**  
   **Answer — SHIPPED:** No. The upstream fetch disables redirects for the current GET gateway.

34. **Can arbitrary tool arguments change the target host?**  
   **Answer — SHIPPED:** No. Only declared path/query parameters are interpolated while the vetted host remains fixed.

35. **Can public tools mutate upstream state via POST?**  
   **Answer — PARTIAL:** The transport supports only GET tool requests. Caution: any GET upstream that performs side effects would violate expected read-only semantics.

36. **What protects browser sessions?**  
   **Answer — SHIPPED:** HttpOnly SameSite cookies, Secure in production, an origin check for API writes and session hashing in PostgreSQL.

37. **Are API keys stored plaintext?**  
   **Answer — SHIPPED:** No, the server stores hashes and displays a created secret only once. Copy/store keys securely client-side.

38. **Can owners revoke credentials and endpoints?**  
   **Answer — SHIPPED:** Yes. Key revocation, unpublish and owned server deletion are implemented.

39. **Are detailed role permissions and audit exports ready?**  
   **Answer — NOT_YET:** No. Current authorization is owner-based; team RBAC, audit exports and SSO are roadmap items.

40. **Are SOC 2 or penetration-test certifications claimed?**  
   **Answer — SHIPPED:** No. Independent SDK/browser functional tests are evidence of behavior, not an audit certification.

## 05 · Startup CTO and platform engineer

41. **Is this a real hosted deployment?**  
   **Answer — SHIPPED:** Yes. The Railway Node service, PostgreSQL datastore and public domain have independently verified deployment/SDK evidence.

42. **What persists after a restart?**  
   **Answer — SHIPPED:** Accounts, session hashes, servers, tools, keys, observed calls, pilot enquiries and activation receipts are stored in PostgreSQL.

43. **What does healthz validate?**  
   **Answer — SHIPPED:** The /healthz endpoint queries PostgreSQL, not merely returning a static uptime string.

44. **Does CI compile and test?**  
   **Answer — SHIPPED:** Node syntax checks, unit tests, external official SDK acceptance and a real Chromium browser path are configured.

45. **Are customer endpoints tenant-isolated?**  
   **Answer — SHIPPED:** Private Builder management is owner scoped and private published endpoints require an owner key. The public directory shows public published servers.

46. **Do you support zero-downtime blue-green deploys?**  
   **Answer — NOT_YET:** Not guaranteed by this application. Railway handles configured service deployments; no owned blue-green SLO is promised.

47. **Can I review production source?**  
   **Answer — SHIPPED:** Yes, the independent Noetfield-Systems/MCP repository contains product, tests and deployment instructions.

48. **Can I replay tool failures and traces?**  
   **Answer — PARTIAL:** Observed outcomes and average latency exist; full per-request replay and distributed traces are not implemented.

49. **How are environment secrets handled?**  
   **Answer — PARTIAL:** Database and operator secrets stay in Railway environment variables, not GitHub source; end-user upstream OAuth vault is not implemented.

50. **Do you guarantee uptime and backups?**  
   **Answer — NOT_YET:** No contractual SLA/backup recovery target is claimed in this release. Dedicated monitoring and recovery tests are future work.

## 06 · Integration agency and implementation partner

51. **Can I demonstrate the product to a client without fake data?**  
   **Answer — SHIPPED:** Yes. The starter template exercises a real public API, and the Test tab shows actual responses with no manufactured customers.

52. **Can I handle multiple client servers?**  
   **Answer — PARTIAL:** Within current per-account quotas yes, but team workspaces, delegation and strict agency account separation are not yet implemented.

53. **Is there an implementation request pipeline?**  
   **Answer — SHIPPED:** Yes. The public form stores consented contact details and a project brief in PostgreSQL.

54. **Can I charge a setup fee immediately on the site?**  
   **Answer — NOT_YET:** A dedicated MCP Foundry paid Checkout/Payment Link has not yet been configured. Scope requests can be received but not billed on this site.

55. **Can an operator qualify incoming leads?**  
   **Answer — SHIPPED:** Yes. Private Operator Desk supports new/contacted/qualified/closed stages with a separate Railway-held token.

56. **Can a customer see implementation delivery milestones?**  
   **Answer — NOT_YET:** There is no customer project portal or live fulfillment tracking yet.

57. **Can I copy configuration for a client's MCP host?**  
   **Answer — SHIPPED:** Yes, using Copy client config for a published server; private keys must be added securely.

58. **Can I create a white-label agency portal?**  
   **Answer — NOT_YET:** Not currently. White-label branding and custom domains are roadmap items.

59. **Is the basic offer defined?**  
   **Answer — PARTIAL:** A $199 narrowly-scoped one-time pilot is a pricing experiment, not a guaranteed quote or successful payment.

60. **How does the product capture a verifiable acceptance receipt?**  
   **Answer — PARTIAL:** The client SDK integration and observed calls can demonstrate real endpoint execution, but client sign-off and fulfillment receipts require a separate workflow.

## 07 · Enterprise buyer

61. **Can my team use enterprise SSO?**  
   **Answer — NOT_YET:** Not today. Current customer authentication is email/password plus personal bearer keys.

62. **Can I assign team-level roles?**  
   **Answer — NOT_YET:** Not yet. The current owner model does not implement organization-level RBAC.

63. **Can Foundry connect to private-network APIs?**  
   **Answer — NOT_YET:** No. The current gateway intentionally restricts targets to publicly reachable HTTPS GET endpoints.

64. **Can my users audit every tool execution?**  
   **Answer — PARTIAL:** Workspace shows recorded calls and usage. Enterprise request-level immutable audit export is not available.

65. **Is data residency contractual?**  
   **Answer — NOT_YET:** No region-specific or enterprise data-residency assurance is offered by this release.

66. **Is a DPA or enterprise legal package available?**  
   **Answer — PARTIAL:** There is a privacy notice; a negotiated DPA and enterprise terms are not currently shipped.

67. **Can Foundry support custom SLAs?**  
   **Answer — PARTIAL:** You can request a proposal, but a signed uptime/support SLA is not part of the standard free offer.

68. **Does the product make security certification claims?**  
   **Answer — SHIPPED:** No unverified SOC 2, ISO 27001 or equivalent certifications are advertised.

69. **Are payments and downstream writes gated by scopes?**  
   **Answer — NOT_YET:** These capabilities are not exposed in the GET gateway; future delegated writes require scoped consent and idempotency.

70. **Can I start with a narrow pilot?**  
   **Answer — SHIPPED:** Yes. A consented scoped implementation enquiry can be submitted without committing to paid production rollout.

## 08 · Product designer and first-time evaluator

71. **Can I understand the product from the hero?**  
   **Answer — IMPROVED:** The redesigned hero shows the real API → validate/test/publish → remote MCP sequence rather than ambiguous orbit-only decoration.

72. **Is the primary CTA obvious?**  
   **Answer — IMPROVED:** Build your first server links directly to Studio; documentation and custom implementation are distinct secondary paths.

73. **Are mobile navigation controls accessible?**  
   **Answer — IMPROVED:** The navigation toggle exposes aria-expanded, closes on Escape and link selection, and uses a visible focus indicator.

74. **Can I use the site by keyboard?**  
   **Answer — PARTIAL:** Native buttons, links, form labels, details/summary and focus-visible styling support keyboard interaction; a full external WCAG audit remains outstanding.

75. **Can I skip repetitive header navigation?**  
   **Answer — IMPROVED:** Yes. A Skip to content link targets main content.

76. **Is motion safe for reduced-motion users?**  
   **Answer — IMPROVED:** Animations and smooth scrolling are disabled when prefers-reduced-motion is requested.

77. **Does a confusing illustration hide what actually ships?**  
   **Answer — IMPROVED:** The new hero is labelled as a reference workflow, while status comes from /healthz. Illustrative analytics remain clearly marked.

78. **Are published catalog entries useful?**  
   **Answer — IMPROVED:** Public server cards expose a copyable remote MCP URL and a link to connection instructions; empty states show real absence of listings.

79. **Can I read realistic FAQ answers before signing up?**  
   **Answer — IMPROVED:** Ten public FAQ entries explain supported operations, private keys, billing and active constraints without invented guarantees.

80. **Are status and errors honest?**  
   **Answer — IMPROVED:** The hero service state is fetched live; the Studio surfaces real upstream errors. The browser test will also assert no runtime JS errors.

## 09 · Community builder and growth lead

81. **Where is the official discovery entry?**  
   **Answer — SHIPPED:** The verified MCP Registry release and downloadable canonical server.json are linked from the public product and Developer Docs.

82. **Is there a shareable first release?**  
   **Answer — SHIPPED:** Yes. GitHub Release v0.1.0 was published after official Registry and production acceptance.

83. **Can I invite early developers?**  
   **Answer — SHIPPED:** Yes. GitHub Issue #20 publicly recruits an initial cohort of ten external builders; it is not evidence that ten already joined.

84. **Can users find the product in web search?**  
   **Answer — PARTIAL:** Canonical URLs, title/description, robots.txt and sitemap.xml exist; actual search-engine ranking is unverified.

85. **Is a public directory seeded with fake logos?**  
   **Answer — SHIPPED:** No. Only genuinely published public server records appear; no invented ratings or customer counts.

86. **Can we measure activation instead of vanity traffic?**  
   **Answer — SHIPPED:** Yes. The private 30-day funnel counts observed account milestones and successful tool calls. Website visits are not inferred.

87. **Can we identify returning weekly developers?**  
   **Answer — PARTIAL:** Current aggregate endpoint events help track calls; an explicit retention cohort dashboard is not yet shipped.

88. **Are referral links and rewards running?**  
   **Answer — NOT_YET:** No. Reward and referral mechanics belong to a future Foundry-specific experiment and must not borrow unrelated venture ledgers.

89. **Can the brand automatically post to social channels?**  
   **Answer — NOT_YET:** Not currently. The linked Metricool brand has no connected social account, so automated distribution has not been claimed.

90. **Does the landing page lead directly to outcomes?**  
   **Answer — IMPROVED:** Studio quickstarts, public directory, copyable endpoint, official docs, FAQ and implementation enquiry each have working routes.

## 10 · Founder, finance and commercial operator

91. **Has a real customer paid?**  
   **Answer — NOT_YET:** No actual MCP Foundry paid order or processor receipt has been independently verified. Software release and CI are not revenue.

92. **Is the custom implementation enquiry live?**  
   **Answer — SHIPPED:** Yes. The consented form stores a durable request and returns a reference ID; it does not collect payment.

93. **Can I distinguish leads from sales?**  
   **Answer — SHIPPED:** Yes. Operator stages and the funnel explicitly separate implementation enquiries from money collected.

94. **Can I immediately charge via Foundry-specific Checkout?**  
   **Answer — NOT_YET:** No. Foundry has no configured Stripe keys, dedicated Price ID and signed webhook for production checkout.

95. **What has to be done for Stripe Tax?**  
   **Answer — NOT_YET:** The connected merchant's Stripe Tax setting was pending due to missing head-office data. Tax registration status and billing setup must be handled with real merchant data.

96. **Does a $199 pilot price mean revenue?**  
   **Answer — NOT_YET:** No. It is a tentative minimum-scope price experiment pending an actual customer, quote and payment.

97. **How do I find new commercial requests?**  
   **Answer — SHIPPED:** Use the private Operator Desk with its separately configured token. It shows only recorded consented submissions.

98. **Can I verify product adoption?**  
   **Answer — SHIPPED:** The observed activation funnel excludes labelled .invalid test accounts; it does not claim that account counts equal external paying users.

99. **Can MCP Foundry use Noetfield venture APIs without merging businesses?**  
   **Answer — SHIPPED:** Yes, only through separately authorized exposed adapters. Noetfield OS, SignalForge, ARQANT, SourceA and Fieldwork retain their own product boundaries.

100. **What is the next revenue-driving step?**  
   **Answer — NEXT:** Recruit real API founders, achieve first repeat external tool use, quote a scoped implementation and obtain an independent real payment receipt. Do not confuse a product upgrade with a sale.

## Coverage & interpretation

- **100 / 100** questions have an explicit answer; zero are discarded or described as “handled” without an answer.
- Status breakdown: SHIPPED 53 · PARTIAL 15 · NOT_YET 21 · IMPROVED 10 · NEXT 1.
- Each question is linked to a persona and concrete product behavior or limitation. These are **design/acceptance hypotheses**, not observed market research.
- Browser and MCP tests can verify working flows but cannot substitute for paid-customer proof, accessibility audit, an enterprise security review or real buyer interviews.

## Required acceptance automation

- Public hero reference pipeline, FAQ and product workflows render at desktop and mobile widths.
- Mobile navigation opens, responds to Escape, closes on link navigation; skip link and keyboard focus exist.
- Public catalog cards display real available entries and copy actual endpoint URLs.
- Authentication, API starter, tool list, test, publish, client config, usage and account deletion work in a real browser.
- Browser produces no uncaught JS exceptions; API/SDK and official Registry checks remain green.
- Production deployment SHA is read back and latest test run tied to same SHA.

## Backlog boundaries

Do not invent a mock payment, fake marketplace testimonials or fabricated analytics to “complete” unanswered commercial questions. Real customer outcome work begins with acquisition, a directly observed tool call, scoped proposal and a reconciled Stripe payment after the merchant's actual billing/tax setup is complete.
