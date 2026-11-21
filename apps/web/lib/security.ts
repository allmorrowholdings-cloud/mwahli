import crypto from 'node:crypto';

export function timingSafeEqual(a:string,b:string){const A=Buffer.from(a);const B=Buffer.from(b);return A.length===B.length&&crypto.timingSafeEqual(A,B)}
export function sign(value:string,secret:string){const mac=crypto.createHmac('sha256',secret).update(value).digest('base64url');return `${value}.${mac}`}
export function verifySigned(input:string,secret:string){const i=input.lastIndexOf('.');if(i<1)return null;const value=input.slice(0,i),sig=input.slice(i+1);const expected=crypto.createHmac('sha256',secret).update(value).digest('base64url');return timingSafeEqual(sig,expected)?value:null}
export function randomToken(bytes=32){return crypto.randomBytes(bytes).toString('base64url')}
export function sha256(value:string|Buffer){return crypto.createHash('sha256').update(value).digest('hex')}
export function hashPassword(password:string,salt=crypto.randomBytes(16).toString('hex')){const key=crypto.scryptSync(password,salt,64).toString('hex');return `${salt}:${key}`}
export function verifyPassword(password:string,stored:string){const [salt,key]=stored.split(':');if(!salt||!key)return false;return timingSafeEqual(hashPassword(password,salt),stored)}
export function verifyWebhook(raw:string,signature:string|undefined,secret:string|undefined){if(!signature||!secret)return false;const normalized=signature.replace(/^sha256=/,'');const expected=crypto.createHmac('sha256',secret).update(raw).digest('hex');return timingSafeEqual(normalized,expected)}

function b32decode(input:string){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of input.toUpperCase().replace(/=|\s/g,'')){const n=alphabet.indexOf(c);if(n<0)continue;bits+=n.toString(2).padStart(5,'0')}const out:number[]=[];for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(out)}
export function verifyTotp(secretBase32:string,code:string,window=1){if(!/^\d{6}$/.test(code))return false;const key=b32decode(secretBase32);const counter=Math.floor(Date.now()/30000);for(let w=-window;w<=window;w++){const buf=Buffer.alloc(8);buf.writeBigUInt64BE(BigInt(counter+w));const digest=crypto.createHmac('sha1',key).update(buf).digest();const offset=digest[digest.length-1]&15;const num=(digest.readUInt32BE(offset)&0x7fffffff)%1_000_000;const candidate=num.toString().padStart(6,'0');if(timingSafeEqual(candidate,code))return true}return false}

export function randomBase32(bytes=20){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const data=crypto.randomBytes(bytes);let bits='',out='';
  for(const b of data)bits+=b.toString(2).padStart(8,'0');
  for(let i=0;i<bits.length;i+=5)out+=alphabet[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)];
  return out;
}
