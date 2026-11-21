'use client';

import {useEffect,useState} from 'react';
import {z} from 'zod';
import {MemoryJarExperience,type MemoryJarData} from '@/components/memory-jar-experience';

const jar = z.object({
  mode:z.enum(['colors','animals']),
  revealCount:z.union([z.literal(1),z.literal(2)]),
  recipientName:z.string().optional(),
  memories:z.array(z.object({
    key:z.string(),
    label:z.string(),
    text:z.string(),
    color:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    animal:z.enum(['Bear','Bunny','Cat','Dog','Elephant','Fox','Giraffe','Koala','Lion','Panda','Penguin','Whale']).optional(),
    gender:z.enum(['female','male']).optional()
  })).length(4)
});

export default function MemoryPreviewPage() {
  const [data,setData]=useState<MemoryJarData|null>(null);
  const [status,setStatus]=useState('Opening your Memory Jar…');
  useEffect(()=>{
    try {
      const fragment=window.location.hash.slice(1);
      if(fragment.length>16000)throw new Error();
      setData(jar.parse(JSON.parse(decodeURIComponent(fragment))));
    } catch {
      setStatus('This Memory Jar link is incomplete or invalid.');
    }
  },[]);
  return <main className="mx-auto max-w-4xl px-4 py-8">{data?<MemoryJarExperience data={data}/>:<p role="status">{status}</p>}</main>;
}
