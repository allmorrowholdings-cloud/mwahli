import Redis from 'ioredis';

type Bucket={n:number;reset:number};
let redis:Redis|undefined;
let redisUnavailableUntil=0;
const memory=new Map<string,Bucket>();

function memoryRateLimit(key:string,limit:number,seconds:number){
  const now=Date.now();
  const cur=memory.get(key);
  if(!cur||cur.reset<now){
    memory.set(key,{n:1,reset:now+seconds*1000});
    return {ok:true,remaining:Math.max(0,limit-1)};
  }
  cur.n++;
  return {ok:cur.n<=limit,remaining:Math.max(0,limit-cur.n)};
}

function client(){
  if(!process.env.REDIS_URL||Date.now()<redisUnavailableUntil)return null;
  if(!redis){
    redis=new Redis(process.env.REDIS_URL,{
      lazyConnect:true,
      maxRetriesPerRequest:1,
      enableOfflineQueue:false,
      connectTimeout:1200,
      retryStrategy:()=>null
    });
    // ioredis otherwise prints an "Unhandled error event" for connection failures.
    // We handle the failure explicitly in rateLimit below.
    redis.on('error',()=>{});
  }
  return redis;
}

function markRedisUnavailable(){
  redisUnavailableUntil=Date.now()+15_000;
  if(redis){
    try{redis.disconnect(false)}catch{}
    redis=undefined;
  }
}

export async function rateLimit(key:string,limit:number,seconds:number){
  const r=client();
  if(r){
    try{
      if(r.status==='wait')await r.connect();
      const bucket=`rl:${key}:${Math.floor(Date.now()/1000/seconds)}`;
      const n=await r.incr(bucket);
      if(n===1)await r.expire(bucket,seconds+2);
      return {ok:n<=limit,remaining:Math.max(0,limit-n)};
    }catch(error){
      markRedisUnavailable();
      // Redis is coordination infrastructure in production, so don't silently
      // weaken distributed rate limiting there. Local development can safely
      // continue with the existing process-local limiter.
      if(process.env.NODE_ENV==='production')throw error;
    }
  }
  return memoryRateLimit(key,limit,seconds);
}
