/* CZ Repair Quote — prices load from data.json (synced from REPAIR PRICES - CZ). Shop rules live in RULES below. */
const RULES = {
  warranty: "6-month warranty",
  // repair time the rep can promise; anything not covered = "ask a tech"
};
let DATA = null;
// Screen setup: which price columns are screen qualities, grouped by display condition.
const SCREEN = {
  iphone:{upsell:true, conds:[
    {k:"works",n:"Display works",hint:"Picture and touch are fine, just cracked glass",say:"if the display still works and it's just the glass",cols:[0,1,2]},
    {k:"dead",n:"Display damaged",hint:"Black, lines, bleeding, or touch not working",say:"if the display is black, has lines, or touch isn't working",cols:[3,4,5]}],
    names:["Good · Glass Only","Better · Glass Only","Best · Glass Only","Good · Aftermarket LCD","Better · Premium OLED","Best · Genuine Apple"],
    // tile label = tier word + bold badge + descriptor (Sam, Nov 10: Better = OLED, Best = OEM, shown in bold on every Better/Best tile)
    kinds:["","OLED","OEM","","OLED","OEM"], desc:["Glass Only","Glass Only","Glass Only","Aftermarket LCD","Full screen","Genuine Apple"],
    why:["Aftermarket incell screen. Priced lower because we keep the old screen.","Premium OLED screen. Deeper blacks, sharper picture, easier on the battery than LCD.","Genuine Apple screen, the same part the phone shipped with.",
         "Aftermarket incell LCD. The budget fix that gets the phone working.","Premium OLED screen. Deeper blacks, sharper picture, easier on the battery than LCD.","Genuine Apple screen, the same part the phone shipped with."]},
  samsung:{upsell:false, conds:[
    {k:"works",n:"Display works",hint:"Picture and touch are fine, just cracked glass",say:"if the display still works and it's just the glass",cols:[0]},
    {k:"burn",n:"Works, has burn-in",hint:"Ghost image or discoloration on the display",say:"if the display works but has burn-in",cols:[1]},
    {k:"dead",n:"Display damaged",hint:"Black, lines, green screen, or touch not working",say:"if the display is black, has lines, or touch isn't working",cols:[2]}],
    names:["Glass Only","Glass Only + Burn-In","Screen Replacement"],why:["","",""]},
  pixel:{upsell:true, conds:[{k:"any",n:"Screen",hint:"",cols:[0,1]}],
    names:["Standard Screen","Genuine OEM Screen"],why:["Refurbished OEM panel. Fingerprint reader keeps working.","Brand-new genuine Google screen."]},
  ipad:{upsell:false, conds:[
    {k:"works",n:"Display works",hint:"Picture is fine, just cracked glass",say:"if the display still works and it's just the glass",cols:[0]},
    {k:"dead",n:"Display damaged",hint:"Black, lines, or bleeding",say:"if the display itself is damaged",cols:[1]}],names:["Glass Only","LCD Replacement"],why:["",""]},
  watch:{upsell:false, conds:[
    {k:"works",n:"Display works",hint:"Picture is fine, just cracked glass",say:"if the display still works and it's just the glass",cols:[0]},
    {k:"dead",n:"Display damaged",hint:"Black, lines, or no touch",say:"if the display itself is damaged",cols:[1]}],names:["Glass Only","LCD Replacement"],why:["",""]},
  ipod:{upsell:false, conds:[
    {k:"glass",n:"Glass cracked",hint:"Picture is fine",say:"for just the glass",cols:[0]},
    {k:"lcd",n:"LCD damaged",hint:"Glass fine, picture broken",say:"for just the LCD",cols:[1]},
    {k:"both",n:"Both",hint:"Glass and picture broken",say:"for both",cols:[2]}],names:["Glass Only","LCD Only","Full Screen"],why:["","",""]}
};
const st = {cat:"iphone", model:null, repair:"screen", cond:null, part:null, checks:{}};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num = v => { if(!v) return null; const m=String(v).replace(/,/g,"").match(/\$?\s?(\d+(?:\.\d+)?)/); return m?parseFloat(m[1]):null; };
const C = () => DATA.cats[st.cat];
function models(){ const m=C().models.slice(); return ["iphone","samsung","pixel","ipad"].includes(st.cat)?m.reverse():m; }
function store(){ try{return window.localStorage}catch(e){return null} }

/* ---------- shop rules: stock + repair time ---------- */
function iphoneGen(n){ n=n.toLowerCase();
  if(/se 2020/.test(n)) return 9; if(/se 2022/.test(n)) return 13; if(/iphone x/.test(n)) return 10; if(/\bair\b/.test(n)) return 17;
  const m=n.match(/iphone (\d+)/); return m?+m[1]:0; }
function repairName(){ return st.repair==="screen" ? "Screen" : C().cols[+st.repair.slice(1)]; }
// returns {stock:"stock"|"check"|"none", time:string|null}
function policy(qualityIdx){
  const cat=st.cat, n=st.model.n, r=repairName().toLowerCase();
  let stock="check", time=null;
  if(cat==="iphone"){
    const g=iphoneGen(n), modern=g>=7&&g<=17;
    if(r==="screen"){ if(modern && ![2,5].includes(qualityIdx)) stock="stock"; time="30 minutes"; }
    else if(r==="battery"){ if(modern) stock="stock"; time="30 minutes"; }
    else if(r.includes("genuine apple")){ time="30 minutes"; }
    else if(r==="port cleaning"){ stock="none"; }
    else if(r.includes("housing")){ stock="check"; }
    else { stock="stock"; } // charging port + all small parts carried for every iPhone
    if(r==="back glass"){ const pro=/pro/i.test(n); time = g<=13 ? "3 hours" : g===14 ? (pro?"3 hours":"45 minutes") : "45 minutes"; }
  } else if(cat==="samsung"){
    if(r==="battery"||r==="charging port") stock="stock";
    if(r==="screen"||r==="battery") time="30 minutes";
  } else if(cat==="ipad"){ time="3 to 4 hours"; }
  else if(cat==="computer"){ stock="none"; }
  return {stock, time};
}

/* ---------- hours: Mon–Sat 10–8, Sun 11–6 ---------- */
function hoursLine(){
  const d=new Date(), day=d.getDay(), h=d.getHours()+d.getMinutes()/60;
  const open=day===0?11:10, close=day===0?18:20, closeTxt=day===0?"6":"8";
  if(h<open) return {say:`We open at ${open} today. Are you able to come in today?`, info:`Opens ${open} AM today`};
  if(h<close-0.5) return {say:`We're open until ${closeTxt} tonight. Are you able to come in today?`, info:`Open now · closes ${closeTxt} PM`};
  if(h<close) return {say:`We close at ${closeTxt} tonight. Can you make it in the next few minutes, or first thing tomorrow?`, info:`Closing soon (${closeTxt} PM)`};
  const tOpen=day===6?11:10;
  return {say:`We're closed for tonight, but we open at ${tOpen} tomorrow. Can you come in tomorrow?`, info:`Closed · opens ${tOpen} AM tomorrow`};
}

/* ---------- rail ---------- */
function renderTabs(){
  $("#tabs").innerHTML = Object.entries(DATA.cats).map(([k,c])=>`<button class="tab" id="tab-${k}" aria-pressed="${k===st.cat}" data-c="${k}">${esc(c.name)}</button>`).join("");
}
function renderList(){
  const q=$("#q").value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hay=m=>{ const s=(m.n+" "+m.g).toLowerCase(); return s+" "+s.replace(/playstation\s*/g,"ps").replace(/galaxy\s*/g,"").replace(/iphone\s*/g,"").replace(/\s+/g,""); };
  const ms=models().filter(m=>q.every(t=>hay(m).includes(t)));
  if(!ms.length){ $("#list").innerHTML=`<div class="empty">No model matches "${esc($("#q").value)}"</div>`; return; }
  let html="", g=null;
  for(const m of ms){ if(m.g && m.g!==g){ g=m.g; html+=`<div class="grp">${esc(g)}</div>`; }
    html+=`<button class="mdl" data-m="${esc(m.g+"|"+m.n)}" aria-current="${!!st.model&&st.model.n===m.n&&st.model.g===m.g}">${esc(m.n)}</button>`; }
  $("#list").innerHTML=html;
}

/* ---------- quote logic ---------- */
function repairs(){
  const cols=C().cols, sc=SCREEN[st.cat], screenCols=new Set(sc?sc.conds.flatMap(c=>c.cols):[]);
  const list=sc?[{k:"screen",n:"Screen"}]:[];
  cols.forEach((c,i)=>{ if(!screenCols.has(i)) list.push({k:"c"+i,n:c,i}); });
  return list;
}
function hasPrice(r){ const p=st.model.p; if(r.k==="screen") return SCREEN[st.cat].conds.some(c=>c.cols.some(i=>p[i])); return !!p[r.i]; }
// "Better OLED · Glass Only": tier word, then the bold OLED/OEM badge, then what the repair is
function tileName(sc,i){ const n=sc.names[i]; if(!sc.kinds) return esc(n);
  const tier=n.split(" · ")[0], k=sc.kinds[i], d=(sc.desc||[])[i] ?? n.split(" · ").slice(1).join(" · ");
  return `${esc(tier)}${k?` <b class="t-k">${esc(k)}</b>`:""}${d?` · ${esc(d)}`:""}`; }
function cheapest(cols){ const p=st.model.p; let best=null;
  for(const i of cols){ if(!p[i]) continue; const n=num(p[i]);
    if(best===null || (n!==null && (num(p[best])===null || n<num(p[best])))) best=i; }
  return best; }
function quoteInfo(){
  const p=st.model.p, sc=SCREEN[st.cat];
  if(st.repair!=="screen"){ const r=repairs().find(x=>x.k===st.repair); const v=r?p[r.i]:null;
    return {lines:v?[{label:r.n,price:v}]:[], cost:v?`the cost is ${v.replace(/ · /g,", ")}`:null, q:null}; }
  if(sc.conds.length===1){ const i=cheapest(sc.conds[0].cols); return {lines:i===null?[]:[{label:sc.names[i],price:p[i],i}], cost:i===null?null:`the cost is ${p[i]}`, q:i}; }
  if(st.cond && st.cond!=="unsure"){ const c=sc.conds.find(x=>x.k===st.cond); const i=cheapest(c.cols);
    return {lines:i===null?[]:[{label:sc.names[i],price:p[i],i}], cost:i===null?null:`the cost is ${p[i]}`, q:i}; }
  const lines=[]; for(const c of sc.conds){ const i=cheapest(c.cols); if(i!==null) lines.push({label:c.n,price:p[i],i,cond:c}); }
  if(lines.length===1 || (lines.length>1 && lines.every(l=>l.price===lines[0].price))) return {lines:[{...lines[0],label:sc.names[lines[0].i],cond:undefined}], cost:`the cost is ${lines[0].price}`, q:lines[0].i};
  return {lines, multi:lines.length>1, cost:lines.length?"the cost is "+lines.map(l=>`${l.price} ${l.cond.say}`).join(", or "):null, q:lines.length?lines[0].i:null};
}
function buildScript(qi, pol, partState){
  const hrs=hoursLine(), W=RULES.warranty;
  if(!qi.cost) return `Yes, we can take a look at that. I'll have a tech give you an exact price, and every repair comes with a ${W}. ${hrs.say}`;
  let first;
  if(partState==="stock") first="We have the part in stock";
  else if(partState==="order") first="We'd need to order the part, and it usually gets here the next business day";
  else if(partState==="none") first=null;
  else first="Let me double-check that we have the part in stock";
  const bits=[];
  if(first && partState==="stock") bits.push(first);
  if(pol.time && partState!=="order") bits.push(`it takes about ${pol.time}`);
  let s="Yes, we can fix that. ";
  if(partState==="check"||partState==="order") s+=first+". ";
  if(bits.length) s+= bits.join(", ").replace(/^./,c=>c.toUpperCase()) + ` with a ${W}, and ${qi.cost}. `;
  else s+= `It comes with a ${W}, and ${qi.cost}. `;
  return s + hrs.say;
}

/* ---------- render ---------- */
function render(){
  const P=$("#panel");
  if(!st.model){ P.innerHTML=`<div class="card"><div class="empty">Pick a model on the left to get a price.</div></div>`; return; }
  const m=st.model, sc=SCREEN[st.cat], reps=repairs(), qi=quoteInfo();
  const pol=policy(qi.q);
  const partState = st.part || pol.stock;
  const script=buildScript(qi,pol,partState);
  let h=`<div class="card"><div class="rowhd"><h2 class="model">${esc(m.n)}</h2><span class="note">${esc(m.g||C().name)}</span></div>
    <div class="lbl">Repair</div><div class="chips" role="group" aria-label="Repair">${reps.map(r=>`<button class="chip" id="rep-${r.k}" data-r="${r.k}" aria-pressed="${r.k===st.repair}" ${hasPrice(r)?"":"disabled title=\"Not offered on this model\""}>${esc(r.n)}</button>`).join("")}</div>`;
  if(st.repair==="screen" && sc && sc.conds.length>1){
    h+=`<div class="lbl">What's wrong with the screen?</div><div class="chips" role="group" aria-label="Screen condition">${sc.conds.map(c=>`<button class="chip" id="cond-${c.k}" data-cond="${c.k}" aria-pressed="${st.cond===c.k}" title="${esc(c.hint)}">${esc(c.n)}</button>`).join("")}<button class="chip" id="cond-unsure" data-cond="unsure" aria-pressed="${st.cond==='unsure'||!st.cond}">Not sure</button></div>`;
    const c=sc.conds.find(x=>x.k===st.cond); if(c&&c.hint) h+=`<div class="note">${esc(c.hint)}</div>`;
  }
  if(!qi.lines.length) h+=`<div class="quote none"><div class="q-l">No set price</div><div class="q-d">Not on the price sheet for this model. Ask a tech: part cost + labor.</div></div>`;
  else if(qi.multi) h+=`<div class="quote two"><div class="q-l">Quote over the phone · ask how the display looks</div><div></div>${qi.lines.map(l=>`<div class="q-d">${esc(l.cond.n)} <span style="font-weight:500">(${esc(sc.names[l.i])})</span></div><div class="q-p" style="grid-row:auto">${esc(l.price)}</div>`).join("")}</div>`;
  else h+=`<div class="quote"><div class="q-l">Quote this price</div><div class="q-p">${esc(qi.lines[0].price)}</div><div class="q-d">${esc(qi.lines[0].label)}</div></div>`;
  // facts + script, right under the price
  const stockFact = partState==="stock"?`<span class="fact ok">Part in stock</span>`:partState==="order"?`<span class="fact wn">Needs ordering · next business day</span>`:partState==="none"?"":`<span class="fact wn">Check stock in RepairShopr</span>`;
  const timeFact = pol.time?`<span class="fact ok">Takes about ${esc(pol.time)}</span>`:`<span class="fact wn">Ask a tech how long</span>`;
  h+=`<div class="sayrow"><div class="lbl">Say it like this</div><div class="sayline" id="script">${esc(script)}</div>
     <div class="facts">${stockFact}${timeFact}<span class="fact">${esc(RULES.warranty)}</span></div>
     <button class="btn" id="copy">Copy script</button></div></div>`;

  if(st.repair==="screen" && sc && sc.conds.some(c=>c.cols.length>1)){
    const quoted=new Set(qi.lines.map(l=>l.i));
    const blocks=sc.conds.map(c=>{
      const dim = st.cond && st.cond!=="unsure" && st.cond!==c.k;
      const tiles=c.cols.map(i=>{ const v=m.p[i]; const q=quoted.has(i);
        let tag = !v?`<span class="tag off">Not offered</span>` : q?`<span class="tag say">Quote this over the phone</span>` : sc.upsell?`<span class="tag up">Upsell in store only</span>`:"";
        const pi=policy(i); const stockNote = v && st.cat==="iphone" && pi.stock==="check" ? `<div class="t-x"><b>Check stock</b> before promising this one.</div>`:"";
        return `<div class="tier ${q?"q":""} ${!v||dim?"na":""}">${tag}<div class="t-n">${tileName(sc,i)}</div><div class="t-p">${v?esc(v):"—"}</div>${sc.why[i]&&v?`<div class="t-x">${esc(sc.why[i])}</div>`:""}${stockNote}</div>`; }).join("");
      return `${sc.conds.length>1?`<div class="rowhd"><div class="lbl">${esc(c.n)}${dim?" · doesn't apply":""}</div><div class="note">${esc(c.hint)}</div></div>`:""}<div class="tiers" style="${c.cols.length<3?`grid-template-columns:repeat(${Math.max(c.cols.length,1)},minmax(0,1fr))`:""}">${tiles}</div>`;
    }).join("");
    h+=`<div class="card"><div class="rowhd"><div class="lbl">All screen qualities</div>${sc.upsell?`<div class="note">Quote the yellow one on the phone. Walk them through the others at the counter.</div>`:""}</div>${blocks}</div>`;
  }

  const hrs=hoursLine();
  const items=[
    {k:"price",t:"Give the price",s:qi.lines.length?(qi.multi?"Give both numbers and ask how the display looks.":`${qi.lines[0].price}. Only the cheapest quality over the phone.`):"No set price. Get a tech quote."},
    {k:"warranty",t:"Mention the warranty",s:`Every repair: ${RULES.warranty}.`},
    {k:"part",t:"Part in stock + repair time",s:(pol.stock==="stock"?"We keep this part in stock.":pol.stock==="none"?"No part needed.":"Not a stocked part. Check this store's stock in RepairShopr.")+" "+(pol.time?`About ${pol.time}.`:"Ask a tech how long it takes."),extra:pol.stock!=="none"},
    {k:"today",t:"Ask them to come in today",s:hrs.info+". Always end with a question."}];
  h+=`<div class="card"><div class="rowhd"><div class="lbl">Before you hang up</div><div class="note">${items.filter(i=>st.checks[i.k]).length} of 4 done</div></div><div class="checks">${items.map(i=>`
    <div><button class="chk" id="chk-${i.k}" data-chk="${i.k}" aria-pressed="${!!st.checks[i.k]}"><span class="box">${st.checks[i.k]?"✓":""}</span><span><b>${i.t}</b><span class="s">${esc(i.s)}</span></span></button>
    ${i.extra?`<div class="seg" role="group" aria-label="Part availability">${[["stock","In stock"],["order","Needs ordering"],["check","Haven't checked"]].map(([k,n])=>`<button id="part-${k}" data-part="${k}" aria-pressed="${partState===k}">${n}</button>`).join("")}</div>`:""}</div>`).join("")}</div></div>`;

  const oth=reps.filter(r=>r.k!=="screen"&&m.p[r.i]);
  const notes=C().notes||[];
  if(oth.length||notes.length) h+=`<div class="card"><div class="lbl">All repairs · ${esc(m.n)}</div>${oth.length?`<div class="others">${oth.map(r=>`<div class="oth"><span>${esc(r.n)}</span><b>${esc(m.p[r.i])}</b></div>`).join("")}</div>`:""}<div class="notes">${notes.map(n=>`<div class="note">${esc(n)}</div>`).join("")}<div class="note">"—" or missing = ask a tech.</div></div></div>`;
  P.innerHTML=h;
}

/* ---------- events ---------- */
function pickModel(key){ const [g,...rest]=key.split("|"); const n=rest.join("|");
  st.model=models().find(m=>m.n===n&&m.g===g)||null; st.checks={}; st.part=null; st.cond=null;
  if(st.model){ const r=repairs().find(x=>x.k===st.repair); if(!r||!hasPrice(r)) st.repair=(repairs().find(hasPrice)||repairs()[0]).k; }
  renderList(); render(); }
document.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b||!DATA) return;
  if(b.dataset.c){ st.cat=b.dataset.c; st.model=null; st.repair=SCREEN[st.cat]?"screen":"c0"; st.cond=null; $("#q").value=""; renderTabs(); renderList(); render(); try{store()?.setItem("czq-cat",st.cat)}catch(_){} return; }
  if(b.dataset.m){ pickModel(b.dataset.m); if(matchMedia("(max-width:820px)").matches) $("#panel").scrollIntoView({behavior:"smooth",block:"start"}); return; }
  if(b.dataset.r){ st.repair=b.dataset.r; st.cond=null; st.part=null; render(); return; }
  if(b.dataset.cond){ st.cond=b.dataset.cond; st.part=null; render(); return; }
  if(b.dataset.part){ st.part=b.dataset.part; if(b.dataset.part!=="check") st.checks.part=true; render(); return; }
  if(b.dataset.chk){ st.checks[b.dataset.chk]=!st.checks[b.dataset.chk]; render(); return; }
  if(b.id==="copy"){ const t=$("#script").textContent;
    const done=()=>{ b.textContent="Copied"; setTimeout(()=>{ if(b.isConnected) b.textContent="Copy script"; },1500); };
    const sel=()=>{ const r=document.createRange(); r.selectNodeContents($("#script")); const s=getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent="Selected, press Ctrl+C"; };
    try{ navigator.clipboard.writeText(t).then(done,sel); }catch(_){ sel(); }
  }
});
$("#q").addEventListener("input",()=>{ if(DATA) renderList(); });
$("#q").addEventListener("keydown",e=>{ if(e.key==="Enter"&&DATA){ const f=$("#list .mdl"); if(f) pickModel(f.dataset.m); } });

/* ---------- start ---------- */
function start(d){
  DATA=d;
  try{ const c=store()?.getItem("czq-cat"); if(c&&DATA.cats[c]) st.cat=c; }catch(_){}
  st.repair=SCREEN[st.cat]?"screen":"c0";
  $("#meta").textContent=(d.live?`Live prices from REPAIR PRICES - CZ (${d.asof})`:`Backup prices from ${d.asof}. Live sheet didn't load`)+` · ${RULES.warranty} on every repair`;
  renderTabs(); renderList(); const f=models()[0]; pickModel(f.g+"|"+f.n);
  setInterval(()=>{ if(st.model) render(); },5*60*1000);
}
loadLive().catch(()=>fetch("data.json",{cache:"no-store"}).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }))
 .then(start)
 .catch(()=>{ $("#meta").textContent="Prices didn't load"; $("#panel").innerHTML=`<div class="card"><div class="empty">The price list didn't load. Refresh the page. If it still fails, use the REPAIR PRICES - CZ sheet.</div></div>`; });
