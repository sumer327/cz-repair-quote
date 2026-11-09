/* Live prices: reads the published price tabs of REPAIR PRICES - CZ (CSV) and builds the same shape as data.json. */
const SHEET_PUB = "https://docs.google.com/spreadsheets/d/1_LCeGk23y5aZ_mT3Oej_6f1b9Zh9PhYuK8R5LlxaNkA/pub";   // published-to-web base, e.g. https://docs.google.com/spreadsheets/d/e/2PACX-.../pub
const TABS = {Apple:510910333, Samsung:1436859400, Pixel:1436859500, Moto:746224264, Consoles:1693651162, PC:1691333639, Mac:784629370, "Surface Pro":1750962834};
function parseCSV(t){ const rows=[]; let row=[], f="", q=false;
  for(let i=0;i<t.length;i++){ const c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
    else if(c==='"') q=true; else if(c===','){ row.push(f); f=""; }
    else if(c==='\n'){ row.push(f); rows.push(row); row=[]; f=""; } else if(c!=='\r') f+=c; }
  if(f!==""||row.length){ row.push(f); rows.push(row); }
  return rows.map(r=>{ let k=r.length; while(k>0&&r[k-1]==="") k--; return r.slice(0,k); }); }
const nrm = h => String(h||"").replace(/\s+/g," ").trim();
const cln = v => { v=nrm(v); return ["","—","-","–","x"].includes(v)?null:v; };
function modelSections(vals){
  const out=[], notes=[]; let i=0;
  const isHdr = r => r && nrm(r[0])==="Model";
  while(i<vals.length){ const r=vals[i];
    if(i+1<vals.length && isHdr(vals[i+1])){
      const title=nrm(r&&r[0]); const hdr=vals[i+1].map(nrm); const rows=[]; let j=i+2;
      while(j<vals.length && vals[j] && nrm(vals[j][0]) && !(j+1<vals.length && isHdr(vals[j+1]))){ rows.push(vals[j]); j++; }
      ((r||[]).slice(1)).map(nrm).filter(x=>x && /\d/.test(x)).forEach(x=>notes.push(x));
      out.push([title,hdr,rows]); i=j;
    } else {
      if(r && nrm(r[0]) && !(i+1<vals.length && isHdr(vals[i+1]))){ const txt=r.map(nrm).filter(Boolean).join(" · "); if(txt) notes.push(txt); }
      i++; } }
  return [out,notes]; }
function buildCats(V){
  const cats={}; const cat=(k,n)=>cats[k]||(cats[k]={name:n,cols:null,models:[],notes:[]});
  const add=(c,g,hdr,rows)=>{ const keep=[]; for(let k=1;k<hdr.length;k++) if(hdr[k]) keep.push(k);
    if(!c.cols) c.cols=keep.map(k=>hdr[k]);
    for(const r0 of rows){ const r=r0.concat(Array(Math.max(0,hdr.length-r0.length)).fill(""));
      const p=keep.map(k=>cln(r[k])); if(p.some(Boolean)) c.models.push({n:nrm(r[0]),g,p}); } };
  let [secs,notes]=modelSections(V.Apple);
  const amap={"APPLE iPHONE":["iphone","iPhone"],"APPLE iPAD":["ipad","iPad"],"APPLE WATCH":["watch","Apple Watch"],"APPLE iPOD":["ipod","iPod"]};
  for(const [t,h,rows] of secs){ const m=amap[t]; if(m) add(cat(m[0],m[1]),"",h,rows); }
  for(const k of ["iphone","ipad","watch","ipod"]) if(cats[k]) cats[k].notes=notes.filter(x=>/labor/i.test(x));
  for(const [tab,key,name] of [["Samsung","samsung","Samsung"],["Pixel","pixel","Pixel"]]){
    [secs,notes]=modelSections(V[tab]); const c=cat(key,name);
    for(const [t,h,rows] of secs){ const g=t.replace(/^SAMSUNG\s+/,"").toLowerCase().replace(/\b\w/g,s=>s.toUpperCase()).replace("(Outer Screen)","(outer screen)"); add(c,g,h,rows); }
    c.notes=notes.filter(x=>!x.startsWith("Cellular Zone")); }
  for(const [tab,key,name] of [["Moto","moto","Motorola"],["Consoles","console","Game Console"],["Surface Pro","surface","Surface"]]){
    [secs,notes]=modelSections(V[tab]); const c=cat(key,name);
    for(const [t,h,rows] of secs) add(c,"",h,rows);
    c.notes=notes.filter(x=>!/^Cellular ?Zone/.test(x) && !["Consoles","Microsoft"].includes(x)); }
  const c=cat("computer","Computer"); c.cols=["Price"];
  for(const tab of ["PC","Mac"]){ let started=false;
    for(const r of V[tab]){ if(!r||!nrm(r[0])) continue; const a=nrm(r[0]);
      if(["Computers","Mac","Model"].includes(a)||a.startsWith("Cellular Zone")){ started=true; continue; }
      if(/labor/i.test(a)||a.startsWith("Any repair")){ if(!c.notes.includes(a)) c.notes.push(a); continue; }
      const price=r.slice(1).map(nrm).filter(Boolean).join(" · ");
      if(started&&price) c.models.push({n:a,g:tab==="PC"?"PC":"Mac",p:[price]}); } }
  for(const c of Object.values(cats)){ const nn=[];
    for(let x of c.notes){ x=x.replace(/^Prices pull automatically[^.]*\.\s*/,"").replace(/\s*-+$/,"").trim();
      if(!x||x.startsWith("—")||nn.includes(x)||x.includes("Smartphone Labor: $60")) continue; nn.push(x); }
    c.notes=nn; }
  const order=["iphone","samsung","pixel","ipad","watch","moto","console","computer","surface","ipod"], o={};
  for(const k of order) if(cats[k]) o[k]=cats[k];
  return o; }
async function loadLive(){
  if(SHEET_PUB.startsWith("__")) throw new Error("not configured");
  const V={};
  await Promise.all(Object.entries(TABS).map(async([name,gid])=>{
    const r=await fetch(`${SHEET_PUB}?gid=${gid}&single=true&output=csv`,{cache:"no-store"});
    if(!r.ok) throw new Error(name+" "+r.status); V[name]=parseCSV(await r.text()); }));
  const cats=buildCats(V);
  if(!cats.iphone||cats.iphone.models.length<30) throw new Error("iPhone tab looks wrong");
  const now=new Date(); return {asof:"live · loaded "+now.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}), cats, live:true};
}
