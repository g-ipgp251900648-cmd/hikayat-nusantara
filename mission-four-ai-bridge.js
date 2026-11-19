/** Misi 4 — private, verified video delivery to the pupil's own Teacher.
 * A pupil explicitly selects a finished recording after pressing Send.
 * The server stores it in a private bucket and creates the teacher inbox row. */
(() => {
  'use strict';
  let overlay=null,iframe=null,uploadButton=null,fileInput=null,uploading=false;
  const MAX_VIDEO=40*1024*1024;
  const allowed=new Set(['video/webm','video/mp4']);
  function note(message){
    const n=overlay?.querySelector('#hn-m4-status');
    if(n)n.textContent=message;
  }
  function close(){
    if(uploading){
      note('Rakaman sedang dihantar. Sila tunggu sehingga proses penghantaran selesai.');
      return;
    }
    if(!overlay)return;
    window.removeEventListener('message',onMessage);
    overlay.remove();overlay=null;iframe=null;fileInput=null;uploadButton=null;
    document.body.classList.remove('hn-m4-open');
  }
  async function deliverVideo(file){
    if(uploading||!overlay||!file)return;
    const mime=String(file.type||'').split(';')[0].toLowerCase();
    if(!allowed.has(mime)){
      note('Format tidak disokong. Pilih rakaman WebM atau MP4.');
      return;
    }
    if(!Number.isSafeInteger(file.size)||file.size<1024||file.size>MAX_VIDEO){
      note('Saiz video mesti kurang daripada 40 MB. Simpan versi lebih kecil dan cuba lagi.');
      return;
    }
    uploading=true;uploadButton.disabled=true;
    note('Menghantar rakaman kepada Guru. Jangan tutup halaman ini...');
    try {
      const res=await fetch('/api/misi4/submit',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':mime},
        body:file,cache:'no-store'
      });
      const result=await res.json().catch(()=>({}));
      if(!res.ok||!result.ok||!result.submission?.id){
        const explanations={
          VIDEO_STORAGE_NOT_CONFIGURED:'Penghantaran video belum diaktifkan oleh pentadbir sekolah.',
          VIDEO_STORAGE_WRITE_FAILED:'Storan video belum menerima rakaman. Cuba semula.',
          VIDEO_STORAGE_UNAVAILABLE:'Perkhidmatan video tidak dapat dihubungi.',
          VIDEO_CONTENT_INVALID:'Fail bukan rakaman video WebM atau MP4 yang sah.',
          CLASS_ENROLLMENT_REQUIRED:'Akaun belum ditempatkan dalam kelas. Hubungi Guru.',
          VIDEO_SUBMISSION_LIMIT_REACHED:'Had penghantaran telah dicapai. Hubungi Guru.',
          VIDEO_UPLOAD_INVALID:'Fail terlalu besar atau penghantaran tidak lengkap.'
        };
        note(explanations[result.error]||'Rakaman belum berjaya dihantar. Sila cuba semula.');
        return;
      }
      // Only a successful private object-storage write and DB receipt counts.
      window.submitMissionFourAdventure?.({
        verified:true,receipt:result.submission.referenceNo,
        submissionId:result.submission.id
      });
      note('✓ Rakaman BERJAYA dihantar kepada Guru. Guru boleh menonton, menilai dan memberikan maklum balas.');
      const receipt=overlay.querySelector('#hn-m4-receipt');
      if(receipt)receipt.textContent='Nombor rujukan: '+result.submission.referenceNo;
    }catch{
      note('Sambungan terganggu. Sila semak status penghantaran sebelum mencuba lagi.');
    }finally{
      uploading=false;
      if(uploadButton)uploadButton.disabled=false;
      if(fileInput)fileInput.value='';
    }
  }
  function onMessage(event){
    if(!overlay||!iframe||event.origin!==window.location.origin||
       event.source!==iframe.contentWindow)return;
    const msg=event.data;
    if(msg?.type==='HIKAYAT_RETURN_DESA'){close();return;}
    // The original standalone game only reports a locally generated receipt.
    // It does NOT prove that a video was uploaded to the school.
    if(msg?.type==='HIKAYAT_MISI4_STATUS'&&msg.mission===4&&msg.completed===true){
      note('Persembahan selesai! Klik “Hantar Rakaman kepada Guru” dan pilih fail video yang telah disimpan.');
      uploadButton?.focus();
    }
  }
  window.openMissionFourAdventure=()=>{
    if(overlay)return;
    overlay=document.createElement('section');
    overlay.id='hn-m4-overlay';
    overlay.setAttribute('aria-label','Misi 4 — Pentas Warisan: Hikayat Berseri');
    overlay.style.cssText='position:fixed;inset:0;z-index:100002;background:#10271f;display:flex;flex-direction:column;color:#fff1d5;font:500 13px Arial,sans-serif';
    const bar=document.createElement('header');
    bar.style.cssText='flex:none;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:10px 14px;background:#17432e;border-bottom:2px solid #d7b570';
    const label=document.createElement('div');
    label.style.cssText='flex:1 1 280px';
    const heading=document.createElement('strong');
    heading.textContent='🎭 Misi 4 — Pentas Warisan: Hikayat Berseri';
    heading.style.fontSize='14px';
    const status=document.createElement('div');
    status.id='hn-m4-status';status.setAttribute('role','status');
    status.style.cssText='font-size:12px;color:#f3ddb5;margin-top:5px;line-height:1.5';
    status.textContent='Rakam dan simpan video. Kemudian tekan Hantar Rakaman kepada Guru, pilih fail dan penghantaran akan dibuat secara automatik.';
    const receipt=document.createElement('div');
    receipt.id='hn-m4-receipt';receipt.style.cssText='font-size:11px;overflow-wrap:anywhere';
    label.append(heading,status,receipt);
    const actions=document.createElement('div');
    actions.style.cssText='display:flex;align-items:center;gap:9px;flex-wrap:wrap';
    fileInput=document.createElement('input');
    fileInput.type='file';fileInput.accept='video/webm,video/mp4,.webm,.mp4';
    fileInput.setAttribute('aria-label','Pilih rakaman video untuk dihantar kepada Guru');
    fileInput.style.display='none';
    fileInput.addEventListener('change',()=>{
      const file=fileInput.files?.[0];if(file)void deliverVideo(file);
    });
    uploadButton=document.createElement('button');
    uploadButton.type='button';uploadButton.textContent='📤 Hantar Rakaman kepada Guru';
    uploadButton.style.cssText='padding:11px 13px;border:1px solid #d7b570;border-radius:9px;background:#f4d98b;color:#183e2a;font-weight:750;cursor:pointer';
    uploadButton.addEventListener('click',()=>fileInput?.click());
    const leave=document.createElement('button');
    leave.type='button';leave.textContent='✕ Kembali ke Dashboard';
    leave.style.cssText='padding:10px;border-radius:9px;border:1px solid #dfc083;background:#fff1d8;color:#205238;font-weight:bold;cursor:pointer';
    leave.addEventListener('click',close);
    actions.append(fileInput,uploadButton,leave);
    bar.append(label,actions);
    iframe=document.createElement('iframe');
    iframe.src='/misi4/';
    iframe.title='Misi 4 Pentas Warisan — Studio Kamera, Mikrofon dan Persembahan';
    iframe.setAttribute('allow','camera; microphone; fullscreen; autoplay');
    iframe.style.cssText='width:100%;flex:1;min-height:0;border:0;background:#122419';
    overlay.append(bar,iframe);document.body.append(overlay);
    document.body.classList.add('hn-m4-open');
    window.addEventListener('message',onMessage);
    uploadButton.focus();
  };
  window.closeMissionFourAdventure=close;
  window.addEventListener('pagehide',()=>{if(!uploading)close();});
})();