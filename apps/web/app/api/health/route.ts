import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){return NextResponse.json({ok:true,service:'mwahli-web',time:new Date().toISOString(),version:'1.0.0'},{headers:{'cache-control':'no-store'}})}
