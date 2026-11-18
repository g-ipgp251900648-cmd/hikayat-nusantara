/* Hikayat Nusantara — sync DRAF latihan Dashboard Murid (bukan keputusan PBD).
   Never claims official completion. Local changes survive connectivity failures.
   Original AI Studio game storage is NOT yet covered by this module. */
(() => {
  'use strict';
  const fields=[
    ['sequence','readingAnswers'],
    ['character','setting','event','chosenPhrases','writtenStory'],
    ['languageAnswers'],
    ['performance']
  ];
  let storageKey='', pendingKey='', metaKey='', revisions={}, pending={}, initialized=false;
  let flushing=false, timer=null, statusNode=null;
  const copy=value=>JSON.parse(JSON.stringify(value));
  const readJSON=(key,fallback)=>{
    try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}
    catch{return fallback;}
  };
  function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
  function status(message){
    if(!statusNode){
      const target=document.querySelector('#murid-ringkasan .dash-heading');
      if(target){
        statusNode=document.createElement('p');
        statusNode.id='hn-cloud-status';statusNode.setAttribute('role','status');
        statusNode.setAttribute('aria-live','polite');
        statusNode.style.cssText='font-size:12px;color:#526857;margin:10px 0 0;max-width:450px';
        target.querySelector('div')?.appendChild(statusNode);
      }
    }
    if(statusNode)statusNode.textContent=message;
  }
  function takeSnapshot(state,index){
    const output={};
    for(const field of fields[index])output[field]=copy(state[field]);
    output.completed=state.completed?.[index]===true;
    output.attempts=copy(state.attempts?.[index]||{count:0,history:[]});
    return {schema:1,data:output};
  }
  function restoreSnapshot(target,index,checkpoint){
    if(checkpoint?.schema!==1 || !checkpoint.data || typeof checkpoint.data!=='object')return false;
    const data=checkpoint.data;
    for(const field of fields[index])if(Object.hasOwn(data,field))target[field]=copy(data[field]);
    if(!Array.isArray(target.completed))target.completed=[false,false,false,false];
    if(!Array.isArray(target.attempts))target.attempts=[{},{},{},{}];
    target.completed[index]=data.completed===true;
    if(data.attempts&&typeof data.attempts==='object')target.attempts[index]=copy(data.attempts);
    return true;
  }
  const api=(path,opts={})=>fetch(path,{credentials:'same-origin',cache:'no-store',...opts});
  function schedule(){if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;void flush();},700);}
  async function flush(){
    if(flushing||!initialized)return;
    flushing=true;
    try{
      const ids=Object.keys(pending).filter(x=>/^[1-4]$/.test(x));
      for(const id of ids){
        const entry=pending[id];
        if(!entry)continue;
        try{
          const response=await api('/api/student/progress/'+id,{
            method:'PUT',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({revision:Number.isInteger(entry.baseRevision)?entry.baseRevision:(revisions[id]||0),checkpoint:entry.checkpoint})
          });
          if(response.status===409){
            status('Terdapat versi lain pada pelayan. Draf peranti ini dikekalkan; semak bersama guru.');
            continue;
          }
          if(!response.ok){
            status('Belum diselaraskan. Draf masih disimpan pada peranti ini.');
            continue;
          }
          const data=await response.json();
          if(!Number.isInteger(data.revision))continue;
          revisions[id]=data.revision;
          writeJSON(metaKey,{revisions});
          if(pending[id]?.sequence===entry.sequence){
            delete pending[id];
            writeJSON(pendingKey,pending);
          } else if(pending[id] && pending[id].baseRevision===entry.baseRevision){
            // Another edit arrived while uploading: advance only our own known version.
            pending[id].baseRevision=data.revision;
            writeJSON(pendingKey,pending);
            schedule();
          }
        }catch{
          status('Sambungan terputus. Draf disimpan pada peranti dan akan dicuba semula.');
        }
      }
      if(!Object.keys(pending).length)status('Draf latihan disimpan pada pelayan.');
    }finally{flushing=false;}
  }
  window.hnCloudDrafts={
    async prepare(accountId,key){
      if(typeof accountId!=='string'||!accountId||typeof key!=='string'||!key)return;
      storageKey=key;pendingKey='hn-draft-outbox-'+accountId;metaKey='hn-draft-meta-'+accountId;
      pending=readJSON(pendingKey,{});const meta=readJSON(metaKey,{revisions:{}});
      revisions=meta.revisions||{};
      const local=readJSON(storageKey,null);
      status('Memeriksa kemajuan pembelajaran yang tersimpan...');
      try{
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),6500);
        let response;
        try{response=await api('/api/student/progress',{signal:controller.signal});}
        finally{clearTimeout(timeout);}
        if(!response.ok)throw Error('Server not ready');
        const body=await response.json();
        const rows=Array.isArray(body.progress)?body.progress:[];
        const merged=local&&typeof local==='object'?copy(local):{};
        let restored=false,conflict=false;
        for(const row of rows){
          const id=String(row.mission_id),index=Number(row.mission_id)-1;
          if(!Number.isInteger(index)||index<0||index>3)continue;
          const serverRev=Number(row.revision)||0;
          const oldRev=Number(revisions[id])||0;
          // A fresh device restores from the cloud. Any local work is preserved until
          // its matching saved revision has been confirmed, avoiding lost student work.
          if(!local&&!pending[id]){
            restored=restoreSnapshot(merged,index,row.checkpoint)||restored;
            revisions[id]=serverRev;
          } else if(local && serverRev>oldRev){
            conflict=true;
            revisions[id]=oldRev;
          } else if(!pending[id]){
            revisions[id]=serverRev;
          }
        }
        if(restored)writeJSON(storageKey,merged);
        writeJSON(metaKey,{revisions});
        initialized=true;
        if(conflict){
          status('Terdapat draf berlainan pada pelayan. Draf peranti dikekalkan; jangan tindih versi lain.');
          if(Object.keys(pending).length)schedule();
        } else if(Object.keys(pending).length){status('Menyelaraskan perubahan tertangguh...');schedule();}
        else status(rows.length?'Kemajuan pembelajaran tersedia.':'Belum ada draf pada pelayan; draf peranti dikekalkan.');
      }catch{
        initialized=true;
        status('Pelayan belum tersedia. Draf latihan kekal pada peranti ini.');
      }
      window.addEventListener('online',()=>{if(Object.keys(pending).length)schedule();});
      document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Object.keys(pending).length)schedule();});
    },
    queue(index,state){
      if(!Number.isInteger(index)||index<0||index>3||!storageKey)return;
      const id=String(index+1);
      try{
        const baseRevision=pending[id]?.baseRevision ?? (revisions[id]||0);
        pending[id]={sequence:Date.now()+Math.random(),baseRevision,checkpoint:takeSnapshot(state,index)};
        if(!writeJSON(pendingKey,pending)){
          status('Storan peranti penuh. Sila hubungi guru sebelum keluar.');
          return;
        }
        status('Draf disimpan pada peranti. Sedang menyelaraskan...');
        schedule();
      }catch{status('Draf belum dapat diselaraskan. Sila semak storan peranti.');}
    }
  };
})();
