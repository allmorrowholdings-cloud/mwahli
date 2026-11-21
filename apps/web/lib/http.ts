import {NextResponse} from 'next/server';
import {getSession,requireRole,type Session} from './auth';
export function json(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'cache-control':'no-store'}})}
export async function auth(roles?:string[]):Promise<{session:Session}|{response:NextResponse}>{const session=await getSession();if(!session)return {response:json({error:'Authentication required.'},401)};if(roles&&!requireRole(session,roles))return {response:json({error:'Not authorized.'},403)};return {session}}
export function sameOrigin(req:Request){if(['GET','HEAD','OPTIONS'].includes(req.method))return true;const origin=req.headers.get('origin');if(!origin){const mobile=req.headers.get('x-mwahli-client')==='mobile';return mobile||process.env.NODE_ENV!=='production'}const allowed=new URL(process.env.APP_URL||req.url).origin;return origin===allowed}
export async function safeBody(req:Request){if(!sameOrigin(req))throw new Error('Cross-origin request blocked');return req.json().catch(()=>null)}
export function requestMeta(req:Request){const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();return {ip:forwarded||null,ua:req.headers.get('user-agent')||null}}
