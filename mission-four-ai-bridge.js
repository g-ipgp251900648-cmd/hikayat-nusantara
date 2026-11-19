/** Same-origin original AI Studio Misi 4; media stays inside its iframe.
 * Portal mode does NOT enable public sample accounts or teacher upload.
 * Only a backend-verified receipt may count toward official completion. */
(() => {
  'use strict';
  let overlay=null, iframe=null;
  async function sendRecording(file,status){
    if(!file)return;
    if(!['video/webm','video/mp4'].includes(file.type)||file.size<1024||file.size>100*1024*1024){
      status.textContent='Gunakan rakaman WebM/MP4 sehingga 100 MB.';return;
    }
    const putJson=async(url,body)=>{
      const r=await fetch(url,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(data.error||'SERVER_ERROR');
      return data;
    };
    status.textContent='Menyediakan penghantaran selamat…';
    try{
      const started=await putJson('/api/misi4/initiate',{bytes:file.size,mime:file.type});
      status.textContent='Memuat naik rakaman kepada Guru…';
      const result=await fetch(started.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});
      if(!result.ok)throw Error('UPLOAD_FAILED');
      const receipt=await putJson('/api/misi4/complete',{id:started.id});
      const verified=await fetch('/api/misi4/state',{credentials:'include',cache:'no-store'});
      const state=await verified.json();
      if(!verified.ok||!state.submissions?.some(s=>s.id===receipt.id))throw Error('RECEIPT_NOT_VERIFIED');
      window.submitMissionFourAdventure?.({receipt:receipt.referenceNo,submissionId:receipt.id,verified:true});
      status.textContent='✓ Rakaman diterima pelayan dan tersedia dalam dashboard guru.';
    }catch(e){
      status.textContent='Penghantaran gagal ('+String(e.message).slice(0,70)+'). Simpan rakaman ke peranti dan cuba lagi.';
    }
  }

  function close(){
    if(!overlay)return;
    window.removeEventListener('message',onMessage);
    overlay.remove(); overlay=null;iframe=null;
    document.body.classList.remove('hn-m4-open');
  }
  async function onMessage(event){
    if(!overlay||!iframe||event.origin!==window.location.origin||event.source!==iframe.contentWindow)return;
    const msg=event.data;
    if(msg?.type==='HIKAYAT_RETURN_DESA'){close();return;}
    if(msg?.type!=='HIKAYAT_MISI4_STATUS'||msg.mission!==4||msg.completed!==true||
       typeof msg.referenceNo!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(msg.referenceNo))return;
    // A postMessage does not prove that a real file was accepted.
    const status=overlay.querySelector('#hn-m4-status');
    if(status)status.textContent='Menunggu pengesahan resit daripada pelayan.';
    try{
      const r=await fetch('/api/misi4/state',{credentials:'include',cache:'no-store'});
      if(!r.ok)throw Error('backend unavailable');
      const data=await r.json();
      const record=data?.submissions?.find(s=>s?.referenceNo===msg.referenceNo && s?.status==='Telah Dihantar');
      if(!record)throw Error('receipt not verified');
      // No claim of teacher grading; only backend-confirmed upload.
      window.submitMissionFourAdventure?.({receipt:record.referenceNo,submissionId:record.id,verified:true});
      if(status)status.textContent='✓ Resit penghantaran disahkan oleh pelayan.';
    }catch{
      if(status)status.textContent='Penghantaran belum dapat disahkan; simpan fail ke peranti.';
    }
  }
  window.openMissionFourAdventure=()=>{
    if(overlay)return;
    overlay=document.createElement('section');
    overlay.id='hn-m4-overlay';
    overlay.setAttribute('aria-label','Misi 4 — Pentas Warisan: Hikayat Berseri');
    overlay.style.cssText='position:fixed;inset:0;z-index:100002;background:#10271f;display:flex;flex-direction:column;color:#fff1d5;font:500 13px Arial,sans-serif';
    const bar=document.createElement('header');
    bar.style.cssText='flex:none;min-height:54px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#17432e;border-bottom:2px solid #d7b570';
    bar.innerHTML='<div><strong style="font-size:14px">🎭 Misi 4 — Pentas Warisan: Hikayat Berseri</strong><div id="hn-m4-status" role="status" style="font-size:11px;color:#f3ddb5">Rakam dan simpan video, kemudian pilih Hantar Rakaman kepada Guru. Penghantaran memerlukan storan disediakan.</div></div>';
    const button=document.createElement('button');
    button.type='button';button.textContent='✕ Kembali ke Dashboard';
    button.style.cssText='padding:10px;border-radius:9px;border:1px solid #dfc083;background:#fff1d8;color:#205238;font-weight:bold;cursor:pointer';
    button.addEventListener('click',close);bar.append(button);
    const upload=document.createElement('label');
    upload.textContent='📤 Hantar Rakaman kepada Guru';
    upload.style.cssText='background:#fff1d8;color:#205238;padding:10px;border-radius:9px;font-weight:bold;cursor:pointer;display:inline-block';
    const file=document.createElement('input');
    file.type='file';file.accept='video/webm,video/mp4';file.setAttribute('aria-label','Pilih rakaman Misi 4 untuk dihantar kepada guru');
    file.style.cssText='position:absolute;width:1px;height:1px;opacity:0';
    file.addEventListener('change',()=>{const chosen=file.files?.[0];if(chosen)void sendRecording(chosen,overlay.querySelector('#hn-m4-status'));file.value='';});
    upload.append(file);bar.append(upload);
    iframe=document.createElement('iframe');
    iframe.src='/misi4/';
    iframe.title='Misi 4 Pentas Warisan — Studio Kamera, Mikrofon dan Persembahan';
    iframe.setAttribute('allow','camera; microphone; fullscreen; autoplay');
    iframe.style.cssText='width:100%;flex:1;min-height:0;border:0;background:#122419';
    overlay.append(bar,iframe);document.body.append(overlay);
    document.body.classList.add('hn-m4-open');
    window.addEventListener('message',onMessage);
    button.focus();
  };
  window.closeMissionFourAdventure=close;
  window.addEventListener('pagehide',close);
})();
