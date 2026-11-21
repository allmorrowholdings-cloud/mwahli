import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
const {Pool}=pg;
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DB_SSL==='false'?false:(process.env.NODE_ENV==='production'?{rejectUnauthorized:process.env.DB_SSL_REJECT_UNAUTHORIZED!=='false'}:undefined)});
const root=process.cwd();
const files=[path.join(root,'infra/postgres/schema.sql'),...((await fs.readdir(path.join(root,'infra/postgres/migrations'))).filter(x=>x.endsWith('.sql')).sort().map(x=>path.join(root,'infra/postgres/migrations',x)))];
const client=await pool.connect();
try{
  await client.query('begin');
  await client.query('create table if not exists schema_migration (name text primary key, applied_at timestamptz not null default now())');
  for(const file of files){const name=path.relative(root,file);const seen=await client.query('select 1 from schema_migration where name=$1',[name]);if(seen.rowCount)continue;const sql=await fs.readFile(file,'utf8');await client.query(sql);await client.query('insert into schema_migration(name) values($1)',[name]);console.log('applied',name)}
  await client.query('commit');
}catch(e){await client.query('rollback');throw e}finally{client.release();await pool.end()}
