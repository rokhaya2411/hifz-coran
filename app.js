const API="https://api.alquran.cloud/v1";
const state={surahs:[], current:1, currentData:[], hidden:false};
const KEY="hifz_progress_v1";
let progress=JSON.parse(localStorage.getItem(KEY)||"{}");

const $=id=>document.getElementById(id);
function save(){localStorage.setItem(KEY,JSON.stringify(progress)); updateProgress(); renderReview();}
function go(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active")); $(page).classList.add("active"); document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.page===page)); if(page==="progress")updateProgress(); if(page==="review")renderReview();}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>go(b.dataset.page));
$("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("hifz_dark",document.body.classList.contains("dark"))};
if(localStorage.getItem("hifz_dark")==="true")document.body.classList.add("dark");

async function getJSON(url){const r=await fetch(url);if(!r.ok)throw Error("Erreur réseau");return r.json()}
function fillSelect(id){const s=$(id);s.innerHTML=state.surahs.map(x=>`<option value="${x.number}">${x.number}. ${x.name} • ${x.englishName}</option>`).join("");s.value=state.current}
async function init(){
 try{
  const j=await getJSON(API+"/surah");
  state.surahs=j.data; fillSelect("surahSelect");fillSelect("memSurahSelect");
  $("surahSelect").onchange=()=>loadSurah(+$("surahSelect").value);
  $("memSurahSelect").onchange=()=>loadMemory(+$("memSurahSelect").value);
  $("searchBtn").onclick=searchTranslation;$("resetSearch").onclick=()=>{ $("searchInput").value=""; renderReader(state.currentData)};
  $("hideAll").onclick=()=>setHidden(true);$("showAll").onclick=()=>setHidden(false);
  $("listenMem").onclick=()=>playSequence(state.currentData);
  await loadSurah(1); await loadMemory(1); updateProgress(); renderReview();
 }catch(e){$("reader").innerHTML=`<div class="loading">Impossible de charger le Coran. Vérifie ta connexion Internet puis actualise la page.</div>`}
}
async function loadSurah(n){
 state.current=n;$("surahSelect").value=n;$("memSurahSelect").value=n;
 $("reader").innerHTML=`<div class="loading">Chargement de la sourate…</div>`;
 try{
  const [ar,fr]=await Promise.all([getJSON(`${API}/surah/${n}/quran-uthmani`),getJSON(`${API}/surah/${n}/fr.hamidullah`)]);
  state.currentData=ar.data.ayahs.map((a,i)=>({...a,translation:fr.data.ayahs[i]?.text||""}));
  $("surahMeta").textContent=`${ar.data.englishName} • ${ar.data.name} • ${ar.data.numberOfAyahs} versets`;
  renderReader(state.currentData);
 }catch(e){$("reader").innerHTML=`<div class="loading">Erreur de chargement.</div>`}
}
function status(n){return progress[n]||"new"}
function buttons(a){
 const s=status(a.number);const label=s==="mem"?"✓ Mémorisé":s==="learn"?"↻ À réviser":"○ À apprendre";
 return `<button class="secondary" onclick="toggleStatus(${a.number},'${s}')">${label}</button><button class="secondary" onclick="playAyah(${a.number},${a.numberInSurah})">▶️</button>`;
}
function renderReader(data){
 $("reader").innerHTML=data.map(a=>`<article class="ayah" data-ayah="${a.numberInSurah}">
 <div class="ayahTop"><span class="ayahNum">${a.numberInSurah}</span><span class="status ${status(a.number)}">${status(a.number)==="mem"?"Mémorisé":status(a.number)==="learn"?"À réviser":"À apprendre"}</span></div>
 <div class="arabic">${a.text}</div><div class="translation">${a.translation}</div><div class="ayahActions">${buttons(a)}</div>
 </article>`).join("");
}
function toggleStatus(globalNumber,current){
 const next=current==="new"?"learn":current==="learn"?"mem":"new";progress[globalNumber]=next;save();renderReader(state.currentData);renderMemory();
 showToast(next==="mem"?"Verset marqué comme mémorisé ✓":next==="learn"?"Verset ajouté aux révisions ↻":"Verset remis à apprendre");
}
function playAyah(globalNumber,local){const a=state.currentData.find(x=>x.number===globalNumber);if(!a){return} const audio=new Audio(a.audio);audio.play().catch(()=>showToast("Lecture audio bloquée par le navigateur"))}
async function playSequence(data){for(const a of data){const au=new Audio(a.audio);try{await au.play();await new Promise(r=>{au.onended=r;au.onerror=r})}catch(e){break}}}
function setHidden(v){state.hidden=v;renderMemory()}
function renderMemory(){
 const data=state.currentData;if(!data.length)return;
 $("memoryReader").innerHTML=data.map(a=>`<article class="ayah" data-mem="${a.numberInSurah}">
 <div class="ayahTop"><span class="ayahNum">${a.numberInSurah}</span><span class="status ${status(a.number)}">${status(a.number)==="mem"?"Mémorisé":status(a.number)==="learn"?"À réviser":"À apprendre"}</span></div>
 <div class="arabic ${state.hidden?"hiddenText":""}" onclick="this.classList.toggle('revealed')">${a.text}</div>
 <div class="translation ${state.hidden?"hiddenText":""}" onclick="this.classList.toggle('revealed')">${a.translation}</div>
 <div class="ayahActions">${buttons(a)}</div></article>`).join("");
}
async function loadMemory(n){await loadSurah(n);renderMemory()}
async function searchTranslation(){
 const q=$("searchInput").value.trim().toLowerCase();if(!q){renderReader(state.currentData);return}
 const filtered=state.currentData.filter(a=>a.translation.toLowerCase().includes(q));
 $("reader").innerHTML=filtered.length?filtered.map(a=>`<article class="ayah"><div class="ayahTop"><span class="ayahNum">${a.numberInSurah}</span></div><div class="arabic">${a.text}</div><div class="translation">${a.translation}</div></article>`).join(""):`<div class="loading">Aucun résultat dans cette sourate.</div>`;
}
function renderReview(){
 const items=state.surahs.flatMap(s=>{return []});
 const entries=Object.entries(progress).filter(([,v])=>v==="learn");
 $("reviewList").innerHTML=entries.length?entries.map(([n])=>`<div class="reviewItem"><div><b>Verset ${n}</b><small> • marqué à réviser</small></div><button class="primary" onclick="openVerse(${n})">Réviser</button></div>`).join(""):`<div class="card"><h3>🌱 Rien à réviser pour le moment</h3><p>Marque des versets « À réviser » depuis la lecture ou le mode mémorisation.</p></div>`;
}
async function openVerse(global){
 const found=state.surahs.find(s=>global>=s.number && false);
 // Map global ayah number to surah by loading metadata from the API's surah list.
 try{
  for(const s of state.surahs){const j=await getJSON(`${API}/surah/${s.number}`);if(global>=j.data.ayahs[0].number && global<=j.data.ayahs[j.data.ayahs.length-1].number){go("memorize");await loadMemory(s.number);document.querySelector(`[data-mem="${global-j.data.ayahs[0].number+1}"]`)?.scrollIntoView({behavior:"smooth"});return}}
 }catch(e){}
}
function updateProgress(){
 const total=6236;const mem=Object.values(progress).filter(x=>x==="mem").length;const rev=Object.values(progress).filter(x=>x==="learn").length;
 const pct=Math.min(100,mem/total*100);$("progressPercent").textContent=pct.toFixed(1)+"%";$("progressBar").style.width=pct+"%";$("memorizedCount").textContent=mem;$("reviewCount").textContent=rev;
 $("surahProgress").innerHTML=state.surahs.map(s=>`<div class="surahItem"><span>${s.number}. ${s.name}</span><small>${s.numberOfAyahs} versets</small></div>`).join("");
}
function showToast(t){const x=$("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1800)}
init();
