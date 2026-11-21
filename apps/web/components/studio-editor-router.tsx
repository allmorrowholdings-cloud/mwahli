"use client";
import {useSearchParams} from 'next/navigation';
import {StudioToolEditor} from './studio-tool-editor';
import {studioTools} from '@/lib/studio-tools';
export function StudioEditorRouter({signedIn}: {signedIn: boolean}){const q=useSearchParams();const slug=q.get('tool')||'memory-jar';const safe=studioTools.some(x=>x.slug===slug)?slug:'memory-jar';return <StudioToolEditor key={safe} slug={safe} signedIn={signedIn}/>}
