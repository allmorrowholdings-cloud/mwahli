import {AppShell} from '@/components/app-shell';import {PageWrap} from '@/components/ui';import {StudioBuilder} from '@/components/studio-builder';
import {getSession} from '@/lib/session';

export default async function Page() {
  const signedIn = Boolean(await getSession({allowLocalPreview: false}));
  return <AppShell guest={!signedIn}><PageWrap><StudioBuilder signedIn={signedIn}/></PageWrap></AppShell>;
}
