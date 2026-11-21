export type MuseContext={relationship?:string;moment?:string;feeling?:string;budget?:number;currency?:string;senderLocation?:string;recipientLocation?:string;notes:string};
export interface AIAdapter{suggest(ctx:MuseContext):Promise<{strategy:string;label:string;why:string;estimatedCost?:string}[]>}
export interface PaymentAdapter{createIntent(input:{amount:number;currency:string;reference:string;email?:string}):Promise<{provider:string;reference:string;checkoutUrl?:string}>;verify(reference:string):Promise<{status:'pending'|'paid'|'failed';providerId?:string}>}
export interface MediaAdapter{createUpload(input:{key:string;contentType:string;bytes:number}):Promise<{uploadUrl:string;assetKey:string}>;remove(assetKey:string):Promise<void>}
export interface DeliveryAdapter{quote(input:{recipientToken:string;deadline:string;items:string[]}):Promise<{providerId:string;eta:string;price:number;currency:string;confidence:number;substitutionPolicy:string}>}
export interface KYCAdapter{start(subject:{type:'creator'|'merchant'|'provider';id:string}):Promise<{verificationId:string;url?:string}>}
export interface NotificationAdapter{send(input:{channel:'email'|'sms'|'whatsapp'|'push';to:string;template:string;data:Record<string,string>}):Promise<{id:string}>}
