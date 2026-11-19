/**
 * Open the user's original Wau Sakti Google AI Studio game at /misi2/.
 * Same-origin full-screen iframe; no public accounts or backend needed.
 * Only source-checked local assessment events are accepted.
 */
(() => {
  'use strict';
  let overlay = null, iframe = null;
  const source = 'hikayat-misi2-aistudio-original';
  const close = () => {
    if (!overlay) return;
    window.removeEventListener('message', receive);
    overlay.remove();
    overlay = null;
    iframe = null;
    document.body.classList.remove('hn-m2-open');
  };
  function receive(event) {
    if (!iframe || event.origin !== window.location.origin ||
        event.source !== iframe.contentWindow) return;
    const message = event.data;
    if (!message || message.source !== source || message.version !== 1) return;
    let result = null;
    if (message.eventType === 'attempt') {
      result = window.submitMissionTwoFlightAttempt?.(message.payload);
    } else if (message.eventType === 'victory') {
      result = window.submitMissionTwoAdventure?.(message.payload);
    }
    if (!result?.ok) return;
    const status = overlay?.querySelector('#hn-m2-status');
    if (status && message.eventType === 'victory') {
      status.textContent = result.completed
        ? '✓ Misi 2 selesai: 90 XP dan karya diselaraskan dengan Ruang Murid.'
        : 'Syarat tugasan belum disahkan; semak karya dan lima ungkapan.';
    } else if (status && result.recorded) {
      status.textContent = '✓ Percubaan penerbangan dan checkpoint direkodkan pada graf murid.';
    }
  }
  window.openMissionTwoAdventure = () => {
    if (overlay) return;
    overlay = document.createElement('section');
    overlay.id = 'hn-m2-overlay';
    overlay.setAttribute('aria-label', 'Misi 2 — Wau Sakti: Pencarian Kata Indah');
    Object.assign(overlay.style, {
      position:'fixed',inset:'0',zIndex:'100000',background:'#153a30',
      display:'flex',flexDirection:'column',color:'#fff4d8',
      fontFamily:'DM Sans,Arial,sans-serif',
    });
    const bar = document.createElement('header');
    Object.assign(bar.style, {
      flex:'none',display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'8px 12px',gap:'10px',minHeight:'52px',background:'#154632',
      borderBottom:'2px solid #dcb974',
    });
    bar.innerHTML = '<div style="min-width:0"><strong style="font-size:14px">🪁 Misi 2 — Wau Sakti: Pencarian Kata Indah</strong><div id="hn-m2-status" role="status" style="font-size:11px;color:#e6d5ab">Lima gerbang bahasa dan Balai Olah Hikayat</div></div>';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '✕ Kembali ke Ruang Murid';
    Object.assign(closeButton.style, {
      border:'1px solid #d0b477',borderRadius:'9px',background:'#fff6dd',
      color:'#22533d',fontWeight:'800',padding:'11px 12px',cursor:'pointer',
      flexShrink:'0',
    });
    closeButton.addEventListener('click', close);
    bar.append(closeButton);
    iframe = document.createElement('iframe');
    iframe.src = '/misi2/';
    iframe.title = 'Misi 2 — Pengembaraan Wau Bulan Sakti';
    iframe.setAttribute('allow', 'autoplay');
    iframe.style.cssText = 'width:100%;min-width:0;min-height:0;flex:1;border:0;background:#173e32';
    overlay.append(bar, iframe);
    document.body.append(overlay);
    document.body.classList.add('hn-m2-open');
    window.addEventListener('message', receive);
    closeButton.focus();
  };
  window.closeMissionTwoAdventure = close;
  window.addEventListener('pagehide', close);
})();
