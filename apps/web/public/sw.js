const CACHE='mwahli-public-assets-v3';
const PUBLIC_SHELL=['/','/brand/mwahli-logo-exact-transparent.svg','/brand/mwahli-fav.png','/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const cacheable=request.destination==='style'||request.destination==='script'||request.destination==='image'||request.destination==='font'||PUBLIC_SHELL.includes(url.pathname);
  if(!cacheable)return; // Never cache authenticated HTML, recipient experiences, or private API data.
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}
      return response;
    }catch{
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==='navigate')return (await caches.match('/'))||Response.error();
      return Response.error();
    }
  })());
});
