import { mkdir, copyFile, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'world3d.js', 'student-map3d.js', 'student-activities.js', 'mission-one-ai-bridge.js', 'student-learning-center.js']) {
  await copyFile(file, 'dist/' + file);
}
console.log('Hikayat Nusantara: binaan statik tersedia dalam dist/');

/* Build the user's original Google AI Studio React/Three.js game.
   Binary illustrations are committed as base64 text so GitHub's content API
   can preserve them; decode images locally before bundling with Vite. */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readdir,readFile,writeFile } from 'node:fs/promises';
const imgBase='mission-one-ai/src/assets/images_b64/';
const imgOut='mission-one-ai/src/assets/images/';
await mkdir(imgOut,{recursive:true});
const images=(await readdir(imgBase)).filter(name=>name.endsWith('.jpg.b64'));
if(images.length!==5)throw new Error('Misi 1 memerlukan lima ilustrasi buku asal.');
for(const filename of images){
  const txt=await readFile(imgBase+filename,'utf8');
  const bytes=Buffer.from(txt.trim(),'base64');
  if(bytes.length<1000||bytes[0]!==0xff||bytes[1]!==0xd8)throw new Error('Ilustrasi Misi 1 tidak sah: '+filename);
  await writeFile(imgOut+filename.slice(0,-4),bytes);
}
// Keep actionable errors at the end of Render logs instead of only an opaque execFileSync stack.
console.log('[Misi 1] Building original Google AI Studio game with Node',process.version);
// Render can retain a cache with no Vite installed. A hard-coded path to
// node_modules/vite/bin/vite.js then crashes with MODULE_NOT_FOUND.
// Resolve the actual package first; perform an explicit production install
// only if the executable is missing. Keep CI checking this cold-start path.
const viteCandidates = [
  resolve('node_modules/vite/bin/vite.js'),
  resolve('mission-one-ai/node_modules/vite/bin/vite.js'),
  resolve('../node_modules/vite/bin/vite.js'),
];
let viteEntry=viteCandidates.find(path=>existsSync(path));
if(!viteEntry){
  console.log('[Misi 1] Vite is missing; installing production dependencies before building.');
  const npm=process.platform==='win32'?'npm.cmd':'npm';
  const install=spawnSync(npm,['install','--omit=dev','--no-audit','--no-fund'],{
    cwd:process.cwd(),encoding:'utf8',maxBuffer:20*1024*1024,env:process.env
  });
  if(install.stdout)process.stdout.write(install.stdout);
  if(install.stderr)process.stderr.write(install.stderr);
  if(install.error)throw install.error;
  if(install.status!==0)throw new Error('Cannot install production dependencies (npm status '+install.status+').');
  viteEntry=viteCandidates.find(path=>existsSync(path));
}
if(!viteEntry)throw new Error('Vite is unavailable after npm install. Check Render Build Command and Root Directory.');
console.log('[Misi 1] Vite executable located:',viteEntry);
const result=spawnSync(process.execPath,
  [viteEntry,'build','--config','mission-one-ai/vite.config.ts'],
  {cwd:process.cwd(),encoding:'utf8',maxBuffer:20*1024*1024,env:process.env}
);
if(result.stdout)process.stdout.write(result.stdout);
if(result.stderr)process.stderr.write(result.stderr);
if(result.error)throw result.error;
if(result.status!==0){
  const evidence=(result.stderr||result.stdout||'No Vite error message was captured')
    .split(/\r?\n/).filter(Boolean).slice(-24).join('\n');
  console.error('[Misi 1] Vite build failed. Recent diagnostic output:\n'+evidence);
  throw new Error('Original Misi 1 Vite build exited with status '+result.status);
}
console.log('[Misi 1] Build completed and dist/misi1 assets are ready.');
