import { query } from './db';
import { randomToken, sha256 } from './security';
import { sendEmail } from './email';

export async function queueEmailVerification(userId:string,email:string){
  const token=randomToken(32);
  await query("update email_verification_token set consumed_at=now() where user_id=$1 and consumed_at is null",[userId]);
  await query("insert into email_verification_token (user_id,token_hash,expires_at) values ($1,$2,now()+interval '24 hours')",[userId,sha256(token)]);
  const appUrl=process.env.APP_URL||'http://localhost:3000';
  await sendEmail({to:email,subject:'Verify your MWAHLI email',html:`<p>Confirm this email for your MWAHLI account.</p><p><a href="${appUrl}/verify-email?token=${encodeURIComponent(token)}">Verify email</a></p><p>This link expires in 24 hours.</p>`});
  return token;
}

export async function verifyEmailToken(token:string){
  const found=await query<{id:string;user_id:string}>("select id,user_id from email_verification_token where token_hash=$1 and consumed_at is null and expires_at>now() order by created_at desc limit 1",[sha256(token)]);
  const row=found.rows[0];if(!row)return null;
  await query('update email_verification_token set consumed_at=now() where id=$1',[row.id]);
  await query('update app_user set email_verified_at=coalesce(email_verified_at,now()),updated_at=now() where id=$1',[row.user_id]);
  return row.user_id;
}
