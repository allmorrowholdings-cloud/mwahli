import crypto from 'node:crypto';
import {NextResponse} from 'next/server';
import {safeBody,requestMeta} from '@/lib/http';
import {rateLimit} from '@/lib/rate-limit';
import {z} from 'zod';
import {db,query} from '@/lib/db';
import {hashPassword} from '@/lib/security';

const body=z.object({token:z.string().min(20),password:z.string().min(10).max(200)});
export async function POST(req:Request){
  const parsed=body.safeParse(await safeBody(req).catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'The reset link or password is invalid.'},{status:400});
  if(!process.env.DATABASE_URL)return NextResponse.json({error:'Account recovery is not configured.'},{status:503});
  const meta=requestMeta(req); const rl=await rateLimit(`reset:${meta.ip||'unknown'}`,10,900); if(!rl.ok)return NextResponse.json({error:'Too many attempts. Try again later.'},{status:429});
  const tokenHash=crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  const found=await query<{id:string;user_id:string}>('select id,user_id from password_reset_token where token_hash=$1 and consumed_at is null and expires_at>now() order by created_at desc limit 1',[tokenHash]);
  const reset=found.rows[0];
  if(!reset)return NextResponse.json({error:'This reset link is invalid or expired.'},{status:400});
  const client=await db().connect();
  try{
    await client.query('begin');
    await client.query('update app_user set password_hash=$1,updated_at=now() where id=$2',[hashPassword(parsed.data.password),reset.user_id]);
    await client.query('update password_reset_token set consumed_at=now() where id=$1',[reset.id]);
    await client.query('update session_record set revoked_at=now() where user_id=$1 and revoked_at is null',[reset.user_id]);
    await client.query('commit');
  }catch(error){await client.query('rollback');throw error}finally{client.release()}
  return NextResponse.json({ok:true});
}
