/* Hikayat Nusantara · Fasa 1: UI prototype only.
   No authentication, server API, database, persistent storage or real student data. */
"use strict";
const views={home:document.getElementById("home-view"),murid:document.getElementById("murid-view"),guru:document.getElementById("guru-view"),admin:document.getElementById("admin-view")};
const dialog=document.getElementById("detail-dialog");
const dialogContent=document.getElementById("dialog-content");
const shade=document.getElementById("sidebar-shade");
const missions=[
 {icon:"📜",name:"Jejak Naskhah Pusaka",time:"10 minit",description:"Murid membaca atau mendengar kisah Misteri Pelita Warisan, menyusun lima peristiwa mengikut urutan dan menjawab tiga soalan pemahaman.",outcome:"Urutan peristiwa dan respons pemahaman."},
 {icon:"🪶",name:"Balai Olah Hikayat",time:"15 minit",description:"Murid memilih watak, latar dan peristiwa, kemudian mengubah suai cerita secara separa berpandu menggunakan sekurang-kurangnya dua ungkapan yang indah serta santun.",outcome:"Draf cerita yang telah diubah suai."},
 {icon:"✒️",name:"Warisan Bahasa",time:"10 minit",description:"Murid menyelesaikan empat cabaran bahasa untuk memilih ungkapan, memperindah ayat dan menyemak kesantunan bahasa.",outcome:"Jawapan empat cabaran bahasa."},
 {icon:"🎭",name:"Persembahan Hikayat",time:"15 minit",description:"Murid merancang permulaan, perkembangan dan pengakhiran cerita, kemudian mempersembahkan karya menerusi rakaman suara atau video.",outcome:"Rakaman suara atau video persembahan."}
];
function route(){
 const hash=decodeURIComponent(location.hash.slice(1));
 const page=(["murid","guru","admin"].includes(hash)?hash:"home");
 Object.entries(views).forEach(([key,el])=>{el.hidden=key!==page;el.classList.remove("menu-open")});
 shade.hidden=true;
 document.title=(page==="home"?"Hikayat Nusantara — Pelita Warisan":("Dashboard "+page[0].toUpperCase()+page.slice(1)+" — Hikayat Nusantara"));
 if(page!=="home"){window.scrollTo({top:0,behavior:"instant"});const first=views[page].querySelector(".side-link");if(first){views[page].querySelectorAll(".side-link").forEach(b=>b.classList.remove("active"));first.classList.add("active")}}
 else{requestAnimationFrame(()=>{const anchor=hash==="portals"||hash==="tentang"?document.getElementById(hash):null;if(anchor)anchor.scrollIntoView({block:"start"});else window.scrollTo({top:0,behavior:"instant"})})}
}
window.addEventListener("hashchange",route);
route();
document.querySelectorAll("[data-target]").forEach(button=>{
 button.addEventListener("click",()=>{
  const target=document.getElementById(button.dataset.target);
  const parent=button.closest(".dashboard");
  if(!target||!parent)return;
  parent.querySelectorAll(".side-link").forEach(x=>x.classList.toggle("active",x===button));
  target.scrollIntoView({behavior:"smooth",block:"start"});
  parent.classList.remove("menu-open");shade.hidden=true;
 });
});
document.querySelectorAll("[data-sidebar-toggle]").forEach(button=>button.addEventListener("click",()=>{
 const parent=button.closest(".dashboard");parent.classList.toggle("menu-open");shade.hidden=!parent.classList.contains("menu-open");
}));
shade.addEventListener("click",()=>{document.querySelectorAll(".dashboard").forEach(x=>x.classList.remove("menu-open"));shade.hidden=true});
function openDialog(markup){
 dialogContent.innerHTML=markup;
 if(typeof dialog.showModal==="function")dialog.showModal();
 else dialog.setAttribute("open","");
}
function closeDialog(){if(typeof dialog.close==="function")dialog.close();else dialog.removeAttribute("open")}
document.querySelector("[data-close-dialog]").addEventListener("click",closeDialog);
dialog.addEventListener("click",event=>{if(event.target===dialog)closeDialog()});
document.querySelectorAll("[data-mission]").forEach(button=>button.addEventListener("click",()=>{
 const m=missions[Number(button.dataset.mission)];if(!m)return;
 openDialog('<div class="dialog-inner"><span class="mini-label">PRATONTON MISI · FASA 1</span><div style="font-size:48px;margin:15px 0">'+m.icon+'</div><h2 id="dialog-title">'+m.name+'</h2><p>'+m.description+'</p><ul><li><b>Anggaran masa:</b> '+m.time+'</li><li><b>Bukti pembelajaran:</b> '+m.outcome+'</li></ul><div class="dialog-note">Mod demonstrasi: aktiviti sebenar, markah dan penyimpanan kemajuan akan dibina selepas sistem akaun serta pangkalan data siap.</div><button class="modal-button" style="margin-top:18px" data-dialog-done>Tutup pratonton</button></div>');
}));
const examples={
 "Murid A":{type:"Balai Olah Hikayat",text:"Pada suatu petang, seorang pemuda menjumpai sebuah pelita lama. Pelita itu sangat cantik dan bercahaya."},
 "Murid B":{type:"Persembahan Hikayat",text:"Contoh rekod persembahan: rakaman belum tersedia dalam prototaip Fasa 1."},
 "Murid C":{type:"Balai Olah Hikayat",text:"Di sebuah desa yang permai, sinar keemasan pelita menerangi jalan pulang."}
};
function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
document.querySelectorAll("[data-review]").forEach(button=>button.addEventListener("click",()=>{
 const name=button.dataset.review, entry=examples[name];if(!entry)return;
 openDialog('<div class="dialog-inner"><span class="mini-label">RUANG SEMAKAN · MOD DEMO</span><h2 id="dialog-title">Karya '+escapeHTML(name)+'</h2><p><b>'+escapeHTML(entry.type)+'</b></p><div class="dialog-note">'+escapeHTML(entry.text)+'</div><label for="review-draft" style="display:block;margin-top:20px;font-weight:800;font-size:12px">Tulis komen untuk pratonton</label><textarea id="review-draft" class="review-input" placeholder="Contoh: Cuba gunakan ungkapan yang lebih indah..."></textarea><button class="modal-button" id="preview-comment">Pratonton komen</button><div class="modal-preview" id="comment-preview" hidden aria-live="polite"></div><p class="tiny-text">Komen ini tidak dihantar atau disimpan. Sambungan Neon akan dibuat dalam fasa berikutnya.</p></div>');
}));
dialog.addEventListener("click",e=>{
 if(e.target.matches("[data-dialog-done]"))closeDialog();
 if(e.target.matches("#preview-comment")){
  const input=document.getElementById("review-draft"),out=document.getElementById("comment-preview");
  if(!input||!out)return;
  out.hidden=false;
  out.textContent=input.value.trim()?"Pratonton komen (tidak disimpan):\n"+input.value.trim():"Sila tulis komen terlebih dahulu.";
 }
});
const search=document.getElementById("teacher-search");
search.addEventListener("input",()=>{
 const text=search.value.toLocaleLowerCase("ms-MY").trim();
 document.querySelectorAll("#teacher-rows tr").forEach(row=>{row.hidden=!row.textContent.toLocaleLowerCase("ms-MY").includes(text)});
});
