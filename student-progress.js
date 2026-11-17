/** Graf kemajuan empat misi, dikira daripada semakan jawapan setempat. */
(function createStudentProgressDashboard(){
  "use strict";
  const dashboard=document.getElementById("murid-view");
  const home=document.getElementById("murid-ringkasan");
  if(!dashboard||!home)return;

  const names=["Jejak Naskhah","Balai Olah Hikayat","Warisan Bahasa","Persembahan Hikayat"];
  const labels=["Urutan + pemahaman (8 item)","Syarat asas draf (2 kriteria)","Cabaran bahasa (4 soalan)","Pelan persembahan (4 kriteria)"];
  const readStats=()=>{
    const raw=window.getStudentAttemptStats?.();
    return Array.from({length:4},(_,i)=>{
      const entry=Array.isArray(raw)?raw[i]:null;
      return {
        mission:i+1,
        completed:entry?.completed===true,
        count:Number.isFinite(entry?.count)?Math.max(0,Math.trunc(entry.count)):0,
        history:Array.isArray(entry?.history)?entry.history:[]
      };
    });
  };
  const section=document.createElement("section");
  section.id="murid-graf";
  section.className="dash-section mission-analytics";
  section.setAttribute("aria-labelledby","mission-analytics-heading");
  section.innerHTML=`
    <div class="section-line"><div><span class="mini-label">JEJAK PEMBELAJARAN</span>
      <h2 id="mission-analytics-heading">Graf Perkembangan Misi</h2>
      <p class="mission-analytics-description">Lihat jumlah percubaan dan perubahan pencapaian selepas setiap semakan jawapan atau hasil kerja.</p>
    </div><span class="small-note">Data latihan setempat · Automatik</span></div>
    <div class="mission-analytics-stats">
      <article><span>Jumlah percubaan</span><strong id="ma-total" aria-live="polite">0</strong><small>Semua empat misi</small></article>
      <article><span>Misi selesai</span><strong id="ma-complete" aria-live="polite">0 / 4</strong><small>Latihan diselesaikan</small></article>
      <article><span>Misi paling banyak dicuba</span><strong id="ma-frequent" aria-live="polite">—</strong><small id="ma-frequent-count">Belum ada percubaan</small></article>
    </div>
    <div class="mission-charts-grid">
      <div class="mission-chart-card">
        <div class="mission-chart-head"><div><h3>Bilangan Percubaan Mengikut Misi</h3>
          <p>Setiap kali murid menekan Semak selepas mengisi jawapan, satu percubaan dicatat.</p></div>
          <span class="mission-chart-icon" aria-hidden="true">📊</span></div>
        <div id="ma-bars" class="mission-chart-drawing" aria-live="polite"></div>
      </div>
      <div class="mission-chart-card">
        <div class="mission-chart-head"><div><h3>Perkembangan Setiap Percubaan</h3>
          <p>Pilih misi untuk melihat perubahan peratus pencapaian daripada semakan ke semakan.</p></div>
          <span class="mission-chart-icon" aria-hidden="true">📈</span></div>
        <label class="mission-select-label" for="ma-mission-select">Pilih misi
          <select id="ma-mission-select">
            <option value="0">Misi 1 — Jejak Naskhah</option>
            <option value="1">Misi 2 — Balai Olah</option>
            <option value="2">Misi 3 — Warisan Bahasa</option>
            <option value="3">Misi 4 — Persembahan Hikayat</option>
          </select>
        </label>
        <div id="ma-trend" class="mission-chart-drawing" aria-live="polite"></div>
      </div>
    </div>
    <div class="mission-attempt-table-card">
      <div class="mission-attempt-table-top"><h3>Rekod Percubaan Terkini</h3>
        <span id="ma-history-label">Misi 1</span></div>
      <div class="mission-table-scroll">
        <table><thead><tr><th>Percubaan</th><th>Hasil Semakan</th><th>Peratus</th><th>Tarikh & Masa</th></tr></thead>
          <tbody id="ma-history"><tr><td colspan="4">Belum ada rekod.</td></tr></tbody>
        </table>
      </div>
      <p class="mission-analytics-note"><b>Panduan membaca graf:</b> Misi 1 mengira 5 kedudukan peristiwa dan 3 jawapan pemahaman; Misi 3 mengira 4 jawapan kuiz yang betul. Misi 2 dan 4 mengukur syarat asas tugasan yang lengkap, <b>bukan gred guru</b>. Percubaan kosong atau kuiz yang belum dijawab sepenuhnya tidak dikira. Graf hanya memaparkan rekod pada pelayar/peranti ini, bukan rekod semua murid.</p>
    </div>`;
  home.after(section);
  const select=section.querySelector("#ma-mission-select");
  const bars=section.querySelector("#ma-bars");
  const trend=section.querySelector("#ma-trend");
  const historyEl=section.querySelector("#ma-history");

  function asNumber(x){
    return Number.isFinite(x)?Math.max(0,Math.round(x)):0;
  }
  function escapeText(s){
    return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function createBars(stats){
    const width=660,height=260,baseline=212,top=34,left=47,right=633;
    const max=Math.max(1,...stats.map(s=>s.count));
    const palette=["#4a8d64","#c49c54","#4a8b93","#8a6f9d"];
    const guides=[0,1,2,3,4].map(i=>{
      const number=Math.round(max*i/4);
      const y=baseline-i*(baseline-top)/4;
      return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#e2dfcf" stroke-width="1"/>
        <text x="${left-11}" y="${y+4}" text-anchor="end" font-size="12" fill="#6d7e6b">${number}</text>`;
    }).join("");
    const rects=stats.map((s,i)=>{
      const barWidth=75,center=left+(right-left)*(i+.5)/4;
      const barHeight=s.count===0?3:(baseline-top)*s.count/max;
      const y=baseline-barHeight;
      return `<g><rect x="${center-barWidth/2}" y="${y}" width="${barWidth}" height="${barHeight}" rx="9"
          fill="${palette[i]}" opacity="${s.count?1:.23}"/>
        <text x="${center}" y="${Math.max(25,y-9)}" text-anchor="middle" font-size="15" font-weight="800" fill="#2b523e">${s.count}</text>
        <text x="${center}" y="235" text-anchor="middle" font-size="13" font-weight="700" fill="#536953">Misi ${i+1}</text>
        <title>Misi ${i+1}: ${s.count} percubaan ${s.completed?", selesai":", belum selesai"}</title></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Graf palang percubaan: ${stats.map(s=>`Misi ${s.mission} ${s.count}`).join(", ")}" xmlns="http://www.w3.org/2000/svg">${guides}${rects}</svg>`;
  }
  function createTrend(s,mission){
    const entries=s.history.slice(-12);
    if(entries.length===0)return `<div class="mission-empty-chart"><span aria-hidden="true">🌱</span>
      <strong>Belum ada percubaan dicatat.</strong><p>Selesaikan semakan Misi ${mission+1} untuk melihat graf perkembangan.</p></div>`;
    const width=650,height=270,top=34,bottom=214,left=53,right=618;
    const guides=[0,25,50,75,100].map(val=>{
      const y=bottom-(bottom-top)*val/100;
      return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#e1e3d7"/>
        <text x="${left-13}" y="${y+4}" text-anchor="end" font-size="12" fill="#74806e">${val}%</text>`;
    }).join("");
    const coords=entries.map((entry,i)=>{
      const x=entries.length===1?(left+right)/2:left+(right-left)*i/(entries.length-1);
      return {x,y:bottom-(bottom-top)*Math.max(0,Math.min(100,asNumber(entry.percent)))/100,entry};
    });
    const polyline=coords.length>1?`<polyline points="${coords.map(point=>`${point.x},${point.y}`).join(" ")}"
      stroke="#317f58" stroke-width="4.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`:"";
    const dots=coords.map(({x,y,entry},i)=>`<g>
      <circle cx="${x}" cy="${y}" r="7" fill="${entry.success?"#d4ad62":"#317f58"}" stroke="#fff9e4" stroke-width="3"/>
      <title>Percubaan ${entry.number}: ${entry.score}/${entry.total}, ${entry.percent}%${entry.success?", selesai":""}</title>
      ${entries.length<=8||i===0||i===entries.length-1?`<text x="${x}" y="240" font-size="11" text-anchor="middle" fill="#52735c">${entry.number}</text>`:""}
      </g>`).join("");
    const latest=coords[coords.length-1].entry;
    return `<svg viewBox="0 0 ${width} ${height}" role="img" xmlns="http://www.w3.org/2000/svg"
      aria-label="Graf garis perkembangan Misi ${mission+1}, ${s.count} percubaan keseluruhan, skor terbaru ${latest.percent} peratus.">${guides}${polyline}${dots}
      <text x="${(left+right)/2}" y="263" text-anchor="middle" font-size="11" fill="#738370">Nombor percubaan (12 rekod terakhir)</text>
      </svg>`;
  }
  function render(){
    const stats=readStats();
    const selected=Math.max(0,Math.min(3,Number(select.value)||0));
    const total=stats.reduce((acc,item)=>acc+item.count,0);
    const finished=stats.filter(item=>item.completed).length;
    section.querySelector("#ma-total").textContent=String(total);
    section.querySelector("#ma-complete").textContent=`${finished} / 4`;
    const greatest=Math.max(...stats.map(s=>s.count));
    const frequent=stats.find(s=>s.count===greatest);
    section.querySelector("#ma-frequent").textContent=greatest?`Misi ${frequent.mission}`:"—";
    section.querySelector("#ma-frequent-count").textContent=greatest?`${greatest} percubaan`:"Belum ada percubaan";
    bars.innerHTML=createBars(stats);
    trend.innerHTML=createTrend(stats[selected],selected);
    section.querySelector("#ma-history-label").textContent=labels[selected];
    const current=stats[selected],items=current.history.slice().reverse().slice(0,8);
    if(items.length===0){
      historyEl.innerHTML=`<tr><td colspan="4">Belum ada percubaan untuk ${names[selected]}.</td></tr>`;
    }else{
      historyEl.innerHTML=items.map(a=>{
        const date=new Date(a.at);
        const readable=Number.isNaN(date.getTime())?"—":date.toLocaleString("ms-MY",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
        const score=`${asNumber(a.score)} / ${asNumber(a.total)} ${a.success?"· Selesai":""}`;
        return `<tr><td>Ke-${asNumber(a.number)}</td><td>${escapeText(score)}</td>
          <td><strong>${asNumber(a.percent)}%</strong></td><td>${escapeText(readable)}</td></tr>`;
      }).join("");
    }
  }
  select.addEventListener("change",render);
  window.addEventListener("hikayat:attempt",render);
  window.addEventListener("hikayat:progress",render);
  render();
})();
