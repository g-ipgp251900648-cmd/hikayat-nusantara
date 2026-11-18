/**
 * Misi 3 original AI Studio — Taman Bahasa, hosted at /misi3/ as a same-origin iframe.
 * The only authoritative completion is the game's validated victory payload.
 * This integration is demo/localStorage; no teacher/backend delivery is implied.
 */
(() => {
  'use strict';
  let overlay = null;
  let iframe = null;
  let hasRecorded = false;
  const expectedSource = 'hikayat-nusantara-misi-3';
  function close() {
    if (!overlay) return;
    window.removeEventListener('message', receive);
    overlay.remove();
    overlay = null;
    iframe = null;
    document.body.classList.remove('hn-m3-open');
  }
  function receive(event) {
    if (!iframe || event.origin !== window.location.origin ||
        event.source !== iframe.contentWindow) return;
    const msg = event.data;
    if (!msg || !['HIKAYAT_MISI3_COMPLETED','HIKAYAT_MISI3_READY'].includes(msg.type)) return;
    const payload = msg.payload;
    if (!payload || payload.source !== expectedSource || payload.missionId !== 'misi-3') return;
    // A readiness message may restore a previously completed game after browser reload.
    if (msg.type === 'HIKAYAT_MISI3_READY' && payload.completed !== true) return;
    if (hasRecorded) return;
    const result = window.submitMissionThreeAdventure?.(payload);
    const status = overlay.querySelector('#hn-m3-status');
    if (result?.ok && result.completed) {
      hasRecorded = true;
      if (status) status.textContent = result.alreadyCompleted
        ? '✓ Misi 3 telah direkodkan pada Dashboard Murid.'
        : '✓ Misi 3 selesai · 70 XP direkodkan pada Dashboard Murid.';
    } else if (status && result?.message) {
      status.textContent = result.message;
    }
  }
  window.openMissionThreeAdventure = function openOriginalMisi3() {
    if (overlay) return;
    hasRecorded = false;
    overlay = document.createElement('section');
    overlay.id = 'hn-m3-overlay';
    overlay.setAttribute('aria-label','Misi 3 — Taman Bahasa: Rahsia Empat Kelopak Warisan');
    overlay.innerHTML = `<header class="hn-m3-top">
      <div class="hn-m3-heading"><strong>🌺 Misi 3: Taman Bahasa</strong>
      <small>Rahsia Empat Kelopak Warisan · Permainan asal Google AI Studio</small></div>
      <span id="hn-m3-status" role="status">Rekod latihan disimpan pada pelayar; bukan dihantar kepada guru.</span>
      <button type="button" id="hn-m3-close">✕ Kembali ke Dashboard</button>
      </header>
      <iframe id="hn-m3-frame" title="Permainan Taman Bahasa dan empat Kelopak Warisan" src="/misi3/" allow="microphone"></iframe>`;
    document.body.append(overlay);
    document.body.classList.add('hn-m3-open');
    iframe = overlay.querySelector('iframe');
    iframe.addEventListener('load', () => {
      try { iframe.contentWindow?.postMessage({type:'HIKAYAT_PING_MISI3'},window.location.origin); }
      catch(e) { /* No cross-origin fallbacks. */ }
    });
    overlay.querySelector('#hn-m3-close').addEventListener('click',close);
    window.addEventListener('message',receive);
    overlay.querySelector('#hn-m3-close').focus();
  };
  window.closeMissionThreeAdventure = close;
  window.addEventListener('pagehide',close);
  window.addEventListener('hikayat:reset',()=>{hasRecorded=false;});
})();
