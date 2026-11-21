import crypto from 'node:crypto';
import {NextResponse} from 'next/server';
import {safeBody,requestMeta} from '@/lib/http';
import {rateLimit} from '@/lib/rate-limit';
import {z} from 'zod';
import {query} from '@/lib/db';
import {randomToken} from '@/lib/security';
import {sendEmail} from '@/lib/email';

const body=z.object({email:z.string().email()});
const generic={ok:true,message:'If an account exists, a recovery message has been queued.'};

export async function POST(req:Request){
  const parsed=body.safeParse(await safeBody(req).catch(()=>null));
  if(!parsed.success)return NextResponse.json(generic);
  if(!process.env.DATABASE_URL)return NextResponse.json(generic);
  const email=parsed.data.email.toLowerCase();
  const meta=requestMeta(req); const rl=await rateLimit(`recover:${meta.ip||'unknown'}:${email}`,5,900); if(!rl.ok)return NextResponse.json(generic);
  const result=await query<{id:string}>('select id from app_user where email=$1 and deleted_at is null limit 1',[email]);
  const user=result.rows[0];
  if(!user)return NextResponse.json(generic);
  const token=randomToken(32);
  const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  await query('insert into password_reset_token (user_id,token_hash,expires_at) values ($1,$2,now()+interval \'30 minutes\')',[user.id,tokenHash]);
  const appUrl=process.env.APP_URL||'http://localhost:3000';
  try{await sendEmail({to:email,subject:'Reset your MWAHLI password',html:`<p>A password reset was requested for your MWAHLI account.</p><p><a href="${appUrl}/reset-password?token=${encodeURIComponent(token)}">Reset password</a></p><p>This link expires in 30 minutes. If this was not you, ignore this email.</p>`})}catch(error){console.error('Password recovery email failed',error)}
  return NextResponse.json(generic);
}
