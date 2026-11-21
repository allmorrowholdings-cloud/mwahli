import {revokeCurrentSession} from '@/lib/auth';import {json} from '@/lib/http';export async function POST(){await revokeCurrentSession();return json({ok:true})}
