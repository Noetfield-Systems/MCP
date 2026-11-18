# MCP Foundry — Reliability, Storage and Delivery Contract
**Effective draft:** 2026-11-18 · **Scope:** Existing product vs proposed managed operations. This is NOT an uptime SLA or a declaration of completed disaster-recovery testing.

## 1. What "persistent MCP" really means
MCP is a protocol interface over a source API. Its HTTP transport in 2026-07-28 is stateless; there is no intrinsically permanent, authenticated connection or persistent agent memory. A **hosted URL** can be continually reachable, while each call independently authenticates and fetches current upstream data. An external agent can reconnect and rediscover tool definitions.
Foundry persists its own business/application state; upstream source APIs remain authoritative.

| Data | Current storage / owner | Recovery implication |
|---|---|---|
| Customer account, password hash, session hashes | Foundry PostgreSQL | Durable across process restarts; credential recovery and account policy are separate work |
| MCP server/tool definitions, slugs, visibility | Foundry PostgreSQL | Definitions survive instance restart; owner can edit and republish |
| Published server manifest/revision | Foundry PostgreSQL `published_snapshot`, `server_revisions` | Preserves an executable reference independent of the editable draft; manual rollback must be separately tested |
| Hashed API keys / revocation | Foundry PostgreSQL | Raw key cannot be reconstructed; rotate/reissue on loss |
| Tool execution outcomes, latency and error categories | Foundry PostgreSQL | Auditing is metadata-only; no complete request/response replay stored |
| Upstream GitHub token / API secret if enabled | Encrypted ciphertext in Foundry Postgres (requires separately configured key) | Key rotation and restore procedure required; unconfigured capabilities must fail closed |
| Source business data | Customer-owned API | Foundry does not back up the third-party system or guarantee its availability |
| AI reasoning/long-running workflow state | External AI host/agent/workflow system | Not automatically durable in MCP Foundry |

## 2. Four failure domains, four recovery actions
**Client/host issue:** connection refused, unsupported auth/transport, tool names cached. Diagnose with exact named host/version, generate correct install config, rotate/reconnect if authorized. Do not declare Foundry down from a client-side issue.
**Authorization issue:** revoked key, expired OAuth, unsupported scope. Deny access, show actionable error, request reauthorization without revealing secret. Never forward host bearer tokens blindly to unrelated upstream APIs.
**Upstream issue:** source API 401/403/404/429/5xx, schema change, DNS/timeout. Return bounded classified error; apply safe retry/backoff only for eligible idempotent GET calls, never blindly replay a side effect. Record upstream cause distinctly.
**Foundry/control-plane issue:** Railway process restart, app or Postgres unavailable, deployment regression. External health checks, managed service restart, previous healthy release rollback, DB restore from verifiably available backups.

## 3. Reliability features and honest status
| Mechanism | Current evidence | Next verification |
|---|---|---|
| Database-backed persistence | Schema and `/healthz` Postgres query | Fresh DB boot / restore rehearsal |
| Stateless MCP over HTTPS | Official SDK v2 route | Tested client/host/transport matrix; reconnect after process restart |
| Dedicated published snapshot | Current DB schema includes `published_snapshot` & versions | Prove atomic publish, immutability and a last-good rollback |
| GET upstream bounds | Public HTTPS/DNS restrictions, 8s timeout, response cap | Tests for DNS change, 429, timeout, provider schema drift |
| Privacy-minimized diagnostics | `tool_events`: categorical errors, timing, no payloads | Distinguish test events vs client-verified external use |
| Customer/API key scoping | owner-bound server lookup and bearer key model | Revoke/regenerate; ensure no cross-tenant visibility |
| OAuth | Constrained GitHub OAuth only when explicitly configured | Test secret restore/expiry, per-user consent separately |
| Backups and restore | No verified schedule or restore exercise in repository | Establish provider backup configuration, retention, test restore |
| Always-on SLO / contractual SLA | Not evidenced | Negotiate only after external monitoring and restore drills |

## 4. Acceptance suite for every customer delivery
1. Explicit customer-owned source API and authorization to access.
2. Versioned description of business task and expected data fields, including negative cases.
3. Tool `name`, description, bounded JSON input and output; eliminate generic/unnecessary operations.
4. One actual upstream call, source response correctness and known provider limitations.
5. Named compatible AI client and version, exact transport, auth mode and successful tool call.
6. Customer uses its own authorized account to execute and sign off; operator keeps non-sensitive receipt.
7. Public install page with no credentials and explicit customer approval to publish.
8. Failure tests: invalid parameter, expired token where relevant, 429, upstream timeout, missing data.
9. Rollback/contact/maintenance ownership: who responds to API breaking changes.
10. Payment confirmation only from processor; delivery acceptance separately recorded.

**Receipt shape:** `{customer_id, server_id, tool_name, host_name_version, source_api, UTC_timestamp, test_or_external, status, error_category, duration_ms, acceptance_reference}`. Treat this as a **target evidence schema**; existing tool_events does not yet store all fields. Redact any personal data, upstream secrets, tokens and sensitive payloads.

## 5. Backup/recovery rollout (not invented production assurances)
- **P0 immediately:** verify existing managed Postgres backup and retention with provider; never assume backups because database is persistent. Test fresh database creation as part of build CI; migration must not depend on prior tables.
- **P1 after first paying customer:** scheduled encrypted backup under operator control, separate restore target, restore drill and manifest consistency check. Document measured restore duration and last verified recovery point.
- **P2 when an uptime contract is actually sold:** propose SLO (example 99.5% endpoint availability for the Foundry-operated portion, excludes third-party source); define permitted maintenance, credit terms, monitored measurement and human escalation **before** advertising it. Calculate RTO and RPO from actual drills, not from aspirations.
- **P3 as high volume requires:** per-provider circuit breakers, bounded idempotent GET retries, source-contract diff detection, canary releases, self-service rollback and customer-facing incident history.

## 6. No cross-product coupling
Founder OS / Company OS orchestrates internal work; MCP Foundry is independently customer-facing. SignalForge/SourceA/other ventures may expose permissioned APIs, but Foundry does not copy their customer DB or agent runtime. Avoid a new "universal OS" abstraction inside this repo.

## 7. Standards and threat model
Current protocol specification: https://blog.modelcontextprotocol.io/posts/2026-07-28/  
Official security: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/docs/2026-07-28/tutorials/security/security_best_practices.mdx  
Explicitly prevent unauthorized upstream access, token passthrough, prompt injection from untrusted tool output, SSRF, credential leakage, cross-tenant reading and duplicate side-effect execution. These are concrete risks in a service that executes customer-authorized API operations, not bureaucratic gates.
