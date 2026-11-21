import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server';
import { query } from './db';

export function passkeyConfig(){
  const rpID=process.env.AUTH_PASSKEY_RP_ID||new URL(process.env.APP_URL||'http://localhost:3000').hostname;
  const origin=process.env.AUTH_PASSKEY_ORIGIN||process.env.APP_URL||'http://localhost:3000';
  const rpName=process.env.AUTH_PASSKEY_RP_NAME||'MWAHLI';
  return {rpID,origin,rpName};
}
export async function registrationOptions(userId:string,email:string,displayName?:string|null){
  const {rpID,rpName}=passkeyConfig();
  const existing=await query<any>('select credential_id,transports from passkey_credential where user_id=$1',[userId]);
  return generateRegistrationOptions({rpName,rpID,userName:email,userDisplayName:displayName||email,userID:new TextEncoder().encode(userId),attestationType:'none',excludeCredentials:existing.rows.map((x:any)=>({id:x.credential_id,transports:x.transports||[]})),authenticatorSelection:{residentKey:'preferred',userVerification:'preferred'}} as any);
}
export async function authenticationOptions(userId:string){
  const {rpID}=passkeyConfig();
  const existing=await query<any>('select credential_id,transports from passkey_credential where user_id=$1',[userId]);
  return generateAuthenticationOptions({rpID,userVerification:'preferred',allowCredentials:existing.rows.map((x:any)=>({id:x.credential_id,transports:x.transports||[]}))} as any);
}
export async function verifyRegistration(response:any,expectedChallenge:string){const {rpID,origin}=passkeyConfig();return verifyRegistrationResponse({response,expectedChallenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:false} as any)}
export async function verifyAuthentication(response:any,expectedChallenge:string,credential:any){const {rpID,origin}=passkeyConfig();return verifyAuthenticationResponse({response,expectedChallenge,expectedOrigin:origin,expectedRPID:rpID,credential:{id:credential.credential_id,publicKey:new Uint8Array(credential.public_key),counter:Number(credential.counter||0),transports:credential.transports||[]},requireUserVerification:false} as any)}
