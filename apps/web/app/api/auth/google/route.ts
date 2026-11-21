import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {randomToken} from '@/lib/security';

export async function GET(){
  const clientId=process.env.AUTH_GOOGLE_CLIENT_ID;
  const redirectUri=process.env.AUTH_GOOGLE_REDIRECT_URI;
  if(!clientId||!redirectUri)return NextResponse.redirect(new URL('/login?error=google_not_configured',process.env.APP_URL||'http://localhost:3000'));
  const state=randomToken(24);
  (await cookies()).set('mwahli_google_state',state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600});
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id',clientId);
  url.searchParams.set('redirect_uri',redirectUri);
  url.searchParams.set('response_type','code');
  url.searchParams.set('scope','openid email profile');
  url.searchParams.set('state',state);
  url.searchParams.set('prompt','select_account');
  return NextResponse.redirect(url);
}
