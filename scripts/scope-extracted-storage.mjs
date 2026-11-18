import { readFile,writeFile } from 'node:fs/promises';

const CONTEXT = [
  'function hnMissionScopedKey(key: string): string {',
  "  const account = typeof document !== 'undefined' ? document.documentElement.dataset.hnAccount : '';",
  '  // Missing session context must never read or write a shared progress key.',
  "  if (!account || !/^[0-9a-f-]{36}$/i.test(account)) {",
  "    throw new Error('Akaun murid belum disahkan.');",
  '  }',
  "  return key + ':' + account;",
  '}'
].join('\n');

async function patchFile(path,replacements) {
  let contents=await readFile(path,'utf8');
  if(contents.includes('function hnMissionScopedKey(')) {
    console.log('[Storan Murid] Sudah dipasang:',path);
    return;
  }
  for(const [original,scoped] of replacements){
    const n=contents.split(original).length-1;
    if(n!==1)throw Error('[Storan Murid] '+path+' expected one occurrence of '+original+' but got '+n);
    contents=contents.replace(original,scoped);
  }
  await writeFile(path,contents+'\n'+CONTEXT,'utf8');
  console.log('[Storan Murid] Akaun khusus untuk',path);
}

export async function scopeExtractedMissionStorage() {
  // These original AI Studio sources are reconstructed from trusted compressed
  // archives by build.mjs. Patch only storage keys, never the game logic or UI.
  await patchFile('mission-three-ai/src/game/rules.ts',[
    ['window.localStorage.setItem(MISI3_STORAGE_KEY','window.localStorage.setItem(hnMissionScopedKey(MISI3_STORAGE_KEY)'],
    ['window.localStorage.getItem(MISI3_STORAGE_KEY','window.localStorage.getItem(hnMissionScopedKey(MISI3_STORAGE_KEY)'],
    ['window.localStorage.removeItem(MISI3_STORAGE_KEY','window.localStorage.removeItem(hnMissionScopedKey(MISI3_STORAGE_KEY)']
  ]);
  await patchFile('mission-four-ai/src/App.tsx',[
    ['localStorage.getItem(key)','localStorage.getItem(hnMissionScopedKey(key))'],
    ['localStorage.setItem(key, JSON.stringify(value))','localStorage.setItem(hnMissionScopedKey(key), JSON.stringify(value))']
  ]);
}
