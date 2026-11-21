import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Love made felt', template: '%s · MWAHLI' },
  description: 'Love made felt',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/brand/mwahli-fav.png', shortcut: '/brand/mwahli-fav.png', apple: '/brand/mwahli-fav.png' },
  applicationName: 'MWAHLI — The Love OS'
};
export const viewport: Viewport = { themeColor: '#211219', colorScheme: 'light dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<script dangerouslySetInnerHTML={{__html:`if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`}} /></body></html>;
}
