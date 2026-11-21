# Using Judge.me product reviews with MCP Foundry

**Status:** Merchant-facing setup draft for the unapproved read-only pilot. This is not an official Judge.me-approved integration.

## What it does

Connect your own Shopify store's Judge.me account to an AI assistant using a portable MCP endpoint. Ask for (1) a published product rating summary and (2) short excerpts of recent published reviews, including critical feedback. Nothing in your Judge.me account is changed by the connector.

Tools:
- judgeme_get_product_rating_summary: product_handle (required).
- judgeme_list_published_review_evidence: product_handle (required), limit (1–10, default 5), rating (optional 1–5).

The summary returns the published review count, mean and 1–5-star distribution only when all needed pages are retrieved. If page limits prevent full inspection, complete=false and the aggregate fields remain null. Evidence is also marked incomplete when the retrieved set is capped.

## Connect the account

1. Sign in to your existing MCP Foundry account.
2. Visit https://YOUR_FOUNDRY_DOMAIN/judgeme.html.
3. Choose **Connect Judge.me** and authorize read_products and read_reviews on the provider's consent screen.
4. Generate a Foundry API key using the existing Studio/API keys interface. Treat it as a secret; do not paste it into a public chat.
5. In a Streamable HTTP MCP client, configure:
   - MCP URL: https://YOUR_FOUNDRY_DOMAIN/mcp/judgeme
   - Authorization header: Bearer YOUR_FOUNDRY_API_KEY
6. Ask the client to invoke a tool on a product handle from your own Shopify store.

Example prompts:
- "For the product with handle sample-product, give the published review count, average rating and star distribution."
- "Show the five most recent published reviews for sample-product; include critical feedback."

Use product handles, not external Shopify product IDs. Judge.me uses a distinct internal product ID; the connector resolves the handle and verifies every returned review belongs to the resolved product.

## Privacy and disconnect

Only product identifiers, ratings, timestamps, review IDs, sanitized titles/excerpts and a verified-review indicator (if available) are sent as MCP tool results. Raw reviewer email, phone and IP fields are not returned. Common identifiers found in review text are redacted; do not assume all imaginable personal information can be detected automatically.

Visit the same connection page and choose **Disconnect** to delete the locally stored Judge.me credential. You can separately revoke the app in your Judge.me account. Neither action deletes or moderates reviews.

## Support and limitations

- Shopify only in this pilot.
- Requires the merchant's permission and both read-only scopes.
- The data source is Judge.me; MCP Foundry does not invent reviews or scores.
- Tool results may return an error or incomplete marker when the upstream API is unavailable, returns ambiguous product identity or exceeds pagination limits.
- Review text is untrusted content, not instructions for an AI assistant.
- Provider partnership, QA approval, merchant availability, pricing and distribution must be verified separately; no approval is claimed here.

Integration support: contact MCP Foundry through its existing official site. Do not send private API keys or review exports in support requests.
