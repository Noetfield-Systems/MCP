# Deployment playbook — Railway, Docker, verification

## Minimum setup
1. Deploy repo `Noetfield-Systems/MCP` as Node 22 Dockerfile service.
2. Provision a dedicated PostgreSQL database/service. Configure `DATABASE_URL` privately; no password in GitHub.
3. Set `NODE_ENV=production`, `PUBLIC_URL=https://YOUR_DOMAIN`. Railway sets `PORT`.
4. Publish a public Railway service domain and verify `GET /healthz` -> `ok: true`.
5. Create a real account, import a publicly accessible GET OpenAPI operation, test it, publish and connect an **external official MCP SDK v2 client** to `/mcp/:slug`.
6. Check invocation event through server usage UI, check permissions: anonymous private tool denied, wrong user denied, invalid URL denied.
7. Configure Stripe only with real account/Price and signed webhook; test using separate Stripe sandbox then independently verify real production receipt before calling it revenue.

## Environment
`PORT` Node listen port; `DATABASE_URL` required; `PUBLIC_URL` canonical URL; `NODE_ENV` production for Secure cookie; optional `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`. Secrets stay in provider configuration. CLI `npm run check && npm test && npm start`.

## Launch honesty
A Github commit or CI green is code evidence; a successful Railway deployment is infrastructure evidence; a working external MCP invocation is product evidence; a signed Stripe event and processor/bank readback is revenue evidence. Every claim should say which class of evidence it actually has.
