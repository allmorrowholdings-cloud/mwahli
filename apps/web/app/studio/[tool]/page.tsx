import {redirect} from 'next/navigation';
export default async function Page({params,searchParams}:{params:Promise<{tool:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {tool}=await params;const q=await searchParams;const p=new URLSearchParams();
  for(const [k,v] of Object.entries(q)){if(Array.isArray(v))v.forEach(x=>p.append(k,x));else if(v!==undefined)p.set(k,v)}
  p.set('tool',tool);redirect(`/studio/editor?${p.toString()}`)
}
