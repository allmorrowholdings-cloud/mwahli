'use client';

import {FormEvent,useState} from 'react';
import Link from 'next/link';
import {getPasskey} from '@/lib/webauthn-client';

type MfaState={kind:'verify'|'enroll';challenge:string;secret?:string;otpauth?:string};

export function AuthCard({mode}:{mode:'login'|'signup'|'forgot'}){
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const [email,setEmail]=useState('');
  const [mfa,setMfa]=useState<MfaState|null>(null);
  const [code,setCode]=useState('');


  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg('');
    const fd=new FormData(e.currentTarget);
    const enteredEmail=String(fd.get('email')||'');setEmail(enteredEmail);
    if(mode==='forgot'){
      const r=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:enteredEmail})});
      const d=await r.json().catch(()=>({}));setBusy(false);setMsg(d.message||'If an account exists, a recovery message has been queued.');return;
    }
    const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:enteredEmail,password:fd.get('password'),mode})});
    const d=await r.json().catch(()=>({}));setBusy(false);
    if(d.mfaRequired){setMfa({kind:'verify',challenge:d.challenge});return}
    if(d.mfaEnrollmentRequired){setMfa({kind:'enroll',challenge:d.challenge,secret:d.secret,otpauth:d.otpauth});return}
    if(d.emailVerificationRequired){setMsg(d.message||d.error||'Check your email to verify your account.');return}
    if(r.ok){window.location.assign(d.redirect||'/home');return} setMsg(d.error||'Could not continue. Check your details.');
  }

  async function submitMfa(e:FormEvent){
    e.preventDefault();if(!mfa)return;setBusy(true);setMsg('');
    const r=await fetch('/api/auth/mfa',{method:mfa.kind==='enroll'?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({challenge:mfa.challenge,code})});
    const d=await r.json().catch(()=>({}));setBusy(false);
    if(r.ok){window.location.assign(d.redirect||'/home');return} setMsg(d.error||'Could not verify the code.');
  }

  async function resend(){
    if(!email)return;setBusy(true);
    const r=await fetch('/api/auth/verify-email/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
    const d=await r.json().catch(()=>({}));setBusy(false);setMsg(d.message||'If verification is needed, a new email has been queued.');
  }

  async function passkeyLogin(){
    if(!email){setMsg('Enter your email first, then choose passkey sign-in.');return}
    setBusy(true);setMsg('');
    try{
      const o=await fetch('/api/auth/passkey/login/options',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
      const od=await o.json().catch(()=>({}));if(!o.ok)throw new Error(od.error||'Passkey sign-in is unavailable.');
      const response=await getPasskey(od.options);
      const v=await fetch('/api/auth/passkey/login/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({challengeToken:od.challengeToken,response})});
      const vd=await v.json().catch(()=>({}));if(!v.ok)throw new Error(vd.error||'Passkey sign-in failed.');window.location.assign(vd.redirect||'/home');
    }catch(e){setMsg(e instanceof Error?e.message:'Passkey sign-in failed.')}finally{setBusy(false)}
  }

  const title=mfa
    ? (mfa.kind==='enroll'?'Set up MFA before entering.':'Enter your verification code.')
    : mode==='login'?'Sign in':mode==='signup'?'Create an account':'Reset your password';

  return <main className="mwahli-auth-shell mwahli-auth-login">
    <header className="mwahli-auth-nav">
      <Link className="mwahli-auth-home" href="/">← Back to MWAHLI</Link>
    </header>

    <section className="mwahli-auth-stage">

      <div className="mwahli-auth-panel">
        <div className="mwahli-auth-panel-inner">

          <h1>{title}</h1>
          {!mfa&&mode==='forgot'&&<p className="mwahli-auth-lede">Enter your email for a recovery link.</p>}

          {mfa ? <>
            {mfa.kind==='enroll'&&<><p className="mwahli-auth-lede">Add this secret to your authenticator app, then enter the current six-digit code.</p><code className="mwahli-auth-code">{mfa.secret}</code></>}
            <form onSubmit={submitMfa} className="mwahli-auth-form">
              <label><span>Verification code</span><input autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000"/></label>
              <button disabled={busy||code.length!==6} className="mwahli-auth-primary">{busy?'Checking…':mfa.kind==='enroll'?'Finish MFA setup':'Verify and continue'}</button>
              {msg&&<div className="mwahli-auth-message">{msg}</div>}
            </form>
            <button onClick={()=>{setMfa(null);setCode('')}} className="mwahli-auth-text-button">Start sign in again</button>
          </> : <>
            <form onSubmit={submit} method={mode==='forgot'?undefined:'post'} action={mode==='forgot'?undefined:'/api/auth/login'} className="mwahli-auth-form">
              {mode!=='forgot'&&<input type="hidden" name="mode" value={mode}/>}
              <label><span>Email</span><input name="email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
              {mode!=='forgot'&&<label><span>Password</span><input name="password" type="password" required minLength={10} autoComplete={mode==='login'?'current-password':'new-password'} placeholder="At least 10 characters"/></label>}
              <button type="submit" disabled={busy} className="mwahli-auth-primary">{busy?'Please wait…':mode==='login'?'Sign in to MWAHLI':mode==='signup'?'Create my account':'Send recovery link'}</button>

              {mode!=='forgot'&&<div className="mwahli-auth-divider"><span>or</span></div>}
              {mode!=='forgot'&&<button type="button" onClick={()=>location.href='/api/auth/google'} className="mwahli-auth-secondary">Continue with Google</button>}
              {mode==='login'&&<button type="button" onClick={passkeyLogin} disabled={busy} className="mwahli-auth-secondary">Sign in with a passkey</button>}

              {msg&&<div className="mwahli-auth-message"><p>{msg}</p>{msg.toLowerCase().includes('verify')&&email&&<button type="button" onClick={resend}>Resend verification email</button>}</div>}
            </form>

            <div className="mwahli-auth-switch">
              {mode==='login'?<><span>New to MWAHLI?</span><Link href="/signup">Create an account →</Link></>:mode==='signup'?<><span>Already have an account?</span><Link href="/login">Sign in →</Link></>:<Link href="/login">← Back to sign in</Link>}
            </div>
            {mode==='login'&&<Link className="mwahli-auth-forgot" href="/forgot-password">Forgot your password?</Link>}
          </>}

          <p className="mwahli-auth-legal">By continuing, you agree to the Terms and acknowledge the Privacy Policy.</p>
        </div>
      </div>
    </section>
  </main>;
}
