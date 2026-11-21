import {auth,json} from '@/lib/http';import {query} from '@/lib/db';
export async function GET(){const a=await auth();if('response'in a)return a.response;const r=await query('select id,content_type,bytes,malware_state,moderation_state,created_at from media_asset where owner_user_id=$1 and deleted_at is null order by created_at desc limit 100',[a.session.sub]);return json({items:r.rows})}
