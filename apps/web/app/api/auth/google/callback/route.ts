import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {query} from '@/lib/db';
import {hashPassword,randomToken,timingSafeEqual} from '@/lib/security';
import {attachSessionCookie,roleHome} from '@/lib/auth';

type GoogleUser={sub:string;email:string;email_verified:boolean;name?:string};
type UserRow={id:string;role:string};

export async function GET(req:Request){
  const requestUrl=new URL(req.url);
  const code=requestUrl.searchParams.get('code');
  const state=requestUrl.searchParams.get('state');
  const store=await cookies();
  const expected=store.get('mwahli_google_state')?.value;
  store.delete('mwahli_google_state');
  const appUrl=process.env.APP_URL||requestUrl.origin;
  if(!code||!state||!expected||!timingSafeEqual(state,expected))return NextResponse.redirect(new URL('/login?error=oauth_state',appUrl));
  if(!process.env.AUTH_GOOGLE_CLIENT_ID||!process.env.AUTH_GOOGLE_CLIENT_SECRET||!process.env.AUTH_GOOGLE_REDIRECT_URI||!process.env.DATABASE_URL)return NextResponse.redirect(new URL('/login?error=google_not_configured',appUrl));

  try{
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:process.env.AUTH_GOOGLE_CLIENT_ID,client_secret:process.env.AUTH_GOOGLE_CLIENT_SECRET,redirect_uri:process.env.AUTH_GOOGLE_REDIRECT_URI,grant_type:'authorization_code'})});
    if(!tokenResponse.ok)throw new Error('Google token exchange failed');
    const token=await tokenResponse.json() as {access_token?:string};
    if(!token.access_token)throw new Error('Google did not return an access token');
    const profileResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:`Bearer ${token.access_token}`}});
    if(!profileResponse.ok)throw new Error('Google profile request failed');
    const profile=await profileResponse.json() as GoogleUser;
    if(!profile.email||!profile.email_verified)throw new Error('Verified Google email required');

    const existing=await query<UserRow>('select id,role from app_user where email=$1 and deleted_at is null limit 1',[profile.email.toLowerCase()]);
    let user=existing.rows[0];
    if(!user){
      const id=crypto.randomUUID();
      await query('insert into app_user (id,email,password_hash,role,display_name,email_verified_at) values ($1,$2,$3,$4,$5,now())',[id,profile.email.toLowerCase(),hashPassword(randomToken(48)),'shopper',profile.name||null]);
      user={id,role:'shopper'};
    }
    const response=NextResponse.redirect(new URL(roleHome(user.role),appUrl));
    await attachSessionCookie(response,user);
    return response;
  }catch(error){
    console.error('Google OAuth failed',error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed',appUrl));
  }
}
