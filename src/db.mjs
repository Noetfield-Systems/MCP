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
  CREATE INDEX IF NOT EXISTS tool_events_server_date_idx ON tool_events(server_id,created_at DESC);
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
