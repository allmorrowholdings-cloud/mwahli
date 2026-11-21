import {auth,json} from '@/lib/http';
import {query} from '@/lib/db';
import {presignRead} from '@/lib/storage';
import {audit} from '@/lib/audit';

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const a=await auth(); if('response' in a)return a.response;
  const {id}=await params;
  const r=await query<{storage_key:string;content_type:string}>(`select storage_key,content_type from media_asset where id=$1 and owner_user_id=$2 and deleted_at is null and malware_state='clean' and moderation_state='approved'`,[id,a.session.sub]);
  const row=r.rows[0]; if(!row)return json({error:'Media is unavailable or has not passed safety checks.'},404);
  const url=await presignRead(row.storage_key);
  await audit(a.session.sub,'media.read','media_asset',id,{},'restricted',req);
  return json({url,contentType:row.content_type,expiresIn:300});
}
