import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { brotliDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT='mission-four-ai';
const EXPECTED_SHA='8bf748b07847b29084688f4466422cb9d2bfb191e02696eb054f072e16ef5ea0';
export async function extractMisiFourSource(){
  // One original-game bundle, uploadable to this GitHub branch in a single action.
  const encoded=(await readFile('mission-four-ai-source.tar.br.b64','utf8')).trim();
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
      // Diagnostic only, enabled explicitly in CI to inspect the original
      // recorder-to-submit interface before adding any automatic transfer.
      if(process.env.HN_INSPECT_MISI4==='1'&&name==='src/components/RecordingStudioModal.tsx'){
        const l=tar.subarray(start,end).toString('utf8').split('\n');
        const spans=[[145,218],[448,515],[555,865],[975,1120]];
        for(const [a,b] of spans)for(let n=a;n<=b&&n<=l.length;n++){
          console.log('[M4 DETAIL] '+name+':'+n+' '+l[n-1].slice(0,360));
        }
      }
      if(process.env.HN_INSPECT_MISI4==='1'&&name==='src/App.tsx'){
        const l=tar.subarray(start,end).toString('utf8').split('\n');
        for(let n=1;n<=l.length;n++)if(/RecordingStudioModal|onSubmit|onComplete|HIKAYAT_MISI4_STATUS|submit.*Video|submission/.test(l[n-1])){
          console.log('[M4 APP] '+name+':'+n+' '+l.slice(Math.max(0,n-3),Math.min(l.length,n+3)).join(' // ').slice(0,850));
        }
      }
      if(process.env.HN_INSPECT_MISI4==='1'&&/\.(tsx?|jsx?)$/.test(name)){
        const lines=tar.subarray(start,end).toString('utf8').split('\n');
        let shown=0;
        for(let i=0;i<lines.length&&shown<45;i++){
          if(/MediaRecorder|HIKAYAT_MISI4_STATUS|videoBlob|recordedBlob|handleSubmit|uploadVideo|setRecorded|submitRecording|recordedVideo|onSubmit/.test(lines[i])){
            console.log('[M4 SOURCE] '+name+':'+(i+1)+' '+lines.slice(Math.max(0,i-2),Math.min(lines.length,i+3)).join(' // ').slice(0,850));
            shown++;
          }
        }
      }
    }else if(type!==53)throw Error('Misi 4: unsupported TAR type.');
    pos=start+Math.ceil(size/512)*512;
  }
  if(files<25)throw Error('Misi 4: incomplete source archive.');
  console.log('[Misi 4] Extracted '+files+' adapted original AI Studio source files.');
}
