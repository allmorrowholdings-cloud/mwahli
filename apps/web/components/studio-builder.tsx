"use client";
import {surpriseStyles} from '@/lib/surprise-styles';
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

  return <nav aria-label="Studio tools" className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
    {studioTools.map(tool=>{
      const href=toolHref(tool.slug);
      const prefetch=()=>router.prefetch(href);
      return <Link key={tool.slug} href={href} prefetch={false} onPointerEnter={prefetch} onTouchStart={prefetch} onFocus={prefetch} className="w-fit py-2 underline-offset-4 hover:underline focus-visible:underline">
        <h2 className="font-serif text-3xl text-wine dark:text-cream">{tool.name}</h2>
      </Link>;
    })}
    {Object.entries(surpriseStyles).map(([style,name])=>(
      <Link key={style} className="w-fit py-2 underline-offset-4 hover:underline focus-visible:underline" href={'/goodies?style='+style}>
        <h2 className="font-serif text-3xl text-wine dark:text-cream">{name}</h2>
      </Link>
    ))}
  </nav>;
}
