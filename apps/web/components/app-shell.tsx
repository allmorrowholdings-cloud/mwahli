'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Brand} from './brand';
import {ThemeToggle} from './theme-toggle';
import {Icon} from './icons';

const nav=[['/home','Home','home'],['/people','People','people'],['/studio','Studio','spark'],['/gifts','Gifts','gift'],['/keeps','Keeps','archive']] as const;
const exploreGroups=[
  {label:'Create & celebrate',items:[['/muse','Ask Muse','Thoughtful ideas from your context'],['/together','Together','Create with family and friends'],['/creators','Creators','Commission a human-made piece'],['/capsule','Capsule','Schedule something for later']]},
  {label:'Send & support',items:[['/local','Local fulfilment','Make it happen near them'],['/care','Care','Meals, rides, errands and check-ins'],['/surprise','Surprise','Ask for a detail without spoiling it']]},
  {label:'Recipient tools',items:[['/id','Gift ID','Preferences with selective sharing'],['/exchange','Exchange','Change a gift quietly'],['/receipt','Gift receipt','Private service and repair'],['/loop','Loop','Keep, repair, donate or regift']]}
] as const;
const accountItems=[['/orders','Orders','Purchases and delivery'],['/settings','Settings','Privacy, identity and notifications']] as const;

export function AppShell({children, guest = false}:{children:React.ReactNode; guest?: boolean}){
  const path=usePathname();
  if (guest) return <div className="min-h-screen">
    <header className="mwahli-app-header bg-[#170c13] text-cream">
      <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-5 py-4 lg:px-8">
        <Brand href="/"/>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/studio">Studio</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </div>
    </header>
    {children}
  </div>;
  return <div className="min-h-screen pb-24 lg:pb-0">
    <header className="sticky top-0 z-40 mwahli-app-header border-b border-white/10 bg-[#170c13]/95 text-cream backdrop-blur-xl">
      <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-5 py-4 lg:px-8">
        <Brand/>
        <nav className="hidden items-center gap-1 lg:flex">{nav.map(([href,label,icon])=><Link key={href} href={href} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${path===href?'bg-wine text-cream':'text-cream/65 hover:bg-white/7 hover:text-cream'}`}><Icon name={icon}/>{label}</Link>)}</nav>
        <div className="flex items-center gap-2">
          <Link href="/muse" className="hidden rounded-full bg-honey-light px-4 py-3 text-sm font-semibold text-wine sm:inline-flex">Ask Muse</Link>
          <details className="group relative">
            <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full border border-white/10 bg-white/5 text-cream" aria-label="Explore MWAHLI"><span className="text-lg leading-none">•••</span></summary>
            <div className="absolute right-0 mt-3 w-[min(92vw,26rem)] rounded-[1.5rem] border border-wine/10 bg-cream p-3 shadow-soft dark:border-white/10 dark:bg-night">
              <div className="px-2 pb-2"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-rose">Explore MWAHLI</p><p className="mt-1 text-xs text-cocoa/65 dark:text-cream/45">Only the tools you use as a customer. Workspaces appear when your role needs them.</p></div>
              <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">{exploreGroups.map(group=><section key={group.label}><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-cocoa/50 dark:text-cream/35">{group.label}</p><div className="grid gap-1">{group.items.map(([href,label,desc])=><Link key={href} href={href} className={`rounded-xl px-3 py-2.5 transition ${path===href?'bg-wine text-cream':'text-cocoa hover:bg-petal dark:text-cream/70 dark:hover:bg-white/5'}`}><span className="block text-sm font-semibold">{label}</span><span className={`mt-0.5 block text-[11px] ${path===href?'text-cream/60':'text-cocoa/50 dark:text-cream/35'}`}>{desc}</span></Link>)}</div></section>)}</div>
            </div>
          </details>
          <ThemeToggle/>
          <details className="group relative">
            <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full bg-gradient-to-br from-[#C83E62] to-[#7A1F43] text-sm font-bold text-cream" aria-label="Account menu">P</summary>
            <div className="absolute right-0 mt-3 w-64 rounded-[1.4rem] border border-wine/10 bg-cream p-2 shadow-soft dark:border-white/10 dark:bg-night"><p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.18em] text-rose">Your account</p>{accountItems.map(([href,label,desc])=><Link key={href} href={href} className="block rounded-xl px-3 py-3 text-cocoa hover:bg-petal dark:text-cream/70 dark:hover:bg-white/5"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-[11px] opacity-55">{desc}</span></Link>)}</div>
          </details>
        </div>
      </div>
    </header>
    <main>{children}</main>
    <nav className="fixed bottom-3 left-3 right-3 z-50 grid grid-cols-5 rounded-[1.6rem] border border-wine/10 bg-cream/95 p-2 shadow-soft backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-night/95">{nav.map(([href,label,icon])=><Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.2rem] text-[11px] font-medium ${path===href?'bg-wine text-cream':'text-cocoa dark:text-cream/70'}`}><Icon name={icon}/><span>{label}</span></Link>)}</nav>
  </div>
}
