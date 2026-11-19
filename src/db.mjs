import pg from 'pg';
const {Pool}=pg;
export const pool=new Pool({connectionString:process.env.DATABASE_URL, max:10,connectionTimeoutMillis:8000, idleTimeoutMillis:30000});
export const q=(sql,args=[])=>pool.query(sql,args);
export async function initDb(){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required: persistent state cannot be simulated');
  await q(`CREATE TABLE IF NOT EXISTS accounts (
    id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL, plan text NOT NULL DEFAULT 'free',
    stripe_customer_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
  );
  CREATE TABLE IF NOT EXISTS servers (
    id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    slug text NOT NULL UNIQUE, name text NOT NULL, description text NOT NULL DEFAULT '',
    visibility text NOT NULL DEFAULT 'public', status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS tools (
    id uuid PRIMARY KEY, server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name text NOT NULL, description text NOT NULL, method text NOT NULL DEFAULT 'GET',
    url text NOT NULL, params jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(server_id,name)
  );
  CREATE TABLE IF NOT EXISTS api_keys (
    id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE, prefix text NOT NULL, label text NOT NULL,
    revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS tool_events (
    id bigserial PRIMARY KEY, server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    tool_name text NOT NULL, account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
    success boolean NOT NULL, duration_ms integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE tool_events ADD COLUMN IF NOT EXISTS error_code text;
  ALTER TABLE tool_events ADD COLUMN IF NOT EXISTS upstream_status integer;
  CREATE INDEX IF NOT EXISTS tool_events_server_date_idx ON tool_events(server_id,created_at DESC);
  CREATE INDEX IF NOT EXISTS tool_events_server_error_idx ON tool_events(server_id,error_code) WHERE success=false;
  CREATE TABLE IF NOT EXISTS pilot_leads (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    contact_name text NOT NULL,
    company text NOT NULL DEFAULT '',
    website text NOT NULL DEFAULT '',
    project_brief text NOT NULL,
    marketing_consent boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS pilot_leads_created_idx ON pilot_leads(created_at DESC);
  ALTER TABLE pilot_leads ADD COLUMN IF NOT EXISTS service_package text NOT NULL DEFAULT 'custom'
    CHECK(service_package IN ('quickstart','launch','private','care','agency','custom'));
  CREATE INDEX IF NOT EXISTS pilot_leads_package_idx ON pilot_leads(service_package,updated_at DESC);

  CREATE TABLE IF NOT EXISTS opportunity_applications (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    contact_name text NOT NULL,
    track text NOT NULL CHECK (track IN (
      'api_business','web3_builder','agency_partner',
      'developer_contributor','community_distribution','strategic_partner'
    )),
    organization text NOT NULL DEFAULT '',
    website text NOT NULL DEFAULT '',
    github_url text NOT NULL DEFAULT '',
    project_brief text NOT NULL,
    source text NOT NULL DEFAULT 'direct',
    contact_consent boolean NOT NULL DEFAULT true,
    updates_consent boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','collaborating','closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(email,track)
  );
  CREATE INDEX IF NOT EXISTS opportunity_applications_status_date
    ON opportunity_applications(status,created_at DESC);
  CREATE INDEX IF NOT EXISTS opportunity_applications_track_date
    ON opportunity_applications(track,created_at DESC);
  CREATE TABLE IF NOT EXISTS activation_events (
    id bigserial PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    server_id uuid REFERENCES servers(id) ON DELETE SET NULL,
    name text NOT NULL CHECK(name IN (
      'account_created','server_created','template_started','tool_added',
      'tool_test_succeeded','server_published','api_key_created'
    )),
    source text NOT NULL CHECK(source IN ('studio','native_mcp')),
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS activation_events_account_date_idx ON activation_events(account_id,created_at DESC);
  CREATE INDEX IF NOT EXISTS activation_events_name_date_idx ON activation_events(name,created_at DESC);
  CREATE TABLE IF NOT EXISTS growth_links (
    owner_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    code text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS growth_referrals (
    invitee_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    inviter_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_self_referral CHECK(invitee_id<>inviter_id)
  );
  CREATE INDEX IF NOT EXISTS growth_referrals_inviter_idx ON growth_referrals(inviter_id);
  CREATE TABLE IF NOT EXISTS marketplace_listings (
    server_id uuid PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    category text NOT NULL DEFAULT 'developer-tools',
    tagline text NOT NULL DEFAULT '',
    docs_url text NOT NULL DEFAULT '',
    readme text NOT NULL DEFAULT '',
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS server_revisions (
    id uuid PRIMARY KEY,
    server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    version integer NOT NULL,
    snapshot jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(server_id,version)
  );
  CREATE TABLE IF NOT EXISTS server_invitations (
    id uuid PRIMARY KEY,
    server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    inviter_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    invitee_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role text NOT NULL CHECK(role IN ('viewer','editor')),
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days'
  );
  CREATE INDEX IF NOT EXISTS server_invitations_target_idx ON server_invitations(invitee_id,status);
  CREATE TABLE IF NOT EXISTS server_members (
    server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role text NOT NULL CHECK(role IN ('viewer','editor')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(server_id,account_id)
  );
  CREATE TABLE IF NOT EXISTS pilot_orders (
    id uuid PRIMARY KEY,
    lead_id uuid NOT NULL REFERENCES pilot_leads(id) ON DELETE RESTRICT,
    payment_token_hash text NOT NULL UNIQUE,
    amount_cents integer NOT NULL CHECK(amount_cents BETWEEN 1000 AND 2500000),
    currency text NOT NULL CHECK(currency IN ('cad','usd')),
    description text NOT NULL,
    status text NOT NULL DEFAULT 'offered' CHECK(status IN ('offered','checkout_pending','paid','failed','fulfilled','refunded')),
    stripe_checkout_session_id text UNIQUE,
    stripe_payment_intent_id text,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS pilot_orders_status_idx ON pilot_orders(status,created_at DESC);
  ALTER TABLE pilot_orders ADD COLUMN IF NOT EXISTS offer_type text NOT NULL DEFAULT 'custom'
    CHECK(offer_type IN ('quickstart','launch','private','care','agency','custom'));
  CREATE INDEX IF NOT EXISTS pilot_orders_offer_idx ON pilot_orders(offer_type,created_at DESC);
  -- Payment and customer-accepted delivery are distinct, independently evidenced milestones.
  ALTER TABLE pilot_orders ADD COLUMN IF NOT EXISTS delivery_reference text;
  ALTER TABLE pilot_orders ADD COLUMN IF NOT EXISTS customer_acceptance_reference text;
  ALTER TABLE pilot_orders ADD COLUMN IF NOT EXISTS accepted_by text;
  ALTER TABLE pilot_orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
  CREATE INDEX IF NOT EXISTS pilot_orders_acceptance_idx ON pilot_orders(accepted_at DESC) WHERE accepted_at IS NOT NULL;
  CREATE TABLE IF NOT EXISTS oauth_flows (
    state_hash text PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    provider text NOT NULL CHECK(provider='github'),
    verifier_cipher text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS oauth_flows_expiry_idx ON oauth_flows(expires_at);
  CREATE TABLE IF NOT EXISTS oauth_connections (
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    provider text NOT NULL CHECK(provider='github'),
    access_cipher text NOT NULL,
    refresh_cipher text,
    scopes text NOT NULL DEFAULT '',
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(account_id,provider)
  );
  CREATE TABLE IF NOT EXISTS server_oauth_bindings (
    server_id uuid PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    provider text NOT NULL CHECK(provider='github'),
    created_at timestamptz NOT NULL DEFAULT now()
  );
  -- Draft tool definitions remain editable; active published snapshot is immutable until next publish.
  ALTER TABLE servers ADD COLUMN IF NOT EXISTS published_snapshot jsonb;
  ALTER TABLE servers ADD COLUMN IF NOT EXISTS published_revision integer;
  ALTER TABLE servers ADD COLUMN IF NOT EXISTS has_unpublished_changes boolean NOT NULL DEFAULT false;
  UPDATE servers s SET published_snapshot=(
    SELECT jsonb_build_object('tools',coalesce(jsonb_agg(jsonb_build_object(
     'name',t.name,'description',t.description,'method',t.method,'url',t.url,'params',t.params
    ) ORDER BY t.name),'[]'::jsonb))
    FROM tools t WHERE t.server_id=s.id
  ),published_revision=coalesce((SELECT max(version) FROM server_revisions WHERE server_id=s.id),0)
  WHERE s.status='published' AND s.published_snapshot IS NULL;
  -- One private, owner-bound key per server, encrypted before storage. No secret in URLs/tool JSON.
  CREATE TABLE IF NOT EXISTS server_upstream_keys (
    server_id uuid PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    hostname text NOT NULL,
    token_cipher text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  -- Operator-only researched B2B accounts: NOT consented inbound leads or customers.
  CREATE TABLE IF NOT EXISTS prospect_accounts (
    id text PRIMARY KEY,company text NOT NULL,segment text NOT NULL,
    api_docs_url text NOT NULL,contact_url text NOT NULL,contact_email text NOT NULL DEFAULT '',
    mcp_status text NOT NULL,evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
    proposed_task text NOT NULL,offer text NOT NULL,rank integer NOT NULL,
    research_as_of date NOT NULL,stage text NOT NULL DEFAULT 'researched'
      CHECK(stage IN ('researched','qualified','contacted','replied','discovery','proposal','won','lost','not_fit')),
    next_action text NOT NULL DEFAULT '',operator_notes text NOT NULL DEFAULT '',contact_receipt text NOT NULL DEFAULT '',
    last_contact_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS prospect_accounts_stage_rank_idx ON prospect_accounts(stage,rank);
  CREATE TABLE IF NOT EXISTS billing_events (event_id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
  `);
}
export async function requireAuth(req,res,next){
  const sid=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('mcpf_session='))?.slice('mcpf_session='.length);
  const {sha}=await import('./security.mjs');
  if(!sid)return res.status(401).json({error:'LOGIN_REQUIRED'});
  const {rows}=await q('SELECT a.id,a.email,a.plan,a.stripe_customer_id FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now()',[sha(sid)]);
  if(!rows.length)return res.status(401).json({error:'SESSION_EXPIRED'});
  req.user=rows[0]; next();
}
export async function ownedServer(id,ownerId){
 const {rows}=await q('SELECT * FROM servers WHERE id=$1 AND owner_id=$2',[id,ownerId]); return rows[0];
}
