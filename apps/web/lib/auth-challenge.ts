import { query } from './db';
import { randomToken, sha256 } from './security';

export async function createAuthChallenge(userId:string|null,purpose:string,payload:Record<string,unknown>={},ttlSeconds=600){
  const token=randomToken(32);
  await query('insert into auth_challenge (user_id,purpose,challenge_hash,payload,expires_at) values ($1,$2,$3,$4,now()+($5||\' seconds\')::interval)',[userId,purpose,sha256(token),payload,String(ttlSeconds)]);
  return token;
}

export async function consumeAuthChallenge(token:string,purpose:string){
  const r=await query<any>(`update auth_challenge set consumed_at=now() where challenge_hash=$1 and purpose=$2 and consumed_at is null and expires_at>now() returning id,user_id,payload`,[sha256(token),purpose]);
  return r.rows[0]||null;
}

export async function peekAuthChallenge(token:string,purpose:string){
  const r=await query<any>('select id,user_id,payload,expires_at from auth_challenge where challenge_hash=$1 and purpose=$2 and consumed_at is null and expires_at>now() limit 1',[sha256(token),purpose]);
  return r.rows[0]||null;
}
