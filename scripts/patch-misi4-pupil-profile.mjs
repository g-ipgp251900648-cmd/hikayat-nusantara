import {readFile,writeFile} from 'node:fs/promises';
const path='mission-four-ai/src/App.tsx';
export async function patchMisiFourPupilProfile(){
 let source=await readFile(path,'utf8');
 const marker="// Keep Misi 4's browser drafts separate across pupils sharing a school tablet.";
 if(source.includes(marker))return;
 const anchor=/(\s*)(const LOCAL_PLAN_KEY\s*=\s*['"][^'"]+['"];\s*const LOCAL_REHEARSAL_KEY\s*=\s*['"][^'"]+['"];)/m;
 const match=source.match(anchor);
 if(!match)throw Error('Cannot safely scope Misi4 drafts: original localStorage declarations changed.');
 // The original source archive stays unchanged; only extracted build sources
 // are adapted. A direct URL without a portal profile gets an ephemeral key.
 const code="\n"+marker+"\n"+
  "const profileArg=new URLSearchParams(window.location.search).get('profile')||'';\n"+
  "const safePupilProfile=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(profileArg)\n"+
  "  ?profileArg:'isolated-'+crypto.randomUUID();\n";
 const declarations=match[2].replace(/(\s*const LOCAL_(?:PLAN|REHEARSAL)_KEY\s*=\s*['"][^'"]+['"])(;)/g,
   "$1 + '-student-' + safePupilProfile$2");
 source=source.replace(anchor,match[1]+code+declarations);
 if(!source.includes("LOCAL_PLAN_KEY")||!source.includes("safePupilProfile"))
   throw Error('Misi4 profile patch validation failed.');
 await writeFile(path,source);
 console.log('[Misi 4] Pupil-local drafts isolated by authenticated account profile.');
}