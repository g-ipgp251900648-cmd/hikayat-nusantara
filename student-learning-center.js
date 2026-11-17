/** Pusat Pembelajaran Murid: panduan empat misi, graf percubaan dan jurnal kendiri setempat. */
(() => {
  'use strict';
  const root = document.getElementById('murid-pusat');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const STORAGE = 'hikayat-nusantara-murid-demo-v2';
  const JOURNAL_KEY = 'hikayat-nusantara-refleksi-demo-v1';
  const missions = [
    {
      name:'Jejak Naskhah Pusaka', icon:'📜', time:'10 minit', xp:60, place:'Rumah Naskhah Pusaka',
      objective:'Membaca dan memahami hikayat serta mengenal pasti susunan peristiwa dengan tepat.',
      steps:['Teroka Rumah Naskhah dan cari lima helaian yang tersembunyi.',
        'Baca lima halaman cerita Cahaya Pelita di Desa Warisan.',
        'Susun lima peristiwa berdasarkan urutan cerita.',
        'Jawab tiga soalan pemahaman dengan tepat.'],
      proof:'Lima helaian ditemukan, lima peristiwa disusun dan tiga jawapan pemahaman disemak.',
      pass:'Lima helaian dan halaman lengkap; susunan 5/5 dan jawapan pemahaman 3/3.',
      hint:'Perhatikan penanda masa dalam cerita, dan baca semula halaman berkaitan sebelum membuat pilihan.'
    },
    {
      name:'Balai Olah Hikayat', icon:'🪶', time:'15 minit', xp:90, place:'Balai Olah Hikayat',
      objective:'Mengolah hikayat secara kreatif menggunakan pilihan watak, latar, peristiwa dan bahasa indah.',
      steps:['Pilih watak, latar dan peristiwa yang ingin diolah.',
        'Pilih sekurang-kurangnya dua ungkapan indah daripada bank kata.',
        'Tulis versi hikayat sendiri yang mempunyai jalan cerita jelas.',
        'Semak semula penggunaan ungkapan dan kesantunan bahasa.'],
      proof:'Draf hikayat murid disimpan dalam portfolio latihan pada peranti.',
      pass:'Lengkapkan pilihan cerita, gunakan dua ungkapan dan semak draf mengikut keperluan aktiviti.',
      hint:'Mulakan dengan latar yang jelas, kemudian ceritakan perkara yang berlaku kepada watak.'
    },
    {
      name:'Warisan Bahasa', icon:'✒️', time:'10 minit', xp:70, place:'Taman Bahasa',
      objective:'Memilih ungkapan indah dan mengenal pasti penggunaan bahasa yang santun serta sesuai konteks.',
      steps:['Baca setiap soalan dan perhatikan konteks ayat.',
        'Pilih jawapan yang menggunakan bahasa tepat dan santun.',
        'Semak empat cabaran bahasa yang disediakan.',
        'Baiki jawapan berdasarkan maklum balas.'],
      proof:'Jawapan empat cabaran bahasa dengan rekod semakan.',
      pass:'Jawab semua empat cabaran dengan tepat.',
      hint:'Baca seluruh ayat, bukan satu perkataan sahaja, sebelum memilih ungkapan.'
    },
    {
      name:'Persembahan Hikayat', icon:'🎭', time:'15 minit', xp:80, place:'Pentas Warisan',
      objective:'Merancang dan berlatih menyampaikan hikayat dengan sebutan, nada dan susunan cerita yang sesuai.',
      steps:['Tulis pembukaan untuk memperkenalkan watak dan latar.',
        'Tulis perkembangan dengan peristiwa dan tindakan watak.',
        'Tulis pengakhiran serta pengajaran cerita.',
        'Pilih format latihan dan tandakan selesai selepas berlatih.'],
      proof:'Pelan tiga babak dan penanda latihan; bukan bukti rakaman sebenar.',
      pass:'Ketiga-tiga babak dan latihan kendiri lengkap dalam sistem demo.',
      hint:'Latih suara dan nada mengikut emosi cerita. Rakaman sebenar memerlukan platform sokongan dan semakan guru.'
    }
  ];
  const missionContainer = $('#hn-lc-missions');
  const chart = $('#hn-lc-chart');
  const filterButtons = Array.from(root.querySelectorAll('[data-lc-filter]'));
  let filter = 'all';
  let notes = {};
  try {
    const loaded = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '{}');
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
      notes = Object.fromEntries([0,1,2,3].map(i => [i, typeof loaded[i] === 'string' ? loaded[i].slice(0,1200) : '']));
    }
  } catch (error) { notes = {}; }
  function safeRead() {
    let data = {};
    try { data = JSON.parse(localStorage.getItem(STORAGE) || '{}') || {}; }
    catch(error) { data = {}; }
    const completed = [0,1,2,3].map(i => data.completed?.[i] === true);
    let attempts = [];
    if (typeof window.getStudentAttemptStats === 'function') {
      try { attempts = window.getStudentAttemptStats(); } catch(error) { attempts = []; }
    }
    if (!Array.isArray(attempts) || attempts.length !== 4) attempts = data.attempts || [];
    const history = [0,1,2,3].map(i => {
      const list = attempts[i]?.history;
      return Array.isArray(list) ? list.slice(-30).filter(record =>
        record && Number.isFinite(Number(record.score)) && Number.isFinite(Number(record.total)) && Number(record.total) > 0
      ).map(record => ({
        score: Number(record.score), total: Number(record.total),
        number: Math.max(1, Math.trunc(Number(record.number) || 1)),
        percent: Math.max(0, Math.min(100, Math.round(Number(record.score) / Number(record.total) * 100)))
      })) : [];
    });
    const counts = [0,1,2,3].map(i => {
      const c = Number(attempts[i]?.count);
      return Number.isFinite(c) ? Math.max(history[i].length, Math.max(0, Math.trunc(c))) : history[i].length;
    });
    return {completed, history, counts};
  }
  const xpOf = completed => completed.reduce((sum,done,i) => sum+(done?missions[i].xp:0),0);
  function cardMarkup(item,i) {
    return `<article class="hn-lc-mission" data-lc-mission="${i}">
      <div class="hn-lc-mission-header"><div class="hn-lc-mission-emblem" aria-hidden="true">${item.icon}</div>
        <div class="hn-lc-mission-ident"><span>MISI ${String(i+1).padStart(2,'0')} · ${item.place} · ${item.time}</span>
          <h4>${item.name}</h4>
        </div><span class="hn-lc-mission-status" data-lc-status="${i}">Belum selesai</span>
      </div>
      <div class="hn-lc-mission-details">
        <div><strong>🎯 Objektif</strong><p>${item.objective}</p></div>
        <div><strong>🧭 Langkah aktiviti</strong><ol>${item.steps.map(s=>`<li>${s}</li>`).join('')}</ol></div>
        <div><strong>📖 Bukti pembelajaran</strong><p>${item.proof}</p></div>
        <div><strong>✓ Syarat selesai</strong><p>${item.pass}</p></div>
      </div>
      <div class="hn-lc-mission-footer"><span>✦ ${item.xp} XP</span><span data-lc-attempts="${i}">Belum ada percubaan</span>
        <button type="button" data-lc-open="${i}" aria-label="Buka ${item.name}">▶ Buka Misi ${i+1}</button>
      </div>
      <details class="hn-lc-tip"><summary>Petunjuk Hang Tuah</summary><p>${item.hint}</p></details>
    </article>`;
  }
  missionContainer.innerHTML = missions.map(cardMarkup).join('');
  function updateCards(state) {
    missionContainer.querySelectorAll('[data-lc-mission]').forEach(card=>{
      const i=Number(card.dataset.lcMission);
      card.hidden = filter === 'done' ? !state.completed[i] : filter === 'pending' ? state.completed[i] : false;
      const badge=card.querySelector('[data-lc-status]');
      badge.textContent=state.completed[i]?'✓ Latihan selesai':'Belum selesai';
      badge.classList.toggle('is-done',state.completed[i]);
      const count=state.counts[i];
      card.querySelector('[data-lc-attempts]').textContent=count
        ? `${count} percubaan direkodkan`
        : 'Belum ada percubaan';
    });
    const available=Array.from(missionContainer.querySelectorAll('[data-lc-mission]')).some(card=>!card.hidden);
    let empty=missionContainer.querySelector('.hn-lc-no-results');
    if(!available){
      if(!empty){ empty=document.createElement('p');empty.className='hn-lc-no-results';missionContainer.appendChild(empty); }
      empty.textContent=filter==='done'?'Belum ada misi yang selesai. Teruskan berlatih!':'Semua misi dalam kategori ini telah diselesaikan.';
    }else empty?.remove();
  }
  function updateChart(state) {
    const selected=Number($('#hn-lc-choice').value);
    const i=Number.isInteger(selected)&&selected>=0&&selected<4?selected:0;
    const items=state.history[i].slice(-8);
    if(!items.length) {
      chart.innerHTML='<div class="hn-lc-no-attempt"><span>📊</span><strong>Belum ada rekod percubaan</strong><p>Selesaikan semakan jawapan dalam misi untuk melihat graf sebenar di sini.</p></div>';
      return;
    }
    const best=Math.max(...items.map(v=>v.percent));
    const latest=items[items.length-1].percent;
    chart.innerHTML=`<div class="hn-lc-chart-summary"><span>Percubaan: <strong>${state.counts[i]}</strong></span>
      <span>Terbaik (8 rekod terakhir): <strong>${best}%</strong></span>
      <span>Terkini: <strong>${latest}%</strong></span></div>
      <div class="hn-lc-bars" role="img" aria-label="Graf markah lapan percubaan terakhir, peratus diperoleh pada setiap semakan">
        ${items.map(v=>`<div class="hn-lc-bar-pair" title="Percubaan ${v.number}: ${v.score}/${v.total} (${v.percent}%)">
          <span>${v.percent}%</span><div class="hn-lc-bar-track"><div class="hn-lc-bar-fill" style="height:${v.percent}%"></div></div>
          <small>#${v.number}</small></div>`).join('')}
      </div>
      <p class="hn-lc-chart-caption">Markah ialah hasil semakan latihan pada pelayar ini sahaja. Bilangan percubaan tinggi menunjukkan usaha berlatih, bukan kegagalan.</p>`;
  }
  function refresh() {
    const state=safeRead();
    const done=state.completed.filter(Boolean).length;
    $('#hn-lc-done').textContent=`${done}/4`;
    $('#hn-lc-xp').textContent=String(xpOf(state.completed));
    $('#hn-lc-total-attempts').textContent=String(state.counts.reduce((a,b)=>a+b,0));
    const next=state.completed.findIndex(v=>!v);
    $('#hn-lc-next').textContent=next<0?'✓':String(next+1).padStart(2,'0');
    $('#hn-lc-continue').textContent=next<0?'↺ Ulang Misi 1':`▶ Sambung Misi ${next+1}`;
    updateCards(state); updateChart(state);
  }
  function showJournal() {
    const i=Number($('#hn-lc-journal-choice').value);
    $('#hn-lc-note').value=notes[i] || '';
    $('#hn-lc-note-status').textContent='Catatan peribadi latihan; belum dihantar kepada guru. Elakkan maklumat peribadi.';
  }
  root.addEventListener('click',event=>{
    const launch=event.target.closest('[data-lc-open]');
    if(launch) { window.openStudentMission?.(Number(launch.dataset.lcOpen));return; }
    const f=event.target.closest('[data-lc-filter]');
    if(f) {
      filter=f.dataset.lcFilter;
      filterButtons.forEach(b=>{const active=b===f;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
      refresh();
    }
  });
  $('#hn-lc-continue').addEventListener('click',()=>{
    const next=safeRead().completed.findIndex(v=>!v);
    window.openStudentMission?.(next<0?0:next);
  });
  $('#hn-lc-choice').addEventListener('change',refresh);
  $('#hn-lc-journal-choice').addEventListener('change',showJournal);
  $('#hn-lc-save-note').addEventListener('click',()=>{
    const i=Number($('#hn-lc-journal-choice').value);
    notes[i]=$('#hn-lc-note').value.slice(0,1200);
    try{
      localStorage.setItem(JOURNAL_KEY,JSON.stringify(notes));
      $('#hn-lc-note-status').textContent='✓ Catatan berjaya disimpan pada pelayar ini sahaja, bukan dihantar kepada guru.';
    }catch(error){
      $('#hn-lc-note-status').textContent='Storan pelayar tidak tersedia. Salin catatan anda untuk menyimpannya di tempat lain.';
    }
  });
  $('#hn-lc-clear-note').addEventListener('click',()=>{
    const i=Number($('#hn-lc-journal-choice').value);
    if(!window.confirm('Kosongkan catatan misi ini pada peranti anda?'))return;
    notes[i]='';$('#hn-lc-note').value='';
    try{localStorage.setItem(JOURNAL_KEY,JSON.stringify(notes));}
    catch(error){/* Mode tanpa storan tetap boleh kosongkan teks. */}
    $('#hn-lc-note-status').textContent='Catatan misi ini telah dikosongkan pada pelayar.';
  });
  window.addEventListener('hikayat:attempt',refresh);
  window.addEventListener('hikayat:reset',()=>{
    notes={};
    try{localStorage.removeItem(JOURNAL_KEY);}catch(error){}
    showJournal();refresh();
  });
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  document.querySelector('[data-target="murid-pusat"]')?.addEventListener('click',refresh);
  showJournal();refresh();
})();
