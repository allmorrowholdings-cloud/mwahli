import {Pool,type PoolClient,type QueryResultRow} from 'pg';

let pool:Pool|undefined;

function localConnectionString(value:string){
  if(process.env.NODE_ENV==='production')return value;
  // On Windows/WSL, Node may resolve localhost to ::1 while Docker Desktop is
  // only reachable through the IPv4 loopback path. Keep production untouched.
  return value.replace(/([@/])localhost(?=[:/])/,'$1127.0.0.1');
}

export function db(){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');
  const connectionString=localConnectionString(process.env.DATABASE_URL);
  pool??=new Pool({
    connectionString,
    max:Number(process.env.DB_POOL_MAX||12),
    idleTimeoutMillis:30000,
    connectionTimeoutMillis:5000,
    ssl:process.env.DB_SSL==='false'?false:(process.env.NODE_ENV==='production'?{rejectUnauthorized:process.env.DB_SSL_REJECT_UNAUTHORIZED!=='false'}:undefined)
  });
  pool.on('error',(error)=>console.error('[mwahli:db] idle client error',error.message));
  return pool;
}

export async function query<T extends QueryResultRow=QueryResultRow>(text:string,values:unknown[]=[]){return db().query<T>(text,values)}
export async function tx<T>(fn:(client:PoolClient)=>Promise<T>){const client=await db().connect();try{await client.query('begin');const value=await fn(client);await client.query('commit');return value}catch(error){await client.query('rollback');throw error}finally{client.release()}}
export async function pingDb(){const r=await query<{ok:number}>('select 1 as ok');return r.rows[0]?.ok===1}

export function isLocalDatabaseConnectionError(error:unknown){
  if(process.env.NODE_ENV==='production')return false;
  const code=(error as {code?:string}|null)?.code;
  return code==='ECONNREFUSED'||code==='ECONNRESET'||code==='ETIMEDOUT'||code==='ENOTFOUND';
}
