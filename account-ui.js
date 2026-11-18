/* Role-scoped account management. Requires the authenticated backend; never stores passwords. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const request=(url,options)=>window.hnApiRequest(url,options);
  let teacherReady=false,adminReady=false;
  let myClasses=[];
  const notice=(root,text)=>{const target=root?.querySelector('.hn-teacher-notice,.hn-admin-notice');if(target)target.textContent=text;};
  function dialog(title,fields,submit) {
    const box=document.createElement('dialog');
    box.className='hn-teacher-dialog';
    box.setAttribute('aria-label',title);
    const heading=document.createElement('h2');heading.textContent=title;box.appendChild(heading);
    const form=document.createElement('form');form.method='dialog';
    const inputs={};
    fields.forEach(field=>{
      const label=document.createElement('label');label.textContent=field.label;
      let input;
      if(field.options){
        input=document.createElement('select');
        for(const x of field.options){const o=document.createElement('option');o.value=x.value;o.textContent=x.label;input.appendChild(o);}
      } else {
        input=document.createElement('input');
        input.type=field.type||'text';input.maxLength=100;
        if(field.value)input.value=field.value;
      }
      input.required=true;inputs[field.key]=input;label.appendChild(input);form.appendChild(label);
    });
    const feedback=document.createElement('p');feedback.setAttribute('role','status');
    const save=document.createElement('button');save.type='submit';save.textContent='Simpan';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Batal';
    cancel.addEventListener('click',()=>box.close());
    form.append(save,cancel,feedback);box.appendChild(form);
    document.body.appendChild(box);
    box.addEventListener('close',()=>box.remove(),{once:true});
    form.addEventListener('submit',async event=>{
      event.preventDefault();save.disabled=true;feedback.textContent='Sedang menyimpan...';
      const values=Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value.trim()]));
      try {
        const result=await submit(values);
        if(!result.ok){feedback.textContent='Tidak dapat disimpan. Sila semak maklumat atau cuba semula.';return;}
        box.close();
      } catch {feedback.textContent='Sambungan bermasalah. Sila cuba semula.';}
      finally{save.disabled=false;}
    });
    box.showModal();
  }
  function showCredential(name,loginId,password) {
    const box=document.createElement('dialog');box.className='hn-teacher-dialog';
    const heading=document.createElement('h2');heading.textContent='Akaun Berjaya Dicipta';
    const text=document.createElement('p');text.textContent='Maklumat ini dipaparkan sekali sahaja. Berikan kepada pemilik akaun secara selamat dan minta mereka menukar kata laluan.';
    const details=document.createElement('pre');details.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;background:#eff4eb;padding:14px;border-radius:8px';
    details.textContent='Nama: '+name+'\nID: '+loginId+'\nKata Laluan Sementara: '+password;
    const close=document.createElement('button');close.textContent='Saya Sudah Menyimpan Maklumat';close.addEventListener('click',()=>box.close());
    box.append(heading,text,details,close);box.addEventListener('close',()=>box.remove(),{once:true});document.body.appendChild(box);box.showModal();
  }
  function makeButton(text,fn){
    const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;
  }

  async function loadAdmin(){
    const [summary,teachers]=await Promise.all([request('/api/admin/overview'),request('/api/admin/teachers')]);
    if(summary.ok) {
      const values=[summary.data.stats.students,summary.data.stats.teachers,summary.data.stats.classes,'—'];
      $('#admin-ringkasan')?.querySelectorAll('.stats-grid.four .stat strong').forEach((el,i)=>{el.textContent=String(values[i]??'—');});
    }
    const root=$('#admin-guru');
    if(!root||!teachers.ok)return;
    // Replace inherited placeholder only after a verified administrator session.
    root.innerHTML='<div class="section-line"><div><span class="mini-label">AKAUN GURU</span><h2>Pengurusan Guru</h2></div></div><p class="hn-admin-intro">Admin mencipta akaun Guru dengan ID dan kata laluan sementara yang unik.</p>';
    const actions=document.createElement('div');actions.className='hn-admin-actions';
    actions.appendChild(makeButton('+ Tambah Guru',()=>dialog('Tambah Guru',[{key:'name',label:'Nama Guru'}],async data=>{
      const r=await request('/api/admin/teachers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(r.ok){showCredential(r.data.teacher.display_name,r.data.teacher.login_id,r.data.temporaryPassword);loadAdmin();}
      return r;
    })));
    root.append(actions);
    const table=document.createElement('div');table.className='table-wrap';
    table.innerHTML='<table><thead><tr><th>Nama Guru</th><th>ID Guru</th><th>Status</th></tr></thead><tbody></tbody></table>';
    const body=table.querySelector('tbody');
    if(!teachers.data.teachers.length)body.innerHTML='<tr><td colspan="3">Belum ada guru berdaftar.</td></tr>';
    for(const user of teachers.data.teachers){
      const tr=document.createElement('tr');
      for(const val of [user.display_name,user.login_id,user.active?'Aktif':'Digantung']){
        const td=document.createElement('td');td.textContent=String(val);tr.appendChild(td);
      }body.appendChild(tr);
    }
    root.append(table);
  }

  async function loadTeacher(){
    const [classes,students,overview]=await Promise.all([
      request('/api/teacher/classes'),request('/api/teacher/students'),request('/api/teacher/overview')
    ]);
    if(overview.ok){
      const val=$('#guru-ringkasan')?.querySelectorAll('.stats-grid.four .stat strong');
      if(val?.length>=4){val[0].textContent=String(overview.data.stats.students);val[1].textContent='—';val[2].textContent='—';val[3].textContent='—';}
    }
    if(classes.ok){
      myClasses=classes.data.classes;
      const tbody=$('#hn-class-rows');if(tbody){
        tbody.replaceChildren();
        if(!myClasses.length){const row=tbody.insertRow();const cell=row.insertCell();cell.colSpan=5;cell.textContent='Belum ada kelas. Klik + Cipta Kelas.';}
        myClasses.forEach(item=>{
          const row=tbody.insertRow();
          [item.name,'Tahun 5',item.school_year,item.students,'Aktif'].forEach(value=>{const cell=row.insertCell();cell.textContent=String(value);});
        });
      }
      $('#hn-class-count')?.replaceChildren(document.createTextNode(String(myClasses.length)));
      $('#hn-class-enrolments')?.replaceChildren(document.createTextNode(String(myClasses.reduce((a,b)=>a+b.students,0))));
      $('#hn-class-year')?.replaceChildren(document.createTextNode(myClasses[0]?.school_year?String(myClasses[0].school_year):'—'));
      const dropdown=$('#hn-student-class');if(dropdown){
        dropdown.replaceChildren(new Option('Semua kelas',''));
        for(const c of myClasses)dropdown.add(new Option(c.name,c.id));
        dropdown.disabled=false;
      }
    }
    if(students.ok){
      const list=students.data.students;
      $('#hn-student-count')?.replaceChildren(document.createTextNode(String(list.length)));
      $('#hn-student-active')?.replaceChildren(document.createTextNode(String(list.filter(s=>s.active).length)));
      $('#hn-student-unassigned')?.replaceChildren(document.createTextNode('0'));
      const tbody=$('#hn-student-rows');if(tbody){
        tbody.replaceChildren();
        if(!list.length){const row=tbody.insertRow();const cell=row.insertCell();cell.colSpan=4;cell.textContent='Belum ada murid. Klik + Daftar Murid.';}
        list.forEach(item=>{
          const row=tbody.insertRow();
          [item.display_name,item.login_id,item.class_name,item.active?'Aktif':'Digantung'].forEach(value=>{const cell=row.insertCell();cell.textContent=String(value);});
        });
      }
    }
    const checkpoint=await request('/api/teacher/progress');
    const progressArea=$('#guru-pemantauan .chart-panel');
    if(checkpoint.ok&&progressArea){
      progressArea.replaceChildren();
      const tip=document.createElement('p');tip.className='tiny-text';
      tip.textContent='Hanya rekod checkpoint yang disimpan dan disahkan oleh pelayan dipaparkan. Status draf bukan keputusan PBD.';
      progressArea.appendChild(tip);
      const table=document.createElement('div');table.className='table-wrap';
      table.innerHTML='<table><thead><tr><th>Murid</th><th>Kelas</th><th>Misi</th><th>Status</th><th>Kemas Kini</th></tr></thead><tbody></tbody></table>';
      const body=table.querySelector('tbody');
      if(!checkpoint.data.progress.length){
        const row=body.insertRow(),cell=row.insertCell();
        cell.colSpan=5;cell.textContent='Belum ada checkpoint yang diselaraskan.';
      }
      for(const item of checkpoint.data.progress){
        const row=body.insertRow();
        for(const value of [item.display_name,item.class_name,'Misi '+item.mission_id,item.state==='draft'?'Draf':item.state==='verified'?'Disahkan':'Dihantar',new Date(item.updated_at).toLocaleString('ms-MY')]){
          const cell=row.insertCell();cell.textContent=String(value);
        }
      }
      progressArea.appendChild(table);
    }
    notice($('#guru-pengurusan-murid'),'Akaun murid disimpan pada pangkalan data berpusat. Kata laluan sementara hanya dipaparkan selepas akaun berjaya dicipta.');
    notice($('#guru-pengurusan-kelas'),'Kelas yang dicipta akan disimpan dalam organisasi dan akaun guru ini.');
  }
  function connectTeacher(){
    const addClass=$('#hn-add-class'),addStudent=$('#hn-add-student');
    if(!addClass||!addStudent)return;
    addClass.disabled=false;addStudent.disabled=false;
    addClass.addEventListener('click',()=>dialog('Cipta Kelas',[
      {key:'name',label:'Nama Kelas (contoh: 5 Amanah)'},
      {key:'schoolYear',label:'Sesi Akademik',type:'number',value:String(new Date().getFullYear())}
    ],async data=>{
      const r=await request('/api/teacher/classes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(r.ok)loadTeacher();return r;
    }));
    addStudent.addEventListener('click',()=>{
      if(!myClasses.length){alert('Sila cipta kelas terlebih dahulu.');return;}
      dialog('Daftar Murid',[
        {key:'name',label:'Nama Murid'},
        {key:'classId',label:'Kelas',options:myClasses.map(x=>({value:x.id,label:x.name}))}
      ],async data=>{
        const r=await request('/api/teacher/students',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        if(r.ok){showCredential(r.data.student.display_name,r.data.student.login_id,r.data.temporaryPassword);loadTeacher();}
        return r;
      });
    });
  }
  async function init(){
    if(location.hash!=='#admin'&&location.hash!=='#guru')return;
    try {
      const u=await window.hnGetSession();
      if(u?.mustChangePassword)return;
      if(u?.role==='admin'&&!adminReady){adminReady=true;await loadAdmin();}
      if(u?.role==='guru'){
        if(!teacherReady){teacherReady=true;connectTeacher();}
        await loadTeacher();
      }
    }catch{ /* Auth layer handles unavailable backend and redirects. */ }
  }
  window.addEventListener('hashchange',init);
  init();
})();
