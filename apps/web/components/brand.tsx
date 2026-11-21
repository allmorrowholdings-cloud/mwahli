import Link from 'next/link';
export function Brand({href='/home'}:{href?:string}) {
  return <Link href={href} className="mwahli-brand mwahli-brand-exact" aria-label="MWAHLI home">
    <img className="mwahli-brand-logo-exact" src="/brand/mwahli-logo-exact-transparent.webp" alt="MWAHLI — Love, made felt."/>
  </Link>
}
