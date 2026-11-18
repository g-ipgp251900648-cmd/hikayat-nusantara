/**
 * Misi 4 original AI Studio — same-origin /misi4/ in a responsive overlay.
 * Real camera/microphone controls live in the uploaded game and require user consent.
 * No claim of teacher upload or 80 XP is made without authenticated backend receipt.
 */
(() => {
  'use strict';
  let overlay=null, iframe=null;
  const stop=()=>{
    if(!overlay)return;
    window.removeEventListener('message',receive);
    overlay.remove(); overlay=null; iframe=null;
    document.body.classList.remove('hn-m4-open');
  };
  function receive(event){
    if(!iframe||event.origin!==window.location.origin||event.source!==iframe.contentWindow)return;
    if(event.data?.type==='HIKAYAT_RETURN_DESA'&&event.data.mission===4)stop();
    // Intentionally ignore client-side "success" messages until a trusted
    // backend can verify the actual submission receipt and student identity.
  }
  window.openMissionFourAdventure=()=>{
    if(overlay)return;
    overlay=document.createElement('section');
    overlay.id='hn-m4-overlay';
    overlay.setAttribute('role','region');
    overlay.setAttribute('aria-label','Misi 4 — Pentas Warisan: Hikayat Berseri');
    Object.assign(overlay.style,{
      position:'fixed',inset:'0',zIndex:'100002',background:'#102b24',
      display:'flex',flexDirection:'column',color:'#fff0cd',
      fontFamily:'DM Sans,Arial,sans-serif'
    });
    const header=document.createElement('header');
    Object.assign(header.style,{
      display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'8px 12px',gap:'12px',background:'#154334',minHeight:'54px',
      borderBottom:'2px solid #d9b773',flexShrink:'0'
    });
    const heading=document.createElement('div');
    heading.style.cssText='min-width:0';
    heading.innerHTML='<strong style="font-size:14px">🎭 Misi 4 — Pentas Warisan: Hikayat Berseri</strong><div style="font-size:11px;color:#eddba9">Permainan Google AI Studio asal · Rakam video/suara · Muat naik fail · Penghantaran guru memerlukan backend selamat</div>';
    const button=document.createElement('button');
    button.type='button';
    button.textContent='✕ Kembali ke Dashboard';
    Object.assign(button.style,{
      padding:'10px 13px',borderRadius:'9px',border:'1px solid #d9b773',
      background:'#fff3d4',color:'#164b35',fontWeight:'800',
      cursor:'pointer',flexShrink:'0'
    });
    button.addEventListener('click',stop);
    header.append(heading,button);
    iframe=document.createElement('iframe');
    iframe.id='hn-m4-frame';
    iframe.src='/misi4/';
    iframe.title='Misi 4 — Studio persembahan hikayat';
    iframe.setAttribute('allow','camera; microphone; fullscreen; autoplay');
    iframe.style.cssText='width:100%;min-width:0;min-height:0;flex:1;border:0;background:#132c23';
    overlay.append(header,iframe);
    document.body.append(overlay);
    document.body.classList.add('hn-m4-open');
    document.body.style.setProperty('overflow','hidden');
    window.addEventListener('message',receive);
    button.focus();
  };
  window.closeMissionFourAdventure=stop;
  window.addEventListener('pagehide',stop);
  window.addEventListener('hikayat:reset',stop);
})();
