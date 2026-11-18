import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';

// Original user-provided Google AI Studio ZIP is stored in two immutable
// encoded parts to preserve the complete playable React/Three.js project.
// These are build-time source assets, not API credentials or media recordings.
const PARTS=['mission-four-ai-source/part-01.b64','mission-four-ai-source/part-02.b64'];
const EXPECTED_SHA256='c382c6107b09dbce3c0a3f2fad70ec016d85d387e9f872a5fd03a608e931e875';
function asString(buffer){return buffer.toString('utf8').split('\0')[0];}
export async function extractMisiFourSource(){
  const root='mission-four-ai';
  if(PARTS.some(p=>!existsSync(p))){
    if(existsSync(join(root,'src/App.tsx'))&&existsSync(join(root,'vite.config.ts'))){
      console.log('[Misi 4] Original local source already available.');
      return;
    }
    throw new Error('[Misi 4] Original source archive missing; do not publish a placeholder.');
  }
  const parts=await Promise.all(PARTS.map(path=>readFile(path,'utf8')));
  const encoded=parts.map(x=>x.trim()).join('');
  if(!/^[a-zA-Z0-9+/]+={0,2}$/.test(encoded))throw new Error('[Misi 4] Invalid archive encoding.');
  const br=Buffer.from(encoded,'base64');
  const digest=createHash('sha256').update(br).digest('hex');
  if(digest!==EXPECTED_SHA256)throw new Error('[Misi 4] Archive SHA-256 mismatch.');
  const data=brotliDecompressSync(br);
  let offset=0,files=0;
  while(offset+512<=data.length){
    const header=data.subarray(offset,offset+512);
    if(header.every(b=>b===0))break;
    const name=asString(header.subarray(0,100));
    const rawSize=asString(header.subarray(124,136)).trim();
    const size=parseInt(rawSize||'0',8);
    const type=header[156];
    if(!name||!/^[a-zA-Z0-9_./-]+$/.test(name)||name.startsWith('/')||name.split('/').includes('..')||!Number.isSafeInteger(size)||size<0||size>10000000)
      throw new Error('[Misi 4] Invalid or unsafe archive member.');
    const start=offset+512,end=start+size;
    if(end>data.length)throw new Error('[Misi 4] Truncated archive.');
    if(type===0||type===48){
      const output=join(root,name);
      await mkdir(dirname(output),{recursive:true});
      await writeFile(output,data.subarray(start,end));
      files++;
    }else if(type!==53)throw new Error('[Misi 4] Unsupported TAR member type.');
    offset=start+Math.ceil(size/512)*512;
  }
  if(files<25||!existsSync(join(root,'src/App.tsx'))||!existsSync(join(root,'src/components/RecordingStudioModal.tsx'))||!existsSync(join(root,'vite.config.ts')))
    throw new Error('[Misi 4] Original archive incomplete ('+files+' source files).');
  console.log('[Misi 4] Restored '+files+' original game source files.');
}
