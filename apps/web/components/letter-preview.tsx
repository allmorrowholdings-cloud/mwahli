import {useEffect,useRef,useState} from 'react';

export const stationery = ['romantic-classic','soft-morning','midnight-letter','joy-confetti','quiet-comfort'];
const ink = ['#6f173a','#6f173a','#f4d98f','#6f173a','#425346'];

export async function renderLetter(canvas: HTMLCanvasElement, template: number, text: string, signOff: string) {
  const paper = new Image();
  paper.src = `/studio/letters/${stationery[template]}.webp`;
  await paper.decode();
  canvas.width = paper.naturalWidth;
  canvas.height = paper.naturalHeight;
  const {width,height} = canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  ctx.drawImage(paper, 0, 0);
  ctx.fillStyle = ink[template];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fontSize = Math.round(width * .034);
  const maxWidth = width * .61;
  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n');
  let lines: string[];
  do {
    ctx.font = `${fontSize}px Georgia, serif`;
    lines = [];
    for (const paragraph of paragraphs) {
      let line = '';
      for (const word of paragraph.split(/(\s+)/)) {
        if (ctx.measureText(line + word).width <= maxWidth) {
          line += word;
          continue;
        }
        if (line.trim()) lines.push(line.trimEnd());
        line = word.trimStart();
        if (ctx.measureText(line).width <= maxWidth) continue;
        const letters = Array.from(line);
        line = '';
        for (const letter of letters) {
          if (ctx.measureText(line + letter).width > maxWidth) {
            lines.push(line);
            line = '';
          }
          line += letter;
        }
      }
      lines.push(line.trimEnd());
    }
    if (lines.length * fontSize * 1.45 <= height * .54) break;
    fontSize = Math.min(fontSize - 1, Math.floor(height * .54 / (lines.length * 1.45)));
  } while (fontSize > 0);

  const lineHeight = fontSize * 1.45;
  lines.forEach((line,index) => ctx.fillText(line, width / 2, height / 2 + (index - (lines.length - 1) / 2) * lineHeight, maxWidth));
  ctx.font = `${Math.min(fontSize, Math.round(width * .028))}px Georgia, serif`;
  signOff.split('\n').forEach((line,index)=>ctx.fillText(line,width/2,height*.82+index*width*.039,maxWidth));
}

export function LetterPreview({template,text,signOff}:{template:number;text:string;signOff:string}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Preparing your preview…');
  useEffect(() => {
    if (!canvas.current) return;
    let active = true;
    renderLetter(canvas.current, template, text, signOff).then(
      () => { if (active) setStatus(''); },
      () => { if (active) setStatus('Could not load the chosen stationery.'); }
    );
    return () => { active = false; };
  }, [template, text, signOff]);
  return <>{status && <p role="status">{status}</p>}<canvas ref={canvas} hidden={Boolean(status)} className="letter-preview-canvas" role="img" aria-label={[text,signOff].filter(Boolean).join(' ')}/></>;
}
