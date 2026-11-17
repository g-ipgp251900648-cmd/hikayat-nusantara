/** Misi 1: Rumah Naskhah Pusaka, permainan 3D asli (mod demonstrasi). */
(function bootMissionOne(){
  "use strict";
  const scriptKey="hikayat-nusantara-misi1-world-v1";
  const chapters=[
    "Pada suatu petang, Melur berjalan di tepi sungai Desa Warisan. Di celah akar pokok tua, dia ternampak sebuah pelita tembaga yang berdebu.",
    "Melur membawa pelita itu kepada Tok Penghulu. Beliau bercerita bahawa pelita tersebut pernah menjadi tanda panduan penduduk ketika kampung dilanda kabus tebal.",
    "Malam itu, angin bertiup kencang dan jambatan kayu tidak kelihatan dalam kabus. Melur teringat pesan Tok Penghulu supaya menjaga cahaya warisan.",
    "Dengan bantuan rakan-rakannya, Melur membersihkan pelita lalu menyalakannya di balai kampung. Cahayanya membantu penduduk menemukan jalan pulang.",
    "Sejak hari itu, penduduk bergilir-gilir menjaga pelita. Melur sedar bahawa warisan bukan sekadar barang lama, tetapi lambang semangat saling membantu."
  ];
  const sceneNames=["Tepi sungai","Tok Penghulu","Kabus melanda","Pelita dinyalakan","Warisan dijaga"];
  const events=[
    "Melur menjumpai pelita tembaga di tepi sungai.",
    "Tok Penghulu menceritakan sejarah pelita.",
    "Kabus tebal menyelubungi kampung pada waktu malam.",
    "Melur dan rakan-rakan menyalakan pelita di balai.",
    "Penduduk bergilir-gilir menjaga pelita warisan."
  ];
  const quiz=[
    {q:"Di manakah Melur menjumpai pelita?",choices:["Di sawah padi","Di tepi sungai","Di perpustakaan"],answer:1,why:"Melur menemukan pelita di celah akar pokok tua berhampiran sungai."},
    {q:"Mengapakah pelita itu penting kepada penduduk?",choices:["Menjadi tanda panduan ketika kabus","Untuk dijual di pasar","Sebagai hadiah pertandingan"],answer:0,why:"Cahaya pelita membantu penduduk mencari jalan."},
    {q:"Apakah nilai utama yang terdapat dalam cerita?",choices:["Mementingkan diri sendiri","Berani tanpa berfikir","Kerjasama dan tanggungjawab"],answer:2,why:"Penduduk bekerjasama dan menjaga pelita secara bergilir-gilir."}
  ];
  const spots=[
    {name:"Rak Kitab",icon:"📚",x:-6.8,z:-4.4,tip:"Lihat rak kitab di bahagian kiri ruang rumah."},
    {name:"Peti Pusaka",icon:"🗝️",x:-5.7,z:2.7,tip:"Periksa peti kayu berhampiran tiang utama."},
    {name:"Tingkap Berukir",icon:"🪟",x:6.5,z:-4.4,tip:"Cari cahaya berhampiran tingkap kanan."},
    {name:"Meja Penulisan",icon:"🪶",x:5.8,z:3.3,tip:"Cuba lihat gulungan di meja penulisan."},
    {name:"Pelita Warisan",icon:"🏮",x:0,z:-3.7,tip:"Helaian terakhir disimpan berhampiran pelita bercahaya."}
  ];
  const newGame=()=>({phase:"intro",found:[false,false,false,false,false],pages:[false,false,false,false,false],page:0,sequence:[2,0,4,1,3],ordered:false,answers:["","",""],remaining:600,timed:true,paused:false,completed:false,feedback:"",lastScore:null,submitted:false});
  let game=newGame();
  try{
    const s=JSON.parse(localStorage.getItem(scriptKey)||"null");
    if(s&&typeof s==="object"){
      const f=Array.isArray(s.found)?s.found:[],p=Array.isArray(s.pages)?s.pages:[],a=Array.isArray(s.answers)?s.answers:[],q=Array.isArray(s.sequence)?s.sequence:[];
      game.found=game.found.map((_,i)=>f[i]===true);
      game.pages=game.pages.map((_,i)=>p[i]===true);
      game.sequence=q.length===5&&q.slice().sort().join()==="0,1,2,3,4"?q.slice():game.sequence;
      game.answers=game.answers.map((_,i)=>["0","1","2"].includes(String(a[i]))?String(a[i]):"");
      game.page=Math.max(0,Math.min(4,Math.trunc(Number(s.page)||0)));
      game.remaining=Math.max(0,Math.min(1200,Number(s.remaining)||600));
      game.ordered=s.ordered===true&&game.sequence.every((v,i)=>v===i);
      game.completed=s.completed===true;
      game.phase=["intro","explore","book","sequence","quiz","victory"].includes(s.phase)?s.phase:"intro";
      if(game.completed)game.phase="victory";
      if(game.phase==="book"&&!game.found.every(Boolean))game.phase="explore";
      if(["sequence","quiz"].includes(game.phase)&&!game.pages.every(Boolean))game.phase="book";
      game.paused=false;
    }
  }catch(e){console.warn("Rekod Misi 1 tidak dapat dibaca.",e);}
  const store=()=>{
    try{localStorage.setItem(scriptKey,JSON.stringify({...game,paused:false}));}catch(e){console.warn("Storan Misi 1 tidak tersedia.",e);}
  };
  const clean=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const html=document.createElement("div");
  html.id="hn-mission-one";
  html.className="hn-m1";
  html.hidden=true;
  html.innerHTML=`
    <div class="hn-m1-shell" role="dialog" aria-modal="true" aria-labelledby="hn-m1-title">
      <header class="hn-m1-header">
        <div class="hn-m1-brand"><span class="hn-m1-emblem">🏮</span><div>
          <small>HIKAYAT NUSANTARA • MISI PERTAMA</small>
          <strong id="hn-m1-title">Misteri Lima Helaian Naskhah</strong>
        </div></div>
        <div class="hn-m1-hud"><span id="hn-m1-clock">10:00</span><span id="hn-m1-progress">📜 0/5</span><span id="hn-m1-stage">Pencarian</span></div>
        <div class="hn-m1-head-buttons">
          <button type="button" data-act="music" id="hn-m1-music" title="Main atau jeda muzik tradisional">♫ Muzik</button>
          <button type="button" data-act="pause" id="hn-m1-pause">Ⅱ Jeda</button>
          <button type="button" data-act="close" class="hn-m1-x" aria-label="Tutup permainan">✕</button>
        </div>
      </header>
      <div class="hn-m1-main">
        <section class="hn-m1-scene" aria-label="Rumah Naskhah Pusaka tiga dimensi">
          <div id="hn-m1-viewport" class="hn-m1-viewport"></div>
          <div id="hn-m1-fallback" class="hn-m1-fallback" hidden>
            <div class="hn-m1-fallback-art"><span>🏡</span><strong>Rumah Naskhah Pusaka</strong>
              <p>Teroka kelima-lima sudut rumah untuk mencari helaian bercahaya.</p></div>
          </div>
          <div class="hn-m1-scene-caption"><span>🌿 Rumah Naskhah Pusaka</span><small id="hn-m1-travel">Arahkan Hang Tuah menuju objek yang bercahaya</small></div>
          <div class="hn-m1-move"><button type="button" data-move="left" aria-label="Gerak kiri">←</button>
            <button type="button" data-move="up" aria-label="Gerak hadapan">↑</button>
            <button type="button" data-move="down" aria-label="Gerak belakang">↓</button>
            <button type="button" data-move="right" aria-label="Gerak kanan">→</button></div>
        </section>
        <section class="hn-m1-panel" aria-live="polite" id="hn-m1-panel"></section>
      </div>
      <footer class="hn-m1-footer"><span>WASD / Anak panah: bergerak • Klik lokasi: pergi ke lokasi • E: periksa</span>
        <span>Latihan demonstrasi disimpan pada pelayar ini sahaja.</span></footer>
    </div>`;
  document.body.append(html);
  const $=s=>html.querySelector(s);
  const panel=$("#hn-m1-panel"),viewport=$("#hn-m1-viewport"),fallback=$("#hn-m1-fallback");
  let isOpen=false,world=null,timer=null,last=0,movedKeys=new Set(),autoTarget=null,tickId=0;
  const timeText=n=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
  function sound(){
    let ctx=null,gain=null,index=0,interval=null,enabled=false;
    const scale=[392,440,523.25,587.33,659.25,587.33,523.25,440,392,329.63,392,440,523.25,440,392,329.63];
    function note(frequency,when,duration,vol=.025){
      if(!ctx)return;
      const oscillator=ctx.createOscillator(),envelope=ctx.createGain();
      oscillator.type="sine";
      oscillator.frequency.setValueAtTime(frequency,when);
      envelope.gain.setValueAtTime(0.0001,when);
      envelope.gain.exponentialRampToValueAtTime(vol,when+.045);
      envelope.gain.exponentialRampToValueAtTime(.0001,when+duration);
      oscillator.connect(envelope);envelope.connect(gain);
      oscillator.start(when);oscillator.stop(when+duration+.02);
    }
    async function toggle(){
      if(enabled){stop();return;}
      try{
        ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();
        await ctx.resume();
        gain=gain||ctx.createGain();gain.gain.value=.7;gain.connect(ctx.destination);
        enabled=true;index=0;
        interval=window.setInterval(()=>{if(!enabled||!isOpen)return;note(scale[index%scale.length],ctx.currentTime,.34,.027);if(index%4===0)note(196,ctx.currentTime,.5,.01);index++;},415);
        refreshAudio();
      }catch(e){game.feedback="Audio tidak disokong pada peranti ini.";render();}
    }
    function stop(){enabled=false;clearInterval(interval);interval=null;refreshAudio();}
    function chime(){if(!enabled||!ctx)return;[523,659,784].forEach((n,i)=>note(n,ctx.currentTime+i*.12,.3,.04));}
    function refreshAudio(){const b=$("#hn-m1-music");if(b)b.textContent=enabled?"♫ Henti Muzik":"♫ Main Muzik";}
    return {toggle,stop,chime,isPlaying:()=>enabled};
  }
  const audio=sound();
  function persist(){store();updateHud();}
  function updateHud(){
    $("#hn-m1-clock").textContent=game.timed?timeText(game.remaining):"∞ Masa";
    $("#hn-m1-progress").textContent=`📜 ${game.found.filter(Boolean).length}/5`;
    const stages={intro:"Pengenalan",explore:"Cari naskhah",book:"Baca cerita",sequence:"Susun peristiwa",quiz:"Kuiz pemahaman",victory:"Misi selesai"};
    $("#hn-m1-stage").textContent=stages[game.phase]||"Misi 1";
    $("#hn-m1-pause").textContent=game.paused?"▶ Sambung":"Ⅱ Jeda";
  }
  function flash(msg){
    const n=$("#hn-m1-travel");
    n.textContent=msg;
    if(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)n.classList.add("hn-m1-flash");
    setTimeout(()=>n.classList.remove("hn-m1-flash"),650);
  }
  function render(){
    updateHud();
    $(".hn-m1-scene").classList.toggle("hn-m1-scene-small",!["intro","explore"].includes(game.phase));
    $(".hn-m1-move").hidden=game.phase!=="explore";
    if(game.phase==="intro"){
      panel.innerHTML=`<div class="hn-m1-content"><span class="hn-m1-eyebrow">🏮 PELITA PEMBIMBING</span>
        <h2>Selamat datang ke Rumah Naskhah Pusaka!</h2>
        <p>Wahai pengembara muda! Lima helaian Kitab Warisan telah hilang. Bantu Hang Tuah mencarinya, baca kisah pelita dan selesaikan cabaran bahasa.</p>
        <div class="hn-m1-steps"><span>① Cari lima helaian</span><span>② Baca 5 halaman</span><span>③ Susun peristiwa</span><span>④ Jawab 3 soalan</span></div>
        <div class="hn-m1-config"><label><input id="hn-m1-timed" type="checkbox" ${game.timed?"checked":""}/> Pemasa panduan 10 minit</label></div>
        <button type="button" class="hn-m1-primary" data-act="start">Mulakan Pengembaraan ✦</button>
        <p class="hn-m1-caption">Muzik instrumental asli yang disintesis boleh dihidupkan selepas permulaan permainan. Tidak menggunakan rakaman instrumen sebenar.</p></div>`;
    }else if(game.phase==="explore"){
      panel.innerHTML=`<div class="hn-m1-content"><span class="hn-m1-eyebrow">CABARAN 1 / 4 • JEJAK NASKHAH</span>
        <h2>Cari lima helaian tersembunyi</h2>
        <p>Bergerak bersama Hang Tuah atau pilih lokasi di bawah. Objek yang belum ditemukan akan bercahaya.</p>
        <div class="hn-m1-findings">${spots.map((item,i)=>`<button type="button" class="hn-m1-location ${game.found[i]?"done":""}" data-visit="${i}" ${game.found[i]?"disabled":""}>
          <span>${item.icon}</span><span><strong>${clean(item.name)}</strong><small>${game.found[i]?"✓ Helaian ditemukan":"Pergi dan periksa"}</small></span><b>${game.found[i]?"✓":"→"}</b>
        </button>`).join("")}</div>
        <div class="hn-m1-action-row"><button type="button" data-act="hint">✨ Petunjuk Hang Tuah</button>
        ${game.found.every(Boolean)?'<button class="hn-m1-primary" type="button" data-act="open-book">Baca Kitab Warisan →</button>':""}</div>
        <p class="hn-m1-feedback" role="status">${clean(game.feedback)}</p></div>`;
    }else if(game.phase==="book"){
      const i=game.page;game.pages[i]=true;store();
      panel.innerHTML=`<div class="hn-m1-content hn-m1-book"><span class="hn-m1-eyebrow">CABARAN 2 / 4 • KITAB WARISAN</span>
        <h2>Cahaya Pelita di Desa Warisan</h2>
        <div class="hn-m1-book-page"><span class="hn-m1-book-icon">${["🌳","👴","🌫️","🏮","🤝"][i]}</span><small>HALAMAN ${i+1} / 5 • ${clean(sceneNames[i])}</small>
          <p>${clean(chapters[i])}</p></div>
        <div class="hn-m1-action-row"><button type="button" data-act="page-prev" ${i===0?"disabled":""}>← Sebelumnya</button>
        ${i<4?'<button type="button" class="hn-m1-primary" data-act="page-next">Halaman seterusnya →</button>':
          `<button type="button" class="hn-m1-primary" data-act="sequence" ${game.pages.every(Boolean)?"":"disabled"}>Susun Peristiwa →</button>`}</div>
        <div class="hn-m1-action-row"><button type="button" data-act="narrate">🔊 Dengar Halaman</button><button type="button" data-act="stop-voice">Ⅱ Henti Bacaan</button></div>
        <p class="hn-m1-caption">Baca atau dengar cerita. Halaman yang telah dilihat disimpan dalam rekod latihan.</p></div>`;
    }else if(game.phase==="sequence"){
      panel.innerHTML=`<div class="hn-m1-content"><span class="hn-m1-eyebrow">CABARAN 3 / 4 • SUSUN NASKHAH</span>
        <h2>Susun lima peristiwa</h2><p>Baca semula kisah, kemudian susun peristiwa dari awal hingga akhir.</p>
        <ol class="hn-m1-order">${game.sequence.map((index,i)=>`<li><span class="hn-m1-order-no">${i+1}</span><span>${clean(events[index])}</span>
          <div class="hn-m1-order-arrows"><button aria-label="Naikkan kad ${i+1}" data-order="${i}" data-dir="-1" ${i===0?"disabled":""}>↑</button>
          <button aria-label="Turunkan kad ${i+1}" data-order="${i}" data-dir="1" ${i===4?"disabled":""}>↓</button></div></li>`).join("")}</ol>
        <div class="hn-m1-action-row"><button type="button" data-act="back-book">📖 Baca Semula</button>
        <button type="button" class="hn-m1-primary" data-act="check-order">Semak Urutan ✓</button></div>
        ${game.ordered?'<button type="button" class="hn-m1-primary hn-m1-wide" data-act="quiz">Teruskan ke Detektif Pemahaman →</button>':""}
        <p class="hn-m1-feedback" role="status">${clean(game.feedback)}</p></div>`;
    }else if(game.phase==="quiz"){
      panel.innerHTML=`<div class="hn-m1-content"><span class="hn-m1-eyebrow">CABARAN 4 / 4 • DETEKTIF PEMAHAMAN</span>
        <h2>Uji kefahaman hikayat</h2><p>Pilih satu jawapan bagi setiap soalan. Setiap semakan lengkap direkodkan sebagai satu percubaan.</p>
        <div class="hn-m1-questions">${quiz.map((q,i)=>`<fieldset><legend>${i+1}. ${clean(q.q)}</legend>
          ${q.choices.map((v,j)=>`<label class="hn-m1-option ${game.answers[i]===String(j)?"selected":""}">
            <input type="radio" name="hn-m1-q${i}" value="${j}" data-answer="${i}" ${game.answers[i]===String(j)?"checked":""}/> ${clean(v)}
          </label>`).join("")}</fieldset>`).join("")}</div>
        <div class="hn-m1-action-row"><button type="button" data-act="back-order">← Semak Susunan</button>
        <button type="button" class="hn-m1-primary" data-act="submit" ${game.submitted?"disabled":""}>Semak Keseluruhan (8 markah) ✓</button></div>
        <p class="hn-m1-feedback" role="status">${clean(game.feedback)}</p></div>`;
    }else if(game.phase==="victory"){
      panel.innerHTML=`<div class="hn-m1-content hn-m1-victory"><span class="hn-m1-victory-icon">🏆</span>
        <span class="hn-m1-eyebrow">MISI PERTAMA SELESAI</span>
        <h2>Kitab Warisan berjaya dipulihkan!</h2>
        <p>Syabas, pengembara muda! Hang Tuah berbangga kerana kamu telah memahami kisah dan menjaga warisan bahasa.</p>
        <div class="hn-m1-victory-xp">🏮 Lencana Penjaga Naskhah <strong>+60 XP</strong></div>
        <div class="hn-m1-action-row"><button type="button" data-act="close">Kembali ke Desa</button>
        <button class="hn-m1-primary" type="button" data-act="next-mission">Teruskan Misi 2 →</button></div>
        <p class="hn-m1-caption">Ini ganjaran latihan Misi 1. Sijil akhir masih memerlukan keempat-empat misi dan semakan guru.</p></div>`;
    }
  }
  function speak(){
    if(!("speechSynthesis" in window)){game.feedback="Pelayar tidak menyokong bacaan suara.";render();return;}
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(chapters[game.page]);
    utterance.lang="ms-MY";utterance.rate=.92;
    window.speechSynthesis.speak(utterance);
  }
  function startTimer(){
    clearInterval(timer);last=Date.now();
    timer=setInterval(()=>{
      if(!isOpen||game.paused||!game.timed||game.phase==="intro"||game.phase==="victory"){last=Date.now();return;}
      const now=Date.now(),elapsed=Math.min(2,Math.max(0,(now-last)/1000));last=now;
      game.remaining=Math.max(0,game.remaining-elapsed);
      $("#hn-m1-clock").textContent=timeText(Math.ceil(game.remaining));
      if(game.remaining===0){game.paused=true;game.feedback="Masa panduan tamat. Tambah tiga minit atau teruskan tanpa pemasa.";store();render();showTimeChoice();}
    },1000);
  }
  function showTimeChoice(){
    const dialog=document.createElement("div");dialog.className="hn-m1-time-prompt";
    dialog.innerHTML=`<div role="alertdialog" aria-modal="true" aria-labelledby="hn-m1-time-title">
      <h3 id="hn-m1-time-title">⏳ Masa panduan tamat</h3><p>Tiada kemajuan dipadam. Pilih cara meneruskan pembelajaran.</p>
      <button type="button" data-time="180">Tambah 3 minit</button>
      <button type="button" data-time="unlimited">Teruskan tanpa pemasa</button></div>`;
    html.append(dialog);dialog.querySelector("button")?.focus();
    dialog.addEventListener("click",e=>{
      const b=e.target.closest("[data-time]");if(!b)return;
      if(b.dataset.time==="unlimited")game.timed=false;
      else game.remaining=180;
      game.paused=false;persist();dialog.remove();
    });
  }
  function collect(index){
    if(!isOpen||game.phase!=="explore"||game.paused||game.found[index])return;
    game.found[index]=true;game.feedback=`✨ ${spots[index].name}: helaian naskhah ditemukan!`;
    autoTarget=null;world?.hideSpot(index);audio.chime();persist();render();
    if(game.found.every(Boolean)){flash("Semua lima helaian telah dikumpulkan. Buka Kitab Warisan!");}
  }
  function checkOrder(){
    const correct=game.sequence.reduce((n,v,i)=>n+Number(v===i),0);
    game.ordered=correct===5;
    game.feedback=game.ordered?"Syabas! Lima peristiwa telah disusun dengan tepat.":"Ada "+correct+"/5 kedudukan tepat. Petunjuk: Melur menemui pelita sebelum Tok Penghulu menerangkan sejarahnya.";
    persist();render();
  }
  function submit(){
    if(game.submitted)return;
    if(!game.answers.every(a=>a!=="")){game.feedback="Jawab ketiga-tiga soalan sebelum semakan. Percubaan belum dikira.";render();return;}
    if(!game.found.every(Boolean)||!game.pages.every(Boolean)||!game.ordered){game.feedback="Lengkapkan semua cabaran dahulu.";render();return;}
    game.submitted=true;
    const call=window.submitMissionOneAdventure;
    const result=typeof call==="function"?call({found:game.found,pages:game.pages,sequence:game.sequence,answers:game.answers}):null;
    const score=quiz.reduce((n,q,i)=>n+Number(Number(game.answers[i])===q.answer),0);
    const success=score===3&&game.sequence.every((v,i)=>v===i);
    if(result&&!result.ok){game.submitted=false;game.feedback=result.message;render();return;}
    if(success){
      game.completed=true;game.phase="victory";game.feedback="";game.lastScore=8;
      audio.chime();persist();render();
    }else{
      game.lastScore=5+score;
      const firstIncorrect=quiz.findIndex((q,i)=>q.answer!==Number(game.answers[i]));
      game.feedback=`${5+score}/8 markah. ${quiz[firstIncorrect].why} Betulkan jawapan dan cuba lagi.`;
      persist();render();
    }
  }
  function action(act,e){
    if(act==="close"){close();return;}
    if(act==="music"){audio.toggle();return;}
    if(act==="pause"){game.paused=!game.paused;persist();return;}
    if(act==="start"){
      const cb=$("#hn-m1-timed");game.timed=!!cb?.checked;
      game.phase="explore";game.paused=false;game.feedback="";
      persist();render();start3D();audio.toggle();return;
    }
    if(game.paused)return;
    if(act==="hint"){
      const i=game.found.findIndex(x=>!x);game.feedback=i>=0?spots[i].tip:"Semua helaian ditemui. Klik Baca Kitab Warisan.";
      render();return;
    }
    if(act==="open-book"&&game.found.every(Boolean)){game.phase="book";game.page=0;persist();render();return;}
    if(act==="page-prev"){game.page=Math.max(0,game.page-1);persist();render();return;}
    if(act==="page-next"){game.page=Math.min(4,game.page+1);persist();render();return;}
    if(act==="sequence"&&game.pages.every(Boolean)){game.phase="sequence";game.feedback="";persist();render();return;}
    if(act==="back-book"){game.phase="book";persist();render();return;}
    if(act==="check-order"){checkOrder();return;}
    if(act==="quiz"&&game.ordered){game.phase="quiz";game.feedback="";persist();render();return;}
    if(act==="back-order"){game.phase="sequence";persist();render();return;}
    if(act==="submit"){submit();return;}
    if(act==="narrate"){speak();return;}
    if(act==="stop-voice"){window.speechSynthesis?.cancel();return;}
    if(act==="next-mission"){close();window.openStudentMission?.(1);return;}
  }
  html.addEventListener("click",e=>{
    const move=e.target.closest("[data-visit]");
    if(move){const i=Number(move.dataset.visit);if(!Number.isInteger(i)||game.found[i])return;
      if(world){autoTarget=i;flash(`Hang Tuah menuju ${spots[i].name}…`);}
      else collect(i);return;
    }
    const order=e.target.closest("[data-order]");
    if(order){
      const i=Number(order.dataset.order),j=i+Number(order.dataset.dir);
      if(i>=0&&i<5&&j>=0&&j<5){
        [game.sequence[i],game.sequence[j]]=[game.sequence[j],game.sequence[i]];
        game.ordered=false;game.feedback="";persist();render();
      }
      return;
    }
    const b=e.target.closest("[data-act]");if(b)action(b.dataset.act,e);
  });
  html.addEventListener("change",e=>{
    if(e.target.matches("[data-answer]")){
      const i=Number(e.target.dataset.answer);
      game.answers[i]=String(e.target.value);game.submitted=false;game.feedback="";persist();render();
    }
  });
  function keyDirection(key){
    return ({"w":"up","arrowup":"up","s":"down","arrowdown":"down","a":"left","arrowleft":"left","d":"right","arrowright":"right"})[key.toLowerCase()];
  }
  function keyDown(e){
    if(!isOpen)return;
    if(e.key==="Escape"){close();return;}
    if(game.phase!=="explore"||game.paused)return;
    const d=keyDirection(e.key);if(d){movedKeys.add(d);autoTarget=null;e.preventDefault();}
    if(e.key.toLowerCase()==="e"&&world){
      const i=world.nearest();if(i>=0)collect(i);
    }
  }
  function keyUp(e){const d=keyDirection(e.key);if(d)movedKeys.delete(d);}
  document.addEventListener("keydown",keyDown);
  document.addEventListener("keyup",keyUp);
  html.querySelectorAll("[data-move]").forEach(button=>{
    button.addEventListener("pointerdown",e=>{movedKeys.add(button.dataset.move);autoTarget=null;button.setPointerCapture?.(e.pointerId);});
    button.addEventListener("pointerup",()=>movedKeys.delete(button.dataset.move));
    button.addEventListener("pointercancel",()=>movedKeys.delete(button.dataset.move));
    button.addEventListener("lostpointercapture",()=>movedKeys.delete(button.dataset.move));
  });
  async function start3D(){
    if(world||!isOpen)return;
    fallback.hidden=false;fallback.querySelector("p").textContent="Memuatkan Rumah Naskhah 3D… Anda juga boleh menggunakan pilihan lokasi.";
    let THREE;
    try{
      THREE=await import("https://cdn.jsdelivr.net/npm/three@0.177.0/build/three.module.js");
      if(!isOpen)return;
      const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"low-power"});
      renderer.setPixelRatio(Math.min(1.6,window.devicePixelRatio||1));
      renderer.setSize(Math.max(260,viewport.clientWidth),Math.max(280,viewport.clientHeight));
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
      viewport.append(renderer.domElement);
      const scene=new THREE.Scene();scene.background=new THREE.Color(0xc4dfd2);
      scene.fog=new THREE.Fog(0xc4dfd2,30,65);
      const camera=new THREE.PerspectiveCamera(42,1,.1,110);
      const amb=new THREE.HemisphereLight(0xfff1d2,0x6b8f6a,2.2);scene.add(amb);
      const sun=new THREE.DirectionalLight(0xffd59d,3.2);sun.position.set(-10,22,13);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
      sun.shadow.camera.left=-30;sun.shadow.camera.right=30;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;scene.add(sun);
      const green=new THREE.MeshStandardMaterial({color:0x649d67,roughness:.96});
      const soil=new THREE.MeshStandardMaterial({color:0xb28b60,roughness:.97});
      const wood=new THREE.MeshStandardMaterial({color:0x84522f,roughness:.83});
      const woodLight=new THREE.MeshStandardMaterial({color:0xb78550,roughness:.83});
      const roof=new THREE.MeshStandardMaterial({color:0x866a45,roughness:.92});
      const gold=new THREE.MeshStandardMaterial({color:0xe8b858,roughness:.42,metalness:.45});
      const paper=new THREE.MeshStandardMaterial({color:0xffe8a3,emissive:0xe0a24a,emissiveIntensity:.6,roughness:.56,side:THREE.DoubleSide});
      const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.78});
      function mesh(geo,material,x,y,z,parent=scene){
        const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
      }
      function box(x,y,z,w,h,d,material,parent=scene){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);}
      function ball(x,y,z,r,material,parent=scene){return mesh(new THREE.SphereGeometry(r,9,7),material,x,y,z,parent);}
      function cylinder(x,y,z,r,ht,material,parent=scene){return mesh(new THREE.CylinderGeometry(r,r,ht,9),material,x,y,z,parent);}
      // Tropical landscape surrounding the open-front interior.
      box(0,-.55,0,62,.4,60,green);
      box(0,-.18,0,23,.35,18,soil);
      box(0,-.02,0,20,.25,14,woodLight);
      for(let i=0;i<18;i++){
        const x=(i%6-2.5)*3.7,z=(Math.floor(i/6)-1)*6.5;
        box(x,.13,z,2.7,.03,4.7,woodLight);
      }
      // A cutaway Malay timber house, readable and navigable.
      box(0,2.4,-7.1,20,4.8,.26,wood);
      box(-10,2.4,-.2,.26,4.8,13.7,wood);
      box(10,2.4,-.2,.26,4.8,13.7,wood);
      for(const x of [-9.7,-4.8,0,4.8,9.7]){
        cylinder(x,2.6,-6.8,.19,5.2,woodLight);
        cylinder(x,2.6,6.5,.19,5.2,woodLight);
      }
      // Roof eaves without blocking view, and songket-inspired rafters.
      box(0,5.14,-6.3,21,.35,2.1,roof);
      box(0,5.08,5.92,21,.36,1.6,roof);
      for(const x of [-7,-3,1,5,9])box(x,4.9,-6.4,.11,.1,1.8,gold);
      const windowMat=new THREE.MeshStandardMaterial({color:0x92c9d1,emissive:0x38778d,emissiveIntensity:.2,roughness:.2,transparent:true,opacity:.82});
      box(5.6,2.8,-6.88,4.2,2.2,.13,windowMat);
      for(const x of [3.5,5.5,7.6])box(x,2.8,-6.66,.09,2.4,.17,woodLight);
      box(5.6,2.8,-6.64,4.3,.1,.16,woodLight);
      // Bookshelf and many manuscript spines.
      box(-7,1.7,-5.5,3,3.3,1.2,wood);
      for(let j=0;j<3;j++){
        box(-7,.65+j*.95,-4.78,3,.12,.8,woodLight);
        for(let k=0;k<7;k++)box(-8.15+k*.37,1+j*.93,-4.88,.23,.7,.3,mat([0x8b4b39,0x496950,0x7e7048][(j+k)%3]));
      }
      // Treasure chest with golden trim.
      box(-5.8,.55,2.65,2,1.1,1.3,wood);
      box(-5.8,1.17,2.65,2.1,.28,1.4,woodLight);
      box(-5.8,.65,3.36,1.6,.12,.09,gold);
      // Writing desk and scrolls.
      box(5.7,1.35,3.35,3,.25,1.75,wood);
      for(const x of [4.5,6.9])for(const z of [2.7,4])box(x,.61,z,.18,1.2,.18,woodLight);
      box(5.9,1.51,3.3,.95,.07,.58,paper);
      cylinder(5.1,1.63,3.2,.14,.3,gold);
      // Central glowing lantern.
      cylinder(0,1,-4.25,.57,1.7,gold);
      ball(0,1.8,-4.25,.45,new THREE.MeshStandardMaterial({color:0xffd97c,emissive:0xffa637,emissiveIntensity:2}));
      const glow=new THREE.PointLight(0xffc25d,9,12);glow.position.set(0,2,-4.25);scene.add(glow);
      box(0,.8,-1,3.6,1.5,2,wood);
      box(0,1.6,-1,4,.16,2.2,woodLight);
      box(0,1.71,-1,1.6,.12,1.1,paper);
      // Wooden paths, rice-green trees, rocks and flowers.
      const foliage=new THREE.MeshStandardMaterial({color:0x43825d,roughness:1});
      for(let i=0;i<35;i++){
        const angle=i*2.39996,r=13+(i%5)*3;
        const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
        cylinder(x,.9,z,.18,2.1,wood);
        ball(x,2.3,z,.95+((i%3)*.11),foliage);
        if(i%3===0)ball(x+.45,1.8,z-.22,.65,foliage);
      }
      const flowers=[0xf3bb59,0xef8992,0xf3f1d7];
      for(let i=0;i<72;i++){
        const x=Math.sin(i*7.43)*13,z=12+Math.cos(i*4.23)*10;
        ball(x,.09,z,.1,mat(flowers[i%3]));
      }
      // Stylized Hang Tuah: animated limbs, green Baju Melayu, tanjak and songket.
      const avatar=new THREE.Group();scene.add(avatar);avatar.position.set(-1,0,5);
      const shirt=mat(0x18634b),samping=mat(0xb49656),skin=mat(0xd9a476),dark=mat(0x292f2c);
      const torso=box(0,1.35,0,.8,1.2,.48,shirt,avatar);
      box(0,.72,0,.8,.45,.51,samping,avatar);
      const head=ball(0,2.28,0,.36,skin,avatar);
      box(0,2.61,0,.64,.17,.63,shirt,avatar);
      const tanjak=mesh(new THREE.ConeGeometry(.52,.55,5),gold,0,2.92,0,avatar);tanjak.rotation.z=.22;
      for(const x of [-.14,.14])ball(x,2.28,.32,.045,dark,avatar);
      const leftArm=box(-.53,1.38,0,.23,.95,.28,shirt,avatar),rightArm=box(.53,1.38,0,.23,.95,.28,shirt,avatar);
      const leftLeg=box(-.22,.35,0,.27,.67,.29,dark,avatar),rightLeg=box(.22,.35,0,.27,.67,.29,dark,avatar);
      // Interactive scrolls emit a soft glow and turn invisible when collected.
      const locations=[],pickables=[];
      spots.forEach((spot,i)=>{
        const scroll=new THREE.Group();scroll.position.set(spot.x,1.9,spot.z);
        const paperM=mesh(new THREE.BoxGeometry(.73,.49,.09),paper,0,0,0,scroll);
        paperM.userData.missionSpot=i;
        const aura=ball(0,.05,0,.55,new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:.20,depthWrite:false}),scroll);
        aura.userData.missionSpot=i;scroll.userData.index=i;
        scroll.visible=!game.found[i];scene.add(scroll);locations.push(scroll);
        pickables.push(paperM,aura);
      });
      const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
      renderer.domElement.addEventListener("click",e=>{
        if(game.phase!=="explore")return;
        const rect=renderer.domElement.getBoundingClientRect();
        pointer.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));
        ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(pickables,true);
        if(hits.length){const i=hits[0].object.userData.missionSpot;if(Number.isInteger(i)){autoTarget=i;flash(`Hang Tuah menuju ${spots[i].name}…`);}}
      });
      const clock=new THREE.Clock(),camTarget=new THREE.Vector3();
      function step(){
        if(!isOpen||!world)return;
        tickId=requestAnimationFrame(step);
        const dt=Math.min(clock.getDelta(),.05);
        if(game.phase==="explore"&&!game.paused){
          const direction=new THREE.Vector3();
          if(movedKeys.has("left"))direction.x-=1;
          if(movedKeys.has("right"))direction.x+=1;
          if(movedKeys.has("up"))direction.z-=1;
          if(movedKeys.has("down"))direction.z+=1;
          if(autoTarget!==null){
            direction.set(spots[autoTarget].x-avatar.position.x,0,spots[autoTarget].z-avatar.position.z);
            if(direction.length()<1.45){const reached=autoTarget;autoTarget=null;collect(reached);direction.set(0,0,0);}
          }
          const walking=direction.lengthSq()>.001;
          if(walking){
            direction.normalize();
            avatar.position.addScaledVector(direction,dt*4.5);
            avatar.position.x=Math.max(-8.7,Math.min(8.7,avatar.position.x));
            avatar.position.z=Math.max(-5.3,Math.min(5.8,avatar.position.z));
            avatar.rotation.y=Math.atan2(direction.x,direction.z);
            const t=performance.now()*.009;
            leftLeg.rotation.x=Math.sin(t)*.45;rightLeg.rotation.x=-Math.sin(t)*.45;
            leftArm.rotation.x=-Math.sin(t)*.32;rightArm.rotation.x=Math.sin(t)*.32;
            torso.position.y=1.35+Math.abs(Math.sin(t))*.045;
          }else{
            leftLeg.rotation.x*=.83;rightLeg.rotation.x*=.83;leftArm.rotation.x*=.83;rightArm.rotation.x*=.83;torso.position.y=1.35;
          }
        }
        locations.forEach((obj,i)=>{if(obj.visible)obj.rotation.y+=dt*.4;});
        const desired=new THREE.Vector3(avatar.position.x+9,13,avatar.position.z+15);
        camera.position.lerp(desired,Math.min(1,dt*2.8));
        camTarget.set(avatar.position.x,1.1,avatar.position.z-1);
        camera.lookAt(camTarget);
        renderer.render(scene,camera);
      }
      const resize=()=>{
        if(!viewport.isConnected)return;
        const w=Math.max(260,viewport.clientWidth),h=Math.max(250,viewport.clientHeight);
        camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
      };
      resize();
      const obs=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;obs?.observe(viewport);
      const onResize=()=>resize();window.addEventListener("resize",onResize);
      world={
        nearest(){
          const available=spots.map((s,i)=>({i,d:Math.hypot(s.x-avatar.position.x,s.z-avatar.position.z)})).filter(s=>!game.found[s.i]&&s.d<2.2).sort((a,b)=>a.d-b.d);
          return available.length?available[0].i:-1;
        },
        hideSpot(i){locations[i].visible=false;},
        dispose(){
          obs?.disconnect();window.removeEventListener("resize",onResize);cancelAnimationFrame(tickId);
          scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
          renderer.dispose();renderer.domElement.remove();
        }
      };
      fallback.hidden=true;step();
    }catch(e){
      console.warn("3D tidak dapat dimulakan; mod lokasi mesra akses kekal tersedia.",e);
      fallback.hidden=false;fallback.querySelector("p").textContent="Paparan 3D tidak tersedia. Pilih lokasi melalui butang di sebelah untuk meneroka semua aktiviti.";
    }
  }
  function open(){
    if(isOpen)return;
    isOpen=true;html.hidden=false;document.body.classList.add("hn-m1-lock");
    render();startTimer();if(game.phase!=="intro")start3D();
  }
  function close(){
    if(!isOpen)return;
    isOpen=false;html.hidden=true;document.body.classList.remove("hn-m1-lock");
    movedKeys.clear();autoTarget=null;audio.stop();window.speechSynthesis?.cancel();
    clearInterval(timer);timer=null;game.paused=false;store();
    world?.dispose();world=null;
  }
  const previous=window.openStudentMission;
  window.openStudentMission=index=>index===0?open():previous?.(index);
  window.openMissionOneAdventure=open;
  window.addEventListener("hikayat:reset",()=>{
    game=newGame();audio.stop();world?.dispose();world=null;autoTarget=null;store();
    if(isOpen){render();start3D();}
  });
  window.addEventListener("pagehide",()=>{if(isOpen)close();});
})();
