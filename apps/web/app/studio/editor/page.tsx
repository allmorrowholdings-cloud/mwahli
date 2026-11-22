import {AppShell} from '@/components/app-shell';
import {PageWrap} from '@/components/ui';
import {StudioEditorRouter} from '@/components/studio-editor-router';
import {redirect} from 'next/navigation';
import {getSession} from '@/lib/session';
import {studioTools} from '@/lib/studio-tools';

export default async function Page({searchParams}: {searchParams: Promise<{tool?: string | string[]}>}) {
  const {tool} = await searchParams;
  const signedIn = Boolean(await getSession({allowLocalPreview: false}));
  if (tool !== undefined && !studioTools.some(entry => entry.slug === tool)) redirect('/studio');
  return <AppShell guest={!signedIn}><PageWrap><StudioEditorRouter signedIn={signedIn}/></PageWrap></AppShell>;
}
