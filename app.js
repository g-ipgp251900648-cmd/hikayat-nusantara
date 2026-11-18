/* Hikayat Nusantara · Paparan portal awam.
   Belum ada pengesahan akaun atau pangkalan data pusat: jangan gunakan untuk data murid sebenar. */
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
 const selected=Number(button.dataset.mission);
 if(typeof window.openStudentMission==="function"){window.openStudentMission(selected);return;}
 const m=missions[selected];if(!m)return;
 openDialog('<div class="dialog-inner"><span class="mini-label">MAKLUMAT MISI</span><div style="font-size:48px;margin:15px 0">'+m.icon+'</div><h2 id="dialog-title">'+m.name+'</h2><p>'+m.description+'</p><ul><li><b>Anggaran masa:</b> '+m.time+'</li><li><b>Bukti pembelajaran:</b> '+m.outcome+'</li></ul><div class="dialog-note">Permainan belum dapat dibuka. Sila cuba semula kemudian. Kemajuan setempat tidak diselaraskan dengan Dashboard Guru.</div><button class="modal-button" style="margin-top:18px" data-dialog-done>Tutup</button></div>');
}));
// Senarai semakan hanya akan dipaparkan selepas backend menghantar rekod sebenar.
dialog.addEventListener("click",e=>{if(e.target.matches("[data-dialog-done]"))closeDialog();});
const search=document.getElementById("teacher-search");
search.addEventListener("input",()=>{
 const text=search.value.toLocaleLowerCase("ms-MY").trim();
 document.querySelectorAll("#teacher-rows tr").forEach(row=>{row.hidden=!row.textContent.toLocaleLowerCase("ms-MY").includes(text)});
});


/* Pengalaman visual Fasa 1C: dunia 3D dan gerakan kad */
import("./world3d.js").catch((err)=>console.warn("Pemandangan 3D tidak tersedia; menggunakan ilustrasi asal.",err));
if (window.matchMedia?.("(hover:hover) and (pointer:fine)")?.matches &&
    !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
  document.querySelectorAll(".portal-card").forEach(card=>{
    let frame=0, tx=0, ty=0;
    card.addEventListener("pointermove",event=>{
      const bounds=card.getBoundingClientRect();
      tx=((event.clientY-bounds.top)/bounds.height-.5)*-8;
      ty=((event.clientX-bounds.left)/bounds.width-.5)*9;
      if(frame)return;
      frame=requestAnimationFrame(()=>{
        card.style.setProperty("--tilt-x",tx.toFixed(2)+"deg");
        card.style.setProperty("--tilt-y",ty.toFixed(2)+"deg");
        frame=0;
      });
    });
    card.addEventListener("pointerleave",()=>{
      if(frame){cancelAnimationFrame(frame);frame=0;}
      card.style.setProperty("--tilt-x","0deg");
      card.style.setProperty("--tilt-y","0deg");
    });
  });
}

/* Peta pengembaraan Desa Hikayat: paparan 3D murid dengan fallback SVG. */
import("./student-map3d.js").catch(err=>console.warn("Peta Desa Hikayat tidak dimuatkan; peta SVG masih tersedia.",err));
