export function mountLegacyNoteIQ() {
  if (window.__noteiqLegacyMounted) return () => {};
  window.__noteiqLegacyMounted = true;

/* ── STATE ── */
let notes = JSON.parse(localStorage.getItem('niq_v3') || '[]');
notes = notes.map(normalizeNote);
let curId = null;
let curView = 'dash';
let layout = 'grid';
let sortMode = 'newest';
let searchQ = '';
let smartSearchIds = null;
let semanticSearchTimer = null;
let voiceRecorder = null;
let voiceChunks = [];
const AI_API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
let pendingDel = null;
let autoSaveTimer = null;
const defaultSettings={theme:'dark',accent:'amber',density:'cozy',defaultFont:'normal',autoSaveDelay:1200,animations:true,wideEditor:false,showWelcome:true};
let appSettings={...defaultSettings,...JSON.parse(localStorage.getItem('niq_settings')||'{}')};

/* ── CANVAS STATE ── */
let drawTool = 'pen';
let drawColor = '#eeebe4';
let brushSize = 3;
let isDrawing = false;
let lastX = 0, lastY = 0;
let drawHistory = [];
let currentStroke = [];

function normalizeNote(n){
  const props=n.props||{};
  const {analysis, analyzedAt, ...base}=n;
  return {
    ...base,
    images:n.images||[],
    body:n.body||'',
    title:n.title||'',
    parentId:n.parentId||null,
    favorite:!!(n.favorite||n.pinned),
    props:{
      status:props.status||'Inbox',
      type:props.type||'Page',
      due:props.due||'',
      tags:Array.isArray(props.tags)?props.tags:[]
    }
  };
}

/* ── LOADING ── */
const lsSteps = [
  [20,'Loading…'],[45,'Preparing workspace…'],[70,'Syncing notes…'],[90,'Almost ready…'],[100,'Ready']
];
let lsIdx = 0;
function tickLoader(){
  if(lsIdx>=lsSteps.length){
    setTimeout(()=>{
      document.getElementById('loadScreen').classList.add('gone');
      document.getElementById('app').classList.add('ready');
      initApp();
    },300);return;
  }
  const[p,m]=lsSteps[lsIdx++];
  document.getElementById('lsBar').style.width=p+'%';
  document.getElementById('lsStatus').textContent=m;
  setTimeout(tickLoader,280+Math.random()*220);
}
setTimeout(tickLoader,300);

/* ── INIT ── */
function initApp(){
  applySettings();
  setGreeting();
  refreshUI();
  initCanvas();
  setupDragDrop();
  setTimeout(()=>{ document.getElementById('editorView').style.display='none'; },0);
  handleResize();
}

window.addEventListener('resize', handleResize);
function handleResize(){
  const mob = window.innerWidth <= 900;
  if(curId){ initCanvas(); }
}

function setGreeting(){
  const h=new Date().getHours();
  document.getElementById('greeting').textContent=h<12?'morning':h<17?'afternoon':'evening';
}

function applySettings(){
  document.body.classList.toggle('theme-light',appSettings.theme==='light');
  document.body.classList.toggle('theme-contrast',appSettings.theme==='contrast');
  document.body.classList.toggle('density-compact',appSettings.density==='compact');
  document.body.classList.toggle('no-motion',!appSettings.animations);
  document.body.classList.toggle('wide-editor',appSettings.wideEditor);
  const accentMap={
    amber:['#c9a84c','rgba(201,168,76,.08)','rgba(201,168,76,.2)'],
    green:['#4d9e6f','rgba(77,158,111,.09)','rgba(77,158,111,.22)'],
    blue:['#5480c0','rgba(84,128,192,.09)','rgba(84,128,192,.22)'],
    purple:['#8b6fbd','rgba(139,111,189,.09)','rgba(139,111,189,.22)'],
    pink:['#b85a8a','rgba(184,90,138,.09)','rgba(184,90,138,.22)'],
    red:['#c95252','rgba(201,82,82,.09)','rgba(201,82,82,.22)']
  };
  const [accent,bg,bd]=accentMap[appSettings.accent]||accentMap.amber;
  document.documentElement.style.setProperty('--amber',accent);
  document.documentElement.style.setProperty('--amber-bg',bg);
  document.documentElement.style.setProperty('--amber-bd',bd);
  const banner=document.querySelector('.welcome-banner');
  if(banner)banner.style.display=appSettings.showWelcome?'flex':'none';
  syncSettingsUI();
  if(curId)applyFont(appSettings.defaultFont);
}

function syncSettingsUI(){
  const pairs={setTheme:'theme',setAccent:'accent',setDensity:'density',setDefaultFont:'defaultFont',setAutoSaveDelay:'autoSaveDelay'};
  Object.entries(pairs).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=String(appSettings[key]);});
  [['setAnimations','animations'],['setWideEditor','wideEditor'],['setShowWelcome','showWelcome']].forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.checked=!!appSettings[key];});
}

function saveSetting(key,value){
  appSettings={...appSettings,[key]:value};
  localStorage.setItem('niq_settings',JSON.stringify(appSettings));
  applySettings();
}

function openSettings(){
  syncSettingsUI();
  document.getElementById('settingsModal').classList.add('on');
  closeSidebar();
}
function closeSettings(){document.getElementById('settingsModal').classList.remove('on');}
function resetSettings(){
  appSettings={...defaultSettings};
  localStorage.setItem('niq_settings',JSON.stringify(appSettings));
  applySettings();
  toast('Settings reset');
}

/* ── KEYBOARD ── */
document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey){
    if(e.key==='k'){e.preventDefault();createNote();}
    if(e.key==='s'){e.preventDefault();saveNote();toast('💾 Saved');}
  }
  if(e.key==='Escape'&&curId) backToDash();
});

/* ── VIEWS ── */
function setView(v){
  curView=v;
  ['navDash','navAll','navPinned','navTags','navFavorites','navTasks'].forEach(id=>document.getElementById(id)?.classList.remove('on'));
  const map={dash:'navDash',all:'navAll',pinned:'navPinned',tags:'navTags',favorites:'navFavorites',tasks:'navTasks'};
  document.getElementById(map[v])?.classList.add('on');
  document.getElementById('dashTopTitle').textContent={dash:'Dashboard',all:'All Notes',pinned:'Pinned',tags:'By Tags',favorites:'Favorites',tasks:'Tasks'}[v]||'Dashboard';
  showDashView();
  renderDashboard();
  closeSidebar();
}

function showDashView(){
  document.getElementById('dashView').style.display='flex';
  document.getElementById('dashTopbar').style.display='flex';
  document.getElementById('editorView').style.display='none';
  curId=null;
}

function backToDash(){
  saveNote();
  showDashView();
  renderDashboard();
  refreshSidebar();
}

/* ── SIDEBAR MOBILE ── */
function openSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('mobOverlay').classList.add('on');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobOverlay').classList.remove('on');
}

/* ── LAYOUT / SORT ── */
function setLayout(l){
  layout=l;
  ['grid','list','table','board','calendar'].forEach(v=>document.getElementById(v+'Btn')?.classList.toggle('on',l===v));
  renderDashboard();
}
function setSortMode(m){sortMode=m;renderDashboard();}
function filterNotes(q){
  searchQ=q.toLowerCase();
  smartSearchIds=null;
  renderDashboard();
  clearTimeout(semanticSearchTimer);
  if(q.trim().length>2){ semanticSearchTimer=setTimeout(()=>semanticSearchNotes(q),350); }
}

/* ── RENDER DASHBOARD ── */
const tagColors={
  '#work':['#5480c0','rgba(84,128,192,.12)'],
  '#study':['#8b6fbd','rgba(139,111,189,.12)'],
  '#fitness':['#4d9e6f','rgba(77,158,111,.12)'],
  '#ideas':['#c9a84c','rgba(201,168,76,.12)'],
  '#personal':['#b85a8a','rgba(184,90,138,.12)'],
  '#health':['#c95252','rgba(201,82,82,.12)'],
  '#finance':['#4d9e6f','rgba(77,158,111,.12)'],
  '#travel':['#5480c0','rgba(84,128,192,.12)'],
  '#shopping':['#c9a84c','rgba(201,168,76,.12)'],
  '#food':['#b85a8a','rgba(184,90,138,.12)'],
};
function tc(tag){return tagColors[tag]||['var(--amber)','var(--amber-bg)'];}
function tagBorderColor(tags){return tags?.length?tc(tags[0])[0]:'var(--amber)';}
function getNoteTags(n){return n.props?.tags||[];}
function escapeHTML(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

function renderDashboard(filter){
  if(!filter) filter=curView==='pinned'?'pinned':curView==='tags'?'tags':curView==='favorites'?'favorites':curView==='tasks'?'tasks':'all';
  const total=notes.length;
  const pinned=notes.filter(n=>n.pinned).length;
  const withImg=notes.filter(n=>n.images?.length).length;
  const allTags=[...new Set(notes.flatMap(getNoteTags))];
  document.getElementById('sc1').textContent=total;
  document.getElementById('sc2').textContent=allTags.length;
  document.getElementById('sc3').textContent=pinned;
  document.getElementById('sc4').textContent=withImg;
  document.getElementById('welcomeSub').textContent=total===0?'Start capturing your thoughts.':`${total} note${total!==1?'s':''} · ${allTags.length} tags · ${withImg} with images`;

  let list=[...notes];
  if(filter==='pinned') list=list.filter(n=>n.pinned);
  if(filter==='favorites') list=list.filter(n=>n.favorite);
  if(filter==='tasks') list=list.filter(n=>n.props?.type==='Task'||/- \[ \]|☐/.test(n.body));
    if(searchQ){
    if(smartSearchIds?.length){
      const rank=new Map(smartSearchIds.map((id,i)=>[id,i]));
      list=list.filter(n=>rank.has(n.id)).sort((a,b)=>rank.get(a.id)-rank.get(b.id));
    } else {
      list=list.filter(n=>(n.title+n.body+getNoteTags(n).join(' ')+n.props.status+n.props.type).toLowerCase().includes(searchQ));
    }
  }
  if(sortMode==='newest') list.sort((a,b)=>b.updatedAt-a.updatedAt);
  if(sortMode==='oldest') list.sort((a,b)=>a.updatedAt-b.updatedAt);
  if(sortMode==='alpha') list.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
  if(sortMode==='favorites') list.sort((a,b)=>Number(b.favorite)-Number(a.favorite));

  const cont=document.getElementById('notesContainer');
  if(filter==='tags'){renderTagsView(cont);return;}
  if(!list.length){
    cont.className='';
    cont.innerHTML=`<div class="empty-ph"><div class="empty-ph-icon">${filter==='pinned'?'📌':'📝'}</div><h3>${filter==='pinned'?'No pinned notes':'No notes yet'}</h3><p>${filter==='pinned'?'Pin important notes for quick access.':'Click + New Note to get started.'}</p></div>`;
    return;
  }
  if(layout==='grid'){
    cont.className='notes-grid';
    cont.innerHTML=list.map((n,i)=>noteCardHTML(n,i)).join('');
  } else if(layout==='list') {
    cont.className='notes-list-view';
    cont.innerHTML=list.map((n,i)=>noteListHTML(n,i)).join('');
  } else if(layout==='table') {
    renderTableView(cont,list);
  } else if(layout==='board') {
    renderBoardView(cont,list);
  } else {
    renderCalendarView(cont,list);
  }
}

function noteCardHTML(n,i){
  const tags=getNoteTags(n);
  const color=tagBorderColor(tags);
  const thumb=n.images?.[0]?`<img class="nc-thumb" src="${n.images[0].data}" alt="" onclick="event.stopPropagation();openLightbox('${n.id}',0)">` : '';
  return `<div class="note-card" style="animation-delay:${Math.min(i*35,260)}ms" onclick="openNote('${n.id}')">
    <div class="nc-top-bar" style="background:${color}"></div>
    ${n.favorite?'<div style="position:absolute;top:10px;right:10px;font-size:11px;opacity:.7">★</div>':n.pinned?'<div style="position:absolute;top:10px;right:10px;font-size:11px;opacity:.5">📌</div>':''}
    ${tags.length?`<div class="nc-tags">${tags.slice(0,3).map(t=>`<span class="nc-tag" style="color:${tc(t)[0]};background:${tc(t)[1]};border:1px solid ${tc(t)[0]}22">${t}</span>`).join('')}</div>`:''}
    <div class="nc-title">${escapeHTML(n.title||'Untitled Note')}</div>
    <div class="board-meta"><span>${n.props?.type||'Page'}</span><span>${n.props?.status||'Inbox'}</span>${n.props?.due?`<span>Due ${n.props.due}</span>`:''}</div>
    ${thumb}
    <div class="nc-prev">${n.body||'No content yet…'}</div>
    <div class="nc-foot">
      <span class="nc-date">${fmtDate(n.updatedAt)}</span>
      <div class="nc-acts">
        ${n.drawingData?'<span style="font-size:10px;opacity:.4">✏️</span>':''}
        ${n.images?.length?`<span style="font-size:10px;opacity:.4">🖼️</span>`:''}
        <button class="nc-act" onclick="event.stopPropagation();togglePinById('${n.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></button>
        <button class="nc-act" onclick="event.stopPropagation();openDelModalById('${n.id}')" style="color:var(--red)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
      </div>
    </div>
  </div>`;
}

function noteListHTML(n,i){
  const tags=getNoteTags(n);
  const color=tagBorderColor(tags);
  return `<div class="note-list-item" style="animation-delay:${Math.min(i*28,220)}ms" onclick="openNote('${n.id}')">
    <div class="nli-bar" style="background:${color}"></div>
    <div class="nli-body">
      <div class="nli-title">${n.favorite?'★ ':n.pinned?'📌 ':''}${escapeHTML(n.title||'Untitled Note')}</div>
      <div class="nli-prev">${n.body||'No content'}</div>
    </div>
    ${tags.length?`<div class="nli-tags">${tags.slice(0,2).map(t=>`<span class="nc-tag" style="font-size:.6rem;padding:1px 6px;color:${tc(t)[0]};background:${tc(t)[1]};border:1px solid ${tc(t)[0]}22">${t}</span>`).join('')}</div>`:''}
    <div class="nli-date">${fmtDate(n.updatedAt)}</div>
  </div>`;
}

function renderTableView(cont,list){
  cont.className='';
  cont.innerHTML=`<table class="db-table"><thead><tr><th>Name</th><th>Status</th><th>Type</th><th>Due</th><th>Tags</th><th>Updated</th></tr></thead><tbody>${list.map(n=>`<tr onclick="openNote('${n.id}')"><td>${n.favorite?'★ ':''}${escapeHTML(n.title||'Untitled Note')}</td><td><span class="db-pill">${n.props?.status||'Inbox'}</span></td><td>${n.props?.type||'Page'}</td><td>${n.props?.due||''}</td><td>${getNoteTags(n).slice(0,3).map(t=>`<span class="db-pill">${escapeHTML(t)}</span>`).join(' ')}</td><td>${fmtDate(n.updatedAt)}</td></tr>`).join('')}</tbody></table>`;
}

function renderBoardView(cont,list){
  cont.className='board-view';
  const groups=['Inbox','Todo','Doing','Done'];
  cont.innerHTML=groups.map(status=>{
    const ns=list.filter(n=>(n.props?.status||'Inbox')===status);
    return `<div class="board-col"><div class="board-head"><span>${status}</span><span>${ns.length}</span></div>${ns.map(n=>`<div class="board-card" onclick="openNote('${n.id}')"><div class="board-title">${escapeHTML(n.title||'Untitled Note')}</div><div class="board-meta"><span>${n.props?.type||'Page'}</span>${n.props?.due?`<span>${n.props.due}</span>`:''}${getNoteTags(n).slice(0,2).map(t=>`<span>${escapeHTML(t)}</span>`).join('')}</div></div>`).join('')}</div>`;
  }).join('');
}

function renderCalendarView(cont,list){
  cont.className='calendar-view';
  const today=new Date();
  const start=new Date(today.getFullYear(),today.getMonth(),1);
  const first=start.getDay();
  const days=new Date(today.getFullYear(),today.getMonth()+1,0).getDate();
  const cells=[];
  for(let i=0;i<first;i++)cells.push(null);
  for(let d=1;d<=days;d++)cells.push(new Date(today.getFullYear(),today.getMonth(),d));
  while(cells.length%7)cells.push(null);
  cont.innerHTML=cells.map(d=>{
    if(!d)return'<div class="cal-day"></div>';
    const key=d.toISOString().slice(0,10);
    const due=list.filter(n=>n.props?.due===key);
    return `<div class="cal-day"><div class="cal-date">${d.toLocaleDateString('en-US',{weekday:'short'})} ${d.getDate()}</div>${due.map(n=>`<div class="cal-item" onclick="openNote('${n.id}')">${escapeHTML(n.title||'Untitled')}</div>`).join('')}</div>`;
  }).join('');
}

function renderTagsView(cont){
  const tagMap={};
  notes.forEach(n=>getNoteTags(n).forEach(t=>{if(!tagMap[t])tagMap[t]=[];tagMap[t].push(n);}));
  const tagEmoji={'#work':'💼','#study':'📚','#fitness':'💪','#ideas':'💡','#personal':'🙋','#health':'❤️','#finance':'💰','#travel':'✈️','#food':'🍳','#shopping':'🛒'};
  const entries=Object.entries(tagMap);
  if(!entries.length){cont.className='';cont.innerHTML=`<div class="empty-ph"><div class="empty-ph-icon">🏷️</div><h3>No tags yet</h3><p>Add tags in a note's properties to organize your workspace.</p></div>`;return;}
  cont.className='tags-grid';
  cont.innerHTML=entries.map(([tag,ns])=>`<div class="tag-card" onclick="filterByTag('${tag}')"><div class="tag-card-emoji">${tagEmoji[tag]||'🏷️'}</div><div class="tag-card-name">${tag}</div><div class="tag-card-count">${ns.length} note${ns.length!==1?'s':''}</div></div>`).join('');
}

function filterByTag(tag){searchQ=tag;document.getElementById('sbSearch').value=tag;setView('all');}

/* ── SIDEBAR REFRESH ── */
function refreshSidebar(){
  const total=notes.length, pinned=notes.filter(n=>n.pinned).length, tasks=notes.filter(n=>n.props?.type==='Task'||/- \[ \]|☐/.test(n.body)).length;
  document.getElementById('nbAll').textContent=total;
  document.getElementById('nbPinned').textContent=pinned;
  document.getElementById('nbFavorites').textContent=notes.filter(n=>n.favorite).length;
  document.getElementById('nbTasks').textContent=notes.filter(n=>n.props?.type==='Task'||/- \[ \]|☐/.test(n.body)).length;
  document.getElementById('sfTotal').textContent=total;
  document.getElementById('sfTasks').textContent=tasks;
  document.getElementById('sfPinned').textContent=pinned;
  renderPageTree();
  const sorted=[...notes].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,15);
  const cont=document.getElementById('sbNotes');
  if(!sorted.length){cont.innerHTML=`<div style="font-size:.69rem;color:var(--faint);padding:8px 10px;font-style:italic">No notes yet</div>`;return;}
  cont.innerHTML=sorted.map(n=>{
    const tags=getNoteTags(n);
    const color=tagBorderColor(tags);
    return `<div class="sbn-item${curId===n.id?' on':''}" onclick="openNote('${n.id}')">
      <div class="sbn-title">${n.title||'Untitled Note'}</div>
      <div class="sbn-prev">${n.body.slice(0,50)||'Empty'}</div>
      <div class="sbn-meta"><div class="sbn-dot" style="background:${color}"></div>${tags[0]?`<span style="font-size:.6rem;color:var(--faint)">${tags[0]}</span>`:''}<span class="sbn-date">${fmtDate(n.updatedAt)}</span></div>
    </div>`;
  }).join('');
}

function renderPageTree(){
  const cont=document.getElementById('pageTree');
  if(!cont)return;
  const roots=notes.filter(n=>!n.parentId).sort((a,b)=>b.favorite-a.favorite||b.updatedAt-a.updatedAt);
  const children=id=>notes.filter(n=>n.parentId===id).sort((a,b)=>b.updatedAt-a.updatedAt);
  const row=(n,child=false)=>`<div class="page-tree-item ${child?'child':''}${curId===n.id?' on':''}" onclick="openNote('${n.id}')"><span>${child?'↳':'▸'}</span><span class="pti-title">${escapeHTML(n.title||'Untitled')}</span>${n.favorite?'<span class="pti-star">★</span>':''}</div>`;
  cont.innerHTML=roots.slice(0,12).map(n=>row(n)+children(n.id).slice(0,4).map(c=>row(c,true)).join('')).join('')||'<div style="font-size:.68rem;color:var(--faint);padding:7px 8px">No pages yet</div>';
}

function refreshUI(){refreshSidebar();renderDashboard();}

/* ── CRUD ── */
function createNote(){
  const n=normalizeNote({id:'n'+Date.now(),title:'',body:'',images:[],drawingData:null,pinned:false,createdAt:Date.now(),updatedAt:Date.now()});
  notes.unshift(n);persist();openNote(n.id);toast('📝 New note');closeSidebar();
  celebrate(window.innerWidth-80,80);
}

function createChildPage(){
  const parent=curId||null;
  const n=normalizeNote({id:'n'+Date.now(),title:'Untitled subpage',body:'',parentId:parent,createdAt:Date.now(),updatedAt:Date.now(),props:{type:'Page',status:'Inbox',due:'',tags:[]}});
  notes.unshift(n);persist();openNote(n.id);toast('Subpage created');closeSidebar();
  celebrate(window.innerWidth-80,120);
}

function createDatabasePage(){
  const n=normalizeNote({id:'n'+Date.now(),title:'Project database',body:'| Name | Status | Owner |\n| --- | --- | --- |\n| Example task | Todo | Me |\n',createdAt:Date.now(),updatedAt:Date.now(),props:{type:'Database',status:'Inbox',due:'',tags:['#database']}});
  notes.unshift(n);persist();openNote(n.id);toast('Database page created');closeSidebar();
  celebrate(window.innerWidth-80,120);
}

function openNote(id){
  curId=id;
  const n=notes.find(x=>x.id===id);
  if(!n)return;
  document.getElementById('dashView').style.display='none';
  document.getElementById('dashTopbar').style.display='none';
  document.getElementById('editorView').style.display='flex';
  document.getElementById('edTitle').value=n.title;
  document.getElementById('edBody2').value=n.body;
  document.getElementById('propStatus').value=n.props?.status||'Inbox';
  document.getElementById('propType').value=n.props?.type||'Page';
  document.getElementById('propDue').value=n.props?.due||'';
  document.getElementById('propTags').value=getNoteTags(n).join(', ');
  updateEditorMeta();
  updatePinBtn(n.pinned);
  renderImgGallery(n);
  document.getElementById('fontSel').value=appSettings.defaultFont;
  applyFont(appSettings.defaultFont);
  setEditorStatus('saved');
  renderBacklinks(n);
  switchTab('text');
  setTimeout(()=>{initCanvas();if(n.drawingData)loadCanvasData(n.drawingData);},100);
  refreshSidebar();
  closeSidebar();
}

function saveNote(){
  if(!curId)return;
  const n=notes.find(x=>x.id===curId);
  if(!n)return;
  n.title=document.getElementById('edTitle').value;
  n.body=document.getElementById('edBody2').value;
  n.props=n.props||{};
  n.props.status=document.getElementById('propStatus').value;
  n.props.type=document.getElementById('propType').value;
  n.props.due=document.getElementById('propDue').value;
  n.props.tags=document.getElementById('propTags').value.split(',').map(t=>t.trim()).filter(Boolean).map(t=>t.startsWith('#')?t:'#'+t);
  n.updatedAt=Date.now();
  persist();refreshSidebar();
}

function onEditorChange(){
  setEditorStatus('unsaved');
  updateEditorMeta();
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(()=>{saveNote();setEditorStatus('saved');},appSettings.autoSaveDelay);
}

function updateEditorMeta(){
  const b=document.getElementById('edBody2').value;
  const w=b.trim()?b.trim().split(/\s+/).length:0;
  document.getElementById('metaTxt').textContent=w+' word'+(w!==1?'s':'');
}

function setEditorStatus(s){
  const dot=document.getElementById('edDot');
  const txt=document.getElementById('edStatusTxt');
  if(s==='saved'){dot.style.background='var(--green)';txt.textContent='Saved';}
  else{dot.style.background='var(--amber)';txt.textContent='Unsaved';}
}

function togglePin(){if(!curId)return;const n=notes.find(x=>x.id===curId);if(!n)return;n.pinned=!n.pinned;persist();updatePinBtn(n.pinned);toast(n.pinned?'📌 Pinned':'Unpinned');refreshSidebar();}
function togglePinById(id){const n=notes.find(x=>x.id===id);if(!n)return;n.pinned=!n.pinned;persist();refreshSidebar();renderDashboard();toast(n.pinned?'📌 Pinned':'Unpinned');}
function updatePinBtn(p){document.getElementById('pinBtn').style.color=p?'var(--amber)':'';}

function toggleFavorite(){
  if(!curId)return;
  const n=notes.find(x=>x.id===curId);if(!n)return;
  n.favorite=!n.favorite;persist();refreshUI();toast(n.favorite?'Added to favorites':'Removed from favorites');
}

function duplicateNote(){
  if(!curId)return;saveNote();
  const n=notes.find(x=>x.id===curId);if(!n)return;
  const dup={...JSON.parse(JSON.stringify(n)),id:'n'+Date.now(),title:(n.title||'Untitled')+' (copy)',createdAt:Date.now(),updatedAt:Date.now()};
  notes.unshift(dup);persist();openNote(dup.id);toast('📋 Duplicated');
  celebrate(window.innerWidth-88,92);
}

function exportNote(){
  if(!curId)return;saveNote();
  const n=notes.find(x=>x.id===curId);if(!n)return;
  let txt=`${n.title||'Untitled'}\n${'='.repeat(40)}\n\n${n.body}`;
  if(getNoteTags(n).length){txt+=`\n\nTags: ${getNoteTags(n).join(', ')}`;}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));a.download=(n.title||'note')+'.txt';a.click();
  toast('📥 Exported');
}

function exportWorkspace(){
  const data=JSON.stringify({app:'NoteIQ',version:4,exportedAt:new Date().toISOString(),notes},null,2);
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  a.download='noteiq-workspace.json';
  a.click();
  toast('Workspace exported');
  celebrate(window.innerWidth-80,80);
}

function importWorkspace(e){
  const f=e.target.files?.[0]; if(!f)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const raw=ev.target.result;
      let incoming=[];
      if(f.name.endsWith('.json')){
        const parsed=JSON.parse(raw);
        incoming=Array.isArray(parsed)?parsed:(parsed.notes||[]);
      }else{
        incoming=[{id:'n'+Date.now(),title:f.name.replace(/\.(md|txt)$/i,''),body:raw,createdAt:Date.now(),updatedAt:Date.now()}];
      }
      notes=[...incoming.map(normalizeNote),...notes];
      persist();refreshUI();toast('Import complete');
      celebrate(window.innerWidth/2,90);
    }catch(err){toast('Import failed');console.error(err);}
  };
  reader.readAsText(f); e.target.value='';
}

function persist(){
  localStorage.setItem('niq_v3',JSON.stringify(notes));
}

/* ── TABS ── */
let currentTab='text';
function switchTab(tab){
  currentTab=tab;
  ['text','draw','images'].forEach(t=>{
    const panel=document.getElementById('panel'+t.charAt(0).toUpperCase()+t.slice(1));
    const tabEl=document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1));
    if(panel) panel.classList.toggle('on',t===tab);
    if(tabEl) tabEl.classList.toggle('on',t===tab);
  });
  if(tab==='draw') setTimeout(()=>{initCanvas();},50);
}

/* ── FONT ── */
function applyFont(v){
  const title=document.getElementById('edTitle');
  const body=document.getElementById('edBody2');
  title.className='note-title-field'+(v==='handwriting'?' handwriting':'');
  body.className='note-body-field'+(v==='handwriting'?' handwriting':v==='serif'?' serif':'');
}

/* ── TEXT HELPERS ── */
function wrapText(before,after){
  const el=document.getElementById('edBody2');
  const s=el.selectionStart,e=el.selectionEnd;
  const sel=el.value.slice(s,e)||'text';
  el.value=el.value.slice(0,s)+before+sel+after+el.value.slice(e);
  el.focus();onEditorChange();
}
function insertBullet(){const el=document.getElementById('edBody2');const p=el.selectionStart;const lines=el.value.split('\n');let li=0,ch=0;for(let i=0;i<lines.length;i++){if(ch+lines[i].length>=p){li=i;break;}ch+=lines[i].length+1;}lines[li]='• '+lines[li];el.value=lines.join('\n');onEditorChange();}
function insertChecklist(){const el=document.getElementById('edBody2');el.value+='\n☐ ';el.focus();el.selectionStart=el.selectionEnd=el.value.length;onEditorChange();}
function clearEditor(){if(document.getElementById('edBody2').value&&!confirm('Clear content?'))return;document.getElementById('edBody2').value='';document.getElementById('edTitle').value='';onEditorChange();}

const slashBlocks=[
  {key:'heading',icon:'H1',title:'Heading',desc:'Large section title'},
  {key:'todo',icon:'☐',title:'To-do',desc:'Track a checkbox item'},
  {key:'quote',icon:'"',title:'Quote',desc:'Call out a thought'},
  {key:'table',icon:'▦',title:'Table',desc:'Simple markdown table'},
  {key:'toggle',icon:'▸',title:'Toggle',desc:'Collapsible-style section'},
  {key:'divider',icon:'-',title:'Divider',desc:'Visual separator'},
  {key:'link',icon:'[[',title:'Page link',desc:'Link another page'}
];

function insertAtCursor(text,replaceSlash=false){
  const el=document.getElementById('edBody2');
  let s=el.selectionStart,e=el.selectionEnd;
  if(replaceSlash&&s>0&&el.value[s-1]==='/')s--;
  el.value=el.value.slice(0,s)+text+el.value.slice(e);
  el.focus();el.selectionStart=el.selectionEnd=s+text.length;onEditorChange();
}

function insertBlock(type){
  const blocks={
    heading:'\n# Heading\n',
    todo:'\n- [ ] Task\n',
    quote:'\n> Quote\n',
    table:'\n| Name | Status | Notes |\n| --- | --- | --- |\n|  |  |  |\n',
    toggle:'\n▶ Toggle title\n  Details...\n',
    divider:'\n---\n',
    link:'[['+(notes.find(n=>n.id!==curId)?.title||'Page name')+']]'
  };
  insertAtCursor(blocks[type]||'',false);
  document.getElementById('slashPop').classList.remove('on');
}

function handleSlashKey(e){
  const pop=document.getElementById('slashPop');
  const el=document.getElementById('edBody2');
  if(e.key==='Escape'){pop.classList.remove('on');return;}
  if(el.value[el.selectionStart-1]==='/'){
    pop.innerHTML=slashBlocks.map(b=>`<div class="slash-item" onclick="insertSlashBlock('${b.key}')"><div class="slash-ico">${b.icon}</div><div><div class="slash-title">${b.title}</div><div class="slash-desc">${b.desc}</div></div></div>`).join('');
    pop.classList.add('on');
  }
}

function insertSlashBlock(type){insertAtCursor('',true);insertBlock(type);}

function renderBacklinks(n){
  const panel=document.getElementById('backlinksPanel');
  const refs=notes.filter(x=>x.id!==n.id&&x.body.includes(`[[${n.title}]]`));
  panel.classList.toggle('on',refs.length>0);
  panel.innerHTML=refs.length?`<span style="font-size:.66rem;color:var(--faint)">Linked from</span>`+refs.map(r=>`<span class="backlink-chip" onclick="openNote('${r.id}')">${escapeHTML(r.title||'Untitled')}</span>`).join(''):'';
}

const templates={
  meeting:`Meeting: [Title] — ${new Date().toLocaleDateString()}\nAttendees: \n\nAgenda:\n1. \n2. \n\nDecisions:\n- \n\nAction Items:\n- [ ] \n- [ ] \n\nNext Meeting: `,
  goal:`Goal: [What I want to achieve]\n\nWhy it matters: \n\nDeadline: \n\nSuccess = \n\nObstacles:\n- \n\nFirst step today: `,
  brainstorm:`Topic: \n\nIdeas (no filter):\n- \n- \n- \n\nBest idea: \n\nNext step: `,
  journal:`${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}\n\nFeeling: \n\nToday:\n\nGrateful for:\n1. \n2. \n3. \n\nTomorrow I'll: `,
};
function insertTemplate(t){
  const el=document.getElementById('edBody2');
  if(el.value&&!confirm('Replace content with template?'))return;
  el.value=templates[t];
  if(!document.getElementById('edTitle').value) document.getElementById('edTitle').value=t.charAt(0).toUpperCase()+t.slice(1)+' Note';
  onEditorChange();toast('📋 Template loaded');
}

/* ── IMAGE HANDLING ── */
function setupDragDrop(){
  const dz=document.getElementById('imgDropZone');
  dz.addEventListener('dragover',handleImgDragOver);
  dz.addEventListener('dragleave',handleImgDragLeave);
  dz.addEventListener('drop',handleImgDrop);
}
function handleImgDragOver(e){e.preventDefault();document.getElementById('imgDropZone').classList.add('drag-over');}
function handleImgDragLeave(){document.getElementById('imgDropZone').classList.remove('drag-over');}
function handleImgDrop(e){e.preventDefault();document.getElementById('imgDropZone').classList.remove('drag-over');processImgFiles(e.dataTransfer.files);}
function handleImgSelect(e){processImgFiles(e.target.files);e.target.value='';}

function processImgFiles(files){
  if(!curId){toast('⚠️ Open a note first');return;}
  const n=notes.find(x=>x.id===curId);
  if(!n)return;
  if(!n.images)n.images=[];
  let loaded=0;
  Array.from(files).forEach(f=>{
    if(!f.type.startsWith('image/')){toast('⚠️ Only image files supported');return;}
    if(f.size>5*1024*1024){toast('⚠️ Image too large (max 5MB)');return;}
    const reader=new FileReader();
    reader.onload=ev=>{
      n.images.push({id:'img'+Date.now()+loaded,data:ev.target.result,name:f.name,size:f.size});
      loaded++;persist();renderImgGallery(n);updateImgBadge(n.images.length);toast('🖼️ Image attached');
    };
    reader.readAsDataURL(f);
  });
}

function renderImgGallery(n){
  const g=document.getElementById('imgGallery');
  if(!n.images||!n.images.length){g.innerHTML='';updateImgBadge(0);return;}
  updateImgBadge(n.images.length);
  g.innerHTML=n.images.map((img,i)=>`
    <div class="img-item">
      <img src="${img.data}" alt="${img.name}" onclick="openLightbox('${n.id}',${i})">
      <div class="img-item-caption">${img.name}</div>
      <button class="img-item-del" onclick="deleteImg('${img.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');
}

function deleteImg(imgId){
  if(!curId)return;const n=notes.find(x=>x.id===curId);if(!n)return;
  n.images=n.images.filter(i=>i.id!==imgId);persist();renderImgGallery(n);toast('🗑️ Image removed');
}
function updateImgBadge(count){
  const b=document.getElementById('imgTabBadge');b.textContent=count;b.style.display=count>0?'inline-block':'none';
}
function openLightbox(noteId,idx){
  const n=notes.find(x=>x.id===noteId);if(!n||!n.images[idx])return;
  document.getElementById('lbImg').src=n.images[idx].data;document.getElementById('lightbox').classList.add('on');
}
function closeLightbox(){document.getElementById('lightbox').classList.remove('on');}

/* ── CANVAS / SMART PEN ── */
let ctx=null, canvas=null;

function initCanvas(){
  canvas=document.getElementById('drawCanvas');
  if(!canvas)return;
  const wrap=canvas.parentElement;
  canvas.width=wrap.clientWidth||window.innerWidth;
  canvas.height=wrap.clientHeight||400;
  ctx=canvas.getContext('2d');
  ctx.fillStyle='#1c1c1a';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.lineJoin='round';ctx.lineCap='round';
  const n=notes.find(x=>x.id===curId);
  if(n?.drawingData) loadCanvasData(n.drawingData);
  canvas.addEventListener('mousedown',startDraw,{passive:false});
  canvas.addEventListener('mousemove',doDraw,{passive:false});
  canvas.addEventListener('mouseup',endDraw);
  canvas.addEventListener('mouseleave',endDraw);
  canvas.addEventListener('touchstart',startDrawTouch,{passive:false});
  canvas.addEventListener('touchmove',doDrawTouch,{passive:false});
  canvas.addEventListener('touchend',endDraw,{passive:false});
}

function getPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};}
function getPosTouch(e){const t=e.touches[0];const r=canvas.getBoundingClientRect();return{x:(t.clientX-r.left)*(canvas.width/r.width),y:(t.clientY-r.top)*(canvas.height/r.height)};}

function startDraw(e){if(currentTab!=='draw')return;e.preventDefault();isDrawing=true;const p=getPos(e);lastX=p.x;lastY=p.y;currentStroke=[{x:p.x,y:p.y}];ctx.beginPath();ctx.moveTo(p.x,p.y);}
function startDrawTouch(e){if(currentTab!=='draw')return;e.preventDefault();isDrawing=true;const p=getPosTouch(e);lastX=p.x;lastY=p.y;currentStroke=[{x:p.x,y:p.y}];ctx.beginPath();ctx.moveTo(p.x,p.y);}
function doDraw(e){if(!isDrawing||currentTab!=='draw')return;e.preventDefault();const p=getPos(e);draw(p.x,p.y);}
function doDrawTouch(e){if(!isDrawing||currentTab!=='draw')return;e.preventDefault();const p=getPosTouch(e);draw(p.x,p.y);}

function draw(x,y){
  if(drawTool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=brushSize*4;ctx.strokeStyle='rgba(0,0,0,1)';}
  else if(drawTool==='highlight'){ctx.globalCompositeOperation='source-over';ctx.lineWidth=brushSize*5;ctx.strokeStyle=drawColor+'55';}
  else{ctx.globalCompositeOperation='source-over';ctx.lineWidth=brushSize;ctx.strokeStyle=drawColor;}
  ctx.lineTo(x,y);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);
  lastX=x;lastY=y;currentStroke.push({x,y});
}

function endDraw(){
  if(!isDrawing)return;isDrawing=false;
  if(currentStroke.length>1){drawHistory.push({tool:drawTool,color:drawColor,size:brushSize,points:currentStroke});persistCanvasToNote();}
  currentStroke=[];ctx.beginPath();
}

function persistCanvasToNote(){
  if(!curId)return;const n=notes.find(x=>x.id===curId);if(!n)return;
  n.drawingData=canvas.toDataURL('image/png');n.updatedAt=Date.now();persist();
}
function loadCanvasData(dataUrl){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0);img.src=dataUrl;}

function setDrawTool(t){
  drawTool=t;
  ['toolPen','toolHighlight','toolEraser'].forEach(id=>document.getElementById(id)?.classList.remove('on'));
  const map={pen:'toolPen',highlight:'toolHighlight',eraser:'toolEraser'};
  document.getElementById(map[t])?.classList.add('on');
}
function setColor(c,el){drawColor=c;document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('on'));if(el)el.classList.add('on');}
function setBrushSize(v){brushSize=parseInt(v);}
function clearCanvas(){
  if(!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#1c1c1a';ctx.fillRect(0,0,canvas.width,canvas.height);
  drawHistory=[];persistCanvasToNote();toast('Canvas cleared');
}
function undoCanvas(){
  if(!ctx||!drawHistory.length){toast('Nothing to undo');return;}
  drawHistory.pop();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#1c1c1a';ctx.fillRect(0,0,canvas.width,canvas.height);
  drawHistory.forEach(stroke=>{
    ctx.beginPath();
    stroke.points.forEach((p,i)=>{
      if(stroke.tool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=stroke.size*4;ctx.strokeStyle='rgba(0,0,0,1)';}
      else if(stroke.tool==='highlight'){ctx.globalCompositeOperation='source-over';ctx.lineWidth=stroke.size*5;ctx.strokeStyle=stroke.color+'55';}
      else{ctx.globalCompositeOperation='source-over';ctx.lineWidth=stroke.size;ctx.strokeStyle=stroke.color;}
      if(i===0)ctx.moveTo(p.x,p.y);else{ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);}
    });
  });
  ctx.globalCompositeOperation='source-over';persistCanvasToNote();toast('Undone');
}
function saveCanvasAsImage(){
  if(!curId||!canvas)return;const n=notes.find(x=>x.id===curId);if(!n)return;
  if(!n.images)n.images=[];
  n.images.push({id:'img'+Date.now(),data:canvas.toDataURL('image/png'),name:'Drawing.png',size:0});
  persist();renderImgGallery(n);updateImgBadge(n.images.length);toast('🖼️ Drawing saved as image');
}

/* ── DELETE MODAL ── */
function openDelModal(){if(curId)openDelModalById(curId);}
function openDelModalById(id){pendingDel=id;document.getElementById('delModal').classList.add('on');}
function closeModal(){document.getElementById('delModal').classList.remove('on');pendingDel=null;}
function confirmDelete(){
  if(!pendingDel)return;
  notes=notes.filter(n=>n.id!==pendingDel);
  if(curId===pendingDel){showDashView();}
  persist();refreshUI();closeModal();toast('🗑️ Deleted');
}
document.getElementById('delModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
document.getElementById('settingsModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeSettings();});

/* ── TOAST ── */
function toast(msg,dur=2800){
  const wrap=document.getElementById('toastWrap');
  const el=document.createElement('div');el.className='toast';
  el.textContent=msg;
  wrap.appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),300);},dur);
}

function celebrate(x=window.innerWidth-90,y=90){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const colors=['#c9a84c','#4d9e6f','#5480c0','#b85a8a','#eeebe4'];
  for(let i=0;i<16;i++){
    const s=document.createElement('span');
    const angle=(Math.PI*2*i)/16;
    const dist=34+Math.random()*44;
    s.className='spark';
    s.style.setProperty('--left',x+'px');
    s.style.setProperty('--top',y+'px');
    s.style.setProperty('--x',Math.cos(angle)*dist+'px');
    s.style.setProperty('--y',Math.sin(angle)*dist+'px');
    s.style.setProperty('--spark-color',colors[i%colors.length]);
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),760);
  }
}

/* ── UTILS ── */
function fmtDate(ts){
  if(!ts)return'';const d=new Date(ts),now=new Date(),diff=now-d;
  if(diff<60000)return'just now';
  if(diff<3600000)return Math.floor(diff/60000)+'m ago';
  if(diff<86400000)return Math.floor(diff/3600000)+'h ago';
  if(diff<604800000)return Math.floor(diff/86400000)+'d ago';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

/* -- LOCAL AI FEATURES -- */
const searchStopWords=new Set('a an and are as at be by for from has have i in is it its my of on or our that the their them they this to was we were will with you your'.split(' '));
function tokenizeSearchText(text=''){
  return String(text).toLowerCase().match(/[a-z0-9#]+/g)?.filter(w=>!searchStopWords.has(w))||[];
}
function offlineSearch(query,items){
  const terms=tokenizeSearchText(query);
  if(!terms.length)return[];
  return items.map(n=>{
    const content=tokenizeSearchText(`${n.title} ${n.body} ${(n.tags||[]).join(' ')} ${n.status} ${n.type}`);
    const counts=new Map();
    content.forEach(w=>counts.set(w,(counts.get(w)||0)+1));
    const score=terms.reduce((sum,w)=>sum+(counts.get(w)||0),0);
    return {...n,score};
  }).filter(n=>n.score>0).sort((a,b)=>b.score-a.score);
}
function offlineSummarize(text){
  const clean=String(text).replace(/\s+/g,' ').trim();
  if(!clean)return'';
  const sentences=clean.match(/[^.!?]+[.!?]*/g)||[];
  return (sentences.slice(0,3).join(' ')||clean.slice(0,260)).trim();
}
async function postJson(url,payload){
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!res.ok)throw new Error(await res.text());
  return res.json();
}
function notePayload(){
  return notes.map(n=>({id:n.id,title:n.title||'Untitled Note',body:n.body||'',tags:getNoteTags(n),status:n.props?.status||'',type:n.props?.type||''}));
}
async function semanticSearchNotes(q){
  const query=(q||document.getElementById('sbSearch')?.value||'').trim();
  searchQ=query.toLowerCase();
  if(!query){smartSearchIds=null;renderDashboard();return;}
  if(!AI_API_BASE){
    const results=offlineSearch(query,notePayload());
    smartSearchIds=results.map(r=>r.id);
    renderDashboard();
    toast(results.length?'Smart search sorted locally':'No local matches found');
    return;
  }
  try{
    toast('Running local semantic search...');
    const data=await postJson(`${AI_API_BASE}/api/ai/search`,{query,notes:notePayload()});
    smartSearchIds=(data.results||[]).map(r=>r.id);
    renderDashboard();
  }catch(err){ console.error(err); smartSearchIds=null; renderDashboard(); toast('Semantic search backend is not running'); }
}
async function summarizeCurrentNote(){
  if(!curId){toast('Open a note first');return;}
  saveNote();
  const body=document.getElementById('edBody2').value.trim();
  if(!body){toast('Nothing to summarize');return;}
  if(!AI_API_BASE){
    const summary=offlineSummarize(body);
    insertAtCursor(`\n\nSummary\n${summary}\n`);
    toast('Summary added');
    return;
  }
  try{
    toast('Summarizing locally...');
    const data=await postJson(`${AI_API_BASE}/api/ai/summarize`,{text:body});
    insertAtCursor(`\n\nSummary\n${data.summary}\n`);
    toast('Summary added');
  }catch(err){console.error(err);toast('Summarizer backend is not running');}
}
async function toggleVoiceNoteRecording(){
  if(voiceRecorder&&voiceRecorder.state==='recording'){ voiceRecorder.stop(); return; }
  if(!navigator.mediaDevices?.getUserMedia){toast('Voice recording is not supported here');return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    voiceChunks=[];
    voiceRecorder=new MediaRecorder(stream);
    voiceRecorder.ondataavailable=e=>{if(e.data.size)voiceChunks.push(e.data);};
    voiceRecorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      document.getElementById('voiceNoteBtn').textContent='Voice';
      const blob=new Blob(voiceChunks,{type:'audio/webm'});
      if(!AI_API_BASE){
        toast('Voice recording saved in browser, but transcription needs the optional backend');
        return;
      }
      try{
        toast('Transcribing locally...');
        const form=new FormData(); form.append('file',blob,'note.webm');
        const res=await fetch(`${AI_API_BASE}/api/voice/transcribe`,{method:'POST',body:form});
        if(!res.ok)throw new Error(await res.text());
        const data=await res.json();
        insertAtCursor((document.getElementById('edBody2').value.trim()? '\n' : '')+data.text);
        toast('Voice note added');
      }catch(err){console.error(err);toast('Whisper backend is not running');}
    };
    voiceRecorder.start();
    document.getElementById('voiceNoteBtn').textContent='Stop';
    toast('Recording...');
  }catch(err){console.error(err);toast('Microphone permission was blocked');}
}
  Object.assign(window, {
    applyFont,
    applySettings,
    backToDash,
    celebrate,
    clearCanvas,
    clearEditor,
    closeLightbox,
    closeModal,
    closeSettings,
    closeSidebar,
    confirmDelete,
    createChildPage,
    createDatabasePage,
    createNote,
    deleteImg,
    doDraw,
    doDrawTouch,
    draw,
    duplicateNote,
    endDraw,
    escapeHTML,
    exportNote,
    exportWorkspace,
    filterByTag,
    filterNotes,
    fmtDate,
    getNoteTags,
    getPos,
    getPosTouch,
    handleImgDragLeave,
    handleImgDragOver,
    handleImgDrop,
    handleImgSelect,
    handleResize,
    handleSlashKey,
    importWorkspace,
    initApp,
    initCanvas,
    insertAtCursor,
    insertBlock,
    insertBullet,
    insertChecklist,
    insertSlashBlock,
    insertTemplate,
    loadCanvasData,
    normalizeNote,
    noteCardHTML,
    noteListHTML,
    notePayload,
    onEditorChange,
    openDelModal,
    openDelModalById,
    openLightbox,
    openNote,
    openSettings,
    openSidebar,
    persist,
    persistCanvasToNote,
    processImgFiles,
    refreshSidebar,
    refreshUI,
    renderBacklinks,
    renderBoardView,
    renderCalendarView,
    renderDashboard,
    renderImgGallery,
    renderPageTree,
    renderTableView,
    renderTagsView,
    resetSettings,
    saveCanvasAsImage,
    saveNote,
    saveSetting,
    setBrushSize,
    setColor,
    setDrawTool,
    setEditorStatus,
    setGreeting,
    setLayout,
    setSortMode,
    setupDragDrop,
    setView,
    showDashView,
    startDraw,
    startDrawTouch,
    switchTab,
    syncSettingsUI,
    tagBorderColor,
    tc,
    tickLoader,
    toast,
    toggleFavorite,
    togglePin,
    togglePinById,
    undoCanvas,
    updateEditorMeta,
    updateImgBadge,
    updatePinBtn,
    wrapText,
  });
  return () => {};
}

export function readStoredNotes() {
  return JSON.parse(localStorage.getItem('niq_v3') || '[]');
}

export function writeStoredNotes(notes) {
  localStorage.setItem('niq_v3', JSON.stringify(notes));
}
