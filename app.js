const PACKAGE_KEY = "eefmPrivatePackage";
const NOTES_KEY = "eefmLocalNotes";
const TAB_KEY = "eefmShellTab";
const DAY_KEY = "eefmShellDay";

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
function pkg(){
  try { return JSON.parse(localStorage.getItem(PACKAGE_KEY) || "null"); }
  catch { return null; }
}
function notes(){
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "[]"); }
  catch { return []; }
}
function days(){
  const p = pkg();
  return Array.isArray(p?.days) ? p.days : [];
}
function currentDay(){
  const d = days();
  if (!d.length) return null;
  if (selectedDay < 0 || selectedDay >= d.length) selectedDay = 0;
  return d[selectedDay];
}
function list(items){
  if (!Array.isArray(items) || !items.length) return "";
  return `<ul>${items.map(x=>`<li>${esc(typeof x === "string" ? x : x.text || x.name || "")}</li>`).join("")}</ul>`;
}
function timeline(items){
  if (!Array.isArray(items)) return "";
  return items.map(x=>`<div class="timeline-item"><div class="timeline-time">${esc(x.time)}</div><strong>${esc(x.activity)}</strong><div class="muted">${esc(x.note)}</div></div>`).join("");
}

function emptyState(){
  return card(`
    <div class="eyebrow">Private data</div>
    <h2>No expedition package loaded</h2>
    <p>This public app shell contains no itinerary, reservations, names, travel dates, booking identifiers, field notes or other private expedition information.</p>
    <p class="muted">Import your private EEFM JSON package from Files. The imported package is stored only in this browser/app profile on this device.</p>
    <input id="packageFile" type="file" accept=".json,application/json">
    <button class="action" onclick="importPackage()">Import private package</button>
  `);
}

function todayScreen(){
  const day = currentDay();
  if (!day) return emptyState();
  return card(`
      <div class="eyebrow">${esc(day.dateLabel || `Day ${day.day || selectedDay+1}`)}</div>
      <h2>${esc(day.title || "Today")}</h2>
      ${day.subtitle ? `<p>${esc(day.subtitle)}</p>` : ""}
    `)
    + card(`<div class="eyebrow">Operations</div><h2>Day at a glance</h2>${timeline(day.timeline)}`)
    + card(`<div class="eyebrow">Fieldwork</div>${list(day.fieldwork)}`)
    + card(`<div class="eyebrow">Photography</div>${list(day.photography)}`)
    + card(`<div class="eyebrow">Comfort</div>${list(day.comfort)}`)
    + card(`<div class="eyebrow">Tomorrow</div><p>${esc(day.tomorrowPreview || "")}</p>`);
}

function itineraryScreen(){
  const d = days();
  if (!d.length) return emptyState();
  return card(`<div class="eyebrow">Private package</div><h2>Itinerary</h2><p class="muted">${d.length} days loaded locally.</p>`)
    + d.map((x,i)=>`<button class="day" onclick="openDay(${i})"><span class="eyebrow">${esc(x.dateLabel || `Day ${i+1}`)}</span><b>${esc(x.title || `Day ${i+1}`)}</b></button>`).join("");
}

function operationsScreen(){
  const p = pkg();
  if (!p) return emptyState();
  const a = p.appendixA || {};
  const groups = [
    ["Air",a.air],["Lodging",a.lodging],["Rail",a.rail],["Ground",a.ground],
    ["Dining",a.dining],["Events",a.events],["Admissions",a.admissions],["Controls",a.controls]
  ];
  let html = card(`<div class="eyebrow">Private package</div><h2>Operations</h2><p class="muted">Loaded locally on this device.</p>`);
  for (const [label,items] of groups){
    if (!Array.isArray(items) || !items.length) continue;
    html += card(`<div class="eyebrow">${esc(label)}</div>` + items.map(x=>`
      <div style="padding:10px 0;border-bottom:1px solid #eee8de">
        <strong>${esc(x.name || x.journey || x.route || x.title || x.provider || "")}</strong>
        <div class="muted">${esc(x.date || x.dates || "")} ${esc(x.time || x.schedule || "")}</div>
        ${x.status ? `<span class="pill">${esc(x.status)}</span>` : ""}
      </div>`).join(""));
  }
  return html;
}

function notesScreen(){
  const arr = notes();
  return card(`
    <div class="eyebrow">On-device only</div>
    <h2>Field Notes</h2>
    <textarea id="noteBox" rows="5" placeholder="Observation, actual timing, research question…"></textarea>
    <button class="action" onclick="saveNote()">Save note locally</button>
  `) + arr.slice().reverse().map(n=>card(`<div class="eyebrow">${esc(n.time)}</div><div>${esc(n.text)}</div>`)).join("");
}

function moreScreen(){
  const p = pkg();
  const arr = notes();
  return card(`
    <div class="eyebrow">Privacy & Data Status</div>
    <h2>Private-by-design</h2>
    <div class="${p ? "ok" : "warn"}">${p ? "PRIVATE PACKAGE LOADED LOCALLY" : "NO PRIVATE PACKAGE LOADED"}</div>
    <p><strong>Public repository:</strong> generic application shell only.</p>
    <p><strong>On this device:</strong> ${p ? "private expedition package" : "no expedition package"} and ${arr.length} field note${arr.length===1?"":"s"}.</p>
    <p><strong>Never publish:</strong> confirmation numbers, record locators, passport data, hotel entry codes, ticket barcodes, personal contacts, medical/insurance identifiers, passwords or payment data.</p>
  `)
  + card(`
    <div class="eyebrow">Private package controls</div>
    <h2>Import / remove</h2>
    <input id="packageFileMore" type="file" accept=".json,application/json">
    <button class="action" onclick="importPackage('packageFileMore')">Import or replace package</button>
    ${p ? `<button class="action danger" onclick="removePackage()">Remove private package from this device</button>` : ""}
  `)
  + card(`
    <div class="eyebrow">Build</div>
    <h2>EEFM privacy-separated shell v1.0</h2>
    <p class="muted">Offline-capable PWA. Private expedition data is imported locally and is not fetched from the public repository.</p>
  `);
}

function render(){
  const app = document.getElementById("app");
  app.innerHTML =
    activeTab==="Today" ? todayScreen() :
    activeTab==="Itinerary" ? itineraryScreen() :
    activeTab==="Operations" ? operationsScreen() :
    activeTab==="Field Notes" ? notesScreen() : moreScreen();

  document.getElementById("tabs").innerHTML = tabNames.map(name=>`
    <button class="${name===activeTab?"active":""}" onclick="activeTab='${name}';localStorage.setItem(TAB_KEY,name);render()">${name}</button>
  `).join("");
}

function openDay(i){
  selectedDay=i;
  localStorage.setItem(DAY_KEY,String(i));
  activeTab="Today";
  localStorage.setItem(TAB_KEY,activeTab);
  scrollTo(0,0);
  render();
}

function saveNote(){
  const box=document.getElementById("noteBox");
  if(!box || !box.value.trim()) return;
  const arr=notes();
  arr.push({time:new Date().toLocaleString(),text:box.value.trim()});
  localStorage.setItem(NOTES_KEY,JSON.stringify(arr));
  render();
}

function importPackage(inputId="packageFile"){
  const input=document.getElementById(inputId);
  const file=input?.files?.[0];
  if(!file){ alert("Choose the private EEFM JSON package first."); return; }
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!data || !Array.isArray(data.days)) throw new Error("Invalid EEFM package");
      localStorage.setItem(PACKAGE_KEY,JSON.stringify(data));
      selectedDay=0;
      localStorage.setItem(DAY_KEY,"0");
      activeTab="Today";
      localStorage.setItem(TAB_KEY,activeTab);
      alert("Private EEFM package imported on this device.");
      render();
    }catch(e){
      alert("Could not import package: " + e.message);
    }
  };
  reader.readAsText(file);
}

function removePackage(){
  if(confirm("Remove the private expedition package from this device? Field notes will remain.")){
    localStorage.removeItem(PACKAGE_KEY);
    selectedDay=0;
    render();
  }
}

render();
