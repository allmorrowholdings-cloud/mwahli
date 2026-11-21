import {promises as fs} from 'node:fs';
import path from 'node:path';

export type LocalPerson={id:string;owner_user_id:string;name:string;relationship_label:string;preferred_contact?:string|null;timezone?:string|null;private_notes?:string|null;created_at:string;updated_at:string};
export type LocalMoment={id:string;owner_user_id:string;person_id?:string|null;kind:string;title:string;occurs_at?:string|null;recurrence_rule?:string|null;reminder_policy?:unknown;created_at:string;updated_at:string};
export type LocalExperience={id:string;owner_user_id:string;person_id?:string|null;moment_id?:string|null;title:string;share_id:string;status:string;theme:string;blocks:any[];published_at?:string|null;expires_at?:string|null;created_at:string;updated_at:string;version?:number};
type Store={people:LocalPerson[];moments:LocalMoment[];experiences:LocalExperience[]};

const empty=():Store=>({people:[],moments:[],experiences:[]});
const file=()=>path.resolve(process.cwd(),'.mwahli-local-store.json');
let queue=Promise.resolve();

export function localPreviewEnabled(){return process.env.NODE_ENV!=='production'&&(process.env.MWAHLI_LOCAL_STANDALONE==='true'||process.env.DEV_DEMO_ENABLED==='true')}
async function read():Promise<Store>{try{return {...empty(),...JSON.parse(await fs.readFile(file(),'utf8'))}}catch{return empty()}}
async function write(store:Store){await fs.writeFile(file(),JSON.stringify(store,null,2),'utf8')}
export async function localRead<T>(fn:(store:Store)=>T|Promise<T>){return fn(await read())}
export async function localMutate<T>(fn:(store:Store)=>T|Promise<T>):Promise<T>{let out!:T;queue=queue.then(async()=>{const store=await read();out=await fn(store);await write(store)});await queue;return out}
