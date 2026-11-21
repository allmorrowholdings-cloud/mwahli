'use client';
import {Icon} from './icons';
export function ThemeToggle(){const toggle=()=>{document.documentElement.classList.toggle('dark');localStorage.setItem('mwahli-theme',document.documentElement.classList.contains('dark')?'dark':'light')};return <button onClick={toggle} className="grid h-11 w-11 place-items-center rounded-full border border-wine/10 bg-white/70 text-wine dark:border-cream/10 dark:bg-white/5 dark:text-cream" aria-label="Toggle light or dark mode"><Icon name="moon"/></button>}
