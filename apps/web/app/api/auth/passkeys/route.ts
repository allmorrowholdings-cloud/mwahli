import {auth,json} from '@/lib/http';import {query} from '@/lib/db';
export async function GET(){const a=await auth();if('response'in a)return a.response;const r=await query('select id,credential_id,transports,device_type,backed_up,created_at,last_used_at from passkey_credential where user_id=$1 order by created_at desc',[a.session.sub]);return json({items:r.rows})}
