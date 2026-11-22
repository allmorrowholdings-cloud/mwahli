"use client";
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {studioTools} from '@/lib/studio-tools';

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

  return <div className="grid gap-4 sm:grid-cols-3">
    {studioTools.map(tool=>{
      const href=toolHref(tool.slug);
      const prefetch=()=>router.prefetch(href);
      return <Link key={tool.slug} href={href} prefetch={false} onPointerEnter={prefetch} onTouchStart={prefetch} onFocus={prefetch} className="studio-tool-card">
        <h2 className="font-serif text-3xl text-wine dark:text-cream">{tool.name}</h2>
      </Link>;
    })}
  </div>;
}
