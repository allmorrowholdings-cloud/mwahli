"use client";
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CTA, Eyebrow, TrustPill } from './ui';
import { Icon } from './icons';
import { useApi } from './client-kit';
import { Empty } from './module-frame';

type Person={id:string;name:string;relationship_label:string};
type Moment={id:string;title:string;kind:string;occurs_at?:string|null;person_name?:string|null};
const lanes=[
  {label:'Make something',desc:'Build a jar, letter, room, cards, timeline or private reveal.',href:'/studio',icon:'spark' as const,tone:'bg-wine text-cream'},
  {label:'Send something',desc:'Choose a thoughtful gift or local add-on after choosing the person.',href:'/gifts',icon:'gift' as const,tone:'bg-honey-light text-ink'},
];
const momentKinds=['just_because','birthday','anniversary','achievement','care','grief','repair','future'];
export function HomeDashboard(){
  const people=useApi<{items:Person[]}>('/api/people');
  const moments=useApi<{items:Moment[]}>('/api/moments');
  const [selected,setSelected]=useState<string>('');
  const chosen=people.data?.items.find(p=>p.id===selected)||people.data?.items[0];
  const upcoming=useMemo(()=>[...(moments.data?.items||[])].filter(x=>x.occurs_at).sort((a,b)=>new Date(a.occurs_at!).getTime()-new Date(b.occurs_at!).getTime()).slice(0,4),[moments.data]);
  return <>
    <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <div><Eyebrow>Your people first</Eyebrow><h1 className="max-w-4xl font-serif text-5xl leading-[.98] text-wine dark:text-cream sm:text-6xl">Who are you thinking about?</h1><p className="mt-4 max-w-2xl text-cocoa dark:text-cream/65">Choose someone, then tell MWAHLI what is happening. Shopping can wait.</p>
        <div className="mt-7 flex gap-3 overflow-x-auto pb-2">
          {people.data?.items.map((p,i)=><button key={p.id} onClick={()=>setSelected(p.id)} className={`min-w-[8rem] rounded-card border p-4 text-left transition hover:-translate-y-1 ${(chosen?.id===p.id)?'border-wine bg-wine text-cream':'border-wine/10 bg-white/70 dark:border-white/10 dark:bg-white/5'}`}><span className={`grid h-11 w-11 place-items-center rounded-full font-bold ${(chosen?.id===p.id)?'bg-cream/10 text-cream':'bg-petal text-wine dark:bg-white/10 dark:text-cream'}`}>{p.name.slice(0,1).toUpperCase()}</span><b className="mt-3 block">{p.name}</b><small className={(chosen?.id===p.id)?'text-cream/60':'text-cocoa dark:text-cream/50'}>{p.relationship_label}</small></button>)}
        </div>
        {!people.loading&&!people.data?.items.length&&<div className="mt-5"><Empty title="Start with one person" body="MWAHLI does not preload fake relationships. Add someone when you are ready."/></div>}
        <div className="mt-9"><p className="text-sm font-semibold text-wine dark:text-cream">What is happening?</p><div className="mt-3 flex flex-wrap gap-2">{momentKinds.map((k,i)=><Link key={k} href={`/moments?kind=${k}${chosen?`&person=${chosen.id}`:''}`} className={`rounded-full border px-4 py-3 text-sm font-medium ${i===0?'border-honey bg-honey-light text-wine':'border-wine/10 bg-white/70 text-cocoa dark:border-white/10 dark:bg-white/5 dark:text-cream/70'}`}>{k.replace('_',' ')}</Link>)}</div></div>
      </div>
    </div>
    <section className="mt-12"><div className="grid gap-4 lg:grid-cols-3">{lanes.map(x=><Link href={x.href} key={x.label} className={`group rounded-sheet p-6 shadow-soft transition hover:-translate-y-1 ${x.tone}`}><span className="grid h-12 w-12 place-items-center rounded-full bg-white/15"><Icon name={x.icon}/></span><h2 className="mt-10 font-serif text-3xl">{x.label}</h2><p className="mt-2 max-w-sm text-sm leading-6 opacity-75">{x.desc}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Open <Icon name="arrow"/></span></Link>)}</div></section>
    <section className="mt-14"><Card><div className="flex items-end justify-between gap-4"><div><Eyebrow>Upcoming moments</Eyebrow><h2 className="font-serif text-3xl text-wine dark:text-cream">Only after the feeling</h2></div><CTA href="/moments" variant="light">All moments</CTA></div><div className="mt-5 divide-y divide-wine/10 dark:divide-white/10">{upcoming.length?upcoming.map(m=><div key={m.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><b className="text-sm">{m.person_name?`${m.person_name} · `:''}{m.title}</b><span className="text-xs text-cocoa dark:text-cream/50">{m.occurs_at?new Date(m.occurs_at).toLocaleString():m.kind}</span><Link href="/studio" className="rounded-full bg-petal px-4 py-2 text-xs font-semibold text-wine dark:bg-white/5 dark:text-honey">Make something</Link></div>):<Empty title="No upcoming moments" body="Add a date when it matters. Just-because actions never need one."/>}</div></Card>
    </section>
  </>
}
