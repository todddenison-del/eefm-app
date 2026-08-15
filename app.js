const PACKAGE_KEY = "eefmPrivatePackage";
const NOTES_KEY = "eefmLocalNotes";
const TAB_KEY = "eefmShellTab";
const DAY_KEY = "eefmShellDay";
const AUTO_DAY_KEY = "eefmAutoDayEnabled";
const ACTUALS_KEY = "eefmTimelineActuals";

const tabNames = ["Today","Itinerary","Operations","Field Notes","More"];
let activeTab = localStorage.getItem(TAB_KEY) || "Today";
let selectedDay = Number(localStorage.getItem(DAY_KEY) || 0);

function esc(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}
function card(html){ return `<section class="card">${html}</section>`; }
function pkg(){ try { return JSON.parse(localStorage.getItem(PACKAGE_KEY) || "null"); } catch { return null; } }
function notes(){ try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "[]"); } catch { return []; } }
function actuals(){ try { return JSON.parse(localStorage.getItem(ACTUALS_KEY) || "{}"); } catch { return {}; } }
function saveActuals(v){ localStorage.setItem(ACTUALS_KEY, JSON.stringify(v)); }
function days(){ const p=pkg(); return Array.isArray(p?.days) ? p.days : []; }
function currentDay(){ const d=days(); if(!d.length) return null; if(selectedDay<0||selectedDay>=d.length) selectedDay=0; return d[selectedDay]; }
function list(items){ if(!Array.isArray(items)||!items.length) return ""; return `<ul>${items.map(x=>`<li>${esc(typeof x==="string"?x:x.text||x.name||"")}</li>`).join("")}</ul>`; }
function nowTime(){ return new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }
function timelineKey(dayIndex,itemIndex){ return `${dayIndex}:${itemIndex}`; }
function parseLeadingTime(v){ const m=String(v||"").match(/^\s*(\d{1,2}):(\d{2})/); return m ? Number(m[1])*60+Number(m[2]) : null; }

function tripDayIndexToday(){
  const d=days();
  if(!d.length) return -1;
  const now=new Date();
  const iso=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  return d.findIndex(x=>x.date===iso);
}
function autoSelectCurrentDay(){
  const enabled=localStorage.getItem(AUTO_DAY_KEY)!=="false";
  const idx=tripDayIndexToday();
  if(enabled && idx>=0){ selectedDay=idx; localStorage.setItem(DAY_KEY,String(idx)); }
}
function getNextFixedAnchor(day){
  if(!day||!Array.isArray(day.timeline)) return null;
  const now=new Date();
  const mins=now.getHours()*60+now.getMinutes();
  const fixed=day.timeline.map((x,i)=>({...x,index:i,mins:parseLeadingTime(x.time)}))
    .filter(x=>String(x.status||"").toLowerCase()==="fixed"&&x.mins!==null);
  if(!fixed.length) return null;
  return fixed.find(x=>x.mins>=mins) || fixed[fixed.length-1];
}
function timeline(items){
  if(!Array.isArray(items)) return "";
  const log=actuals();
  return items.map((x,i)=>{
    const rec=log[timelineKey(selectedDay,i)]||{};
    return `<button onclick="toggleTimeline(${i})" style="width:100%;text-align:left;border:0;border-bottom:1px solid #eee8de;background:${rec.completed?"#f2f7ef":"transparent"};padding:12px 0;color:inherit">
      <div class="timeline-time">${esc(x.time)}</div>
      <strong>${rec.completed?"✓ ":""}${esc(x.activity)}</strong>
      <div class="muted">${esc(x.note)}</div>
      <div style="margin-top:6px">${x.status?`<span class="pill">${esc(x.status)}</span>`:""}${rec.actualTime?`<span class="pill">Actual ${esc(rec.actualTime)}</span>`:""}</div>
    </button>`;
  }).join("");
}

function emptyState(){
  return card(`<div class="eyebrow">Private data</div><h2>No expedition package loaded</h2><p>This public app shell contains no private expedition information.</p><p class="muted">Import your private EEFM JSON package from Files. It will be stored only in this app/browser profile on this device.</p><input id="packageFile" type="file" accept=".json,application/json"><button class="action" onclick="importPackage()">Import private package</button>`);
}
function todaySummary(day){
  const next=getNextFixedAnchor(day);
  const log=actuals();
  const completed=Object.entries(log).filter(([k,v])=>k.startsWith(`${selectedDay}:`)&&v.completed).length;
  const total=Array.isArray(day.timeline)?day.timeline.length:0;
  return card(`<div class="eyebrow">Today at a Glance</div><h2>${esc(day.title||"Today")}</h2><p class="muted">${esc(day.dateLabel||"")}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0"><div style="background:#f4f1ea;border-radius:14px;padding:12px"><div class="eyebrow">Progress</div><strong>${completed} / ${total}</strong></div><div style="background:#f4f1ea;border-radius:14px;padding:12px"><div class="eyebrow">Privacy</div><strong>Local only</strong></div></div>
    ${next?`<div style="background:#eef2f7;border-radius:16px;padding:14px"><div class="eyebrow">Next Fixed Anchor</div><h3>${esc(next.time)} · ${esc(next.activity)}</h3><div class="muted">${esc(next.note)}</div></div>`:`<p class="muted">No timed fixed anchor detected.</p>`}
    <button class="action" onclick="quickNote()">Quick field note</button><button class="action" onclick="jumpToTimeline()">Jump to timeline</button>`);
}
function todayScreen(){
  const day=currentDay(); if(!day) return emptyState();
  return todaySummary(day)
    + card(`<div class="eyebrow">${esc(day.dateLabel||`Day ${day.day||selectedDay+1}`)}</div><h2>${esc(day.title||"Today")}</h2>${day.subtitle?`<p>${esc(day.subtitle)}</p>`:""}${day.epigraph?.text?`<blockquote style="margin:12px 0;padding-left:14px;border-left:3px solid #c5a55a">“${esc(day.epigraph.text)}”<div class="muted" style="margin-top:6px">— ${esc(day.epigraph.author||"")}</div></blockquote>`:""}`)
    + card(`<div id="timelineSection" class="eyebrow">Operations</div><h2>Day at a glance</h2><p class="muted">Tap an item to mark it complete and record the actual time.</p>${timeline(day.timeline)}`)
    + card(`<div class="eyebrow">Interpretive Plan</div>${Array.isArray(day.interpretivePlan)?day.interpretivePlan.map(x=>`<h3>${esc(x.heading)}</h3><p>${esc(x.text)}</p>`).join(""):""}`)
    + card(`<div class="eyebrow">Fieldwork</div>${list(day.fieldwork)}`)
    + card(`<div class="eyebrow">Photography</div>${list(day.photography)}`)
    + card(`<div class="eyebrow">Comfort</div>${list(day.comfort)}`)
    + card(`<div class="eyebrow">Evening Record</div>${list(day.eveningRecord)}`)
    + card(`<div class="eyebrow">Tomorrow</div><p>${esc(day.tomorrowPreview||"")}</p>`);
}
function itineraryScreen(){
  const d=days(); if(!d.length) return emptyState();
  return card(`<div class="eyebrow">Private package</div><h2>Itinerary</h2><p class="muted">${d.length} days loaded locally.</p>`)
    + d.map((x,i)=>`<button class="day" onclick="openDay(${i})"><span class="eyebrow">${esc(x.dateLabel||`Day ${i+1}`)}</span><b>${esc(x.title||`Day ${i+1}`)}</b>${i===selectedDay?`<span class="pill">Selected</span>`:""}</button>`).join("");
}
function operationsScreen(){
  const p=pkg(); if(!p) return emptyState(); const a=p.appendixA||{};
  const groups=[["Controls",a.controls],["Air",a.air],["Lodging",a.lodging],["Rail",a.rail],["Ground",a.ground],["Dining",a.dining],["Events",a.events],["Admissions",a.admissions]];
  let html=card(`<div class="eyebrow">Private package</div><h2>Operations</h2><p class="muted">Loaded locally on this device.</p>`);
  for(const [label,items] of groups){ if(!Array.isArray(items)||!items.length) continue; html+=card(`<div class="eyebrow">${esc(label)}</div>`+items.map(x=>`<div style="padding:10px 0;border-bottom:1px solid #eee8de"><strong>${esc(x.name||x.journey||x.route||x.title||x.provider||x.flight||"")}</strong><div class="muted">${esc(x.date||x.dates||"")} ${esc(x.time||x.schedule||"")}</div>${x.detail?`<div>${esc(x.detail)}</div>`:""}${x.seats?`<div>${esc(x.seats)}</div>`:""}${x.status?`<span class="pill">${esc(x.status)}</span>`:""}${x.note||x.text?`<p class="muted">${esc(x.note||x.text)}</p>`:""}</div>`).join("")); }
  return html;
}
function notesScreen(){
  const arr=notes();
  return card(`<div class="eyebrow">On-device only</div><h2>Field Notes</h2><label class="eyebrow">Category</label><select id="noteCategory" style="width:100%;padding:12px;border:1px solid #ccc5b9;border-radius:14px;background:#fbfaf7;margin:8px 0 12px"><option>Observation</option><option>Historical interpretation</option><option>Archaeology</option><option>Operational friction</option><option>Photography</option><option>Dining / comfort</option><option>Research follow-up</option></select><textarea id="noteBox" rows="5" placeholder="Observation, actual timing, research question…"></textarea><button class="action" onclick="saveNote()">Save note locally</button>`)
    + arr.slice().reverse().map(n=>card(`<div class="eyebrow">${esc(n.category||"Field note")} · ${esc(n.dayLabel||"")}</div><div class="muted">${esc(n.time)}</div><p>${esc(n.text)}</p>`)).join("");
}
function moreScreen(){
  const p=pkg(), arr=notes(), auto=localStorage.getItem(AUTO_DAY_KEY)!=="false";
  return card(`<div class="eyebrow">Privacy & Data Status</div><h2>Private-by-design</h2><div class="${p?"ok":"warn"}">${p?"PRIVATE PACKAGE LOADED LOCALLY":"NO PRIVATE PACKAGE LOADED"}</div><p><strong>Network:</strong> ${navigator.onLine?"Online":"Offline"}</p><p><strong>Public repository:</strong> generic application shell only.</p><p><strong>On this device:</strong> ${p?"private expedition package":"no expedition package"} and ${arr.length} field note${arr.length===1?"":"s"}.</p>`)
    + card(`<div class="eyebrow">Field behavior</div><h2>Automatic expedition day</h2><p class="muted">During 1–17 September 2026 the app can automatically open the matching day.</p><button class="action" onclick="toggleAutoDay()">${auto?"Disable":"Enable"} automatic day selection</button>`)
    + card(`<div class="eyebrow">Private package controls</div><h2>Import / remove</h2><input id="packageFileMore" type="file" accept=".json,application/json"><button class="action" onclick="importPackage('packageFileMore')">Import or replace package</button>${p?`<button class="action danger" onclick="removePackage()">Remove private package from this device</button>`:""}`)
    + card(`<div class="eyebrow">Build</div><h2>EEFM shell v1.2</h2><p class="muted">Automatic day selection, next-fixed-anchor summary, completion/actual-time logging, structured field notes and offline/private status.</p>`);
}
function render(){ autoSelectCurrentDay(); const app=document.getElementById("app"); app.innerHTML=activeTab==="Today"?todayScreen():activeTab==="Itinerary"?itineraryScreen():activeTab==="Operations"?operationsScreen():activeTab==="Field Notes"?notesScreen():moreScreen(); document.getElementById("tabs").innerHTML=tabNames.map(name=>`<button class="${name===activeTab?"active":""}" onclick="setTab('${name}')">${name}</button>`).join(""); }
function setTab(name){ activeTab=name; localStorage.setItem(TAB_KEY,name); scrollTo(0,0); render(); }
function openDay(i){ selectedDay=i; localStorage.setItem(DAY_KEY,String(i)); activeTab="Today"; localStorage.setItem(TAB_KEY,activeTab); scrollTo(0,0); render(); }
function toggleTimeline(i){ const data=actuals(), key=timelineKey(selectedDay,i), cur=data[key]||{}; data[key]=cur.completed?{}:{completed:true,actualTime:nowTime()}; saveActuals(data); render(); }
function jumpToTimeline(){ document.getElementById("timelineSection")?.scrollIntoView({behavior:"smooth",block:"start"}); }
function quickNote(){ const day=currentDay(), text=prompt("Quick field note"); if(!text||!text.trim()) return; const arr=notes(); arr.push({time:new Date().toLocaleString(),category:"Quick capture",dayLabel:day?.dateLabel||"",dayIndex:selectedDay,text:text.trim()}); localStorage.setItem(NOTES_KEY,JSON.stringify(arr)); alert("Field note saved locally."); }
function saveNote(){ const box=document.getElementById("noteBox"), cat=document.getElementById("noteCategory"); if(!box||!box.value.trim()) return; const arr=notes(), day=currentDay(); arr.push({time:new Date().toLocaleString(),category:cat?.value||"Observation",dayLabel:day?.dateLabel||"",dayIndex:selectedDay,text:box.value.trim()}); localStorage.setItem(NOTES_KEY,JSON.stringify(arr)); render(); }
function toggleAutoDay(){ const cur=localStorage.getItem(AUTO_DAY_KEY)!=="false"; localStorage.setItem(AUTO_DAY_KEY,cur?"false":"true"); render(); }
function importPackage(inputId="packageFile"){ const input=document.getElementById(inputId), file=input?.files?.[0]; if(!file){ alert("Choose the private EEFM JSON package first."); return; } const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); if(!data||!Array.isArray(data.days)) throw new Error("Invalid EEFM package"); localStorage.setItem(PACKAGE_KEY,JSON.stringify(data)); selectedDay=0; localStorage.setItem(DAY_KEY,"0"); autoSelectCurrentDay(); activeTab="Today"; localStorage.setItem(TAB_KEY,activeTab); alert("Private EEFM package imported on this device."); render(); }catch(e){ alert("Could not import package: "+e.message); } }; reader.readAsText(file); }
function removePackage(){ if(confirm("Remove the private expedition package from this device? Field notes and actual-time records will remain.")){ localStorage.removeItem(PACKAGE_KEY); selectedDay=0; render(); } }
window.addEventListener("online",render); window.addEventListener("offline",render); autoSelectCurrentDay(); render();
