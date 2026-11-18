import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { join, dirname } from 'node:path';

// Source from the user's ORIGINAL Google AI Studio Misi 3 ZIP; compressed only
// to transfer as one binary file through the GitHub web upload interface.
// This retains the original TSX, game data, art generation and minigame logic.
const ARCHIVE = 'mission-three-ai-original.tar.br';
const ROOT = 'mission-three-ai';
function cString(buffer) { return buffer.toString('utf8').split('\0',1)[0]; }
export async function extractMisiThreeSource() {
  if(!existsSync(ARCHIVE)){
    if(existsSync(join(ROOT,'src/App.tsx'))&&existsSync(join(ROOT,'vite.config.ts'))){
      console.log('[Misi 3] Existing original source detected; archive not needed.');
      return;
    }
    throw new Error('[Misi 3] Original Google AI Studio source archive is missing. Upload mission-three-ai-original.tar.br to the GitHub branch root before deployment.');
  }
  const compressed=await readFile(ARCHIVE);
  const archive=brotliDecompressSync(compressed);
  await mkdir(ROOT,{recursive:true});
  let offset=0,count=0;
  while(offset+512<=archive.length){
    const header=archive.subarray(offset,offset+512);
    if(header.every(byte=>byte===0))break;
    const name=cString(header.subarray(0,100));
    const sizeStr=cString(header.subarray(124,136)).trim();
    const size=parseInt(sizeStr||'0',8);
    const type=header[156];
    if(!name||!Number.isSafeInteger(size)||size<0||!/^[-a-zA-Z0-9_./]+$/.test(name)||name.split('/').includes('..')||name.startsWith('/'))
      throw new Error('[Misi 3] Invalid or unsafe TAR member.');
    const start=offset+512,end=start+size;
    if(end>archive.length)throw new Error('[Misi 3] Truncated source TAR.');
    const dest=join(ROOT,name);
    if(type===53){await mkdir(dest,{recursive:true});}
    else if(type===0||type===48){
      await mkdir(dirname(dest),{recursive:true});
      await writeFile(dest,archive.subarray(start,end));
      count++;
    } else throw new Error('[Misi 3] Unsupported TAR entry type for '+name);
    offset=start+Math.ceil(size/512)*512;
  }
  if(count<20||!existsSync(join(ROOT,'src/App.tsx'))||!existsSync(join(ROOT,'vite.config.ts')))
    throw new Error('[Misi 3] Source archive incomplete: '+count+' files.');
  console.log('[Misi 3] Extracted '+count+' original AI Studio source files.');
}
