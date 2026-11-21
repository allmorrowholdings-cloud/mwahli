import {AppShell} from './app-shell';import {Card,CTA,Eyebrow,PageWrap,TrustPill} from './ui';import {modules,ModuleKey} from '@/lib/catalog';
const moduleDetails:Partial<Record<ModuleKey,string[]>>={
 people:['Private notes stay yours.','Shared preferences require consent.','Block and no-contact controls are first-class.'],
 moments:['Just because is always visible.','Granular calendar import.','Timed reminders never auto-send intimate messages.'],
 gifts:['Verified merchant provenance.','Delivery confidence before checkout.','Recipient-controlled delivery details.'],
 local:['Compare ship vs local fulfilment.','Show landed cost and substitution rules.','Keep recipient address away from the sender.'],
 together:['Private contribution amounts.','Vote without endless group chat.','One final delivery and shared Studio room.'],
 creators:['Structured brief and rights.','Milestones and bounded revisions.','Protected payout workflow.'],
 care:['Recipient boundaries first.','Prevent duplicate help.','No medical claims.'],
 keeps:['Private by default.','Recipient chooses save, export or delete.','Access history for sensitive media.'],
 capsule:['Timed unlock and cancellation rules.','Trustee and recovery options.','Idempotent scheduled delivery.'],
 id:['Selective disclosure only.','Fit and allergy fields protected.','No full profile shared with merchants.'],
 surprise:['Reveal the minimum detail.','Honor do-not-surprise settings.','No address disclosure to the sender.'],
 exchange:['Quiet correction before fulfilment.','Sender sees only approved outcome.','No social pressure.'],
 receipt:['Purchase details remain private.','Repair, exchange or credit.','Merchant API ready.'],
 loop:['Keep, exchange, donate, repair, regift or resell.','Recipient controls what sender can see.','Lower shame and waste.'],
 muse:['Always include low-cost options when suitable.','Personal words require sender review.','Ground product claims to real inventory and delivery confidence.']
};
export function ModulePage({name}:{name:ModuleKey}){const m=modules[name];const points=moduleDetails[name]??['Built around the person, not the catalogue.','Designed for mobile and unstable data.','Private, consent-aware and human-approved.'];return <AppShell><PageWrap><div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-end"><div><Eyebrow>{m.kicker}</Eyebrow><h1 className="max-w-4xl font-serif text-5xl leading-[.96] text-wine dark:text-cream sm:text-6xl lg:text-7xl">{m.title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-cocoa dark:text-cream/70">{m.description}</p><div className="mt-7 flex flex-wrap gap-3"><CTA href={name==='muse'?'/muse':'/studio'}>{m.cta}</CTA><TrustPill>Recipient control built in</TrustPill></div></div><Card className="overflow-hidden p-0"><div className="bg-wine p-7 text-cream"><p className="text-xs uppercase tracking-[.2em] text-honey">MWAHLI principle</p><p className="mt-3 font-serif text-3xl leading-tight">The gift is the feeling that someone thought about me.</p></div><div className="space-y-0 divide-y divide-wine/10 dark:divide-white/10">{points.map((x,i)=><div key={x} className="flex gap-4 p-5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-petal text-sm font-bold text-wine dark:bg-white/10 dark:text-honey">0{i+1}</span><p className="pt-1 text-sm leading-6 text-cocoa dark:text-cream/70">{x}</p></div>)}</div></Card></div></PageWrap></AppShell>}
