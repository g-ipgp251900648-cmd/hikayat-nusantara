/* Maklum balas guru bagi setiap misi — bacaan murid sahaja.
   Rekod hanya berasal daripada sesi murid dan komen yang telah diterbitkan oleh guru. */
(async()=>{
  'use strict';
  const root=document.getElementById('murid-portfolio');
  if(!root)return;
  const user=await window.hnGetSession?.().catch(()=>null);
  if(!user||user.role!=='murid'||user.mustChangePassword)return;
  const el=(tag,text,cls)=>{
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=String(text);
    if(cls)node.className=cls;
    return node;
  };
  const names=['Jejak Naskhah Pusaka','Balai Olah Hikayat','Warisan Bahasa','Pentas Warisan'];
  const previous=root.querySelector('.split-cards');
  if(previous)previous.remove();
  const originalHeading=root.querySelector('.section-line');
  if(originalHeading){
    const heading=originalHeading.querySelector('h2');
    if(heading)heading.textContent='Maklum Balas Guru';
    const caption=originalHeading.querySelector('.mini-label');
    if(caption)caption.textContent='ULASAN GURU · MISI 1–4';
  }
  const panel=el('section','','hn-pupil-portfolio');
  panel.append(el('p','Baca komen guru bagi setiap misi. Ulasan Misi 4 boleh merujuk kepada rakaman video yang telah dihantar.','hn-learning-muted'));
  const status=el('p','','hn-learning-message');
  status.setAttribute('role','status');
  const grid=el('div','','hn-feedback-mission-grid');
  grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin:16px 0';
  panel.append(grid,status);
  const refresh=el('button','↻ Muat Semula Maklum Balas','hn-learning-refresh');
  refresh.type='button';panel.append(refresh);
  root.append(panel);
  function date(value){
    const time=new Date(value);
    return Number.isNaN(time.getTime())?'':time.toLocaleString('ms-MY');
  }
  async function load(){
    status.textContent='Memuatkan maklum balas guru...';
    const res=await window.hnApiRequest('/api/student/learning');
    if(!res.ok){status.textContent='Maklum balas belum dapat dimuatkan. Cuba lagi.';return;}
    const items=res.data?.feedback||[];
    const assessments=res.data?.assessments||[];
    grid.replaceChildren();
    for(let i=1;i<=4;i++){
      const card=el('article','','hn-learning-entry');
      card.style.cssText='padding:18px;border-radius:15px;display:flex;flex-direction:column;gap:8px';
      card.append(el('h3','Misi '+i+' · '+names[i-1]));
      const rows=items.filter(x=>Number(x.mission_id)===i);
      if(!rows.length){
        card.append(el('p','Belum ada maklum balas guru yang diterbitkan.','hn-learning-muted'));
      }else{
        for(const item of rows.slice(0,5)){
          card.append(el('strong',item.status==='revision_requested'?'Perlu Penambahbaikan':'Ulasan Guru'));
          card.append(el('p','Diterbitkan: '+date(item.updated_at||item.created_at),'hn-learning-muted'));
          if(item.strengths)card.append(el('p','Kekuatan: '+item.strengths));
          if(item.improvements)card.append(el('p','Penambahbaikan: '+item.improvements));
          if(item.next_steps)card.append(el('p','Cadangan Guru: '+item.next_steps));
          if(i===4&&item.video_id){
            const vid=el('div','','hn-feedback-video');
            vid.append(el('p','Ulasan ini merujuk kepada rakaman Misi 4 anda.','hn-learning-muted'));
            const watch=el('button','▶ Lihat Rakaman Yang Dinilai','hn-learning-primary');
            watch.type='button';
            watch.addEventListener('click',()=>{
              let video=vid.querySelector('video');
              if(video){video.pause();video.remove();return;}
              video=document.createElement('video');
              video.controls=true;video.playsInline=true;video.preload='none';
              video.style.cssText='width:100%;margin-top:10px;border-radius:10px';
              video.src='/api/misi4/watch/'+encodeURIComponent(item.video_id);
              video.addEventListener('error',()=>{status.textContent='Rakaman tidak dapat dimainkan. Sila maklumkan kepada guru.';});
              vid.append(video);
            });
            vid.append(watch);card.append(vid);
          }
        }
      }
      const tp=assessments.find(x=>Number(x.mission_id)===i);
      if(tp&&tp.tp!==null)card.append(el('p','Tahap Penguasaan disahkan: TP'+tp.tp,'hn-learning-muted'));
      grid.append(card);
    }
    status.textContent='Maklum balas telah dikemas kini.';
  }
  refresh.addEventListener('click',()=>{void load();});
  await load();
})();
