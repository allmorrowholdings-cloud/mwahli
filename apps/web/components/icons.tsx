import * as React from 'react';
const p=(d:string)=> <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>;
export const Icon=({name,className='h-5 w-5'}:{name:string;className?:string})=>{
 const paths:Record<string,string>={
  home:'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  spark:'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9zM5 15l.8 1.7L7.5 17.5l-1.7.8L5 20l-.8-1.7-1.7-.8 1.7-.8z',
  calendar:'M5 3v4M19 3v4M3 9h18M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2z',
  gift:'M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7H7.5A2.5 2.5 0 1 1 10 4.5c0 1.4 2 2.5 2 2.5zM12 7h4.5A2.5 2.5 0 1 0 14 4.5C14 5.9 12 7 12 7z',
  care:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  archive:'M3 6h18M5 6v15h14V6M8 10h8M10 14h4',
  moon:'M21 12.8A8 8 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8z',
  menu:'M4 6h16M4 12h16M4 18h16',
  arrow:'M5 12h14M14 7l5 5-5 5',
  shield:'M12 3l8 4v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V7zM9 12l2 2 4-4',
  lock:'M6 10h12v10H6zM8 10V7a4 4 0 0 1 8 0v3'
 };
 return <svg viewBox="0 0 24 24" className={className} aria-hidden="true">{p(paths[name]||paths.spark)}</svg>
}
