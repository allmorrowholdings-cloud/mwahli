import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const previewRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(previewRoot);
const brandRoot = path.join(projectRoot,'apps','web','public','brand');
const publicRoot = path.join(projectRoot,'apps','web','public');
const types = {
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
  '.ico':'image/x-icon','.webp':'image/webp'
};

function safeJoin(base, rel){
  const p = path.normalize(path.join(base, rel));
  return p.startsWith(base) ? p : null;
}
const server = http.createServer((req,res)=>{
  const url = new URL(req.url,'http://localhost');
  let file;
  if(url.pathname.startsWith('/brand/')){
    file=safeJoin(brandRoot,url.pathname.slice('/brand/'.length));
  } else if(url.pathname==='/mwahli-mark.svg'){
    file=path.join(publicRoot,'mwahli-mark.svg');
  } else {
    file=safeJoin(previewRoot,url.pathname==='/'?'index.html':url.pathname.slice(1));
  }
  if(!file) return res.writeHead(403).end('Forbidden');
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404).end('Not found');return;}
    res.setHeader('Content-Type',types[path.extname(file).toLowerCase()]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.setHeader('Pragma','no-cache');
    res.end(data);
  });
});
server.listen(4173,'0.0.0.0',()=>console.log('MWAHLI v1.4 cinematic preview: http://localhost:4173'));
