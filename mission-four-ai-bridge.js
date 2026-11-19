/** Same-origin original AI Studio Misi 4; media stays inside its iframe.
 * Portal mode does NOT enable public sample accounts or teacher upload.
 * Only a backend-verified receipt may count toward official completion. */
(() => {
  'use strict';
  let overlay=null, iframe=null;
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
    bar.innerHTML='<div><strong style="font-size:14px">🎭 Misi 4 — Pentas Warisan: Hikayat Berseri</strong><div id="hn-m4-status" role="status" style="font-size:11px;color:#f3ddb5">Benarkan kamera dan mikrofon untuk merakam. Simpan karya pada peranti; penghantaran kepada Guru belum tersedia.</div></div>';
    const button=document.createElement('button');
    button.type='button';button.textContent='✕ Kembali ke Dashboard';
    button.style.cssText='padding:10px;border-radius:9px;border:1px solid #dfc083;background:#fff1d8;color:#205238;font-weight:bold;cursor:pointer';
    button.addEventListener('click',close);bar.append(button);
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
