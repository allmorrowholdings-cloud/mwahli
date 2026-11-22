"use client";
import Link from 'next/link';
import {useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {encodeMemoryLink} from '@/lib/memory-link';
import {studioTools} from '@/lib/studio-tools';
import {api,buttonClass,inputClass,softButton} from './client-kit';
import {LetterPreview, renderLetter, stationery} from './letter-preview';
import {Card,Eyebrow} from './ui';
import {MemoryJarExperience,type MemoryAttachment,type MemoryJarData} from './memory-jar-experience';

const colorChoices=[['Honey','#F0B64A'],['Blush','#F8D5DE'],['Lilac','#A590C8'],['Tangerine','#E77A47'],['Ruby','#D41949'],['Cream','#F7E9D8'],['Emerald','#39775F'],['Navy','#27476B']];
const animalChoices=['Bunny','Cat','Dog','Fox','Giraffe','Koala','Lion','Panda'];
const letterTemplateNames=['Romantic Classic','Soft Morning','Midnight Letter','Joy Confetti','Quiet Comfort'];
type MemoryDraft={text:string;caption:string;attachments:MemoryAttachment[]};
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.15em] text-cocoa/65 dark:text-cream/45">{label}</span>{children}</label>}
const fileToDataUrl=(file:File)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(file)});
const videoDuration=(file:File)=>new Promise<number>((resolve,reject)=>{const url=URL.createObjectURL(file),v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=()=>{const d=v.duration;URL.revokeObjectURL(url);resolve(d)};v.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read video.'))};v.src=url});

export function StudioToolEditor({slug, signedIn}:{slug:string; signedIn:boolean}){
  const q=useSearchParams();const tool=studioTools.find(x=>x.slug===slug)!;
  const [jarStep,setJarStep]=useState(1);
  const [letterStep,setLetterStep]=useState(1),[chosenTemplate,setChosenTemplate]=useState(false);
  const [closing,setClosing]=useState('With love,'),[signature,setSignature]=useState(''),[anonymous,setAnonymous]=useState(false);
  const [preview,setPreview]=useState(false),[text,setText]=useState(''),[poem,setPoem]=useState(false),[template,setTemplate]=useState(0),[selected,setSelected]=useState<string[]>([]),[revealCount,setRevealCount]=useState(2),[memoryMode,setMemoryMode]=useState<'colors'|'animals'>('colors'),[memories,setMemories]=useState<MemoryDraft[]>(Array.from({length:4},()=>({text:'',caption:'',attachments:[]}))),[animalGender,setAnimalGender]=useState<Record<string,'female'|'male'>>({}),[brush,setBrush]=useState('#6F173A'),[size,setSize]=useState(6),[rhyme,setRhyme]=useState('free verse'),[stanzas,setStanzas]=useState('3'),[shareUrl,setShareUrl]=useState(''),[shareBusy,setShareBusy]=useState(false),[status,setStatus]=useState('');
  const canvas=useRef<HTMLCanvasElement|null>(null);const who=q.get('tempName')||'someone you love';
  const jarReady=selected.length===4 && selected.every((_,i)=>Boolean(memories[i].text.trim()||memories[i].attachments.length));
  const signOff=[closing.trim(),anonymous?'Anonymous':signature.trim()].filter(Boolean).join('\n');
  async function downloadCreation() {
    const artwork = canvas.current;
    const download = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    if (artwork) {
      artwork.toBlob(blob => {
        if (blob) download(blob, 'mwahli-artwork.png');
      }, 'image/png');
    } else if (text.trim()) {
      const letter = document.createElement('canvas');
      try {
        await renderLetter(letter, template, text, signOff);
        const blob = await new Promise<Blob | null>(resolve => letter.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG export failed');
        download(blob, poem ? 'mwahli-poem.png' : 'mwahli-letter.png');
      } catch {
        setStatus('Could not download the PNG. Please try again.');
      }
    }
  }
  function toggle(v:string){setSelected(s=>s.includes(v)?s.filter(x=>x!==v):s.length<4?[...s,v]:s)}
  function draw(e:React.PointerEvent<HTMLCanvasElement>){const c=canvas.current;if(!c)return;const r=c.getBoundingClientRect(),ctx=c.getContext('2d');if(!ctx)return;ctx.fillStyle=brush;ctx.beginPath();ctx.arc((e.clientX-r.left)*(c.width/r.width),(e.clientY-r.top)*(c.height/r.height),size,0,Math.PI*2);ctx.fill()}
  const memoryData=useMemo<MemoryJarData>(()=>({mode:memoryMode,revealCount,recipientName:who,watermark:true,memories:selected.map((label,i)=>({key:`memory-${i}-${label}`,label,color:colorChoices.find(x=>x[0]===label)?.[1],animal:memoryMode==='animals'?label:undefined,gender:memoryMode==='animals'?(animalGender[label]||'female'):undefined,text:memories[i]?.text||'',caption:memories[i]?.caption||'',attachments:memories[i]?.attachments||[]}))}),[memoryMode,revealCount,who,selected,animalGender,memories]);
  async function addFiles(index:number,files:FileList|null){if(!files?.length)return;setStatus('');try{const current=memories.flatMap(m=>m.attachments);let imageCount=current.filter(a=>a.kind==='image').length,motionCount=current.filter(a=>a.kind!=='image').length;const additions:MemoryAttachment[]=[];for(const file of Array.from(files)){const isGif=file.type==='image/gif',isVideo=file.type.startsWith('video/'),isImage=file.type.startsWith('image/')&&!isGif;if(!isImage&&!isVideo&&!isGif)throw new Error('Use an image, GIF or video file.');if(file.size>10*1024*1024)throw new Error(`${file.name} is larger than 10MB.`);if(isVideo){const d=await videoDuration(file);if(d>30.2)throw new Error(`${file.name} is longer than 30 seconds.`)}if(isImage){if(++imageCount>4)throw new Error('Memory Jar allows up to 4 images in total.')}else{if(++motionCount>4)throw new Error('Memory Jar allows up to 4 videos/GIFs in total.')}additions.push({kind:isVideo?'video':isGif?'gif':'image',name:file.name,dataUrl:await fileToDataUrl(file),caption:''})}setMemories(v=>v.map((m,i)=>i===index?{...m,attachments:[...m.attachments,...additions]}:m));}catch(e){setStatus(e instanceof Error?e.message:'Could not add attachment.')}}
  function removeAttachment(mi:number,ai:number){setMemories(v=>v.map((m,i)=>i===mi?{...m,attachments:m.attachments.filter((_,j)=>j!==ai)}:m))}
  async function shareLetter(){
    const url=new URL('/studio/letter-preview',window.location.origin);
    const json=JSON.stringify({template,text,signOff});
    try{url.hash=await encodeMemoryLink(json)}catch{url.hash=encodeURIComponent(json)}
    if(url.hash.length>16001){setStatus('Shorten your letter to create a shareable link.');return}
    setShareUrl(url.href);
    try{await navigator.clipboard.writeText(url.href);setStatus('Link copied. Anyone with the link can read the letter.')}
    catch{setStatus('Copy your shareable link below.')}
  }
  async function shareGuestJar(){
    if(!jarReady)return;
    setShareUrl('');
    if(memoryData.memories.some(memory=>memory.attachments?.length)){
      setStatus('Guest links can carry written memories. Photos and videos stay on this device.');
      return;
    }
    const url=new URL('/studio/memory-preview',window.location.origin);
    const json=JSON.stringify(memoryData);
    if(json.length>16000){setStatus('Shorten the written memories to fit in a shareable link.');return}
    try{url.hash=await encodeMemoryLink(json)}catch{url.hash=encodeURIComponent(json)}
    if(url.href.length>16000){setStatus('Shorten the written memories to fit in a shareable link.');return}
    setShareUrl(url.href);
    try{await navigator.clipboard.writeText(url.href);setStatus('Link copied. Anyone with the link can open it.')}
    catch{setStatus('Your link is ready below. Anyone with the link can open it.')}
  }
  async function publishMemory(){setShareBusy(true);setStatus('');try{if(selected.length<1)throw new Error('Choose at least one colour or animal first.');const created=await api<{id:string;shareId:string}>('/api/studio',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({personId:q.get('personId')||null,title:`Memory Jar for ${who}`,theme:'memory-jar',blocks:[{type:'memory_jar',payload:memoryData,approved:true}],allowDownload:false})});const published=await api<{recipientUrl:string}>(`/api/studio/${created.id}/publish`,{method:'POST'});const url=published.recipientUrl.startsWith('http')?published.recipientUrl:`${window.location.origin}${published.recipientUrl}`;setShareUrl(url);await navigator.clipboard?.writeText(url).catch(()=>{});setStatus('Private URL created and copied.');return url}catch(e){setStatus(e instanceof Error?e.message:'Could not create private URL.');return ''}finally{setShareBusy(false)}}

  const body=useMemo(()=>{
    if(slug==='memory-jar')return jarStep===1?<Card><Eyebrow>1 · Build the jar</Eyebrow><h2 className="font-serif text-3xl text-wine dark:text-cream">What should be inside?</h2><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={memoryMode==='colors'?buttonClass:softButton} onClick={()=>{setMemoryMode('colors');setSelected([])}}>Colour heart balls</button><button type="button" className={memoryMode==='animals'?buttonClass:softButton} onClick={()=>{setMemoryMode('animals');setSelected([])}}>Animal portraits</button></div><p className="mt-4 text-sm text-cocoa">{memoryMode==='animals'?'Choose four animals.':'Choose four heart colours.'}</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{(memoryMode==='colors'?colorChoices.map(x=>x[0]):animalChoices).map(v=><button type="button" key={v} onClick={()=>toggle(v)} className={`memory-choice-card ${selected.includes(v)?'active':''}`}>{memoryMode==='colors'?<span className="studio-heart-swatch" style={{'--swatch':colorChoices.find(x=>x[0]===v)?.[1]} as React.CSSProperties}>♥</span>:<img src={`/studio/animals/female-${v.toLowerCase()}.webp`} alt="" loading="lazy" decoding="async"/>}<b>{v}</b></button>)}</div>{memoryMode==='animals'&&selected.length>0&&<div className="mt-5 grid gap-3 sm:grid-cols-2">{selected.map(v=><div className="animal-gender-row" key={v}><span><img src={v==='Giraffe'&&(animalGender[v]||'female')==='male'?'/studio/animals/male-giraffee.webp':`/studio/animals/${(animalGender[v]||'female')}-${v.toLowerCase()}.webp`} alt=""/><b>{v}</b></span><div><button type="button" className={(animalGender[v]||'female')==='female'?'active':''} onClick={()=>setAnimalGender(g=>({...g,[v]:'female'}))}>Female</button><button type="button" className={animalGender[v]==='male'?'active':''} onClick={()=>setAnimalGender(g=>({...g,[v]:'male'}))}>Male</button></div></div>)}</div>}<div className="mt-5 max-w-xs"><Field label="Recipient may reveal"><select className={inputClass} value={revealCount} onChange={e=>setRevealCount(Number(e.target.value))}><option value={1}>1 memory</option><option value={2}>2 memories</option></select></Field></div><button type="button" className={buttonClass+" mt-4"} disabled={selected.length!==4} onClick={()=>setJarStep(2)}>Next</button></Card>:<Card><button type="button" className={softButton+" mb-4"} onClick={()=>setJarStep(1)}>Back</button><Eyebrow>2 · Add memories + attachments</Eyebrow><p className="mt-2 text-sm text-cocoa">Each chosen heart/animal can hold text plus private media.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{Array.from({length:Math.max(selected.length,1)},(_,i)=>{const m=memories[i];return <div key={i} className="memory-edit-card"><b>{selected[i]||`Memory ${i+1}`}</b><textarea className={`${inputClass} mt-3 min-h-28`} value={m.text} onChange={e=>setMemories(v=>v.map((x,j)=>j===i?{...x,text:e.target.value}:x))} placeholder={['Remember when we laughed so hard on the way home?', 'I still think about the morning you brought me coffee.', 'My favourite part of that trip was watching the sunset with you.', 'I’ll always remember how you showed up for me that day.'][i]}/><label className="memory-upload-button"><input type="file" multiple accept="image/*,video/*" onChange={e=>{void addFiles(i,e.target.files);e.currentTarget.value=''}}/><span>＋ Add photo, GIF or video (video/GIF max 10MB)</span></label>{m.attachments.length>0&&<div className="memory-attachment-grid">{m.attachments.map((a,ai)=><figure key={`${a.name}-${ai}`}>{a.kind==='video'?<video src={a.dataUrl} muted playsInline/>:<img src={a.dataUrl} alt={a.name}/>}<figcaption>{a.name}<button type="button" onClick={()=>removeAttachment(i,ai)}>×</button></figcaption></figure>)}</div>}</div>})}</div>{status&&<p className="mt-4 rounded-xl bg-petal/50 p-3 text-sm text-wine">{status}</p>}</Card>;
    if(slug==='love-letter'){
      if(letterStep===1)return <Card><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {stationery.map((name,i)=><button type="button" key={name} aria-label={letterTemplateNames[i]} aria-pressed={chosenTemplate&&template===i} onClick={()=>{setTemplate(i);setChosenTemplate(true)}} className="letter-sample"><img src={`/studio/letters/${name}.webp`} alt="" decoding="async"/></button>)}
      </div><button type="button" className={buttonClass+' mt-4'} disabled={!chosenTemplate} onClick={()=>setLetterStep(2)}>Next</button></Card>;
      if(letterStep===2)return <Card><div className="grid gap-3 sm:grid-cols-2"><Field label="Closing"><input className={inputClass} maxLength={60} value={closing} onChange={e=>setClosing(e.target.value)} placeholder="With love,"/></Field><Field label="Signature"><input className={inputClass} maxLength={60} value={signature} onChange={e=>setSignature(e.target.value)} placeholder="Your name" disabled={anonymous}/></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)}/> Sign anonymously</label></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={softButton} onClick={()=>setLetterStep(1)}>Back</button><button type="button" className={buttonClass} disabled={!anonymous&&!signature.trim()} onClick={()=>setLetterStep(3)}>Continue to writing</button></div></Card>;
      return <><button type="button" className={softButton} onClick={()=>setLetterStep(2)}>Edit signature</button><Card className={`letter-writing-world letter-template-${template}`}><div className="letter-writing-overlay"><div className="flex flex-wrap items-center justify-between gap-3"><label className="poem-toggle"><input type="checkbox" checked={poem} onChange={e=>setPoem(e.target.checked)}/><span>Poem mode</span></label></div>{poem&&<div className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Rhyme"><select className={inputClass} value={rhyme} onChange={e=>setRhyme(e.target.value)}>{['free verse','AABB','ABAB','ABCB','couplets'].map(value=><option key={value}>{value}</option>)}</select></Field><Field label="Stanzas"><select className={inputClass} value={stanzas} onChange={e=>setStanzas(e.target.value)}>{['2','3','4','5','6','custom'].map(value=><option key={value}>{value}</option>)}</select></Field></div></div>}<div className="letter-writing-center"><textarea aria-label={poem ? "Poem" : "Letter"} className="letter-writing-area" maxLength={2000} value={text} onChange={e=>setText(e.target.value)} placeholder={poem?`Begin stanza 1 · ${rhyme}…`:'Dear…'}/></div></div></Card></>;
    }
    if(slug==='art4u')return <Card><Eyebrow>Art4U editor</Eyebrow><h2 className="font-serif text-3xl text-wine dark:text-cream">Draw it yourself. Raw is allowed.</h2><div className="mt-4 flex flex-wrap gap-2"><input type="color" value={brush} onChange={e=>setBrush(e.target.value)} className="h-11 w-14"/><input type="range" min="2" max="24" value={size} onChange={e=>setSize(Number(e.target.value))}/><button type="button" className={softButton} onClick={()=>{const c=canvas.current;c?.getContext('2d')?.clearRect(0,0,c.width,c.height)}}>Erase all</button>{signedIn ? <button type="button" className="studio-pro-button" onClick={()=>alert('AI drawing assistance is Pro. Uploads are intentionally disabled in Art4U.')}>♥ PRO · Draw with AI</button> : <Link href="/login" className="studio-pro-button">♥ PRO · Draw with AI</Link>}</div><canvas ref={canvas} width={1200} height={700} onPointerMove={e=>{if(e.buttons)draw(e)}} onPointerDown={draw} className="mt-4 aspect-[12/7] w-full touch-none rounded-card border border-wine/10 bg-white shadow-inner"/><p className="mt-2 text-xs text-cocoa/55">No uploads. Draw, erase and edit here so the result stays personal.</p></Card>;
    return null;
  },[letterStep,chosenTemplate,jarStep,slug,tool,who,memoryMode,selected,revealCount,memories,template,poem,text,rhyme,stanzas,closing,signature,anonymous,brush,size,animalGender,status,signedIn]);

  return <div className="studio-editor-layout"><aside className="studio-editor-nav"><Link href="/studio" className={softButton}>← Studio</Link><h1 className="mt-3 font-serif text-3xl text-wine dark:text-cream">{tool.name}</h1></aside><main className="min-w-0 space-y-5">{body}{(slug==='memory-jar'?(jarStep===2&&jarReady):slug==='love-letter'?(letterStep===3&&Boolean(text.trim())):true)&&<Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Eyebrow>Finish</Eyebrow><p className="text-sm text-cocoa">Preview your creation before sharing. </p></div><div className="flex flex-wrap gap-2">{(slug === "love-letter" || slug === "art4u") && <button type="button" className={softButton} onClick={downloadCreation} disabled={slug === "love-letter" && !text.trim()}>Download PNG</button>}<button type="button" className={buttonClass} onClick={()=>{setShareUrl('');setStatus('');setPreview(true)}}>Preview final</button></div></div></Card>}</main>{preview&&<div className="studio-preview-backdrop" onClick={()=>setPreview(false)}><div className="studio-preview studio-preview-wide" onClick={e=>e.stopPropagation()}><button className="float-right text-xl" onClick={()=>setPreview(false)}>×</button><Eyebrow>Live recipient preview</Eyebrow>{slug==='memory-jar'?<><MemoryJarExperience data={memoryData}/><div className="mt-5 flex flex-wrap gap-2">{signedIn ? <><button type="button" className={buttonClass} onClick={()=>void publishMemory()} disabled={shareBusy}>{shareBusy?'Creating private link…':'Share private URL · Free'}</button></> : <button type="button" className={buttonClass} onClick={shareGuestJar}>Copy shareable link</button>}{shareUrl&&<a className={softButton} href={shareUrl} target="_blank" rel="noreferrer">Open delivery ↗</a>}</div>{shareUrl&&<input readOnly className={`${inputClass} mt-3`} value={shareUrl}/>} {status&&<p className="mt-3 text-sm text-wine">{status}</p>}</>:<><h2 className="mt-3 font-serif text-4xl text-wine">{tool.name} for {who}</h2><LetterPreview template={template} signOff={signOff} text={text || "Your creation will appear here as the recipient sees it."}/>{slug==='love-letter'&&<div className="mt-4 space-y-3"><button type="button" className={softButton} onClick={shareLetter}>Copy shareable link</button>{shareUrl&&<input aria-label="Shareable letter link" readOnly className={inputClass} value={shareUrl} onFocus={e=>e.target.select()}/>}<p role="status">{status}</p></div>}</>}</div></div>}</div>
}
