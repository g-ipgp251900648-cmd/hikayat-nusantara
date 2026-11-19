import test from 'node:test';
import {readFileSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
test('Inspect Misi4 media submission points for safe integration',()=>{
  const b=Buffer.from(readFileSync('mission-four-ai-source.tar.br.b64','utf8').trim(),'base64');
  const t=brotliDecompressSync(b);let pos=0;
  while(pos+512<=t.length){
    const h=t.subarray(pos,pos+512);
    if(h.every(x=>!x))break;
    const str=(a,b)=>h.subarray(a,b).toString('utf8').split('\0')[0];
    const name=str(0,100),len=parseInt(str(124,136).trim()||'0',8);
    const bytes=t.subarray(pos+512,pos+512+len);
    if(/\.(jsx?|tsx?|json|html)$/.test(name)){
      const txt=bytes.toString('utf8');
      const lines=txt.split('\n');
      const match=lines.map((v,i)=>/submit|hantar|send|MediaRecorder|recording|videoBlob|videoUrl|videoFile|ondataavailable|storage|upload|referenceNo|onSubmit|FormData|camera|getUserMedia|URL\.createObjectURL/i.test(v)?i:-1).filter(i=>i>=0);
      if(['src/App.tsx','src/components/SubmissionHallModal.tsx','src/game/misi4Logic.ts'].includes(name)){
        const areas=name==='src/App.tsx'?[[120,222],[370,430],[780,816]]:
          name==='src/components/SubmissionHallModal.tsx'?[[12,65],[95,210],[235,265]]:
          [[70,102]];
        console.log('RELEVANTFILE',name);
        for(const [first,last] of areas){
          console.log('RANGE',first,last);
          console.log(lines.slice(first-1,last).map((v,i)=>(first+i)+': '+v).join('\n'));
        }
      }
      if(match.length){
        console.log('INSPECTFILE',name,'lines',lines.length,'matches',match.length);
        for(const i of match.slice(0,45)){
          console.log('  SOURCE',i+1,lines.slice(Math.max(0,i-1),Math.min(lines.length,i+2)).join(' | ').slice(0,600));
        }
      }
    }
    pos+=512+Math.ceil(len/512)*512;
  }
});