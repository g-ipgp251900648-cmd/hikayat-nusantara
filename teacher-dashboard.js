/* Hikayat Nusantara — Simple 12-menu Teacher Dashboard.
   User accounts are not yet authenticated. Real student accounts require a secure backend.
   Never generate/store student credentials in browser or localStorage. */
(() => {
  'use strict';
  const dashboard = document.getElementById('guru-view');
  if (!dashboard) return;
  const sidebar = dashboard.querySelector('.sidebar');
  const content = dashboard.querySelector('.dash-content');
  const breadcrumb = dashboard.querySelector('.breadcrumbs');
  if (!sidebar || !content) return;

  const sections = [
    {id:'guru-ringkasan',label:'Laman Utama',symbol:'⌂'},
    {id:'guru-pengurusan-murid',label:'Pengurusan Murid',symbol:'♙'},
    {id:'guru-pengurusan-kelas',label:'Pengurusan Kelas',symbol:'▦'},
    {id:'guru-pemantauan',label:'Pemantauan Empat Misi',symbol:'◇'},
    {id:'guru-tugasan',label:'Pengurusan Tugasan',symbol:'☷'},
    {id:'guru-semakan',label:'Pusat Semakan Tugasan',symbol:'✒'},
    {id:'guru-pbd',label:'Pentaksiran PBD',symbol:'✓'},
    {id:'guru-analisis',label:'Analisis Prestasi',symbol:'▥'},
    {id:'guru-maklum-balas',label:'Maklum Balas',symbol:'✉'},
    {id:'guru-portfolio',label:'Portfolio Digital',symbol:'▤'},
    {id:'guru-laporan',label:'Laporan dan Eksport',symbol:'↧'},
    {id:'guru-tetapan',label:'Tetapan Guru',symbol:'⚙'}
  ];

  // Original sections are kept but sample records and labels are removed.
  const existingProgress = document.getElementById('guru-murid');
  if (existingProgress) existingProgress.id = 'guru-pemantauan';

  const safe = text => String(text ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const wrapper = (id,eyebrow,title,lead,body) => {
    const node = document.createElement('section');
    node.id=id; node.className='dash-section hn-teacher-page';
    node.innerHTML='<div class="section-line"><div><span class="mini-label">'+safe(eyebrow)+'</span><h2>'+safe(title)+'</h2></div></div>'+
      '<p class="hn-teacher-lead">'+safe(lead)+'</p>'+body;
    content.appendChild(node);
    return node;
  };

  const notice = '<div class="hn-teacher-notice" role="status">Sistem pengurusan akaun sebenar belum disambungkan. Tiada akaun murid sebenar boleh diwujudkan di sini buat masa ini. Penyimpanan rasmi memerlukan log masuk guru dan pangkalan data yang selamat.</div>';
  const studentPage = wrapper('guru-pengurusan-murid','PENGURUSAN AKAUN','Pengurusan Murid',
    'Daftar murid, tempatkan dalam kelas serta urus ID dan kata laluan sementara melalui backend yang disahkan.',
    notice+
    '<div class="hn-teacher-toolbar"><input id="hn-student-search" type="search" aria-label="Cari murid" placeholder="Cari nama atau ID murid..." disabled><select id="hn-student-class" aria-label="Tapis mengikut kelas" disabled><option>Semua kelas</option></select><button type="button" id="hn-preview-student">Lihat Borang Pendaftaran</button><button type="button" id="hn-add-student" disabled>+ Daftar Murid</button></div>'+
    '<div class="stats-grid three"><div class="stat"><span>Murid berdaftar</span><strong id="hn-student-count">—</strong><em>Data sebenar sahaja</em></div><div class="stat"><span>Akaun aktif</span><strong id="hn-student-active">—</strong><em>Memerlukan autentikasi</em></div><div class="stat"><span>Belum ditetapkan kelas</span><strong id="hn-student-unassigned">—</strong><em>Memerlukan pangkalan data</em></div></div>'+
    '<div class="table-wrap"><table><thead><tr><th>Nama Murid</th><th>ID Murid</th><th>Kelas</th><th>Status</th></tr></thead><tbody id="hn-student-rows"><tr><td colspan="4">Belum ada data murid yang disahkan.</td></tr></tbody></table></div>'
  );
  const classPage = wrapper('guru-pengurusan-kelas','PENGURUSAN KELAS','Pengurusan Kelas',
    'Cipta kelas mengikut sesi akademik, tempatkan murid berdaftar dan pantau keahlian kelas.',
    notice+
    '<div class="hn-teacher-toolbar"><input id="hn-class-search" type="search" aria-label="Cari kelas" placeholder="Cari nama kelas..." disabled><button type="button" id="hn-preview-class">Lihat Borang Kelas</button><button type="button" id="hn-add-class" disabled>+ Cipta Kelas</button></div>'+
    '<div class="stats-grid three"><div class="stat"><span>Jumlah kelas</span><strong id="hn-class-count">—</strong><em>Data sebenar sahaja</em></div><div class="stat"><span>Jumlah keahlian</span><strong id="hn-class-enrolments">—</strong><em>Memerlukan autentikasi</em></div><div class="stat"><span>Sesi akademik</span><strong id="hn-class-year">—</strong><em>Mengikut akaun guru</em></div></div>'+
    '<div class="table-wrap"><table><thead><tr><th>Nama Kelas</th><th>Tahun</th><th>Sesi</th><th>Jumlah Murid</th><th>Status</th></tr></thead><tbody id="hn-class-rows"><tr><td colspan="5">Belum ada kelas yang disahkan.</td></tr></tbody></table></div>'
  );

  const newPages=[
    ['guru-pbd','PENTAKSIRAN','Pentaksiran PBD','Nilai pengubahsuaian cerita dan persembahan murid berdasarkan bukti pembelajaran sebenar.',
      ['Rubrik SP 4.3.2','Catatan pertimbangan profesional guru','Rekod tahap penguasaan']],
    ['guru-analisis','ANALISIS PEMBELAJARAN','Analisis Prestasi','Pantau perkembangan percubaan dan pencapaian murid mengikut kelas.',
      ['Ketepatan mengikut misi','Perkembangan individu','Murid memerlukan bimbingan']],
    ['guru-maklum-balas','KOMUNIKASI','Maklum Balas','Berikan komen yang membimbing kepada karya dan persembahan yang telah diterima.',
      ['Komen individu','Cadangan penambahbaikan','Penghantaran semula']],
    ['guru-portfolio','PORTFOLIO PEMBELAJARAN','Portfolio Digital','Himpunkan karya Misi 1 hingga Misi 4 dalam profil pembelajaran setiap murid.',
      ['Cerita yang diubah suai','Petikan cerita yang diperindah','Rakaman persembahan']],
    ['guru-laporan','LAPORAN','Laporan dan Eksport','Hasilkan laporan berdasarkan rekod sebenar, tanpa mengekspot kata laluan atau maklumat sensitif.',
      ['Laporan murid','Laporan kelas','Eksport PDF/CSV']],
    ['guru-tetapan','TETAPAN','Tetapan Guru','Urus maklumat akaun guru, keselamatan dan kebenaran akses.',
      ['Profil guru','Tetapan keselamatan','Pengurusan sesi']]
  ];
  for (const [id,eyebrow,title,lead,features] of newPages) {
    wrapper(id,eyebrow,title,lead,
      '<div class="hn-teacher-feature-list">'+features.map(f=>'<div class="hn-teacher-feature"><span aria-hidden="true">✓</span>'+safe(f)+'</div>').join('')+'</div>'+
      '<p class="hn-teacher-notice" role="status">Belum disambungkan kepada rekod guru dan murid sebenar. Fungsi ini akan diaktifkan apabila backend yang dilindungi disediakan.</p>');
  }

  // Replace only the existing teacher navigation, not any student/admin menus.
  for(const node of sidebar.querySelectorAll('.side-link[data-target]')) node.remove();
  const marker = sidebar.querySelector('.side-label');
  const anchor = sidebar.querySelector('.side-spacer');
  const nav = document.createElement('nav');
  nav.className='hn-teacher-nav';
  nav.setAttribute('aria-label','12 menu Dashboard Guru');
  for (const entry of sections) {
    const button=document.createElement('button');
    button.type='button';
    button.className='side-link';
    button.dataset.teacherMenu=entry.id;
    button.setAttribute('aria-controls',entry.id);
    button.innerHTML='<span aria-hidden="true">'+safe(entry.symbol)+'</span>'+safe(entry.label);
    nav.appendChild(button);
  }
  if(anchor)sidebar.insertBefore(nav,anchor);
  else if(marker)marker.after(nav);
  else sidebar.appendChild(nav);

  const allSections=sections.map(item=>document.getElementById(item.id)).filter(Boolean);
  let selected='guru-ringkasan';
  function show(id,options={}){
    if(!sections.some(s=>s.id===id))return;
    selected=id;
    for(const section of allSections)section.hidden=section.id!==id;
    for(const button of nav.querySelectorAll('[data-teacher-menu]')) {
      const active=button.dataset.teacherMenu===id;
      button.classList.toggle('active',active);
      button.setAttribute('aria-current',active?'page':'false');
    }
    const current=sections.find(s=>s.id===id);
    if(breadcrumb)breadcrumb.innerHTML='Hikayat Nusantara <span>/</span> Guru <span>/</span> '+safe(current.label);
    if(!options.silent) {
      dashboard.classList.remove('menu-open');
      const shade=document.getElementById('sidebar-shade');
      if(shade)shade.hidden=true;
      if(!dashboard.hidden)window.scrollTo({top:0,behavior:'instant'});
    }
  }
  nav.addEventListener('click',event=>{
    const button=event.target.closest('[data-teacher-menu]');
    if(button)show(button.dataset.teacherMenu);
  });
  window.addEventListener('hashchange',()=>{
    if(location.hash==='#guru')show(selected,{silent:true});
  });
  show('guru-ringkasan',{silent:true});

  const modal=document.createElement('dialog');
  modal.className='hn-teacher-dialog';
  modal.setAttribute('aria-label','Pratonton borang');
  document.body.appendChild(modal);
  const preview={
    student:'<h2>Borang Pendaftaran Murid</h2><p>Pratonton sahaja. Maklumat ini tidak dihantar atau disimpan.</p>'+
      '<label>Nama murid<input type="text" placeholder="Nama penuh" disabled></label>'+
      '<label>Kelas<select disabled><option>Pilih kelas berdaftar</option></select></label>'+
      '<p><strong>ID murid:</strong> Akan dijana oleh backend selepas pengesahan.</p>'+
      '<p><strong>Kata laluan sementara:</strong> Dijana secara selamat dan ditunjukkan sekali sahaja selepas pendaftaran yang berjaya.</p>',
    class:'<h2>Borang Tambah Kelas</h2><p>Pratonton sahaja. Maklumat ini tidak dihantar atau disimpan.</p>'+
      '<label>Nama kelas<input type="text" placeholder="Contoh: 5 Bestari" disabled></label>'+
      '<label>Tahun<select disabled><option>Tahun 5</option></select></label>'+
      '<label>Sesi akademik<input type="text" placeholder="Contoh: 2026" disabled></label>'
  };
  function previewForm(kind){
    modal.innerHTML=preview[kind]+'<button type="button" class="hn-teacher-close">Tutup</button>';
    modal.querySelector('.hn-teacher-close').addEventListener('click',()=>modal.close());
    if(typeof modal.showModal==='function')modal.showModal();
  }
  studentPage.querySelector('#hn-preview-student').addEventListener('click',()=>previewForm('student'));
  classPage.querySelector('#hn-preview-class').addEventListener('click',()=>previewForm('class'));
  modal.addEventListener('click',event=>{if(event.target===modal)modal.close()});
})();