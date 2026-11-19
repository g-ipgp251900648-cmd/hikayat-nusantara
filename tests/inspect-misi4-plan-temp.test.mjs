import test from 'node:test';
import {readFileSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
test('Inspect original Misi4 plan and rehearsal API contract',()=>{
 const t=brotliDecompressSync(Buffer.from(readFileSync('mission-four-ai-source.tar.br.b64','utf8').trim(),'base64'));
 let pos=0;while(pos+512<=t.length){
  const h=t.subarray(pos,pos+512);if(h.every(x=>!x))break;
  const str=(a,b)=>h.subarray(a,b).toString('utf8').split('\0')[0];
  const name=str(0,100),len=parseInt(str(124,136).trim()||'0',8);
  if(name==='src/App.tsx'||name==='server.ts'){
   const l=t.subarray(pos+512,pos+512+len).toString('utf8').split('\n');
   const ranges=name==='src/App.tsx'?[[330,377]]:[[165,302]];
   console.log('EXACT',name);
   for(const [a,b] of ranges)console.log(l.slice(a-1,b).map((x,i)=>String(a+i)+': '+x).join('\n'));
  }
  pos+=512+Math.ceil(len/512)*512;
 }
});