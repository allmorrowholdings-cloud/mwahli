"use client";
import {useEffect,useMemo,useState} from 'react';

export type MemoryAttachment={kind:'image'|'video'|'gif';name:string;dataUrl:string;caption?:string};
export type MemoryItem={key:string;label:string;color?:string;animal?:string;gender?:'female'|'male';text:string;caption?:string;attachments?:MemoryAttachment[]};
export type MemoryJarData={mode:'colors'|'animals';revealCount:number;memories:MemoryItem[];recipientName?:string;watermark?:boolean};

const animalAsset=(animal?:string,gender?:string)=>{
  const a=(animal||'').toLowerCase();
  const g=gender==='male'?'male':'female';
  if(a==='giraffe'&&g==='male') return '/studio/animals/male-giraffee.webp';
  return `/studio/animals/${g}-${a}.webp`;
};

const heartAsset=(label?:string)=>{const k=(label||'').toLowerCase();return ['rose','honey','sage','blush','wine','sky','tangerine'].includes(k)?`/studio/hearts/${k}-ball.webp`:''};

export function MemoryJarExperience({data,compact=false}:{data:MemoryJarData;compact?:boolean}){
  const [phase,setPhase]=useState<'jar'|'countdown'|'choices'|'done'>('jar');
  const [count,setCount]=useState(0);
  const [chosen,setChosen]=useState<string[]>([]);
  const [active,setActive]=useState<string|null>(null);
  const [burst,setBurst]=useState<string|null>(null);
  const memories=useMemo(()=>data.memories.filter(m=>m.label),[data.memories]);
  useEffect(()=>{setPhase('jar');setChosen([]);setActive(null);setCount(0)},[data.mode,data.revealCount,memories.length]);
  async function launch(){
    if(phase!=='jar')return;
    setPhase('countdown');
    for(const n of [1,2,3]){setCount(n);await new Promise(r=>setTimeout(r,520));}
    setCount(0);setPhase('choices');
  }
  function reveal(key:string){
    if(chosen.includes(key)||chosen.length>=data.revealCount)return;
    setActive(key);
    if(data.mode==='animals') setBurst(key);
    window.setTimeout(()=>{
      const next=[...chosen,key];setChosen(next);
      if(data.mode==='animals') setBurst(null);
      if(next.length>=data.revealCount)window.setTimeout(()=>setPhase('done'),650);
    },data.mode==='colors'?420:300);
  }
  const revealed=memories.filter(m=>chosen.includes(m.key));
  return <section className={`mj-stage ${compact?'mj-stage-compact':''}`}>
    <div className="mj-ambient" aria-hidden="true"/>
    <div className="mj-title"><span>MWAHLI</span><b>Memory Jar{data.recipientName?` for ${data.recipientName}`:''}</b><small>{phase==='jar'?'Tap the jar to begin.':phase==='countdown'?'Ready…':phase==='choices'?`Choose ${Math.max(0,data.revealCount-chosen.length)} to reveal a memory.`:'Your memories, revealed.'}</small></div>
    <button type="button" className={`mj-jar-button ${phase==='countdown'?'is-shaking':''} ${phase==='done'?'is-empty':''}`} onClick={launch} aria-label="Open the Memory Jar">
      <img src={data.mode==='animals'?'/studio/jars/animal-jar.webp':'/studio/jars/color-jar.webp'} alt="MWAHLI Memory Jar"/>
      {phase==='countdown'&&<span className="mj-count">{count}</span>}
    </button>
    {(phase==='choices'||phase==='done')&&<div className={`mj-choice-line ${phase==='done'?'is-finished':''}`}>
      {memories.map((m,i)=>{
        const isChosen=chosen.includes(m.key),disabled=phase==='done'&&!isChosen;
        return <button key={m.key} type="button" disabled={disabled||isChosen} onClick={()=>reveal(m.key)} className={`mj-choice mj-pop-${i%4} ${isChosen?'is-chosen':''} ${active===m.key&&!isChosen?'is-opening':''}`} aria-label={`Reveal ${m.label}`}>
          {data.mode==='animals'?<><img src={animalAsset(m.animal,m.gender)} alt={`${m.gender||'female'} ${m.animal||m.label}`}/>{burst===m.key&&<img className="mj-burst-fx" src="/studio/effects/balloon-burst.webp" alt=""/>}</>:heartAsset(m.label)?<img className="mj-heart-ball-img" src={heartAsset(m.label)} alt={`${m.label} heart ball`}/>:<span className="mj-heart-ball" style={{'--heart-color':m.color||'#B72A57'} as React.CSSProperties}>♥</span>}
          <b>{m.label}</b>
        </button>
      })}
    </div>}
    {!!revealed.length&&<div className="mj-reveals">
      {revealed.map(m=><article className="brain-card" key={m.key}>
        <img className="brain-card-art" src="/studio/memory/brain-card.webp" alt=""/>
        <div className="brain-card-inner">
          <span className="brain-kicker">A memory from someone who loves you</span>
          {m.text&&<p>{m.text}</p>}
          {m.attachments?.map((a,i)=><figure className="brain-media" key={`${a.name}-${i}`}>
            {a.kind==='video'?<video controls playsInline preload="metadata" src={a.dataUrl}/>:<img src={a.dataUrl} alt={a.caption||a.name}/>} 
            {(a.caption||m.caption)&&<figcaption>{a.caption||m.caption}</figcaption>}
          </figure>)}
          {!m.attachments?.length&&m.caption&&<small>{m.caption}</small>}
        </div>
      </article>)}
    </div>}
    {data.watermark!==false&&<div className="mj-watermark"><img src="/brand/mwahli-logo-exact-transparent.svg" alt="MWAHLI"/></div>}
  </section>
}
