'use client';

import {useEffect,useState} from 'react';
import {z} from 'zod';
import {LetterPreview,stationery} from '@/components/letter-preview';
import {decodeMemoryLink} from '@/lib/memory-link';
import {softButton} from '@/components/client-kit';

const sharedLetter=z.object({
  template:z.number().int().min(0).max(stationery.length-1),
  text:z.string().min(1).max(2000).refine(value=>Boolean(value.trim())),
  signOff:z.string().max(121)
});

export default function SharedLetterPage(){
  const [letter,setLetter]=useState<z.infer<typeof sharedLetter>|null>(null);
  const [status,setStatus]=useState('Opening your letter…');
  const [reading,setReading]=useState(false);
  const [supportsSpeech,setSupportsSpeech]=useState(false);

  useEffect(()=>{
    setSupportsSpeech('speechSynthesis' in window);
    async function openLetter(){
      try {
        const hash=window.location.hash.slice(1);
        if(hash.length>16000)throw new Error();
        setLetter(sharedLetter.parse(JSON.parse(await decodeMemoryLink(hash))));
        setStatus('');
      } catch {
        setStatus('This letter link is incomplete or invalid.');
      }
    }
    void openLetter();
    return ()=>window.speechSynthesis?.cancel();
  },[]);

  function readAloud(){
    if(!letter||!supportsSpeech)return;
    if(reading){
      window.speechSynthesis.cancel();
      setReading(false);
      return;
    }
    const speech=new SpeechSynthesisUtterance([letter.text,letter.signOff].filter(Boolean).join('\n\n'));
    speech.onend=()=>setReading(false);
    speech.onerror=event=>{
      setReading(false);
      if(event.error!=='canceled'&&event.error!=='interrupted')setStatus('Your browser could not read this letter aloud.');
    };
    setStatus('');
    setReading(true);
    window.speechSynthesis.speak(speech);
  }

  return <main className="mx-auto max-w-3xl px-4 py-8">
    {letter&&<>
      {supportsSpeech&&<div className="mb-4 flex justify-end">
        <button type="button" className={softButton} aria-label={reading?'Stop reading':'Read aloud'} title={reading?'Stop reading':'Read aloud'} onClick={readAloud}>
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4z"/>
            {reading?<path d="m16 9 6 6m0-6-6 6"/>:<path d="M15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>}
          </svg>
        </button>
      </div>}
      <LetterPreview {...letter}/>
    </>}
    {status&&<p role="status">{status}</p>}
  </main>;
}
