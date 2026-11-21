'use client';
function fromB64url(value:string){const pad='='.repeat((4-value.length%4)%4);const b64=(value+pad).replace(/-/g,'+').replace(/_/g,'/');const bin=atob(b64);return Uint8Array.from(bin,c=>c.charCodeAt(0)).buffer}
function toB64url(value:ArrayBuffer|null){if(!value)return null;let bin='';for(const b of new Uint8Array(value))bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
export async function createPasskey(options:any){
  if(!window.PublicKeyCredential)throw new Error('Passkeys are not supported in this browser.');
  const publicKey={...options,challenge:fromB64url(options.challenge),user:{...options.user,id:fromB64url(options.user.id)},excludeCredentials:(options.excludeCredentials||[]).map((x:any)=>({...x,id:fromB64url(x.id)}))};
  const c=await navigator.credentials.create({publicKey}) as PublicKeyCredential|null;if(!c)throw new Error('Passkey creation was cancelled.');
  const r=c.response as AuthenticatorAttestationResponse;
  return {id:c.id,rawId:toB64url(c.rawId),type:c.type,authenticatorAttachment:(c as any).authenticatorAttachment||null,response:{clientDataJSON:toB64url(r.clientDataJSON),attestationObject:toB64url(r.attestationObject),transports:typeof r.getTransports==='function'?r.getTransports():[]},clientExtensionResults:c.getClientExtensionResults()};
}
export async function getPasskey(options:any){
  if(!window.PublicKeyCredential)throw new Error('Passkeys are not supported in this browser.');
  const publicKey={...options,challenge:fromB64url(options.challenge),allowCredentials:(options.allowCredentials||[]).map((x:any)=>({...x,id:fromB64url(x.id)}))};
  const c=await navigator.credentials.get({publicKey}) as PublicKeyCredential|null;if(!c)throw new Error('Passkey sign-in was cancelled.');
  const r=c.response as AuthenticatorAssertionResponse;
  return {id:c.id,rawId:toB64url(c.rawId),type:c.type,authenticatorAttachment:(c as any).authenticatorAttachment||null,response:{clientDataJSON:toB64url(r.clientDataJSON),authenticatorData:toB64url(r.authenticatorData),signature:toB64url(r.signature),userHandle:toB64url(r.userHandle)},clientExtensionResults:c.getClientExtensionResults()};
}
