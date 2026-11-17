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
import { execFileSync } from 'node:child_process';
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
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','mission-one-ai/vite.config.ts'],{stdio:'inherit'});
