import Link from 'next/link';import {Brand} from '@/components/brand';
import {getSession} from '@/lib/session';
import '../public/brand/homepage.css';
const studioActions = [
  ['Write a Letter', '/studio/editor?tool=love-letter'],
  ['Share a Memory', '/studio/editor?tool=memory-jar'],
  ['Record Voice', '/studio/editor?tool=voice-capsule'],
  ['Draw & Share', '/studio/editor?tool=art4u'],
] as const;
const featureCards=[
  ['Keeps','Private memories. Beautifully kept.','/brand/mwahli-card-keeps.webp'],
  ['Capsule','Send a moment to the future.','/brand/mwahli-card-capsule.webp'],
  ['Together','Love is better, together.','/brand/mwahli-card-together.webp'],
  ['Creators','Commission something unique.','/brand/mwahli-card-creators.webp'],
  ['Care','Show up beyond gifts.','/brand/mwahli-card-care.webp'],
  ['Gifts','Thoughtfully curated.','/brand/mwahli-card-gifts.webp']
];
export default async function Landing(){
const signedIn = Boolean(await getSession({allowLocalPreview: false}));

return <main className="mwahli-cinematic">
<header className="mwahli-public-nav"><Brand href={signedIn ? "/home" : "/"}/><div className="nav-actions">{!signedIn && <Link href="/login">Sign in</Link>}<Link className="send-love" href="/studio">Send Love ♥</Link></div></header>
<section className="cinematic-hero mwahli-textured">
  <div className="hero-copy-new"><h1>Love,<br/><em>made</em><br/>intentional.</h1><p>Make something. Send something.<br/>Show up for them.</p><div className="hero-actions"><Link href="/studio" className="primary-love">Start with a person ♥</Link></div><div className="hero-proof"><span>Private by design</span><span>Secure & encrypted</span><span>Made with care</span></div></div>
  <img className="home-hero-art" fetchPriority="high" src="/brand/mwahli-envelope-hero.webp" alt="Cream envelope wrapped in a burgundy ribbon with a jeweled heart"/>
</section>
<section className="home-studio" aria-label="MWAHLI Studio">
  <h2>Turn words, memories, voice and private media into a recipient experience.</h2>
  <nav className="home-studio-stack" aria-label="Studio tools">
    {studioActions.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
  </nav>
</section>
<section className="emotion-grid">{featureCards.map(([t,d,img])=><article className="emotion-card" key={t}><div className="emotion-photo"><img src={img} alt="" loading="lazy" decoding="async"/></div><div className="emotion-copy"><span>{t}</span><b>{d}</b></div></article>)}</section>
<footer className="mwahli-footer"><div><Brand href={signedIn ? "/home" : "/"}/><p>Love is the attention we choose to give.</p></div><div className="footer-values"><span>Private by design</span><span>Encrypted & secure</span><span>Made with care</span><span>Global delivery</span></div><small>A platform by ALLMORROW</small></footer>
</main>}
