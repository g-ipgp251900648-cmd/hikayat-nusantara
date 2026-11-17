import { mkdir, copyFile, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'world3d.js', 'student-map3d.js', 'student-activities.js', 'mission-one-ai-bridge.js']) {
  await copyFile(file, 'dist/' + file);
}
console.log('Hikayat Nusantara: binaan statik tersedia dalam dist/');

/* Build the user's original Google AI Studio React/Three.js game.
   Binary illustrations are committed as base64 text so GitHub's content API
   can preserve them; decode images locally before bundling with Vite. */
import { spawnSync } from 'node:child_process';
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
const result=spawnSync(process.execPath,
  ['node_modules/vite/bin/vite.js','build','--config','mission-one-ai/vite.config.ts'],
  {encoding:'utf8',maxBuffer:20*1024*1024,env:process.env}
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
