'use client';

import Link from 'next/link';
import {GiftScene} from '@/components/gift-scenes';
import {isSurpriseStyle,surpriseStyles,type SurpriseStyle} from '@/lib/surprise-styles';
import {useEffect, useState} from 'react';
import {buttonClass, inputClass, softButton} from '@/components/client-kit';

type Surprise = {name:string; occasion:string; note:string; gift:string};
const empty:Surprise = {name:'', occasion:'Just because', note:'', gift:''};

export default function Goodies(){
  const [editing,setEditing]=useState(false);
  const [style,setStyle]=useState<SurpriseStyle|null>(null);
  const [draft,setDraft]=useState(empty);
  const [received,setReceived]=useState<Surprise|null>(null);
  const [step,setStep]=useState(0);
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    function open(){
      const chosen=new URLSearchParams(location.search).get('style');
      setStyle(isSurpriseStyle(chosen)?chosen:null);
      setReceived(null);
      setError('');
      setStep(0);
      if(location.hash){
        const p=new URLSearchParams(location.hash.slice(1));
        const surprise={name:p.get('name')||'',occasion:p.get('occasion')||'',note:p.get('note')||'',gift:p.get('gift')||''};
        if(Object.values(surprise).every(v=>v.trim()&&v.length<=500))setReceived(surprise);
        else setError('This surprise link is incomplete.');
      }
      setReady(true);
    }
    open();
    window.addEventListener('hashchange',open);
    return ()=>window.removeEventListener('hashchange',open);
  },[]);
  function update(key:keyof Surprise,value:string){
    setDraft({...draft,[key]:value});
    setUrl('');
  }
  return <main className="mx-auto max-w-xl px-5 py-12">
    <Link href="/studio" className="text-sm">← Studio</Link>
    {ready&&!received&&!error&&!style&&<section className="mt-6 grid gap-4"><h1 className="font-serif text-4xl">Goodie &amp; Gift</h1>{Object.entries(surpriseStyles).map(([key,title])=><Link className="studio-tool-card" key={key} href={'/goodies?style='+key} onClick={()=>setStyle(key as SurpriseStyle)}>{title}</Link>)}</section>}
    {ready&&!received&&!error&&style&&!editing&&<>
      <h1 className="mt-6 font-serif text-3xl">{surpriseStyles[style]}</h1>
      <GiftScene style={style} data={{name:draft.name||'you',occasion:draft.occasion,note:draft.note||'I still remember you running alongside the train, waving until the platform ran out.',gift:draft.gift||'Two train tickets this Sunday. This time we get on together.'}}/>
      <button className={buttonClass+' mt-4'} onClick={()=>setEditing(true)}>Make this yours</button>
    </>}
    {ready&&(error?<p role="alert">{error}</p>:received&&style?<GiftScene data={received} style={style}/>:received?<section className="mt-8 rounded-3xl bg-petal p-8 text-center text-wine" aria-live="polite">
      <p>{received.occasion}</p><h1 className="my-4 break-words font-serif text-4xl">For {received.name}</h1>
      {step===0&&<img className="mx-auto mb-4 w-44" src="/brand/mwahli-envelope-hero.webp" alt="Burgundy ribbon envelope"/>}
      {step>0&&<p className="my-6 whitespace-pre-wrap break-words">{received.note}</p>}
      {step===2&&<div className="rounded-2xl bg-white p-5"><h2 className="font-serif text-2xl">Your gift</h2><p className="mt-2 whitespace-pre-wrap break-words">{received.gift}</p></div>}
      <button className={softButton+' mt-5'} onClick={()=>setStep((step+1)%3)}>{['Open your goodie','Unwrap your gift','Open again'][step]}</button>
    </section>:editing&&style?<form className="mt-8 grid gap-5" onSubmit={e=>{
      e.preventDefault();
      setUrl(location.origin+location.pathname+location.search+'#'+new URLSearchParams(draft).toString());
    }}>
      <h1 className="font-serif text-4xl">{style?surpriseStyles[style]:'Goodie & Gift'}</h1>
      <p>A personal note, followed by a gift you promise.</p>
      <label>For<input required maxLength={70} pattern=".*\S.*" className={inputClass} value={draft.name} onChange={e=>update('name',e.target.value)}/></label>
      <label>Occasion<input required maxLength={80} pattern=".*\S.*" list="occasions" className={inputClass} value={draft.occasion} onChange={e=>update('occasion',e.target.value)}/></label>
      <datalist id="occasions">{['Just because','Anniversary','Birthday','Thank you','Congratulations'].map(x=><option key={x}>{x}</option>)}</datalist>
      <label>Your note<textarea required maxLength={500} className={inputClass} placeholder="I still think about how you showed up for me." value={draft.note} onChange={e=>update('note',e.target.value)}/></label>
      <label>Your gift<textarea required maxLength={500} className={inputClass} placeholder="Saturday breakfast is on me. Pick your favourite café." value={draft.gift} onChange={e=>update('gift',e.target.value)}/></label>
      <button className={buttonClass} disabled={!Object.values(draft).every(v=>v.trim())}>Create shareable link</button>
      {url&&<div className="grid gap-3"><label>Share this link<input readOnly className={inputClass} value={url} onFocus={e=>e.target.select()}/></label><a className={softButton} href={url} target="_blank" rel="noreferrer">Preview surprise</a></div>}
    </form>:null)}
  </main>;
}
