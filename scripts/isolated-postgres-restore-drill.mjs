// Destructive changes are confined to two randomly named local disposable PostgreSQL
// databases. NEVER run this against customer production or Railway's real database.
// Tests schema + representative records via actual pg_dump -> pg_restore -> readback.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import pg from 'pg';

const adminUrl=process.env.DRILL_ADMIN_URL;
if(!adminUrl)throw Error('DRILL_ADMIN_URL_REQUIRED (local CI postgres admin only)');
const admin=new URL(adminUrl);
if(!['localhost','127.0.0.1','[::1]'].includes(admin.hostname)||admin.pathname!=='/postgres'||admin.protocol!=='postgresql:')
 throw Error('REFUSING_NONLOCAL_OR_NON_DISPOSABLE_POSTGRES');
const suffix=randomBytes(4).toString('hex');
const sourceName='fdy_drill_src_'+suffix,targetName='fdy_drill_restore_'+suffix;
const nameRE=/^fdy_drill_(?:src|restore)_[a-f0-9]{8}$/;
const urlFor=name=>{const u=new URL(adminUrl);u.pathname='/'+name;return u.toString();};
const cliEnv=name=>({...process.env,PGHOST:admin.hostname.replaceAll('[','').replaceAll(']',''),
 PGPORT:admin.port||'5432',PGUSER:decodeURIComponent(admin.username),
 PGPASSWORD:decodeURIComponent(admin.password),PGDATABASE:name,PGSSLMODE:'disable'});
const adminClient=new pg.Client({connectionString:adminUrl,connectionTimeoutMillis:4000});
const execute=(command,args,env)=>{
 const result=spawnSync(command,args,{env,encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']});
 if(result.error||result.status!==0)throw Error(command+' failed: '+(result.error?.code||result.status)+' '+String(result.stderr).slice(-400));
};
let dir;
try{
 await adminClient.connect();
 for(const name of [sourceName,targetName]){
  assert.ok(nameRE.test(name));
  await adminClient.query('CREATE DATABASE "'+name+'"');
 }
 process.env.DATABASE_URL=urlFor(sourceName);
 const {initDb,pool,q}=await import('../src/db.mjs');
 await initDb();
 const account=randomUUID(),server=randomUUID(),tool=randomUUID(),lead=randomUUID(),order=randomUUID();
 const snapshot={tools:[{name:'source_checked_item',description:'Disposable CI fixture',method:'GET',url:'https://example.org/api/items',params:[]}]};
 await q('INSERT INTO accounts(id,email,password_hash) VALUES($1,$2,$3)',[account,'restore-fixture-'+suffix+'@foundry.invalid','ci-never-real-auth']);
 await q("INSERT INTO servers(id,owner_id,slug,name,status,published_snapshot,published_revision) VALUES($1,$2,$3,$4,'published',$5::jsonb,1)",[server,account,'ci-restore-'+suffix,'CI restoration fixture',JSON.stringify(snapshot)]);
 await q('INSERT INTO tools(id,server_id,name,description,url) VALUES($1,$2,$3,$4,$5)',[tool,server,'source_checked_item','CI fixture','https://example.org/api/items']);
 await q('INSERT INTO pilot_leads(id,email,contact_name,project_brief) VALUES($1,$2,$3,$4)',[lead,'buyer-fixture-'+suffix+'@foundry.invalid','CI Disposable Buyer','Disposable restore test, not an actual lead or customer']);
 await q("INSERT INTO pilot_orders(id,lead_id,payment_token_hash,amount_cents,currency,description,offer_type) VALUES($1,$2,$3,19900,'cad',$4,'quickstart')",
  [order,lead,'ci-dummy-token-'+suffix,'CI restore test only; no money collected or paid event']);
 const before=(await q("SELECT id,slug,published_snapshot FROM servers WHERE id=$1",[server])).rows[0];
 const tableQuery="SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename";
 const beforeTables=(await q(tableQuery)).rows.map(x=>x.tablename);
 await pool.end();
 dir=await mkdtemp(path.join(tmpdir(),'fdy-restore-'));
 const filename=path.join(dir,'postgres-snapshot.dump');
 execute('pg_dump',['--format=custom','--no-owner','--no-acl','--file',filename],cliEnv(sourceName));
 const dumpSize=(await stat(filename)).size;
 assert.ok(dumpSize>2048,'Backup is unexpectedly empty');
 execute('pg_restore',['--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',targetName,filename],cliEnv(targetName));
 const restored=new pg.Client({connectionString:urlFor(targetName)});
 try{
  await restored.connect();
  const afterTables=(await restored.query(tableQuery)).rows.map(x=>x.tablename);
  assert.deepEqual(afterTables,beforeTables,'Schema tables did not restore');
  const after=(await restored.query('SELECT id,slug,published_snapshot FROM servers WHERE id=$1',[server])).rows[0];
  assert.deepEqual(after,before,'Published customer MCP metadata did not restore');
  const fixtureOrder=(await restored.query('SELECT status,amount_cents,accepted_at FROM pilot_orders WHERE id=$1',[order])).rows[0];
  assert.equal(fixtureOrder.status,'offered');assert.equal(fixtureOrder.amount_cents,19900);
  assert.equal(fixtureOrder.accepted_at,null,'No fictitious accepted order should be generated');
  const token=(await restored.query('SELECT count(*)::int n FROM tools WHERE server_id=$1',[server])).rows[0].n;
  assert.equal(token,1,'Tool definitions not restored');
  const sha=createHash('sha256').update(await readFile(filename)).digest('hex');
  console.log(JSON.stringify({kind:'ISOLATED_POSTGRES_RESTORE_PASS',source:'disposable-local',
   tables:afterTables.length,fixture_server_restored:true,published_revision:1,
   non_paid_fixture_order_restored:true,dump_bytes:dumpSize,archive_sha256:sha,
   production_backup_verified:false,production_restore_performed:false}));
 }finally{await restored.end().catch(()=>{});}
}finally{
 if(dir)await rm(dir,{recursive:true,force:true}).catch(()=>{});
 if(adminClient._connected){
  for(const name of [sourceName,targetName].reverse()){
   if(nameRE.test(name)){
    try{await adminClient.query('DROP DATABASE IF EXISTS "'+name+'" WITH (FORCE)');}
    catch(error){console.error('cleanup_disposable_db_failed',name,error.code);}
   }
  }
 }
 await adminClient.end().catch(()=>{});
}
