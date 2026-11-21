import {spawn,spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import net from 'node:net';

function loadEnv(path){
  if(!existsSync(path))return;
  for(const raw of readFileSync(path,'utf8').split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#'))continue;
    const i=line.indexOf('=');
    if(i<1)continue;
    const key=line.slice(0,i).trim();
    let value=line.slice(i+1).trim();
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    if(process.env[key]===undefined)process.env[key]=value;
  }
}

loadEnv('.env.local');
process.env.NODE_ENV='development';
process.env.DEV_DEMO_ENABLED='true';
process.env.MWAHLI_LOCAL_STANDALONE='true';
process.env.APP_URL=process.env.APP_URL||'http://localhost:4173';
process.env.NEXT_PUBLIC_APP_URL=process.env.NEXT_PUBLIC_APP_URL||'http://localhost:4173';
process.env.DATABASE_URL=(process.env.DATABASE_URL||'postgresql://mwahli:mwahli@127.0.0.1:5432/mwahli').replace('@localhost:','@127.0.0.1:');
process.env.REDIS_URL=(process.env.REDIS_URL||'redis://127.0.0.1:6380').replace('://localhost:','://127.0.0.1:');

function waitForPort(host,port,timeoutMs=30000){
  const started=Date.now();
  return new Promise(resolve=>{
    const attempt=()=>{
      const socket=net.createConnection({host,port});
      let settled=false;
      const done=(ok)=>{
        if(settled)return;
        settled=true;
        socket.destroy();
        if(ok)return resolve(true);
        if(Date.now()-started>=timeoutMs)return resolve(false);
        setTimeout(attempt,750);
      };
      socket.setTimeout(1000);
      socket.once('connect',()=>done(true));
      socket.once('timeout',()=>done(false));
      socket.once('error',()=>done(false));
    };
    attempt();
  });
}

function runDocker(args){
  try{
    return spawnSync('docker',args,{stdio:'inherit'}).status===0;
  }catch{
    return false;
  }
}

console.log('\nMWAHLI local preview — preparing services…');

// Start persistence services independently so a Redis port collision can never stop PostgreSQL.
const coreStarted=runDocker(['compose','up','-d','postgres','minio','opensearch']);
const redisStarted=runDocker(['compose','up','-d','redis']);
if(!redisStarted){
  console.warn('! Redis could not bind locally. Continuing with the development in-memory rate-limit fallback.');
}

let dbReady=false;
if(coreStarted){
  dbReady=await waitForPort('127.0.0.1',5432,45000);
}

if(dbReady){
  console.log('✓ PostgreSQL is reachable. Refreshing local demo accounts…');
  const seed=spawnSync(process.execPath,['--env-file=.env.local','scripts/seed-dev.mjs'],{
    stdio:'inherit',
    env:{...process.env,DEV_DEMO_ENABLED:'true',DATABASE_URL:process.env.DATABASE_URL},
  });
  if(seed.status!==0)console.warn('! Seed refresh did not complete. Local preview fallback remains enabled.');
}else{
  console.warn('! PostgreSQL is unavailable. Continuing with MWAHLI standalone local data.');
}

console.log('✓ Local preview identity and fallback data are enabled.');
console.log('✓ Open http://localhost:4173 — protected product areas remain testable locally.\n');

const npmArgs=['run','dev','--workspace','@mwahli/web','--','--hostname','0.0.0.0','--port','4173'];
let child;
if(process.platform==='win32'){
  // Node 22 on Windows can throw EINVAL when a .cmd shim is spawned directly.
  child=spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm',...npmArgs],{
    stdio:'inherit',
    env:{...process.env},
    windowsHide:false,
  });
}else{
  child=spawn('npm',npmArgs,{stdio:'inherit',env:{...process.env}});
}

child.on('error',err=>{
  console.error('Could not start the Next.js preview process:',err);
  process.exit(1);
});
child.on('exit',code=>process.exit(code??0));
for(const signal of ['SIGINT','SIGTERM']){
  process.on(signal,()=>{
    if(!child.killed)child.kill(signal);
  });
}
