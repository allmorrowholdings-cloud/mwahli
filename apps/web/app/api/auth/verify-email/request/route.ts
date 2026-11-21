import { z } from 'zod';
import { json, safeBody } from '@/lib/http';
import { query } from '@/lib/db';
import { queueEmailVerification } from '@/lib/email-verification';
import { rateLimit } from '@/lib/rate-limit';
const schema=z.object({email:z.string().email()});
const generic={ok:true,message:'If the account needs verification, a new email has been queued.'};
export async function POST(req:Request){
  const p=schema.safeParse(await safeBody(req).catch(()=>null));if(!p.success)return json(generic);
  const email=p.data.email.toLowerCase();const rl=await rateLimit(`verify-email:${email}`,4,3600);if(!rl.ok)return json(generic);
  if(!process.env.DATABASE_URL)return json(generic);
  const r=await query<{id:string;email_verified_at:string|null}>('select id,email_verified_at from app_user where email=$1 and deleted_at is null limit 1',[email]);
  const u=r.rows[0];if(!u||u.email_verified_at)return json(generic);
  try{await queueEmailVerification(u.id,email)}catch(error){console.error('Verification email resend failed',error)}
  return json(generic);
}
