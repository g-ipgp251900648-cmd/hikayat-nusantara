import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { brotliDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT='mission-four-ai';
const EXPECTED_SHA='8bf748b07847b29084688f4466422cb9d2bfb191e02696eb054f072e16ef5ea0';
export async function extractMisiFourSource(){
  const chunks=[];
  for(let i=0;i<11;i++){
    const file='mission-four-ai-transfer/part-'+String(i).padStart(2,'0')+'.txt';
    chunks.push((await readFile(file,'utf8')).trim());
  }
  const encoded=chunks.join('');
  if(!/^[a-zA-Z0-9+/]+={0,2}$/.test(encoded))throw Error('Misi 4: invalid source archive.');
  const compressed=Buffer.from(encoded,'base64');
  if(createHash('sha256').update(compressed).digest('hex')!==EXPECTED_SHA)
    throw Error('Misi 4: source archive checksum mismatch.');
  const tar=brotliDecompressSync(compressed);
  let pos=0,files=0;
  while(pos+512<=tar.length){
    const h=tar.subarray(pos,pos+512);
    if(h.every(b=>b===0))break;
    const c=(a,b)=>h.subarray(a,b).toString('utf8').split('\0')[0];
    const name=c(0,100),size=parseInt(c(124,136).trim()||'0',8),type=h[156];
    if(!name||!Number.isSafeInteger(size)||size<0||!/^[-a-zA-Z0-9_./]+$/.test(name)||name.startsWith('/')||name.split('/').includes('..'))
      throw Error('Misi 4: unsafe source TAR entry.');
    const start=pos+512,end=start+size;
    if(end>tar.length)throw Error('Misi 4: truncated TAR member.');
    if(type===0||type===48){
      const dest=path.join(ROOT,name);
      await mkdir(path.dirname(dest),{recursive:true});
      await writeFile(dest,tar.subarray(start,end));
      files++;
    }else if(type!==53)throw Error('Misi 4: unsupported TAR type.');
    pos=start+Math.ceil(size/512)*512;
  }
  if(files<25)throw Error('Misi 4: incomplete source archive.');
  console.log('[Misi 4] Extracted '+files+' adapted original AI Studio source files.');
}
