export async function encodeMemoryLink(json: string) {
  if (typeof CompressionStream === 'undefined') return encodeURIComponent(json);
  const bytes = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const packed = new Uint8Array(await new Response(bytes).arrayBuffer());
  return 'z.' + btoa(Array.from(packed, byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export async function decodeMemoryLink(fragment: string) {
  if (!fragment.startsWith('z.')) return decodeURIComponent(fragment);
  const binary = atob(fragment.slice(2).replaceAll('-', '+').replaceAll('_', '/'));
  const packed = Uint8Array.from(binary, char => char.charCodeAt(0));
  const reader = new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const decoder = new TextDecoder();
  let output = '';
  while (true) {
    const {done, value} = await reader.read();
    if (done) return output + decoder.decode();
    output += decoder.decode(value, {stream: true});
    if (output.length > 16000) {
      await reader.cancel();
      throw new Error('Memory Jar link is too large');
    }
  }
}
