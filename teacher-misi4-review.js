/* Pusat Semakan Guru: Misi 4 videos stored in private object storage.
 * Only the teacher's class can access a pupil video URL. */
(() => {
  'use strict';
  const root=document.getElementById('guru-semakan');
  if(!root)return;
  const api=(url,opts)=>window.hnApiRequest(url,opts);
  const node=(tag,value,cls)=>{
    const n=document.createElement(tag);
    if(value!==undefined)n.textContent=String(value);
    if(cls)n.className=cls;return n;
  };
  const button=(label,fn)=>{
    const n=node('button',label,'hn-m4-teacher-button');n.type='button';
    n.addEventListener('click',fn);return n;
  };
  let initialized=false,items=[],searchTerm='',selectedStatus='all';
  function statusText(text){
    const el=root.querySelector('#hn-m4-teacher-status');
    if(el)el.textContent=text;
  }
  function render(){
    root.replaceChildren();
    const heading=node('div',undefined,'section-line');
    const area=node('div');area.append(node('h2','Rakaman Misi 4 untuk Disemak'));
    area.append(node('p','Video yang berjaya dihantar oleh Murid akan muncul di sini. Hanya Guru kelas berkenaan boleh menonton.','hn-learning-intro'));
    heading.append(area,button('↻ Muat Semula',()=>void load()));
    root.append(heading);
    const toolbar=node('div',undefined,'hn-m4-teacher-toolbar');
    const search=node('input');search.type='search';search.placeholder='Cari murid, ID atau kelas';
    search.setAttribute('aria-label','Cari video mengikut murid atau kelas');
    search.value=searchTerm;
    search.addEventListener('input',()=>{searchTerm=search.value.trim().toLocaleLowerCase('ms-MY');drawRows();});
    const filter=node('select');
    filter.setAttribute('aria-label','Tapis status semakan');
    [['all','Semua status'],['submitted','Menunggu Semakan'],
      ['reviewed','Telah Disemak'],['revision_requested','Perlu Penambahbaikan']]
      .forEach(([id,label])=>filter.add(new Option(label,id)));
    filter.value=selectedStatus;
    filter.addEventListener('change',()=>{selectedStatus=filter.value;drawRows();});
    toolbar.append(search,filter);
    root.append(toolbar);
    const summary=node('div',undefined,'hn-m4-teacher-summary');
    const s=node('p','','');
    s.id='hn-m4-teacher-status';s.setAttribute('role','status');
    summary.append(s);root.append(summary);
    const records=node('div',undefined,'hn-m4-teacher-records');
    records.id='hn-m4-teacher-records';root.append(records);
    drawRows();
  }
  function drawRows(){
    const area=root.querySelector('#hn-m4-teacher-records');
    if(!area)return;
    area.replaceChildren();
    const filtered=items.filter(i=>{
      if(selectedStatus!=='all'&&i.status!==selectedStatus)return false;
      return !searchTerm||[i.student_name,i.login_id,i.class_name]
        .some(v=>String(v||'').toLocaleLowerCase('ms-MY').includes(searchTerm));
    });
    statusText(filtered.length+' rakaman ditunjukkan · '+
      items.filter(x=>x.status==='submitted').length+' menunggu semakan.');
    if(!filtered.length){
      area.append(node('p',items.length?'Tiada rakaman sepadan dengan carian.':
        'Belum ada rakaman Misi 4 yang dihantar.','hn-learning-muted'));return;
    }
    for(const item of filtered){
      const card=node('article',undefined,'hn-m4-submission-card');
      card.append(node('h3',item.student_name+' · '+item.login_id));
      const status={submitted:'Menunggu Semakan',reviewed:'Telah Disemak',
        revision_requested:'Perlu Penambahbaikan'}[item.status]||item.status;
      card.append(node('p',item.class_name+' · '+status+' · '+
        new Date(item.created_at).toLocaleString('ms-MY')+
        ' · '+(Math.ceil(Number(item.size_bytes)/1024/1024*10)/10)+' MB',
        'hn-learning-muted'));
      const controls=node('div',undefined,'hn-learning-actions');
      let player=null;
      const play=button('▶ Tonton Rakaman',()=>{
        if(player){player.remove();player=null;play.textContent='▶ Tonton Rakaman';return;}
        // Private same-origin streaming endpoint checks this Teacher's class.
        player=document.createElement('video');player.controls=true;
        player.preload='metadata';player.playsInline=true;
        player.setAttribute('aria-label','Rakaman Misi 4 oleh '+item.student_name);
        player.src='/api/misi4/media/'+encodeURIComponent(item.id);
        player.className='hn-m4-teacher-player';card.append(player);
        play.textContent='Tutup Rakaman';
      });
      controls.append(play);
      controls.append(button('Nilai PBD',()=>{
        if(typeof window.hnGoToTeacherMissionFour==='function')
          window.hnGoToTeacherMissionFour(item.student_id,'pbd');
        else statusText('Buka menu Pentaksiran PBD dan pilih murid serta Misi 4.');
      }));
      controls.append(button('Beri Maklum Balas',()=>{
        if(typeof window.hnGoToTeacherMissionFour==='function')
          window.hnGoToTeacherMissionFour(item.student_id,'feedback');
        else statusText('Buka menu Maklum Balas dan pilih murid serta Misi 4.');
      }));
      if(item.status!=='reviewed'){
        controls.append(button('Tandakan Disemak',()=>void changeStatus(item,'reviewed')));
      }
      if(item.status!=='revision_requested'){
        controls.append(button('Minta Penambahbaikan',()=>void changeStatus(item,'revision_requested')));
      }
      card.append(controls);area.append(card);
    }
  }
  async function changeStatus(item,newStatus){
    const act=newStatus==='reviewed'?'tandakan telah disemak':'meminta penambahbaikan';
    if(!confirm('Adakah anda pasti mahu '+act+' bagi rakaman '+item.student_name+'?'))return;
    try{
      const r=await api('/api/misi4/teacher/review',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({submissionId:item.id,status:newStatus})
      });
      if(!r.ok){statusText('Status semakan tidak dapat disimpan. Cuba semula.');return;}
      item.status=r.data.submission.status;render();
    }catch{statusText('Sambungan terganggu. Cuba semula.');}
  }
  async function load(){
    try{
      const result=await api('/api/misi4/teacher/submissions');
      if(!result.ok){
        render();
        statusText(result.data?.error==='VIDEO_STORAGE_NOT_CONFIGURED'
          ?'Penghantaran video belum diaktifkan. Pentadbir perlu menyediakan storan persendirian.'
          :'Rekod video belum dapat dimuatkan. Sila cuba semula.');
        return;
      }
      items=result.data.submissions||[];
      render();
    }catch{render();statusText('Tidak dapat memuatkan rekod video. Cuba semula.');}
  }
  async function init(){
    if(location.hash!=='#guru')return;
    const user=await window.hnGetSession?.().catch(()=>null);
    if(user?.role!=='guru'||user.mustChangePassword)return;
    if(initialized)return;initialized=true;
    await load();
  }
  window.addEventListener('hashchange',()=>void init());
  void init();
})();