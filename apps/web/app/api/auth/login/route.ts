import { z } from 'zod';
import { hashPassword, randomBase32, verifyPassword } from '@/lib/security';
import { isLocalDatabaseConnectionError, query } from '@/lib/db';
import { attachSessionCookie, roleHome } from '@/lib/auth';
import { json, safeBody, sameOrigin } from '@/lib/http';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { createAuthChallenge } from '@/lib/auth-challenge';
import { queueEmailVerification } from '@/lib/email-verification';

const body=z.object({email:z.string().email(),password:z.string().min(10).max(200),mode:z.enum(['login','signup']).default('login')});
type UserRow={id:string;role:string;password_hash:string;mfa_enrolled_at:string|null;email_verified_at:string|null;email:string};

function demoUser(email:string,password:string){
  if(process.env.DEV_DEMO_ENABLED!=='true'||process.env.NODE_ENV==='production')return null;
  return [
    {email:process.env.DEV_DEMO_SHOPPER_EMAIL||'shopper@mwahli.local',password:process.env.DEV_DEMO_SHOPPER_PASSWORD||'LoveMadeFelt!2026',id:'00000000-0000-4000-8000-000000000001',role:'shopper'},
    {email:process.env.DEV_DEMO_CREATOR_EMAIL||'creator@mwahli.local',password:process.env.DEV_DEMO_CREATOR_PASSWORD||'CreateWithCare!2026',id:'00000000-0000-4000-8000-000000000002',role:'creator'},
    {email:process.env.DEV_DEMO_OPS_EMAIL||'ops@mwahli.local',password:process.env.DEV_DEMO_OPS_PASSWORD||'OperateSafely!2026',id:'00000000-0000-4000-8000-000000000003',role:'ops'}
  ].find(c=>c.email?.toLowerCase()===email&&c.password===password)||null;
}

function otpauth(email:string,secret:string){
  const issuer=process.env.AUTH_MFA_ISSUER||'MWAHLI';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

export async function POST(req:Request){
  const contentType=req.headers.get('content-type')||'';
  const nativeForm=contentType.includes('application/x-www-form-urlencoded')||contentType.includes('multipart/form-data');
  let payload:unknown=null;
  if(nativeForm){
    if(!sameOrigin(req))return json({error:'Cross-origin request blocked.'},403);
    const fd=await req.formData().catch(()=>null);
    payload=fd?{email:String(fd.get('email')||''),password:String(fd.get('password')||''),mode:String(fd.get('mode')||'login')}:null;
  }else{
    payload=await safeBody(req).catch(()=>null);
  }
  const parsed=body.safeParse(payload);
  if(!parsed.success)return json({error:'Check your email and password.'},400);
  const email=parsed.data.email.toLowerCase();
  const rl=await rateLimit(`auth:${email}`,10,300);
  if(!rl.ok)return json({error:'Too many attempts. Try again later.'},429);
  if(!process.env.DATABASE_URL&&process.env.DEV_DEMO_ENABLED!=='true')return json({error:'Database is not configured.'},503);

  const demo=demoUser(email,parsed.data.password);
  let user:UserRow|null=null;
  if(demo&&process.env.DATABASE_URL){
    const passwordHash=hashPassword(parsed.data.password);
    try{
      const r=await query<UserRow>(`insert into app_user (id,email,password_hash,role,email_verified_at) values ($1,$2,$3,$4,now())
        on conflict (email) do update set password_hash=excluded.password_hash,role=excluded.role,email_verified_at=coalesce(app_user.email_verified_at,now()),deleted_at=null returning id,role,password_hash,mfa_enrolled_at,email_verified_at,email`,[demo.id,email,passwordHash,demo.role]);
      user=r.rows[0]||null;
    }catch(error){
      if(!(process.env.NODE_ENV!=='production'&&process.env.MWAHLI_LOCAL_STANDALONE==='true')&&!isLocalDatabaseConnectionError(error))throw error;
      console.warn('[mwahli:auth] Local database persistence is unavailable; continuing with the verified local demo account.');
      user={id:demo.id,role:demo.role,password_hash:'',mfa_enrolled_at:null,email_verified_at:new Date().toISOString(),email};
    }
  }else if(demo){
    user={id:demo.id,role:demo.role,password_hash:'',mfa_enrolled_at:null,email_verified_at:new Date().toISOString(),email};
  }else if(parsed.data.mode==='signup'){
    const id=crypto.randomUUID();
    try{
      const verified=process.env.AUTH_EMAIL_VERIFICATION_REQUIRED==='true'?null:new Date();
      const r=await query<UserRow>(`insert into app_user (id,email,password_hash,role,email_verified_at) values ($1,$2,$3,'shopper',$4)
        returning id,role,password_hash,mfa_enrolled_at,email_verified_at,email`,[id,email,hashPassword(parsed.data.password),verified]);
      user=r.rows[0]||null;
      if(user&&process.env.AUTH_EMAIL_VERIFICATION_REQUIRED==='true'){
        try{await queueEmailVerification(user.id,email)}catch(error){console.error('Verification email failed',error);return json({error:'Account created, but the verification email could not be sent. Try resend verification.'},503)}
        return json({ok:true,emailVerificationRequired:true,message:'Check your email to verify your MWAHLI account.'},201);
      }
    }catch{return json({error:'That email is already in use or cannot be registered.'},409)}
  }else{
    try{const result=await query<UserRow>('select id,role,password_hash,mfa_enrolled_at,email_verified_at,email from app_user where email=$1 and deleted_at is null limit 1',[email]);
      const row=result.rows[0];
      if(row&&verifyPassword(parsed.data.password,row.password_hash))user=row;
    }catch(error){if((process.env.NODE_ENV!=='production'&&process.env.MWAHLI_LOCAL_STANDALONE==='true')||isLocalDatabaseConnectionError(error))return json({error:'This account is not available in local preview yet.'},401);throw error}
  }
  if(!user)return json({error:'Could not sign in.'},401);
  if(process.env.AUTH_EMAIL_VERIFICATION_REQUIRED==='true'&&!user.email_verified_at){
    return json({error:'Verify your email before signing in.',emailVerificationRequired:true},403);
  }

  const admin=['ops','trust_safety','finance','support','work_admin'].includes(user.role);
  if(admin&&user.mfa_enrolled_at){
    const challenge=await createAuthChallenge(user.id,'mfa_verify',{role:user.role},300);
    return json({mfaRequired:true,challenge,role:user.role});
  }
  if(admin&&process.env.NODE_ENV==='production'&&process.env.AUTH_REQUIRE_ADMIN_MFA!=='false'&&!user.mfa_enrolled_at){
    const secret=randomBase32(20);
    const challenge=await createAuthChallenge(user.id,'mfa_enroll',{role:user.role,secret},600);
    return json({mfaEnrollmentRequired:true,challenge,secret,otpauth:otpauth(user.email,secret),role:user.role});
  }

  const destination=roleHome(user.role);
  const mobile=req.headers.get('x-mwahli-client')==='mobile';
  const response=nativeForm&&!mobile
    ? NextResponse.redirect(new URL(destination,req.url),303)
    : json({ok:true,role:user.role,redirect:destination,mobileToken:undefined});
  const token=await attachSessionCookie(response,{id:user.id,role:user.role,mfa:!admin||!!user.mfa_enrolled_at});
  if(mobile)return json({ok:true,role:user.role,redirect:destination,mobileToken:token});
  return response;
}
