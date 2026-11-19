/**
 * Hikayat Nusantara — launch the user's ORIGINAL AI Studio Misi 1 on /misi1/.
 * The React/Three.js application lives in mission-one-ai/. It is framed at
 * the SAME origin and never embedded from an external AI Studio/private URL.
 * Its assessment events are validated by the existing student-activities.js.
 */
(() => {
  'use strict';
  let overlay = null;
  let iframe = null;
  let lastSignature = '';
  let lastGameAttemptCount = 0;
  const sourceName = 'hikayat-misi1-aistudio-original';
  const expectedScrolls = ['rak', 'peti', 'tingkap', 'meja', 'pelita'];
  const options = {
    q1: ['gua', 'sungai', 'pasar', 'pentas'],
    q2: ['pertandingan', 'hiasan', 'kabus', 'jual'],
    q3: ['kerjasama', 'mementingkan_diri', 'persaingan', 'tidak_peduli'],
  };
  const expectedIds = ['ev-1', 'ev-2', 'ev-3', 'ev-4', 'ev-5'];

  function normalizeEvidence(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const { foundScrolls, readStoryPages, orderedIds, quizAnswers } = raw;
    if (!Array.isArray(foundScrolls) || foundScrolls.length !== 5 ||
        !expectedScrolls.every(id => foundScrolls.includes(id)) || new Set(foundScrolls).size !== 5) return null;
    if (!Array.isArray(readStoryPages) || readStoryPages.length !== 5 ||
        ![1,2,3,4,5].every(i => readStoryPages.includes(i)) || new Set(readStoryPages).size !== 5) return null;
    if (!Array.isArray(orderedIds) || orderedIds.length !== 5 ||
        !expectedIds.every(id => orderedIds.includes(id)) || new Set(orderedIds).size !== 5) return null;
    if (!quizAnswers || typeof quizAnswers !== 'object') return null;
    for (const id of ['q1','q2','q3']) {
      if (typeof quizAnswers[id] !== 'string' || !options[id].includes(quizAnswers[id])) return null;
    }
    const sequence = orderedIds.map(id => expectedIds.indexOf(id));
    // The portal's original quiz indexes use three options (q1=1, q2=0, q3=2).
    // We map the uploaded original's four-option IDs to right/wrong positions.
    const answers = [
      quizAnswers.q1 === 'sungai' ? '1' : '0',
      quizAnswers.q2 === 'kabus' ? '0' : '1',
      quizAnswers.q3 === 'kerjasama' ? '2' : '0',
    ];
    const signature = JSON.stringify([orderedIds, quizAnswers.q1, quizAnswers.q2, quizAnswers.q3]);
    return { found: [true,true,true,true,true], pages: [true,true,true,true,true], sequence, answers, signature };
  }

  function validStats(raw) {
    if(!raw||typeof raw!=='object')return null;
    const count=raw.attemptCount;
    if(!Number.isSafeInteger(count)||count<0||count>100000)return null;
    const score=raw.lastScore,total=raw.lastTotal;
    if(count>0&&(!Number.isInteger(score)||!Number.isInteger(total)||
      score<0||total!==8||score>total))return null;
    const history=Array.isArray(raw.attempts)?raw.attempts:[];
    if(history.length>30)return null;
    const cleaned=[];
    for(const item of history){
      if(!Number.isSafeInteger(item?.attemptNumber)||item.attemptNumber<1||
         item.attemptNumber>count||!Number.isInteger(item.totalScore)||
         item.totalScore<0||item.totalScore>8||
         typeof item.timestampIso!=='string'||item.timestampIso.length>40) return null;
      cleaned.push({number:item.attemptNumber,score:item.totalScore,total:8,
        at:item.timestampIso});
    }
    return {attemptCount:count,lastScore:count>0?score:null,lastTotal:count>0?8:null,
      attempts:cleaned};
  }

  function onGameMessage(event) {
    if (event.origin !== window.location.origin || !iframe || event.source !== iframe.contentWindow) return;
    const msg = event.data;
    if (!msg || msg.source !== sourceName || msg.version !== 1 ||
        !['attempt','victory','snapshot'].includes(msg.eventType)) return;
    if (msg.eventType==='attempt'||msg.eventType==='snapshot'){
      const stats=validStats(msg.payload);
      if(!stats)return;
      // Quiz state may render and post its snapshot before the click message;
      // never count the same game attempt twice.
      if(msg.eventType==='attempt'&&stats.attemptCount<=lastGameAttemptCount)return;
      lastGameAttemptCount=Math.max(lastGameAttemptCount,stats.attemptCount);
      const transfer=window.syncMissionOneGameAttempts;
      if(typeof transfer!=='function')return;
      const result=transfer(stats,{newAttempt:msg.eventType==='attempt'});
      if(result?.ok){
        const status=overlay?.querySelector('#hn-ai-status');
        if(status)status.textContent='Percubaan Misi 1 direkodkan: '+result.count+
          '. Ringkasan akan diselaraskan dengan Neon.';
      }
      return;
    }
    // Victory requires full learning evidence. It does not increment the
    // attempt count again: the quiz attempt was recorded separately above.
    const data=normalizeEvidence(msg.payload);
    if (!data) { console.warn('Misi 1: bukti tamat misi tidak lengkap.'); return; }
    if(data.signature===lastSignature)return;
    const save=window.submitMissionOneAdventure;
    if(typeof save!=='function')return;
    const result=save(data);
    if(result?.ok&&result.success){
      lastSignature=data.signature;
      const status=overlay?.querySelector('#hn-ai-status');
      if(status)status.textContent='✓ Misi 1 selesai. Rekod latihan akan diselaraskan ke Neon.';
    }
  }

  function close() {
    if (!overlay) return;
    window.removeEventListener('message', onGameMessage);
    overlay.remove(); overlay = null; iframe = null;
    document.body.classList.remove('hn-ai-fullscreen-active');
    document.getElementById('hn-ai-style')?.remove();
  }

  window.openMissionOneAdventure = function openOriginalAiStudioMissionOne(studentId) {
    lastGameAttemptCount=0;
    lastSignature='';
    if(typeof studentId!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(studentId)){
      console.warn('Misi 1 memerlukan sesi Murid yang disahkan.');
      return;
    }
    // The original AI Studio game used one shared localStorage entry. Never
    // silently attach that legacy history to a named pupil on shared devices.
    const legacyKey='hikayat_nusantara_misi1_progress_v1';
    const privateKey=legacyKey+'-student-'+studentId;
    try {
      const oldValue=localStorage.getItem(legacyKey);
      if(!localStorage.getItem(privateKey)&&oldValue){
        const parsed=JSON.parse(oldValue);
        if(Array.isArray(parsed?.attempts)&&parsed.attempts.length>0){
          const belongs=confirm(
            'Terdapat '+parsed.attempts.length+' rekod percubaan Misi 1 lama pada peranti ini. '+
            'Adakah SEMUA rekod ini milik akaun Murid yang sedang log masuk? '+
            'Pilih OK hanya jika pasti. Jika peranti pernah digunakan oleh murid lain, pilih Batal.'
          );
          if(belongs)localStorage.setItem(privateKey,oldValue);
        }
      }
    }catch { /* Legacy profile is optional and never imported automatically. */ }
    if (overlay) return;
    const style = document.createElement('style');
    style.id = 'hn-ai-style';
    style.textContent = `
      body.hn-ai-fullscreen-active{overflow:hidden!important}
      #hn-ai-overlay{position:fixed;inset:0;background:#132a23;z-index:99999;display:flex;flex-direction:column;color:#f8edce;font:500 13px 'DM Sans',Arial,sans-serif}
      #hn-ai-top{height:51px;flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 16px;background:linear-gradient(112deg,#12382f,#285841);border-bottom:2px solid #d6af61}
      #hn-ai-top strong{font:700 15px 'Fraunces',Georgia,serif}
      #hn-ai-top small{color:#ead3a5;font-size:10px}
      #hn-ai-top button{cursor:pointer;background:#f4e8ca;color:#1a4c37;border:1px solid #d5b97a;border-radius:9px;padding:10px 13px;font-weight:800;white-space:nowrap}
      #hn-ai-status{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px;color:#e8d9b9}
      #hn-ai-frame{width:100%;min-width:0;min-height:0;flex:1;border:0;background:#241509}
      @media(max-width:750px){#hn-ai-top{height:56px;padding:6px 9px}#hn-ai-top strong{font-size:12px}#hn-ai-status{display:none}#hn-ai-top button{padding:9px}}
    `;
    document.head.append(style);
    overlay = document.createElement('section');
    overlay.id = 'hn-ai-overlay';
    overlay.setAttribute('aria-label','Misi 1 — Misteri Lima Helaian Naskhah');
    overlay.innerHTML = `<header id="hn-ai-top"><div><strong>🏮 Misi 1: Misteri Lima Helaian Naskhah</strong><br><small>Permainan asal Google AI Studio • Hang Tuah 3D</small></div>
      <span id="hn-ai-status" role="status">Kemajuan kuiz diselaraskan dengan Dashboard Murid.</span>
      <button id="hn-ai-close" type="button">✕ Kembali ke Dashboard</button></header>
      <iframe id="hn-ai-frame" title="Permainan Misi 1 — Hang Tuah dan Lima Helaian Naskhah" src="/misi1/?profile=${encodeURIComponent(studentId)}"></iframe>`;
    document.body.append(overlay);
    document.body.classList.add('hn-ai-fullscreen-active');
    iframe = overlay.querySelector('iframe');
    overlay.querySelector('#hn-ai-close').addEventListener('click', close);
    window.addEventListener('message', onGameMessage);
    overlay.querySelector('#hn-ai-close').focus();
  };
  window.closeMissionOneAdventure = close;
  window.addEventListener('pagehide', close);
  window.addEventListener('hikayat:reset', () => { lastSignature='';lastGameAttemptCount=0; });
})();
