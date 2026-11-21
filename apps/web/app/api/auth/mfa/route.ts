import { z } from 'zod';
import { query } from '@/lib/db';
import { verifyTotp } from '@/lib/security';
import { json, safeBody } from '@/lib/http';
import { attachSessionCookie, roleHome } from '@/lib/auth';
import { decryptJson, encryptJson } from '@/lib/crypto-store';
import { consumeAuthChallenge, peekAuthChallenge } from '@/lib/auth-challenge';
import { rateLimit } from '@/lib/rate-limit';

const verifyBody=z.object({challenge:z.string().min(20),code:z.string().regex(/^\d{6}$/)});
const enrollBody=z.object({challenge:z.string().min(20),code:z.string().regex(/^\d{6}$/)});

export async function POST(req:Request){
  const p=verifyBody.safeParse(await safeBody(req).catch(()=>null));if(!p.success)return json({error:'Invalid MFA request.'},400);
  const challenge=await peekAuthChallenge(p.data.challenge,'mfa_verify');if(!challenge?.user_id)return json({error:'MFA challenge expired. Sign in again.'},401);
  const rl=await rateLimit(`mfa:${challenge.user_id}`,8,300);if(!rl.ok)return json({error:'Too many MFA attempts. Sign in again later.'},429);
  const r=await query<any>('select id,role,mfa_secret_ciphertext,mfa_enrolled_at from app_user where id=$1 and deleted_at is null',[challenge.user_id]);
  const u=r.rows[0];if(!u?.mfa_secret_ciphertext)return json({error:'MFA is not configured.'},403);
  const secret=decryptJson<{secret:string}>(u.mfa_secret_ciphertext,`mfa:${u.id}`)?.secret;
  if(!secret||!verifyTotp(secret,p.data.code))return json({error:'Invalid verification code.'},401);
  const consumed=await consumeAuthChallenge(p.data.challenge,'mfa_verify');if(!consumed)return json({error:'MFA challenge expired.'},401);
  const response=json({ok:true,redirect:roleHome(u.role),mobileToken:undefined});
  const token=await attachSessionCookie(response,{id:u.id,role:u.role,mfa:true});
  if(req.headers.get('x-mwahli-client')==='mobile')return json({ok:true,redirect:roleHome(u.role),mobileToken:token});
  return response;
}

export async function PUT(req:Request){
  const p=enrollBody.safeParse(await safeBody(req).catch(()=>null));if(!p.success)return json({error:'Enrollment data is incomplete.'},400);
  const challenge=await peekAuthChallenge(p.data.challenge,'mfa_enroll');if(!challenge?.user_id)return json({error:'Enrollment challenge expired. Sign in again.'},401);
  const secret=String(challenge.payload?.secret||'');if(!secret||!verifyTotp(secret,p.data.code))return json({error:'Verification code did not match.'},400);
  const consumed=await consumeAuthChallenge(p.data.challenge,'mfa_enroll');if(!consumed)return json({error:'Enrollment challenge expired.'},401);
  const r=await query<{role:string}>('update app_user set mfa_secret_ciphertext=$2,mfa_enrolled_at=now(),updated_at=now() where id=$1 and deleted_at is null returning role',[challenge.user_id,encryptJson({secret},`mfa:${challenge.user_id}`)]);
  const role=r.rows[0]?.role;if(!role)return json({error:'Account not found.'},404);
  const response=json({ok:true,redirect:roleHome(role),mobileToken:undefined});
  const token=await attachSessionCookie(response,{id:challenge.user_id,role,mfa:true});
  if(req.headers.get('x-mwahli-client')==='mobile')return json({ok:true,redirect:roleHome(role),mobileToken:token});
  return response;
}
