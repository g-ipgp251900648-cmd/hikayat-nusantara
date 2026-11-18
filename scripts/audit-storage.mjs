import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const roots=['mission-three-ai','mission-four-ai'];
const pattern=/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bcaches\b|\.cookie\b|\bStorageManager\b/g;
async function scan(dir){
  const entries=await readdir(dir,{withFileTypes:true});
  const out=[];
  for(const ent of entries){
    if(ent.name==='node_modules'||ent.name==='dist')continue;
    const p=join(dir,ent.name);
    if(ent.isDirectory())out.push(...await scan(p));
    else if(ent.isFile()&&/\.(ts|tsx|js|jsx|html)$/.test(ent.name)){
      const source=await readFile(p,'utf8');
      const lines=source.split('\n');
      for(let i=0;i<lines.length;i++){
        const line=lines[i];
        if(pattern.test(line))out.push({path:p,line:i+1,hints:[...new Set(line.match(pattern)||[])],sample:line.trim().slice(0,160)});
        pattern.lastIndex=0;
      }
    }
  }
  return out;
}
for(const root of roots) {
  const records=await scan(root);
  console.log('=== '+root+' storage audit: '+records.length+' lines ===');
  for(const hit of records.slice(0,120))console.log(hit.path+':'+hit.line+' ['+hit.hints.join(',')+'] '+hit.sample);
}
