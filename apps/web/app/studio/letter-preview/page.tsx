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
    window.speechSynthesis.cancel();
    const speech=new SpeechSynthesisUtterance([letter.text,letter.signOff].filter(Boolean).join('\n\n'));
    speech.onerror=event=>{
      if(event.error!=='canceled'&&event.error!=='interrupted')setStatus('Your browser could not read this letter aloud.');
    };
    setStatus('');
    window.speechSynthesis.speak(speech);
  }

  return <main className="mx-auto max-w-3xl px-4 py-8">
    {letter&&<>
      <LetterPreview {...letter}/>
      {supportsSpeech&&<div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={softButton} onClick={readAloud}>Read aloud</button>
        <button type="button" className={softButton} onClick={()=>window.speechSynthesis.cancel()}>Stop reading</button>
      </div>}
    </>}
    {status&&<p role="status">{status}</p>}
  </main>;
}
