import { z } from 'zod';
import { json, safeBody } from '@/lib/http';
import { verifyEmailToken } from '@/lib/email-verification';
const schema=z.object({token:z.string().min(20)});
export async function POST(req:Request){const p=schema.safeParse(await safeBody(req).catch(()=>null));if(!p.success)return json({error:'Verification link is invalid.'},400);const userId=await verifyEmailToken(p.data.token);if(!userId)return json({error:'Verification link is invalid or expired.'},400);return json({ok:true});}
