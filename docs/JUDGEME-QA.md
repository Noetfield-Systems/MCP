# Judge.me × MCP Foundry — Read-only pilot QA checklist

Status: **source implementation only**. This document is NOT a Judge.me approval, merchant connection receipt, or submission receipt.

## Version and boundaries

- Provider: Judge.me on Shopify; Merchant authorizes MCP Foundry using Judge.me OAuth.
- Permissions: read_products and read_reviews only; no write scopes.
- Transport: protected Foundry endpoint /mcp/judgeme; Foundry API key as Bearer authorization.
- Exactly two dedicated MCP tools:
  1. judgeme_get_product_rating_summary(product_handle)
  2. judgeme_list_published_review_evidence(product_handle,limit=5,rating?)
- No review creation, edits, moderation, archive, sync, emails, checkout or webhooks.
- Existing PostgreSQL, accounts and Foundry API keys are reused. No new service is required.
- The connector is available in code but remains inoperable until OAuth credentials and merchant consent are supplied.

## Setup for real partner QA

1. Create a Shopify Development Store, install Judge.me and create products with identifiable handles.
2. In the Judge.me developer app settings, register a callback URL:
   https://YOUR_FOUNDRY_DOMAIN/api/integrations/judgeme/callback
3. Set JUDGEME_CLIENT_ID and JUDGEME_CLIENT_SECRET only as runtime secrets.
   Use the existing FOUNDRY_OAUTH_ENCRYPTION_KEY (64 hex characters) and set PUBLIC_URL to the exact HTTPS Foundry origin.
4. Open /judgeme.html when signed in to Foundry. Connect and explicitly authorize read_products and read_reviews.
5. Create an owner API key using the existing Foundry account/key flow. Connect a compatible Streamable HTTP MCP client to https://YOUR_FOUNDRY_DOMAIN/mcp/judgeme with Authorization: Bearer YOUR_FOUNDRY_KEY.
6. Capture a **redacted** run receipt: provider store identifier, test product handle, run timestamp, MCP host and host version, tool name, result checksum or scalar count; never persist bearer tokens or raw PII.

## Seed dataset and expected outcomes

Create at least these samples in a single development store:

- Product A: Published 5-star review and Published 1-star critical review. Expected count 2, mean 3.0, distribution {1:1,2:0,3:0,4:0,5:1}.
- Product A: a Pending review, a Hidden review and an Archived review that previously had curated=ok. None may appear in tool results.
- Product B: a Published 4-star review. It must NEVER appear under Product A.
- Product C: no reviews. Expected count 0 and average_rating=null, complete=true.
- One Published review with email / HTML markup in its body to exercise excerpt redaction.
- Optional: >1,000 published Product A reviews to check page limit and complete=false.

## Acceptance matrix (mark from evidence, never assumptions)

| Test | Expected result | Status |
|---|---|---|
| T01 OAuth | Read-only scopes and correct authorized merchant | UNVERIFIED |
| T02 Product | Handle resolves to Judge.me internal product ID | UNVERIFIED |
| T03 Rating | Full Published set matches expected mean and histogram | UNVERIFIED |
| T04 Pending/Hidden | Neither included | UNVERIFIED |
| T05 Archived | Archived excluded, even when curated=ok | UNVERIFIED |
| T06 Critical | Published 1-star evidence preserved | UNVERIFIED |
| T07 Product isolation | No Product B records under Product A or invalid ID fallback | UNVERIFIED |
| T08 Tenant isolation | Key from account A cannot fetch account B merchant's data | UNVERIFIED |
| T09 Errors | 401, 403, 404, 429 and provider errors fail closed | UNVERIFIED |
| T10 Privacy | No reviewer email, phone, IP, raw HTML or secret leaks | UNVERIFIED |
| T11 Real MCP host | Tools listed and both invoked from named client | UNVERIFIED |
| T12 Disconnect | Local credential removed; subsequent invocations denied | UNVERIFIED |
| T13 Deployment | /healthz and /mcp/judgeme work at a deployed commit SHA | UNVERIFIED |
| T14 Regression | Existing MCP Builder, published revisions and payment routes unaffected | UNVERIFIED |

Unit test fixtures validate known edge cases but do NOT count as real-provider acceptance evidence.

## Submission packet / external verification

- Test app/merchant access: NOT YET PROVIDED
- Exact deployment URL and commit: NOT YET VERIFIED
- Installation guide: docs/JUDGEME-INSTALL.md
- Technical spec: source modules src/judgeme/core.mjs and src/judgeme/integration.mjs
- Redacted evidence for T01–T14: NOT YET CAPTURED
- One-to-two-minute screencast with setup, two tool calls and negative-review inclusion: NOT YET RECORDED
- Judge.me-style merchant knowledge base article: use docs/JUDGEME-INSTALL.md as a first draft, then share the required Google Doc.
- Submit the official technical review form only after the above are complete:
  https://form.asana.com/?d=785777602510242&k=eQvB_7UMNDC90RA3EG6Llg
- Record the real submission receipt before setting status SUBMITTED; approval, directory listing and promotion are separate decisions.

Official references:
- https://judge.me/help/en/articles/8278390-build-integrations-with-judge-me
- https://judge.me/help/en/articles/8283047-setting-up-oauth
- https://judge.me/help/en/articles/8409180-using-judge-me-api
- https://judge.me/api/docs
