import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=process.cwd();let failed=false;const errors=[];
function walk(d){let out=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.next','.expo','.git'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())out=out.concat(walk(p));else out.push(p)}return out}
const files=walk(root);
for(const f of files.filter(x=>x.endsWith('.json'))){try{JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){errors.push(`JSON ${path.relative(root,f)}: ${e.message}`)}}
for(const f of files.filter(x=>/\.(mjs|js)$/.test(x))){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0)errors.push(`JS ${path.relative(root,f)}: ${r.stderr||r.stdout}`)}
const source=files.filter(x=>/\.(tsx?|mjs|js)$/.test(x));
function resolveLocal(base,spec){const appRoot=base.includes(path.join('apps','mobile'))?path.join(root,'apps/mobile'):path.join(root,'apps/web');const start=spec.startsWith('@/')?path.join(appRoot,spec.slice(2)):path.resolve(path.dirname(base),spec);const tries=[start,start+'.ts',start+'.tsx',start+'.js',start+'.mjs',path.join(start,'index.ts'),path.join(start,'index.tsx'),path.join(start,'index.js')];return tries.some(fs.existsSync)}
const re=/(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g;
for(const f of source){const txt=fs.readFileSync(f,'utf8');for(const m of txt.matchAll(re)){const s=m[1];if((s.startsWith('.')||s.startsWith('@/'))&&!resolveLocal(f,s))errors.push(`IMPORT ${path.relative(root,f)} -> ${s}`)}}
const routeFiles=files.filter(x=>x.endsWith(path.join('route.ts')));const pageFiles=files.filter(x=>x.endsWith(path.join('page.tsx')));
if(routeFiles.length<70)errors.push(`Expected >=70 API routes, found ${routeFiles.length}`);if(pageFiles.length<30)errors.push(`Expected >=30 pages, found ${pageFiles.length}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(JSON.stringify({ok:true,json:files.filter(x=>x.endsWith('.json')).length,jsChecked:files.filter(x=>/\.(mjs|js)$/.test(x)).length,sourceFiles:source.length,apiRoutes:routeFiles.length,pages:pageFiles.length},null,2));
