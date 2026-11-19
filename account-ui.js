/* Role-scoped account management. Requires the authenticated backend; never stores passwords. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const request=(url,options)=>window.hnApiRequest(url,options);
  let teacherReady=false,adminReady=false;
  const adminRoles=['admin','gkmp','panitia'];
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

  const adminPost=(path,data)=>request(path,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)
  });
  const adminError=r=>({
    DEACTIVATE_ACCOUNT_FIRST:'Nyahaktifkan akaun terlebih dahulu sebelum pemadaman kekal.',
    TRANSFER_TEACHER_CLASSES_FIRST:'Guru ini masih mempunyai kelas. Pindahkan semua kelas melalui Pengurusan Kelas terlebih dahulu.',
    INVALID_DELETE_CONFIRMATION:'ID pengesahan tidak sepadan.',
    CLASS_NAME_CONFLICT:'Guru penerima sudah mempunyai kelas dengan nama dan tahun yang sama.',
    CLASS_OR_TEACHER_NOT_FOUND:'Kelas atau Guru penerima tidak ditemui atau tidak aktif.',
    ACCOUNT_NOT_FOUND:'Akaun tidak ditemui dalam organisasi ini.',
    CLASS_HAS_STUDENTS:'Kelas masih mempunyai murid. Pilih kelas pengganti untuk memindahkan mereka terlebih dahulu.',
    DESTINATION_CLASS_NOT_FOUND:'Kelas pengganti tidak sah atau Guru penerimanya tidak aktif.',
    CLASS_NOT_FOUND:'Kelas tidak ditemui atau bukan kelas anda.',
    CLASS_NAME_CONFIRMATION_REQUIRED:'Nama pengesahan kelas tidak tepat.',
    CLASS_DELETE_CONFLICT:'Penghapusan kelas tidak berjaya kerana perubahan serentak.'
  }[r.data?.error]||'Operasi gagal. Sila semak sambungan dan cuba lagi.');
  async function accountStatus(person,nextActive){
    const verb=nextActive?'aktifkan semula':'nyahaktifkan';
    if(!confirm('Adakah anda mahu '+verb+' akaun '+person.display_name+' ('+person.login_id+')?'+
      (nextActive?'':' Semua sesi log masuk pengguna ini akan ditamatkan.')))return;
    const r=await adminPost('/api/admin/users/status',{userId:person.id,active:nextActive});
    if(!r.ok){alert(adminError(r));return;}
    await loadAdmin();
  }
  async function deleteAccount(person){
    if(person.active){alert('Nyahaktifkan akaun ini dahulu.');return;}
    const isStudent=person.progress_count!==undefined;
    const warning=isStudent
      ? '\\nPERHATIAN: Rekod kemajuan misi dan penyertaan kelas murid ini akan dipadam secara kekal.'
      : '\\nPERHATIAN: Pastikan semua kelas telah dipindahkan kepada Guru lain.';
    const confirmation=prompt('PADAM KEKAL (tidak boleh dibatalkan): '+person.display_name+
      warning+'\\n\\nTaip ID pengguna tepat seperti berikut untuk mengesahkan: '+person.login_id);
    if(confirmation===null)return;
    if(confirmation!==person.login_id){alert('ID pengesahan tidak sama. Tiada akaun dipadam.');return;}
    const r=await adminPost('/api/admin/users/delete',{userId:person.id,confirmationId:confirmation});
    if(!r.ok){alert(adminError(r));return;}
    alert('Akaun '+person.login_id+' berjaya dipadam secara kekal.');
    await loadAdmin();
  }
  function adminUserActions(row,person){
    const cell=row.insertCell();
    cell.style.whiteSpace='nowrap';
    const stateButton=makeButton(person.active?'Nyahaktifkan':'Aktifkan Semula',
      ()=>accountStatus(person,!person.active));
    cell.append(stateButton);
    if(!person.active){
      const deleteButton=makeButton('Padam Kekal',()=>deleteAccount(person));
      deleteButton.style.cssText='margin-left:6px;border-color:#a14b45;color:#8d302a;';
      cell.append(deleteButton);
    }
  }
  function deleteClassWithSafeguards(cls,otherClasses,onSuccess){
    const members=Number(cls.students)||0;
    if(members>0&&!otherClasses.length){
      alert('Kelas '+cls.name+' masih mempunyai '+members+
        ' murid. Cipta atau pilih kelas pengganti yang aktif dahulu. Akaun murid tidak akan dipadam.');
      return;
    }
    const warning=members>0
      ? 'Kelas ini mempunyai '+members+' murid. Semua keahlian murid akan dipindahkan ke kelas pengganti sebelum kelas dipadam. Akaun dan kemajuan murid kekal.'
      : 'Kelas ini kosong. Pemadaman adalah kekal dan tidak boleh dibatalkan.';
    if(!confirm('Padam Kelas '+cls.name+' ('+cls.school_year+')?\\n\\n'+warning))return;
    const fields=[];
    if(members>0){
      fields.push({key:'destinationClassId',label:'Kelas Pengganti',
        options:otherClasses.map(c=>({value:c.id,label:c.name+' ('+c.school_year+')'}))});
    }
    fields.push({key:'confirmationName',label:'Taip nama kelas tepat untuk mengesahkan: '+cls.name});
    dialog('Sahkan Padam Kelas',fields,async data=>{
      if(data.confirmationName!==cls.name){
        alert('Nama kelas tidak sepadan. Tiada kelas dipadam.');
        return {ok:false};
      }
      const payload={classId:cls.id,confirmationName:data.confirmationName};
      if(members>0)payload.destinationClassId=data.destinationClassId;
      const result=await adminPost('/api/classes/delete',payload);
      if(!result.ok){alert(adminError(result));return result;}
      await onSuccess();
      return result;
    });
  }

  function renderAdminStudents(result){
    const root=$('#admin-murid');
    if(!root)return;
    root.replaceChildren();
    const heading=document.createElement('h2');heading.textContent='Pengurusan Murid';root.append(heading);
    const description=document.createElement('p');description.className='hn-admin-intro';
    description.textContent='Admin boleh menyekat log masuk Murid yang tidak aktif, mengaktifkannya semula, atau memadam akaun secara kekal selepas pengesahan ID. Pemadaman akan menghapuskan rekod kemajuan misi murid.';
    root.append(description);
    if(!result.ok){root.append(document.createTextNode('Data murid belum tersedia.'));return;}
    const table=document.createElement('div');table.className='table-wrap';
    table.innerHTML='<table><thead><tr><th>Nama Murid</th><th>ID Murid</th><th>Kelas</th><th>Rekod Misi</th><th>Status</th><th>Tindakan</th></tr></thead><tbody></tbody></table>';
    const tbody=table.querySelector('tbody');
    if(!result.data.students.length){const row=tbody.insertRow(),cell=row.insertCell();cell.colSpan=6;cell.textContent='Belum ada akaun Murid.';}
    for(const person of result.data.students){
      const row=tbody.insertRow();
      for(const val of [person.display_name,person.login_id,person.class_names,person.progress_count,person.active?'Aktif':'Tidak aktif']){
        const cell=row.insertCell();cell.textContent=String(val);
      }
      adminUserActions(row,person);
    }
    root.append(table);
  }
  function renderAdminClasses(result,teacherResult){
    const root=$('#admin-kelas');
    if(!root)return;
    root.replaceChildren();
    const heading=document.createElement('h2');heading.textContent='Pengurusan Kelas & Pemindahan Guru';root.append(heading);
    const description=document.createElement('p');description.className='hn-admin-intro';
    description.textContent='Pindahkan kelas kepada Guru aktif sebelum memadam akaun Guru berpindah. Admin juga boleh memadam kelas; kelas berisi murid memerlukan kelas pengganti supaya rekod murid kekal.';
    root.append(description);
    if(!result.ok||!teacherResult.ok){root.append(document.createTextNode('Data kelas belum tersedia.'));return;}
    const teachers=teacherResult.data.teachers.filter(p=>p.active);
    const table=document.createElement('div');table.className='table-wrap';
    table.innerHTML='<table><thead><tr><th>Kelas</th><th>Tahun</th><th>Guru Semasa</th><th>Bilangan Murid</th><th>Tindakan</th></tr></thead><tbody></tbody></table>';
    const tbody=table.querySelector('tbody');
    if(!result.data.classes.length){const row=tbody.insertRow(),cell=row.insertCell();cell.colSpan=5;cell.textContent='Belum ada kelas berdaftar.';}
    for(const cls of result.data.classes){
      const row=tbody.insertRow();
      for(const val of [cls.name,cls.school_year,cls.teacher_name,cls.students]){
        const cell=row.insertCell();cell.textContent=String(val);
      }
      const cell=row.insertCell();
      const targets=teachers.filter(t=>t.id!==cls.teacher_id);
      if(!targets.length){const note=document.createElement('span');note.textContent='Tiada Guru penerima aktif. ';cell.append(note);}
      if(targets.length)cell.append(makeButton('Pindahkan Kelas',()=>dialog('Pindahkan '+cls.name,[
        {key:'teacherId',label:'Guru Penerima',options:targets.map(t=>({value:t.id,label:t.display_name+' ('+t.login_id+')'}))}
      ],async data=>{
        const r=await adminPost('/api/admin/classes/transfer',{classId:cls.id,teacherId:data.teacherId});
        if(!r.ok)alert(adminError(r));else loadAdmin();
        return r;
      })));
      const eligible=result.data.classes.filter(c=>c.id!==cls.id&&teachers.some(t=>t.id===c.teacher_id));
      const deleteButton=makeButton('Padam Kelas',()=>deleteClassWithSafeguards(cls,eligible,loadAdmin));
      deleteButton.style.cssText='margin-left:6px;border-color:#a14b45;color:#8d302a;';
      cell.append(deleteButton);
    }
    root.append(table);
  }

  async function loadAdmin(){
    const [summary,teachers,leaders,students,classes]=await Promise.all([request('/api/admin/overview'),request('/api/admin/teachers'),request('/api/admin/leaders'),request('/api/admin/students'),request('/api/admin/classes')]);
    if(summary.ok) {
      const values=[summary.data.stats.students,summary.data.stats.teachers,summary.data.stats.classes,'—'];
      $('#admin-ringkasan')?.querySelectorAll('.stats-grid.four .stat strong').forEach((el,i)=>{el.textContent=String(values[i]??'—');});
    }
    const root=$('#admin-guru');
    renderAdminStudents(students);
    renderAdminClasses(classes,teachers);
    renderLeaders(leaders);
    if(!root||!teachers.ok)return;
    // Replace inherited placeholder only after a verified administrator session.
    root.innerHTML='<div class="section-line"><div><span class="mini-label">AKAUN GURU</span><h2>Pengurusan Guru</h2></div></div><p class="hn-admin-intro">Admin boleh mendaftar Guru, menyahaktifkan akaun ketika berpindah, mengaktifkan semula dan memadam akaun selepas semua kelas dipindahkan.</p>';
    const actions=document.createElement('div');actions.className='hn-admin-actions';
    actions.appendChild(makeButton('+ Tambah Guru',()=>dialog('Tambah Guru',[{key:'name',label:'Nama Guru'}],async data=>{
      const r=await request('/api/admin/teachers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(r.ok){showCredential(r.data.teacher.display_name,r.data.teacher.login_id,r.data.temporaryPassword);loadAdmin();}
      return r;
    })));
    root.append(actions);
    const table=document.createElement('div');table.className='table-wrap';
    table.innerHTML='<table><thead><tr><th>Nama Guru</th><th>ID Guru</th><th>Status</th><th>Tindakan</th></tr></thead><tbody></tbody></table>';
    const body=table.querySelector('tbody');
    if(!teachers.data.teachers.length)body.innerHTML='<tr><td colspan="4">Belum ada guru berdaftar.</td></tr>';
    for(const user of teachers.data.teachers){
      const tr=document.createElement('tr');
      for(const val of [user.display_name,user.login_id,user.active?'Aktif':'Digantung']){
        const td=document.createElement('td');td.textContent=String(val);tr.appendChild(td);
      }
      adminUserActions(tr,user);
      body.appendChild(tr);
    }
    root.append(table);
  }

  function renderLeaders(result){
    const root=$('#admin-kepimpinan');
    if(!root)return;
    if(!result.ok){
      root.textContent='Rekod kepimpinan tidak dapat dibaca. Pastikan migrasi Neon sudah dijalankan.';
      return;
    }
    root.replaceChildren();
    const heading=document.createElement('div');heading.className='section-line';
    const inner=document.createElement('div');
    const title=document.createElement('h2');title.textContent='Kepimpinan Bahasa Melayu';inner.append(title);heading.append(inner);root.append(heading);
    const description=document.createElement('p');description.className='hn-admin-intro';
    description.textContent='GKMP dan Ketua Panitia mempunyai fungsi serta akses Dashboard Admin yang sama, terhad kepada organisasi ini.';root.append(description);
    const actions=document.createElement('div');actions.className='hn-admin-actions';
    actions.append(makeButton('+ Tambah Pentadbir BM',()=>dialog('Daftar Kepimpinan BM',[
      {key:'role',label:'Jawatan',options:[{value:'gkmp',label:'Guru Kanan Mata Pelajaran Bahasa Melayu'},{value:'panitia',label:'Ketua Panitia Bahasa Melayu'}]},
      {key:'name',label:'Nama Penuh'}
    ],async data=>{
      const r=await request('/api/admin/leaders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(r.ok){showCredential(r.data.leader.display_name,r.data.leader.login_id,r.data.temporaryPassword);loadAdmin();}
      return r;
    })));
    root.append(actions);
    const table=document.createElement('div');table.className='table-wrap';
    table.innerHTML='<table><thead><tr><th>Jawatan</th><th>Nama</th><th>ID Pengguna</th><th>Status</th></tr></thead><tbody></tbody></table>';
    const tbody=table.querySelector('tbody');
    if(!result.data.leaders.length){const row=tbody.insertRow(),cell=row.insertCell();cell.colSpan=4;cell.textContent='Belum ada akaun Guru Kanan atau Ketua Panitia.';}
    for(const person of result.data.leaders){
      const row=tbody.insertRow();
      const label=person.role==='gkmp'?'Guru Kanan Mata Pelajaran Bahasa Melayu':'Ketua Panitia Bahasa Melayu';
      for(const value of [label,person.display_name,person.login_id,person.active?'Aktif':'Digantung']){
        const cell=row.insertCell();cell.textContent=String(value);
      }
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
        if(!myClasses.length){const row=tbody.insertRow();const cell=row.insertCell();cell.colSpan=6;cell.textContent='Belum ada kelas. Klik + Cipta Kelas.';}
        myClasses.forEach(item=>{
          const row=tbody.insertRow();
          [item.name,'Tahun 5',item.school_year,item.students,'Aktif'].forEach(value=>{const cell=row.insertCell();cell.textContent=String(value);});
          const cell=row.insertCell();
          const targets=myClasses.filter(c=>c.id!==item.id);
          const deleteButton=makeButton('Padam Kelas',()=>deleteClassWithSafeguards(item,targets,loadTeacher));
          deleteButton.style.cssText='border-color:#a14b45;color:#8d302a;';
          cell.append(deleteButton);
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
  // Teacher-only, private CSV import. Names never enter the public GitHub repo.
  function readRosterCsv(source){
    const input=source.replace(/^\uFEFF/,'');
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<input.length;i++){
      const c=input[i];
      if(quoted){
        if(c==='"'&&input[i+1]==='"'){cell+='"';i++;}
        else if(c==='"'){quoted=false;}
        else cell+=c;
      } else if(c==='"'&&cell===''){quoted=true;}
      else if(c===','){row.push(cell);cell='';}
      else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
      else cell+=c;
    }
    if(quoted)throw Error('Tanda petik dalam fail CSV tidak lengkap.');
    if(cell!==''||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
    const lines=rows.filter(x=>x.some(v=>v.trim()));
    if(!lines.length)throw Error('Fail CSV kosong.');
    const headers=lines.shift().map(x=>x.trim().toLowerCase());
    if(headers.length!==2||headers[0]!=='login_id'||headers[1]!=='name'){
      throw Error('Format CSV salah. Lajur pertama mesti login_id dan lajur kedua name.');
    }
    if(lines.length<1||lines.length>50)throw Error('Hanya 1 hingga 50 murid boleh diimport sekali gus.');
    const students=lines.map((values,i)=>{
      if(values.length!==2)throw Error('Lajur baris '+(i+2)+' tidak tepat.');
      const loginId=values[0].trim().toUpperCase(),name=values[1].trim();
      if(!/^[A-Z0-9-]{5,32}$/.test(loginId)||name.length<2||name.length>100){
        throw Error('ID atau nama tidak sah pada baris '+(i+2)+'.');
      }
      return {loginId,name};
    });
    if(new Set(students.map(x=>x.loginId)).size!==students.length){
      throw Error('Terdapat ID murid yang berulang dalam fail CSV.');
    }
    return students;
  }
  function downloadCredentialsCsv(rows){
    const wrap=value=>{
      const str=String(value??'');
      const safeValue=/^[=+\-@\t\r]/.test(str)?"'"+str:str;
      return '"'+safeValue.replace(/"/g,'""')+'"';
    };
    const table=[['id_murid','nama_penuh','kata_laluan_sementara'],
      ...rows.map(r=>[r.loginId,r.name,r.temporaryPassword])];
    const csv='\uFEFF'+table.map(r=>r.map(wrap).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;
    link.download='Kelayakan_Log_Masuk_Murid_5_Dinamik.csv';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),15000);
  }
  function openBulkEnrollment(){
    if(!myClasses.length){alert('Sila cipta kelas 5 Dinamik terlebih dahulu.');return;}
    const box=document.createElement('dialog');box.className='hn-teacher-dialog';
    box.style.maxWidth='min(94vw,840px)';
    box.setAttribute('aria-label','Daftar Murid Secara Pukal');
    const heading=document.createElement('h2');heading.textContent='Daftar Murid Secara Pukal';
    const info=document.createElement('p');
    info.textContent='Pilih kelas, muat naik CSV (login_id,name), semak semua nama dan sahkan pendaftaran. Setiap murid menerima kata laluan sementara unik.';
    const classLabel=document.createElement('label');classLabel.textContent='Kelas';
    const classSelect=document.createElement('select');
    for(const c of myClasses){classSelect.add(new Option(c.name+' · '+c.school_year,c.id));}
    const preferred=myClasses.find(c=>c.name.trim().toLocaleLowerCase('ms-MY')==='5 dinamik');
    if(preferred)classSelect.value=preferred.id;
    classSelect.style.cssText='display:block;width:100%;padding:10px;margin:7px 0 12px';
    classLabel.append(classSelect);
    const fileLabel=document.createElement('label');fileLabel.textContent='Fail CSV Senarai Murid';
    const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='.csv,text/csv';
    fileInput.style.cssText='display:block;width:100%;margin:7px 0 12px';
    fileLabel.append(fileInput);
    const note=document.createElement('p');note.setAttribute('role','status');
    note.textContent='Pilih fail CSV untuk menyemak senarai sebelum mengimport.';
    const preview=document.createElement('div');preview.className='table-wrap';
    preview.style.cssText='max-height:280px;overflow:auto;margin:10px 0';
    const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
    const submit=document.createElement('button');submit.type='button';submit.textContent='Daftar Semua Murid';submit.disabled=true;
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Tutup';
    const save=document.createElement('button');save.type='button';save.textContent='Muat Turun Senarai ID & Kata Laluan';
    save.hidden=true;
    toolbar.append(submit,save,cancel);
    box.append(heading,info,classLabel,fileLabel,note,preview,toolbar);
    document.body.append(box);
    let roster=[],created=[];
    fileInput.addEventListener('change',async()=>{
      roster=[];submit.disabled=true;preview.replaceChildren();
      const file=fileInput.files?.[0];
      if(!file)return;
      if(file.size>30000){note.textContent='Fail terlalu besar (maksimum 30 KB).';return;}
      try {
        roster=readRosterCsv(await file.text());
        const t=document.createElement('table');
        t.innerHTML='<thead><tr><th>ID Murid</th><th>Nama Murid</th></tr></thead><tbody></tbody>';
        const tbody=t.querySelector('tbody');
        for(const person of roster){
          const tr=tbody.insertRow();
          tr.insertCell().textContent=person.loginId;
          tr.insertCell().textContent=person.name;
        }
        preview.append(t);
        note.textContent='Semakan: '+roster.length+' nama sah. Periksa kelas dan ID sebelum menekan Daftar Semua Murid.';
        submit.disabled=false;
      }catch(error){note.textContent=String(error.message||'Fail CSV tidak sah.');}
    });
    submit.addEventListener('click',async()=>{
      if(!roster.length)return;
      const cls=myClasses.find(c=>c.id===classSelect.value);
      if(!cls)return;
      if(!confirm('Daftar '+roster.length+' akaun Murid ke kelas '+cls.name+
        '? ID akan dikekalkan, kata laluan unik dijana sekali sahaja.'))return;
      submit.disabled=true;fileInput.disabled=true;classSelect.disabled=true;
      note.textContent='Sedang mendaftarkan '+roster.length+' murid dengan selamat...';
      try{
        const result=await request('/api/teacher/students/bulk',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({classId:cls.id,students:roster})
        });
        if(!result.ok){
          note.textContent=result.data?.error==='LOGIN_ID_CONFLICT'
            ? 'ID Murid sudah digunakan dalam sistem. Tiada akaun baharu didaftarkan. Semak ID dalam CSV.'
            : 'Import gagal: '+String(result.data?.error||'Sila cuba semula.');
          submit.disabled=false;fileInput.disabled=false;classSelect.disabled=false;
          return;
        }
        created=result.data.credentials;
        note.textContent='Berjaya! '+result.data.created+' akaun Murid telah didaftarkan dalam '+cls.name+
          '. MUAT TURUN senarai kata laluan sekarang; ia tidak dapat dibaca semula daripada sistem.';
        save.hidden=false;fileInput.disabled=true;classSelect.disabled=true;
        await loadTeacher();
      }catch{
        note.textContent='Sambungan gagal; semak senarai murid sebelum cuba lagi untuk mengelakkan ID berulang.';
        fileInput.disabled=false;classSelect.disabled=false;
      }
    });
    save.addEventListener('click',()=>{if(created.length)downloadCredentialsCsv(created);});
    cancel.addEventListener('click',()=>{
      if(created.length&&!confirm('Sudah simpan senarai ID dan kata laluan sementara? Setelah ditutup, kata laluan tidak boleh dipaparkan lagi.'))return;
      box.close();
    });
    box.addEventListener('close',()=>{created=[];roster=[];box.remove();},{once:true});
    box.showModal();
  }

  function openCredentialRecovery(){
    if(!myClasses.length){alert('Sila cipta kelas dahulu.');return;}
    const box=document.createElement('dialog');box.className='hn-teacher-dialog';
    box.style.maxWidth='min(94vw,690px)';
    const heading=document.createElement('h2');heading.textContent='Jana Semula Kata Laluan Sementara Murid';
    const intro=document.createElement('p');
    intro.textContent='Untuk fail kata laluan yang hilang. Hanya murid aktif yang MASIH perlu menukar kata laluan pertama akan menerima kata laluan baharu. Kata laluan murid yang telah ditukar sendiri tidak disentuh.';
    const classLabel=document.createElement('label');classLabel.textContent='Pilih Kelas';
    const select=document.createElement('select');
    select.style.cssText='display:block;width:100%;padding:10px;margin:8px 0 12px';
    for(const c of myClasses)select.add(new Option(c.name+' · '+c.school_year,c.id));
    const preferred=myClasses.find(c=>c.name.trim().toLocaleLowerCase('ms-MY')==='5 dinamik');
    if(preferred)select.value=preferred.id;
    classLabel.append(select);
    const confirmLabel=document.createElement('label');
    confirmLabel.textContent='Taip nama kelas dengan tepat untuk mengesahkan';
    const confirmInput=document.createElement('input');
    confirmInput.type='text';confirmInput.maxLength=100;
    confirmInput.style.cssText='display:block;width:100%;padding:10px;margin:8px 0 12px';
    confirmLabel.append(confirmInput);
    const message=document.createElement('p');message.setAttribute('role','status');
    message.textContent='Tindakan ini membatalkan kata laluan sementara yang dikeluarkan sebelum ini untuk murid yang belum menukarnya.';
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    const generate=makeButton('Jana Kata Laluan Baharu',async()=>{
      const cls=myClasses.find(c=>c.id===select.value);
      if(!cls)return;
      if(confirmInput.value!==cls.name){
        message.textContent='Nama pengesahan tidak sepadan dengan kelas '+cls.name+'.';
        return;
      }
      if(!confirm('Jana semula kata laluan untuk murid yang belum menukar kata laluan di '+cls.name+
        '? Kata laluan sementara lama mereka tidak lagi sah.'))return;
      generate.disabled=true;select.disabled=true;confirmInput.disabled=true;
      message.textContent='Menjana kata laluan sementara baharu...';
      try{
        const response=await adminPost('/api/teacher/students/reissue-temporary',{
          classId:cls.id,confirmationName:confirmInput.value
        });
        if(!response.ok){
          message.textContent='Gagal: '+String(response.data?.error||'Sila cuba lagi.');
          generate.disabled=false;select.disabled=false;confirmInput.disabled=false;
          return;
        }
        const credentials=response.data.credentials||[];
        message.textContent='Berjaya. '+response.data.reissued+' kata laluan sementara baharu telah dijana. '+
          response.data.unaffected+' murid yang sudah menukar kata laluan atau tidak aktif tidak diubah. '+
          'Simpan fail di tempat persendirian sebelum menutup tetingkap.';
        generate.hidden=true;
        if(credentials.length){
          download.hidden=false;
          download.addEventListener('click',()=>downloadCredentialsCsv(credentials),{once:false});
        }
        box.addEventListener('close',()=>{
          if(credentials.length)credentials.splice(0,credentials.length);
        },{once:true});
      }catch{
        message.textContent='Masalah sambungan. Semak semula akaun di Dashboard Guru sebelum mencuba lagi.';
        generate.disabled=false;select.disabled=false;confirmInput.disabled=false;
      }
    });
    const download=makeButton('Muat Turun Senarai Kata Laluan',()=>{});
    download.hidden=true;
    const close=makeButton('Tutup',()=>{
      if(!download.hidden&&!confirm('Adakah fail kata laluan baharu sudah dimuat turun dan disimpan dengan selamat?'))return;
      box.close();
    });
    actions.append(generate,download,close);
    box.append(heading,intro,classLabel,confirmLabel,message,actions);
    box.addEventListener('close',()=>box.remove(),{once:true});
    document.body.append(box);box.showModal();
  }

  function connectTeacher(){
    const addClass=$('#hn-add-class'),addStudent=$('#hn-add-student'),bulk=$('#hn-import-students'),recover=$('#hn-reissue-credentials');
    if(!addClass||!addStudent)return;
    addClass.disabled=false;addStudent.disabled=false;
    if(bulk){bulk.disabled=false;bulk.addEventListener('click',openBulkEnrollment);}
    if(recover){recover.disabled=false;recover.addEventListener('click',openCredentialRecovery);}
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
      if(adminRoles.includes(u?.role)&&!adminReady){adminReady=true;await loadAdmin();}
      if(u?.role==='guru'){
        if(!teacherReady){teacherReady=true;connectTeacher();}
        await loadTeacher();
      }
    }catch{ /* Auth layer handles unavailable backend and redirects. */ }
  }
  window.addEventListener('hashchange',init);
  init();
})();
