"use client";
import Link from 'next/link';
import {useEffect,useRef} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {studioTools} from '@/lib/studio-tools';
import {softButton} from './client-kit';
import {Eyebrow} from './ui';

export function StudioBuilder(){
const q=useSearchParams();
const router=useRouter();
function toolHref(slug:string){
  const params=new URLSearchParams(q.toString());
  const person=params.get('person');
  if(person&&!params.has('personId'))params.set('personId',person);
  params.delete('person');
  params.set('tool',slug);
  return `/studio/editor?${params}`;
}
const toolsDrawer=useRef<HTMLDialogElement>(null);
function closeTools(){toolsDrawer.current?.close()}
useEffect(()=>{
  const desktop=window.matchMedia('(min-width: 901px)');
  const closeOnDesktop=()=>{if(desktop.matches)closeTools()};
  desktop.addEventListener('change',closeOnDesktop);
  return ()=>desktop.removeEventListener('change',closeOnDesktop);
},[]);
const retainedProTools=new Set(['love-cards','open-when','story-path']);
const navigationTools=studioTools.filter(tool=>!tool.pro||retainedProTools.has(tool.slug));
const toolNavigation=<nav aria-label="Studio tools" className="mt-5 space-y-1">{navigationTools.map(t=><Link onClick={closeTools} prefetch={false} key={t.slug} href={toolHref(t.slug)} onPointerEnter={()=>router.prefetch(toolHref(t.slug))} onTouchStart={()=>router.prefetch(toolHref(t.slug))} onFocus={()=>router.prefetch(toolHref(t.slug))} className="studio-side-link"><span>{t.icon}</span><span className="min-w-0 flex-1 truncate">{t.name}</span>{t.pro&&<span className="studio-pro-love">♥ PRO</span>}</Link>)}</nav>;
return <div className="studio-dashboard"><aside className="studio-sidebar"><div><Eyebrow>MWAHLI Studio</Eyebrow><h2 className="mt-2 font-serif text-3xl text-wine dark:text-cream">Create</h2></div>{toolNavigation}</aside><div className="studio-mobile-tools"><button type="button" className={softButton} aria-haspopup="dialog" onClick={()=>toolsDrawer.current?.showModal()}>☰ Studio tools</button></div><dialog ref={toolsDrawer} className="studio-tools-drawer" aria-labelledby="studio-tools-title" onClick={event=>{if(event.target===event.currentTarget)closeTools()}}><div className="studio-tools-drawer-panel"><div className="flex items-center justify-between gap-3"><h2 id="studio-tools-title" className="font-serif text-2xl">Studio tools</h2><button type="button" className={softButton} onClick={closeTools}>Close</button></div>{toolNavigation}</div></dialog><div className="min-w-0 space-y-6"><section><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{studioTools.map(t=><Link prefetch={false} href={toolHref(t.slug)} onPointerEnter={()=>router.prefetch(toolHref(t.slug))} onTouchStart={()=>router.prefetch(toolHref(t.slug))} onFocus={()=>router.prefetch(toolHref(t.slug))} key={t.slug} className="studio-tool-card"><div className="flex items-start justify-between gap-3"><span className="studio-tool-icon">{t.icon}</span>{t.pro?<span className="studio-pro-love">♥ PRO</span>:<span className="studio-free-pill">FREE</span>}</div><h3 className="mt-5 font-serif text-3xl text-wine dark:text-cream">{t.name}</h3></Link>)}</div></section></div></div>}
