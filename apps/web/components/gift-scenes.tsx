'use client';
import {useEffect,useRef,useState} from 'react';
import {softButton} from './client-kit';
import type {SurpriseStyle} from '@/lib/surprise-styles';
import './gift-scenes.css';

export type Surprise={name:string;occasion:string;note:string;gift:string};
const envelope='/brand/mwahli-envelope-hero.webp';
const parcel='/brand/mwahli-possibilities-gift.webp';

function WishingTree({data}:{data:Surprise}){
  const [growing,setGrowing]=useState(false);
  return <><button className="tree-stage" aria-label="Plant the heart seed" onClick={()=>setGrowing(!growing)}><svg className={'wish-tree '+(growing?'growing':'')} viewBox="0 0 300 230" aria-hidden="true">
    <ellipse cx="150" cy="214" rx="70" ry="5" fill="#dcc8a9"/>
    {growing&&<><g className="branches" fill="none" stroke="#674638" strokeWidth="5" strokeLinecap="round">
      <path d="M150 213 Q143 157 151 68 M149 168 Q117 137 82 110 M148 143 Q175 107 211 85 M148 122 Q130 92 116 73"/>
    </g>{Array.from({length:225},(_,i)=>{
      const angle=i*2.39996,r=Math.sqrt((i+.5)/225);
      return <text key={i} className="blossom" style={{animationDelay:(0.5+i*.008)+'s'}} x={146+86*r*Math.sin(angle)**3} y={88-4.8*r*(13*Math.cos(angle)-5*Math.cos(2*angle)-2*Math.cos(3*angle)-Math.cos(4*angle))} fill={['#812442','#ad5265','#ce9970'][i%3]} fontSize={8+i%6}>♥</text>;
    })}</>}
    {!growing&&<text x="140" y="214" fill="#822448" fontSize="24">♥</text>}
  </svg></button>{growing&&<div className="bloom-message"><p>{data.note}</p><p>{data.gift}</p></div>}
  <button className={softButton} onClick={()=>setGrowing(!growing)}>{growing?'Plant again':'Plant the heart'}</button></>;
}

function Parcels({data}:{data:Surprise}){
  const [opened,setOpened]=useState<number[]>([]);
  const items=[
    ['For you',data.name,envelope],['The occasion',data.occasion,'/brand/mwahli-card-capsule.webp'],
    ['A little note',data.note,'/brand/mwahli-card-creators.webp'],['Your gift',data.gift,parcel]
  ];
  return <div className="parcel-grid">{items.map(([label,message,image],i)=>{
    const open=opened.includes(i);
    return <button key={label} aria-label={label} aria-expanded={open} className={'parcel-tile '+(open?'unwrapped':'')} onClick={()=>setOpened(open?opened.filter(n=>n!==i):[...opened,i])}>
      <span className="parcel-inside"><img src={image} alt=""/><span>{message}</span></span>
      <span className="parcel-wrap"><b>{label}</b></span>
    </button>;
  })}</div>;
}

function Evening({data}:{data:Surprise}){
  const [stage,setStage]=useState(0);
  const audio=useRef<AudioContext|null>(null);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  function advance(){
    if(stage===1&&typeof AudioContext!=='undefined'){
      try{
        const ctx=audio.current??new AudioContext(); audio.current=ctx;
        void ctx.resume().then(()=>{
          if(ctx.state!=='running')return;
          [261.63,329.63,392,523.25].forEach((hz,i)=>{
            const t=ctx.currentTime+i*.24,tone=ctx.createOscillator(),gain=ctx.createGain();
            tone.frequency.value=hz;gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.09,t+.04);gain.gain.exponentialRampToValueAtTime(.001,t+.8);
            tone.connect(gain);gain.connect(ctx.destination);tone.start(t);tone.stop(t+.8);
          });
        }).catch(()=>{});
      }catch{}
    }
    setStage((stage+1)%8);
  }
  return <div className={'evening '+(stage?'lamplit':'')}>
    <div className="fairy-lights" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i}/>)}</div>
    {stage>=3&&<div className="party-stream" aria-hidden="true">{['♥','✦','♥','✧','♥','✦','♥'].map((v,i)=><i key={i} style={{left:(8+i*13)+'%',animationDelay:(i*-.65)+'s'}}>{v}</i>)}</div>}
    {stage>=4&&<div className="petit-cake" aria-hidden="true"/>}
    {stage>=5&&<div className="wax" aria-hidden="true">{stage>=4&&<i/>}</div>}
    {stage>=2&&<h2 className="scene-appear">{data.occasion}</h2>}
    {stage>=6&&<p>{data.note}</p>}{stage===7&&<p>{data.gift}</p>}
    <button className={softButton} onClick={advance}>{['Turn on the lights','Play the chimes','Release the hearts','Bring out the cake','Light the candle','Make a wish','Open the dedication','Celebrate again'][stage]}</button>
  </div>;
}

function MotionNote({data}:{data:Surprise}){
  const [frame,setFrame]=useState(-1);
  const [paused,setPaused]=useState(false);
  const frames=['Dear '+data.name+',',data.occasion,data.note,'One more thing…',data.gift];
  const current=frames[frame]||'';
  useEffect(()=>{
    if(paused||frame<0||frame>=4)return;
    const timer=setTimeout(()=>setFrame(f=>f+1),Math.max(2600,current.length*95));
    return ()=>clearTimeout(timer);
  },[frame,paused,current]);
  return <div className="motion-note"><div aria-live="polite" className="film-frame" key={frame}>{frame<0?<img src={envelope} alt="Sealed letter"/>:<span className={'film-shot shot-'+frame} aria-label={current}>{Array.from(current).map((char,i)=><span aria-hidden="true" key={i} style={{animationDelay:Math.min(i*.026,2)+'s'}}>{char}</span>)}</span>}</div>
    {frame>=0&&<div className="frame-counter">{frame+1} / 5</div>}
    {frame===-1||frame===4?<button className={softButton} onClick={()=>{setPaused(false);setFrame(0)}}>{frame<0?'Play your greeting':'Replay'}</button>:<>
      <button className={softButton} onClick={()=>setPaused(!paused)}>{paused?'Resume':'Pause'}</button> <button className={softButton} onClick={()=>setFrame(frame+1)}>Next</button></>}
  </div>;
}

function FoldedLetter({data}:{data:Surprise}){
  const [open,setOpen]=useState(false);
  return <><div className={'folded '+(open?'unfold':'')}>
    <div className="inner-paper" aria-hidden={!open}><p>{data.note}</p><p>{data.gift}</p></div>
    <button type="button" className="letter-cover" aria-label="Unfold the cover" tabIndex={open?-1:0} onClick={()=>setOpen(true)} aria-hidden={open}><img src={envelope} alt=""/><b>{data.occasion}</b></button>
  </div><button className={softButton} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close the card':'Open the card'}</button></>;
}

const scenes={tree:WishingTree,parcels:Parcels,evening:Evening,film:MotionNote,folded:FoldedLetter};
export function GiftScene({style,data}:{style:SurpriseStyle;data:Surprise}){
  const Scene=scenes[style];
  return <section className="gift-scene"><h1>For {data.name}</h1><Scene data={data}/></section>;
}
