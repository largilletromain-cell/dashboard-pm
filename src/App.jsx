import { useState, useEffect, useCallback, useRef } from "react";

const SUPA_URL = "https://foppanucfuwcmephikvq.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcHBhbnVjZnV3Y21lcGhpa3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjU3OTQsImV4cCI6MjA5ODAwMTc5NH0.KyORf5PFTDr6KX0dc0p_CsjfYIlK_yDKOc0Fk0aqC0U";
const H = {"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Prefer":"return=representation"};

async function sbGet(t,s="*"){const r=await fetch(SUPA_URL+"/rest/v1/"+t+"?select="+s+"&order=id",{headers:H});return r.json();}
async function sbIns(t,d){const r=await fetch(SUPA_URL+"/rest/v1/"+t,{method:"POST",headers:H,body:JSON.stringify(d)});const j=await r.json();if(!r.ok){return{error:true,status:r.status,detail:j};}return j;}
async function sbUpd(t,id,d){const r=await fetch(SUPA_URL+"/rest/v1/"+t+"?id=eq."+id,{method:"PATCH",headers:H,body:JSON.stringify(d)});const j=await r.json();if(!r.ok){return{error:true,status:r.status,detail:j};}return j;}
async function sbDel(t,id){await fetch(SUPA_URL+"/rest/v1/"+t+"?id=eq."+id,{method:"DELETE",headers:H});}

const STATUSES=["En cours","En attente","Terminé","Bloqué"];
const PRIORITIES=["Haute","Moyenne","Basse"];
const SITES=["Centre Bourgogne","Centre Galilée"];
const GCOLS=["#378ADD","#1D9E75","#BA7517","#D4537E","#7F77DD","#D85A30","#639922"];
const SC={"En cours":{bg:"#E6F1FB",tx:"#0C447C"},"En attente":{bg:"#FAEEDA",tx:"#633806"},"Terminé":{bg:"#EAF3DE",tx:"#27500A"},"Bloqué":{bg:"#FCEBEB",tx:"#791F1F"}};
const PC={"Haute":{bg:"#FAECE7",tx:"#712B13"},"Moyenne":{bg:"#FAEEDA",tx:"#633806"},"Basse":{bg:"#EAF3DE",tx:"#27500A"}};
const SIC={"Centre Bourgogne":{bg:"#EDE9FB",tx:"#3B1FA3"},"Centre Galilée":{bg:"#E6F1FB",tx:"#0C447C"}};
const TODAY=new Date().toISOString().split("T")[0];
const PRIOR_ORDER={"Haute":0,"Moyenne":1,"Basse":2};
const STATUS_ORDER={"En cours":0,"Bloqué":1,"En attente":2,"Terminé":3};

function fd(d){if(!d)return"-";const[y,m,day]=d.split("-");return day+"/"+m+"/"+y;}
function isOD(d,s){return s!=="Terminé"&&!!d&&d<TODAY;}
function pgCol(v){return v>=70?"#639922":v>=40?"#BA7517":"#378ADD";}
function calcProgress(projectId, tasks){
  const pt=tasks.filter(t=>t.project_id===projectId);
  if(!pt.length)return 0;
  const done=pt.filter(t=>t.status==="Terminé").length;
  return Math.round((done/pt.length)*100);
}

// Fraction de chevauchement entre [start,end] de la tâche et [pStart,pEnd] de la période, en jours
function overlapDays(start,end,pStart,pEnd){
  const s=Math.max(new Date(start).getTime(), new Date(pStart).getTime());
  const e=Math.min(new Date(end).getTime(), new Date(pEnd).getTime());
  return Math.max(0,(e-s)/86400000);
}

// Charge d'une tâche dans une période : ((échéance-début)*pondération)/durée période, pondérée par le chevauchement réel
function taskLoadInPeriod(task, pStart, pEnd){
  if(!task.created_at || !task.deadline) return 0;
  const tStart=new Date(task.created_at), tEnd=new Date(task.deadline);
  const periodDays=(new Date(pEnd)-new Date(pStart))/86400000;
  if(periodDays<=0) return 0;
  const ov=overlapDays(tStart,tEnd,pStart,pEnd);
  if(ov<=0) return 0;
  const w=(task.weight||0)/100;
  return (ov*w/periodDays)*100; // en %
}

// Retard d'une tâche : (date_fin_effective - échéance) / (échéance - début)
function taskDelay(task){
  if(!task.completion_date || !task.deadline || !task.created_at) return null;
  const start=new Date(task.created_at), due=new Date(task.deadline), done=new Date(task.completion_date);
  const denom=(due-start)/86400000;
  if(denom<=0) return null;
  return ((done-due)/86400000)/denom;
}

const ss={
  inp:{width:"100%",padding:"6px 9px",fontSize:12,border:"1px solid #ccc",borderRadius:6,background:"#fff",color:"#111",boxSizing:"border-box"},
  lbl:{fontSize:11,color:"#555",display:"block",marginBottom:3},
  btnP:{padding:"6px 13px",fontSize:12,background:"#1a6bbf",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600},
  btnS:{padding:"5px 11px",fontSize:12,background:"#f0f0f0",color:"#333",border:"1px solid #ccc",borderRadius:6,cursor:"pointer"},
  btnD:{padding:"5px 9px",fontSize:12,background:"#fce8e8",color:"#a32d2d",border:"none",borderRadius:6,cursor:"pointer"},
  sel:{padding:"5px 8px",fontSize:12,border:"1px solid #ccc",borderRadius:6,background:"#fff",color:"#111"},
};

function Badge({label,c}){return <span style={{background:c.bg,color:c.tx,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:5,whiteSpace:"nowrap"}}>{label}</span>;}
function PBar({v}){return <div style={{background:"#e8e8e8",borderRadius:4,height:7,flex:1,overflow:"hidden"}}><div style={{width:v+"%",height:"100%",background:pgCol(v),borderRadius:4}}/></div>;}
function Spinner(){return <div style={{textAlign:"center",padding:40,color:"#888"}}>Chargement...</div>;}

function Modal({title,onClose,wide,children}){
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #ccc",padding:20,width:"100%",maxWidth:wide?960:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontWeight:700,fontSize:14,color:"#111"}}>{title}</span>
          <button onClick={onClose} style={{background:"#eee",border:"none",cursor:"pointer",fontSize:14,borderRadius:5,padding:"2px 9px"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProjForm({data,pilots,tasks,onSave,onClose}){
  const [f,setF]=useState({...data});
  const set=k=>e=>setF(x=>({...x,[k]:e.target.value}));
  const autoProgress=calcProgress(f.id,tasks);
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Nom *</label><input style={ss.inp} value={f.name||""} onChange={set("name")} placeholder="Nom du projet"/></div>
      <div><label style={ss.lbl}>Statut</label><select style={ss.inp} value={f.status||"En cours"} onChange={set("status")}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Priorité</label><select style={ss.inp} value={f.priority||"Moyenne"} onChange={set("priority")}>{PRIORITIES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Pilote</label><select style={ss.inp} value={f.pilot||""} onChange={set("pilot")}>{pilots.map(s=><option key={s.id}>{s.name}</option>)}</select></div>
      <div><label style={ss.lbl}>Site</label><select style={ss.inp} value={f.site||SITES[0]} onChange={set("site")}>{SITES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div style={{gridColumn:"1/-1",background:"#f0f6ff",borderRadius:8,padding:"8px 12px"}}>
        <div style={{fontSize:11,color:"#555",marginBottom:4}}>Avancement automatique (basé sur les tâches terminées)</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <PBar v={autoProgress}/>
          <span style={{fontWeight:700,fontSize:14,color:pgCol(autoProgress),minWidth:40}}>{autoProgress}%</span>
        </div>
        <div style={{fontSize:10,color:"#888",marginTop:4}}>{tasks.filter(t=>t.project_id===f.id&&t.status==="Terminé").length} / {tasks.filter(t=>t.project_id===f.id).length} tâches terminées</div>
      </div>
      <div><label style={ss.lbl}>Échéance</label><input type="date" style={ss.inp} value={f.deadline||""} onChange={set("deadline")}/></div>
      <div><label style={ss.lbl}>Date de début</label><input type="date" style={ss.inp} value={f.created_at||TODAY} onChange={set("created_at")}/></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Description</label><input style={ss.inp} value={f.description||""} onChange={set("description")}/></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Notes</label><textarea style={{...ss.inp,height:72,resize:"vertical"}} value={f.notes||""} onChange={set("notes")}/></div>
      <div style={{gridColumn:"1/-1",display:"flex",gap:8,marginTop:4}}>
        <button style={ss.btnP} onClick={()=>(f.name||"").trim()&&onSave({...f,progress:autoProgress})}>Enregistrer</button>
        <button style={ss.btnS} onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

function TaskForm({data,projects,pilots,onSave,onClose}){
  const [f,setF]=useState({...data});
  const set=k=>e=>setF(x=>({...x,[k]:e.target.value}));
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Nom *</label><input style={ss.inp} value={f.name||""} onChange={set("name")} placeholder="Nom de la tâche"/></div>
      <div style={{gridColumn:"1/-1"}}>
        <label style={ss.lbl}>Projet (optionnel)</label>
        <select style={ss.inp} value={f.project_id||""} onChange={e=>setF(x=>({...x,project_id:e.target.value?Number(e.target.value):null}))}>
          <option value="">— Tâche indépendante (aucun projet) —</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div><label style={ss.lbl}>Statut</label><select style={ss.inp} value={f.status||"En attente"} onChange={set("status")}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Priorité</label><select style={ss.inp} value={f.priority||"Moyenne"} onChange={set("priority")}>{PRIORITIES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Pilote</label><select style={ss.inp} value={f.pilot||""} onChange={set("pilot")}>{pilots.map(s=><option key={s.id}>{s.name}</option>)}</select></div>
      <div><label style={ss.lbl}>Site</label><select style={ss.inp} value={f.site||SITES[0]} onChange={set("site")}>{SITES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Pondération temps : {f.weight||0}%</label><input type="range" min={0} max={100} step={5} value={f.weight||0} onChange={e=>setF(x=>({...x,weight:Number(e.target.value)}))} style={{width:"100%"}}/></div>
      <div><label style={ss.lbl}>Date de début</label><input type="date" style={ss.inp} value={f.created_at||TODAY} onChange={set("created_at")}/></div>
      <div><label style={ss.lbl}>Échéance</label><input type="date" style={ss.inp} value={f.deadline||""} onChange={set("deadline")}/></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Date de fin effective {f.status!=="Terminé"&&<span style={{color:"#aaa",fontWeight:400}}>(renseignée à la clôture)</span>}</label><input type="date" style={ss.inp} value={f.completion_date||""} onChange={set("completion_date")}/></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Notes</label><textarea style={{...ss.inp,height:60,resize:"vertical"}} value={f.notes||""} onChange={set("notes")}/></div>
      <div style={{gridColumn:"1/-1",display:"flex",gap:8,marginTop:4}}>
        <button style={ss.btnP} onClick={()=>(f.name||"").trim()&&onSave(f)}>Enregistrer</button>
        <button style={ss.btnS} onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

function PilotsForm({pilots,onClose,onRefresh}){
  const [list,setList]=useState([...pilots]);
  const [newName,setNewName]=useState("");
  async function add(){const n=newName.trim();if(!n||list.find(p=>p.name===n))return;const r=await sbIns("pilots",{name:n,position:list.length});if(r&&r[0])setList(l=>[...l,r[0]]);setNewName("");}
  async function remove(p){await sbDel("pilots",p.id);setList(l=>l.filter(x=>x.id!==p.id));}
  return(
    <div>
      <div style={{marginBottom:12}}>{list.map((p,i)=>(
        <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:i%2===0?"#f9f9f9":"#fff",borderRadius:6,marginBottom:4}}>
          <span style={{flex:1,fontSize:13}}>{p.name}</span>
          <button onClick={()=>remove(p)} style={{...ss.btnD,padding:"2px 7px",fontSize:11}}>✕</button>
        </div>
      ))}</div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <input style={{...ss.inp,flex:1}} value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Nouveau pilote"/>
        <button style={ss.btnP} onClick={add}>+ Ajouter</button>
      </div>
      <button style={ss.btnP} onClick={()=>{onRefresh();onClose();}}>Fermer</button>
    </div>
  );
}

function buildGanttSVG(projects, tasks, W=800){
  const startDate=new Date(TODAY); startDate.setMonth(startDate.getMonth()-1); startDate.setDate(1);
  const endDate=new Date(startDate); endDate.setFullYear(endDate.getFullYear()+1);
  const totalDays=(endDate-startDate)/86400000;
  const LW=180, DW=(W-LW-10)/totalDays, RH=28, HH=48;
  function xp(ds){if(!ds)return LW;const days=(new Date(ds)-startDate)/86400000;return LW+Math.max(0,Math.min((W-LW-10),days*DW));}
  const months=[]; const mc=new Date(startDate);
  while(mc<endDate){months.push(new Date(mc));mc.setMonth(mc.getMonth()+1);}
  const weeks=[]; const wc=new Date(startDate);
  const wd=wc.getDay(); wc.setDate(wc.getDate()+(wd===0?1:wd===1?0:8-wd));
  while(wc<endDate){
    const d=new Date(Date.UTC(wc.getFullYear(),wc.getMonth(),wc.getDate()));
    d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
    const wn=Math.ceil((((d-new Date(Date.UTC(d.getUTCFullYear(),0,1)))/86400000)+1)/7);
    weeks.push({date:new Date(wc),num:wn}); wc.setDate(wc.getDate()+7);
  }
  const rows=[];
  projects.forEach(p=>{
    rows.push({type:"p",data:p});
    tasks.filter(t=>t.project_id===p.id).forEach(t=>rows.push({type:"t",data:t}));
  });
  const TH=HH+rows.length*RH+8;
  const todayX=xp(TODAY);
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TH}" style="font-family:Arial,sans-serif">`;
  svg+=`<rect width="${W}" height="${TH}" fill="#fafafa" rx="4"/>`;
  months.forEach((m,i)=>{
    const x1=xp(m.toISOString().split("T")[0]);
    const nx=new Date(m); nx.setMonth(nx.getMonth()+1);
    const x2=xp(nx.toISOString().split("T")[0]);
    svg+=`<rect x="${x1}" y="${HH}" width="${x2-x1}" height="${TH-HH}" fill="${i%2===0?"#f8f8f8":"#f2f2f2"}"/>`;
  });
  weeks.forEach(w=>{const x=xp(w.date.toISOString().split("T")[0]);svg+=`<line x1="${x}" y1="${HH}" x2="${x}" y2="${TH}" stroke="#e0e0e0" stroke-width="0.5"/>`;});
  svg+=`<rect x="0" y="0" width="${W}" height="26" fill="#1a6bbf"/>`;
  months.forEach((m,i)=>{
    const x1=xp(m.toISOString().split("T")[0]);
    const nx=new Date(m); nx.setMonth(nx.getMonth()+1);
    const x2=xp(nx.toISOString().split("T")[0]);
    const mw=x2-x1;
    svg+=`<line x1="${x1}" y1="0" x2="${x1}" y2="26" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>`;
    if(mw>24)svg+=`<text x="${x1+mw/2}" y="17" font-size="9.5" fill="#fff" font-weight="bold" text-anchor="middle">${m.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"})}</text>`;
  });
  svg+=`<rect x="0" y="26" width="${W}" height="22" fill="#eef3fa"/>`;
  weeks.forEach(w=>{
    const x=xp(w.date.toISOString().split("T")[0]);
    svg+=`<line x1="${x}" y1="26" x2="${x}" y2="48" stroke="#ccc" stroke-width="0.5"/>`;
    if(DW*7>14)svg+=`<text x="${x+2}" y="39" font-size="7.5" fill="#888">S${w.num}</text>`;
  });
  svg+=`<rect x="0" y="0" width="${LW}" height="${HH}" fill="#1558a0"/>`;
  svg+=`<text x="8" y="28" font-size="10" fill="#fff" font-weight="bold">Projet / Tâche</text>`;
  svg+=`<line x1="0" y1="${HH}" x2="${W}" y2="${HH}" stroke="#ccc" stroke-width="1"/>`;
  rows.forEach((row,i)=>{
    const y=HH+i*RH;
    const isP=row.type==="p";
    const item=row.data;
    const ci=isP?projects.findIndex(p=>p.id===item.id):0;
    const col=isP?GCOLS[ci%GCOLS.length]:"#94a3b8";
    const x1=xp(item.created_at); const x2=Math.max(xp(item.deadline),x1+3);
    const prog=isP?calcProgress(item.id,tasks):0;
    const pw=(x2-x1)*prog/100;
    const nm=item.name.length>(isP?24:22)?item.name.slice(0,isP?22:20)+"...":item.name;
    const sc=SC[item.status]||{bg:"#eee",tx:"#333"};
    svg+=`<rect x="0" y="${y}" width="${W}" height="${RH}" fill="${i%2===0?"#fff":"#fafafa"}"/>`;
    svg+=`<line x1="0" y1="${y+RH}" x2="${W}" y2="${y+RH}" stroke="#f0f0f0" stroke-width="0.5"/>`;
    svg+=`<rect x="0" y="${y}" width="${LW}" height="${RH}" fill="${isP?"#f8faff":"#f2f5ff"}"/>`;
    svg+=`<line x1="${LW}" y1="${y}" x2="${LW}" y2="${y+RH}" stroke="#ddd" stroke-width="1"/>`;
    svg+=`<text x="${isP?8:22}" y="${y+RH/2+3.5}" font-size="${isP?10:9}" fill="${isP?"#111":"#555"}" font-weight="${isP?"bold":"normal"}">${isP?"":"↳ "}${nm}</text>`;
    if(isP){
      svg+=`<rect x="${LW-48}" y="${y+7}" width="42" height="12" rx="3" fill="${sc.bg}"/>`;
      svg+=`<text x="${LW-27}" y="${y+16}" font-size="7" fill="${sc.tx}" font-weight="bold" text-anchor="middle">${item.status}</text>`;
    }
    if(item.deadline){
      svg+=`<rect x="${x1}" y="${y+6}" width="${Math.max(x2-x1,3)}" height="${RH-12}" rx="3" fill="${col}${isP?"28":"18"}" stroke="${col}" stroke-width="${isP?"1.5":"1"}"/>`;
      if(isP&&pw>0)svg+=`<rect x="${x1}" y="${y+6}" width="${pw}" height="${RH-12}" rx="3" fill="${col}"/>`;
      if(isP&&pw>14)svg+=`<text x="${x1+pw/2}" y="${y+RH/2+3.5}" font-size="7.5" fill="#fff" font-weight="bold" text-anchor="middle">${prog}%</text>`;
      if(!isP)svg+=`<rect x="${x1}" y="${y+9}" width="${Math.max(x2-x1,3)}" height="${RH-18}" rx="2" fill="${col}"/>`;
    }
  });
  svg+=`<line x1="${todayX}" y1="0" x2="${todayX}" y2="${TH}" stroke="#e24b4a" stroke-width="1.5" stroke-dasharray="4,3"/>`;
  svg+=`<rect x="${todayX-14}" y="${TH-16}" width="28" height="14" rx="3" fill="#e24b4a"/>`;
  svg+=`<text x="${todayX}" y="${TH-6}" font-size="8" fill="#fff" text-anchor="middle" font-weight="bold">Auj.</text>`;
  svg+=`</svg>`;
  return {svg, height:TH};
}

function GanttView({projects,tasks}){
  const [expanded,setExpanded]=useState({});
  const toggle=id=>setExpanded(e=>({...e,[id]:!e[id]}));
  const startDate=new Date(TODAY); startDate.setMonth(startDate.getMonth()-1); startDate.setDate(1);
  const endDate=new Date(startDate); endDate.setFullYear(endDate.getFullYear()+1);
  const totalDays=(endDate-startDate)/86400000;
  const LW=195,DW=2.8,CW=totalDays*DW,TW=LW+CW+10,RH=30,HH=52;
  function xp(ds){if(!ds)return LW;const days=(new Date(ds)-startDate)/86400000;return LW+Math.max(0,Math.min(CW,days*DW));}
  const months=[]; const mc=new Date(startDate);
  while(mc<endDate){months.push(new Date(mc));mc.setMonth(mc.getMonth()+1);}
  const weeks=[]; const wc=new Date(startDate);
  const wd=wc.getDay(); wc.setDate(wc.getDate()+(wd===0?1:wd===1?0:8-wd));
  while(wc<endDate){
    const d=new Date(Date.UTC(wc.getFullYear(),wc.getMonth(),wc.getDate()));
    d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
    const wn=Math.ceil((((d-new Date(Date.UTC(d.getUTCFullYear(),0,1)))/86400000)+1)/7);
    weeks.push({date:new Date(wc),num:wn}); wc.setDate(wc.getDate()+7);
  }
  const rows=[];
  projects.forEach(p=>{
    rows.push({type:"p",data:p});
    if(expanded[p.id])tasks.filter(t=>t.project_id===p.id).forEach(t=>rows.push({type:"t",data:t}));
  });
  const TH=HH+rows.length*RH+8;
  const todayX=xp(TODAY);
  if(!projects.length)return <p style={{color:"#888",fontSize:13}}>Aucun projet.</p>;
  return(
    <div style={{overflowX:"auto",overflowY:"auto",maxHeight:"70vh"}}>
      <svg width={TW} height={TH} style={{fontFamily:"Arial,sans-serif",display:"block"}}>
        <rect width={TW} height={TH} fill="#fafafa" rx="4"/>
        {months.map((m,i)=>{const x1=xp(m.toISOString().split("T")[0]);const nx=new Date(m);nx.setMonth(nx.getMonth()+1);const x2=xp(nx.toISOString().split("T")[0]);return<rect key={i} x={x1} y={HH} width={x2-x1} height={TH-HH} fill={i%2===0?"#f8f8f8":"#f2f2f2"}/>;  })}
        {weeks.map((w,i)=><line key={i} x1={xp(w.date.toISOString().split("T")[0])} y1={HH} x2={xp(w.date.toISOString().split("T")[0])} y2={TH} stroke="#e0e0e0" strokeWidth="0.5"/>)}
        <rect x={0} y={0} width={TW} height={26} fill="#1a6bbf"/>
        {months.map((m,i)=>{const x1=xp(m.toISOString().split("T")[0]);const nx=new Date(m);nx.setMonth(nx.getMonth()+1);const x2=xp(nx.toISOString().split("T")[0]);const w=x2-x1;return<g key={i}><line x1={x1} y1={0} x2={x1} y2={26} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>{w>24&&<text x={x1+w/2} y={17} fontSize="10" fill="#fff" fontWeight="bold" textAnchor="middle">{m.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"})}</text>}</g>;})}
        <rect x={0} y={26} width={TW} height={26} fill="#eef3fa"/>
        {weeks.map((w,i)=>{const x=xp(w.date.toISOString().split("T")[0]);return<g key={i}><line x1={x} y1={26} x2={x} y2={52} stroke="#ccc" strokeWidth="0.5"/>{DW*7>14&&<text x={x+2} y={40} fontSize="8" fill="#888">S{w.num}</text>}</g>;})}
        <rect x={0} y={0} width={LW} height={HH} fill="#1558a0"/>
        <text x={8} y={30} fontSize="11" fill="#fff" fontWeight="bold">Projet / Tâche</text>
        <line x1={0} y1={HH} x2={TW} y2={HH} stroke="#ccc" strokeWidth="1"/>
        {rows.map((row,i)=>{
          const y=HH+i*RH; const isP=row.type==="p"; const item=row.data;
          const ci=isP?projects.findIndex(p=>p.id===item.id):0;
          const col=isP?GCOLS[ci%GCOLS.length]:"#94a3b8";
          const x1=xp(item.created_at),x2=Math.max(xp(item.deadline),x1+4);
          const prog=isP?calcProgress(item.id,tasks):0;
          const pw=(x2-x1)*prog/100;
          const nm=item.name.length>(isP?26:24)?item.name.slice(0,isP?24:22)+"...":item.name;
          const hasT=isP&&tasks.filter(t=>t.project_id===item.id).length>0;
          const sc=SC[item.status]||{bg:"#eee",tx:"#333"};
          return(
            <g key={row.type+item.id}>
              <rect x={0} y={y} width={TW} height={RH} fill={i%2===0?"#fff":"#fafafa"}/>
              <line x1={0} y1={y+RH} x2={TW} y2={y+RH} stroke="#f0f0f0" strokeWidth="0.5"/>
              <rect x={0} y={y} width={LW} height={RH} fill={isP?"#f8faff":"#f2f5ff"}/>
              <line x1={LW} y1={y} x2={LW} y2={y+RH} stroke="#ddd" strokeWidth="1"/>
              {isP&&hasT&&<text x={6} y={y+RH/2+4} fontSize="12" fill="#1a6bbf" style={{cursor:"pointer"}} onClick={()=>toggle(item.id)}>{expanded[item.id]?"▼":"▶"}</text>}
              <text x={isP?20:30} y={y+RH/2+4} fontSize={isP?10.5:9.5} fill={isP?"#111":"#555"} fontWeight={isP?"bold":"normal"}>{!isP&&"↳ "}{nm}</text>
              {isP&&<g><rect x={LW-50} y={y+8} width={44} height={13} rx="3" fill={sc.bg}/><text x={LW-28} y={y+18} fontSize="7.5" fill={sc.tx} fontWeight="bold" textAnchor="middle">{item.status}</text></g>}
              {item.deadline&&<g>
                <rect x={x1} y={y+7} width={Math.max(x2-x1,3)} height={RH-14} rx="3" fill={col+(isP?"28":"18")} stroke={col} strokeWidth={isP?"1.5":"1"}/>
                {isP&&pw>0&&<rect x={x1} y={y+7} width={pw} height={RH-14} rx="3" fill={col}/>}
                {isP&&pw>14&&<text x={x1+pw/2} y={y+RH/2+3.5} fontSize="8" fill="#fff" fontWeight="bold" textAnchor="middle">{prog}%</text>}
                {!isP&&<rect x={x1} y={y+10} width={Math.max(x2-x1,3)} height={RH-20} rx="2" fill={col}/>}
              </g>}
            </g>
          );
        })}
        <line x1={todayX} y1={0} x2={todayX} y2={TH} stroke="#e24b4a" strokeWidth="1.5" strokeDasharray="4,3"/>
        <rect x={todayX-14} y={TH-16} width={28} height={14} rx="3" fill="#e24b4a"/>
        <text x={todayX} y={TH-6} fontSize="8" fill="#fff" textAnchor="middle" fontWeight="bold">Auj.</text>
      </svg>
    </div>
  );
}

function buildChargeSVG(projects,tasks,pilots,W=700){
  const months=[]; const now=new Date(TODAY);
  for(let i=-1;i<11;i++)months.push(new Date(now.getFullYear(),now.getMonth()+i,1));
  const data=months.map(m=>{
    const mEnd=new Date(m.getFullYear(),m.getMonth()+1,0);
    const loads={};
    pilots.forEach(p=>{
      const pW=projects.filter(pr=>pr.pilot===p.name&&pr.status!=="Terminé"&&pr.deadline&&new Date(pr.created_at||pr.deadline)<=mEnd&&new Date(pr.deadline)>=m).reduce((s,pr)=>s+(pr.weight||0),0);
      const tW=tasks.filter(t=>t.pilot===p.name&&t.status!=="Terminé"&&t.deadline&&new Date(t.created_at||t.deadline)<=mEnd&&new Date(t.deadline)>=m).reduce((s,t)=>s+(t.weight||0),0);
      loads[p.name]=pW+tW;
    });
    return{label:m.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"}),month:m,loads};
  });
  const CH=280,PL=45,PB=50,PT=20,PR=15;
  const cW=W-PL-PR,cH=CH-PB-PT;
  const maxV=Math.max(120,...data.flatMap(d=>Object.values(d.loads)));
  const colW=cW/data.length;
  function yp(v){return PT+cH-(v/maxV*cH);}
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${CH}" style="font-family:Arial,sans-serif">`;
  svg+=`<rect width="${W}" height="${CH}" fill="#fafafa" rx="4"/>`;
  [0,25,50,75,100].forEach(v=>{
    const y=yp(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="${v===100?"#e24b4a":"#e8e8e8"}" stroke-width="${v===100?"1.5":"0.5"}" stroke-dasharray="${v===100?"5,3":""}"/>`;
    svg+=`<text x="${PL-4}" y="${y+4}" font-size="9" fill="${v===100?"#e24b4a":"#999"}" text-anchor="end">${v}%</text>`;
  });
  svg+=`<rect x="${PL}" y="${PT}" width="${cW}" height="${yp(100)-PT}" fill="#fff0f0" opacity="0.3"/>`;
  pilots.forEach((p,pi)=>{
    const col=GCOLS[pi%GCOLS.length];
    const pts=data.map((d,i)=>[PL+i*colW+colW/2,yp(d.loads[p.name]||0)]);
    const path=pts.map(([x,y],i)=>(i===0?"M":"L")+x+","+y).join(" ");
    svg+=`<path d="${path}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`;
    pts.forEach(([x,y],i)=>{
      svg+=`<circle cx="${x}" cy="${y}" r="3.5" fill="${col}" stroke="#fff" stroke-width="1.5"/>`;
      if((data[i].loads[p.name]||0)>0)svg+=`<text x="${x}" y="${y-7}" font-size="7.5" fill="${col}" text-anchor="middle" font-weight="bold">${data[i].loads[p.name]}%</text>`;
    });
  });
  data.forEach((d,i)=>{
    const x=PL+i*colW+colW/2;
    const isNow=d.month.getMonth()===now.getMonth()&&d.month.getFullYear()===now.getFullYear();
    svg+=`<line x1="${x}" y1="${PT}" x2="${x}" y2="${CH-PB}" stroke="#ececec" stroke-width="0.5"/>`;
    svg+=`<rect x="${x-14}" y="${CH-PB+3}" width="28" height="14" rx="3" fill="${isNow?"#1a6bbf":"transparent"}"/>`;
    svg+=`<text x="${x}" y="${CH-PB+13}" font-size="8.5" fill="${isNow?"#fff":"#666"}" text-anchor="middle" font-weight="${isNow?"bold":"normal"}">${d.label}</text>`;
  });
  svg+=`<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${CH-PB}" stroke="#ccc" stroke-width="1"/>`;
  svg+=`<line x1="${PL}" y1="${CH-PB}" x2="${W-PR}" y2="${CH-PB}" stroke="#ccc" stroke-width="1"/>`;
  svg+=`<text x="${W-PR}" y="${yp(100)-4}" font-size="8" fill="#e24b4a" text-anchor="end">Seuil 100%</text>`;
  // Légende
  pilots.forEach((p,pi)=>{
    const col=GCOLS[pi%GCOLS.length];
    const lx=PL+(pi*(cW/pilots.length));
    svg+=`<circle cx="${lx+6}" cy="${CH-8}" r="4" fill="${col}"/>`;
    svg+=`<text x="${lx+13}" y="${CH-4}" font-size="8" fill="#333">${p.name.split(" ")[0]}</text>`;
  });
  svg+=`</svg>`;
  return svg;
}

function WorkloadChart({projects,tasks,pilots}){
  const [visible,setVisible]=useState(()=>Object.fromEntries(pilots.map(p=>[p.name,true])));
  useEffect(()=>{setVisible(v=>{const nv={...v};pilots.forEach(p=>{if(!(p.name in nv))nv[p.name]=true;});return nv;});},[pilots]);
  const activePilots=pilots.filter(p=>visible[p.name]);
  const months=[]; const now=new Date(TODAY);
  for(let i=-1;i<11;i++)months.push(new Date(now.getFullYear(),now.getMonth()+i,1));
  const data=months.map(m=>{
    const mEnd=new Date(m.getFullYear(),m.getMonth()+1,0);
    const loads={};
    pilots.forEach(p=>{
      const pW=projects.filter(pr=>pr.pilot===p.name&&pr.status!=="Terminé"&&pr.deadline&&new Date(pr.created_at||pr.deadline)<=mEnd&&new Date(pr.deadline)>=m).reduce((s,pr)=>s+(pr.weight||0),0);
      const tW=tasks.filter(t=>t.pilot===p.name&&t.status!=="Terminé"&&t.deadline&&new Date(t.created_at||t.deadline)<=mEnd&&new Date(t.deadline)>=m).reduce((s,t)=>s+(t.weight||0),0);
      loads[p.name]=pW+tW;
    });
    return{label:m.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"}),month:m,loads};
  });
  const W=680,CH=280,PL=45,PB=50,PT=20,PR=15;
  const cW=W-PL-PR,cH=CH-PB-PT;
  const maxV=Math.max(120,...data.flatMap(d=>activePilots.map(p=>d.loads[p.name]||0)));
  const colW=cW/data.length;
  function yp(v){return PT+cH-(v/maxV*cH);}
  return(
    <div style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"14px",marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:13,color:"#111",marginBottom:10}}>Évolution de la charge sur 12 mois</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {pilots.map((p,i)=>(
          <label key={p.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,cursor:"pointer",padding:"3px 8px",border:"1px solid",borderColor:visible[p.name]?GCOLS[i%GCOLS.length]:"#ddd",borderRadius:6,background:visible[p.name]?GCOLS[i%GCOLS.length]+"18":"#f9f9f9",userSelect:"none"}}>
            <input type="checkbox" checked={!!visible[p.name]} onChange={e=>setVisible(v=>({...v,[p.name]:e.target.checked}))} style={{accentColor:GCOLS[i%GCOLS.length]}}/>
            <div style={{width:10,height:10,borderRadius:"50%",background:visible[p.name]?GCOLS[i%GCOLS.length]:"#ccc",flexShrink:0}}/>
            <span style={{color:visible[p.name]?"#111":"#aaa",fontWeight:visible[p.name]?600:400}}>{p.name}</span>
          </label>
        ))}
      </div>
      <div style={{overflowX:"auto"}}>
        <svg width={W} height={CH} style={{fontFamily:"Arial,sans-serif",display:"block"}}>
          <rect width={W} height={CH} fill="#fafafa" rx="4"/>
          {[0,25,50,75,100].map(v=>{const y=yp(v);return<g key={v}><line x1={PL} y1={y} x2={W-PR} y2={y} stroke={v===100?"#e24b4a":"#e8e8e8"} strokeWidth={v===100?"1.5":"0.5"} strokeDasharray={v===100?"5,3":""}/><text x={PL-4} y={y+4} fontSize="9" fill={v===100?"#e24b4a":"#999"} textAnchor="end">{v}%</text></g>;})}
          <rect x={PL} y={PT} width={cW} height={yp(100)-PT} fill="#fff0f0" opacity="0.3"/>
          {activePilots.map((p,pi)=>{
            const realIdx=pilots.findIndex(x=>x.id===p.id);
            const col=GCOLS[realIdx%GCOLS.length];
            const pts=data.map((d,i)=>[PL+i*colW+colW/2,yp(d.loads[p.name]||0)]);
            const path=pts.map(([x,y],i)=>(i===0?"M":"L")+x+","+y).join(" ");
            return<g key={p.id}>
              <path d={path} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round"/>
              {pts.map(([x,y],i)=><g key={i}>
                <circle cx={x} cy={y} r="4" fill={col} stroke="#fff" strokeWidth="1.5"/>
                {(data[i].loads[p.name]||0)>0&&<text x={x} y={y-8} fontSize="8" fill={col} textAnchor="middle" fontWeight="bold">{data[i].loads[p.name]}%</text>}
              </g>)}
            </g>;
          })}
          {data.map((d,i)=>{
            const x=PL+i*colW+colW/2;
            const isNow=d.month.getMonth()===now.getMonth()&&d.month.getFullYear()===now.getFullYear();
            return<g key={i}>
              <line x1={x} y1={PT} x2={x} y2={CH-PB} stroke="#ececec" strokeWidth="0.5"/>
              <rect x={x-14} y={CH-PB+3} width={28} height={14} rx="3" fill={isNow?"#1a6bbf":"transparent"}/>
              <text x={x} y={CH-PB+13} fontSize="8.5" fill={isNow?"#fff":"#666"} textAnchor="middle" fontWeight={isNow?"bold":"normal"}>{d.label}</text>
            </g>;
          })}
          <line x1={PL} y1={PT} x2={PL} y2={CH-PB} stroke="#ccc" strokeWidth="1"/>
          <line x1={PL} y1={CH-PB} x2={W-PR} y2={CH-PB} stroke="#ccc" strokeWidth="1"/>
          <text x={W-PR} y={yp(100)-4} fontSize="8" fill="#e24b4a" textAnchor="end">Seuil 100%</text>
        </svg>
      </div>
    </div>
  );
}

function WorkloadTable({projects,tasks,pilots}){
  const rows=pilots.map(p=>{
    const pW=projects.filter(x=>x.pilot===p.name&&x.status!=="Terminé").reduce((s,x)=>s+(x.weight||0),0);
    const tW=tasks.filter(x=>x.pilot===p.name&&x.status!=="Terminé").reduce((s,x)=>s+(x.weight||0),0);
    const total=pW+tW;
    const color=total>100?"#a32d2d":total>80?"#BA7517":"#27500A";
    const bgColor=total>100?"#FCEBEB":total>80?"#FAEEDA":"#EAF3DE";
    return{pilot:p.name,pW,tW,total,color,bgColor};
  });
  return(
    <div style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px",marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>
        Charge du jour — {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{background:"#f4f4f4"}}>
          <th style={{padding:"6px 10px",textAlign:"left",color:"#555"}}>Pilote</th>
          <th style={{padding:"6px 10px",textAlign:"center",color:"#555"}}>Projets</th>
          <th style={{padding:"6px 10px",textAlign:"center",color:"#555"}}>Tâches</th>
          <th style={{padding:"6px 10px",textAlign:"center",color:"#555"}}>Total</th>
          <th style={{padding:"6px 10px",textAlign:"left",color:"#555"}}>Charge</th>
        </tr></thead>
        <tbody>{rows.map((r,i)=>(
          <tr key={r.pilot} style={{borderBottom:"1px solid #f0f0f0",background:i%2===0?"#fff":"#fafafa"}}>
            <td style={{padding:"6px 10px",fontWeight:600}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{background:"#1a6bbf",color:"#fff",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{r.pilot[0]}</span>
                {r.pilot}
              </div>
            </td>
            <td style={{padding:"6px 10px",textAlign:"center",color:"#555"}}>{r.pW}%</td>
            <td style={{padding:"6px 10px",textAlign:"center",color:"#555"}}>{r.tW}%</td>
            <td style={{padding:"6px 10px",textAlign:"center",fontWeight:700,color:r.color}}>{r.total}%</td>
            <td style={{padding:"6px 10px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1,background:"#e8e8e8",borderRadius:4,height:8,overflow:"hidden"}}>
                  <div style={{width:Math.min(r.total,100)+"%",height:"100%",background:r.color,borderRadius:4}}/>
                </div>
                <span style={{background:r.bgColor,color:r.color,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,whiteSpace:"nowrap"}}>
                  {r.total>100?"Surchargé":r.total>80?"Chargé":r.total>0?"OK":"Libre"}
                </span>
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function PieChart({inProgress,completed,size=130}){
  const free=Math.max(0,100-inProgress-completed);
  const r=size/2-8, cx=size/2, cy=size/2;
  const segs=[
    {v:inProgress,color:"#378ADD",label:"En cours"},
    {v:completed,color:"#639922",label:"Terminé"},
    {v:free,color:"#e8e8e8",label:"Disponible"},
  ];
  let acc=0;
  const paths=segs.map((s,i)=>{
    if(s.v<=0)return null;
    const startAngle=(acc/100)*2*Math.PI - Math.PI/2;
    acc+=s.v;
    const endAngle=(acc/100)*2*Math.PI - Math.PI/2;
    const x1=cx+r*Math.cos(startAngle), y1=cy+r*Math.sin(startAngle);
    const x2=cx+r*Math.cos(endAngle), y2=cy+r*Math.sin(endAngle);
    const large=(s.v/100)>0.5?1:0;
    if(s.v>=99.99){
      return <circle key={i} cx={cx} cy={cy} r={r} fill={s.color}/>;
    }
    const d=`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
    return <path key={i} d={d} fill={s.color} stroke="#fff" strokeWidth="1.5"/>;
  });
  return(
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <svg width={size} height={size}>{paths}<circle cx={cx} cy={cy} r={r*0.5} fill="#fff"/><text x={cx} y={cy+4} fontSize="13" fontWeight="bold" textAnchor="middle" fill="#333">{Math.round(inProgress+completed)}%</text></svg>
      <div style={{fontSize:11}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><span style={{width:10,height:10,borderRadius:"50%",background:"#378ADD",display:"inline-block"}}/>En cours : <b>{inProgress.toFixed(1)}%</b></div>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><span style={{width:10,height:10,borderRadius:"50%",background:"#639922",display:"inline-block"}}/>Terminé : <b>{completed.toFixed(1)}%</b></div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:"50%",background:"#e8e8e8",display:"inline-block",border:"1px solid #ddd"}}/>Disponible : <b>{free.toFixed(1)}%</b></div>
      </div>
    </div>
  );
}

function PilotCard({pilot,projects,tasks,dateFrom,dateTo}){
  const pStart=dateFrom||TODAY, pEnd=dateTo||TODAY;
  function inRange(item){
    if(!dateFrom&&!dateTo)return true;
    const raw=item.deadline||item.created_at; if(!raw)return true;
    const d=new Date(raw);
    if(dateFrom&&d<new Date(dateFrom))return false;
    if(dateTo&&d>new Date(dateTo))return false;
    return true;
  }
  const pAll=projects.filter(p=>p.pilot===pilot&&inRange(p));
  const tAll=tasks.filter(t=>t.pilot===pilot&&inRange(t));
  const myTasks=tasks.filter(t=>t.pilot===pilot);

  // Charge camembert
  const inProgLoad=myTasks.filter(t=>t.status!=="Terminé").reduce((s,t)=>s+taskLoadInPeriod(t,pStart,pEnd),0);
  const doneLoad=myTasks.filter(t=>t.status==="Terminé").reduce((s,t)=>s+taskLoadInPeriod(t,pStart,pEnd),0);

  // Retard moyen
  const delays=myTasks
    .filter(t=>t.status==="Terminé"&&t.completion_date)
    .filter(t=>{const raw=t.deadline||t.created_at;if(!raw)return true;const d=new Date(raw);if(dateFrom&&d<new Date(dateFrom))return false;if(dateTo&&d>new Date(dateTo))return false;return true;})
    .map(t=>taskDelay(t))
    .filter(v=>v!==null);
  const avgDelay = delays.length ? delays.reduce((s,v)=>s+v,0)/delays.length : null;
  const delayColor = avgDelay===null ? "#888" : avgDelay<=0 ? "#27500A" : avgDelay<0.2 ? "#BA7517" : "#a32d2d";
  const delayLabel = avgDelay===null ? "Pas de donnée" : avgDelay<=0 ? "En avance / à l'heure" : "En retard";

  return(
    <div style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:10,paddingBottom:6,borderBottom:"2px solid #1a6bbf",display:"flex",alignItems:"center",gap:8}}>
        <span style={{background:"#1a6bbf",color:"#fff",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{pilot[0]}</span>
        {pilot}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:12}}>
        <div style={{background:"#f8faff",borderRadius:8,padding:"10px 12px"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#1a6bbf",marginBottom:8}}>Charge sur la période</div>
          <PieChart inProgress={inProgLoad} completed={doneLoad}/>
        </div>
        <div style={{background:"#f8faff",borderRadius:8,padding:"10px 12px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#1a6bbf",marginBottom:8}}>Indicateur de respect des délais</div>
          <div style={{fontSize:26,fontWeight:700,color:delayColor,marginBottom:2}}>
            {avgDelay===null?"—":(avgDelay>0?"+":"")+(avgDelay*100).toFixed(0)+"%"}
          </div>
          <div style={{fontSize:11,color:delayColor,fontWeight:600}}>{delayLabel}</div>
          <div style={{fontSize:10,color:"#999",marginTop:4}}>{delays.length} tâche{delays.length>1?"s":""} terminée{delays.length>1?"s":""} avec date de fin renseignée</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
        {[{l:"Projets en cours",v:pAll.filter(p=>p.status!=="Terminé").length,blue:true},{l:"Projets terminés",v:pAll.filter(p=>p.status==="Terminé").length},{l:"Tâches en cours",v:tAll.filter(t=>t.status!=="Terminé").length,blue:true},{l:"Tâches terminées",v:tAll.filter(t=>t.status==="Terminé").length}].map(k=>(
          <div key={k.l} style={{background:k.blue?"#f0f6ff":"#eaf3de",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
            <div style={{fontSize:10,color:"#555",marginBottom:2}}>{k.l}</div>
            <div style={{fontSize:20,fontWeight:700,color:k.blue?"#1a6bbf":"#27500A"}}>{k.v}</div>
          </div>
        ))}
      </div>
      {pAll.length>0&&<div style={{marginBottom:8}}>
        <div style={{fontWeight:600,fontSize:11,color:"#1a6bbf",marginBottom:4}}>Projets :</div>
        {pAll.map(p=>{const prog=calcProgress(p.id,tasks);return(
          <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",background:p.status==="Terminé"?"#f3fbee":"#f7f9ff",borderRadius:5,marginBottom:3,fontSize:11}}>
            <span style={{fontWeight:500}}>{p.name}</span>
            <div style={{display:"flex",gap:5,flexShrink:0}}>
              <span style={{background:SC[p.status]?.bg||"#eee",color:SC[p.status]?.tx||"#333",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3}}>{p.status}</span>
              <span style={{fontSize:10,color:isOD(p.deadline,p.status)?"#a32d2d":"#888"}}>{fd(p.deadline)}</span>
              <span style={{background:"#e8e8e8",fontSize:9,padding:"1px 5px",borderRadius:3}}>{prog}%</span>
            </div>
          </div>
        );})}
      </div>}
      {tAll.length>0&&<div>
        <div style={{fontWeight:600,fontSize:11,color:"#1a6bbf",marginBottom:4}}>Tâches :</div>
        {tAll.map(t=>{const prj=projects.find(p=>p.id===t.project_id);return(
          <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",background:t.status==="Terminé"?"#f3fbee":"#f7f9ff",borderRadius:5,marginBottom:3,fontSize:11}}>
            <div><span style={{fontWeight:500}}>{t.name}</span>{prj?<span style={{color:"#888",marginLeft:5,fontSize:10}}>({prj.name})</span>:<span style={{color:"#bbb",marginLeft:5,fontSize:10}}>(indépendante)</span>}</div>
            <div style={{display:"flex",gap:5,flexShrink:0}}>
              <span style={{background:SC[t.status]?.bg||"#eee",color:SC[t.status]?.tx||"#333",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3}}>{t.status}</span>
              <span style={{fontSize:10,color:isOD(t.deadline,t.status)?"#a32d2d":"#888"}}>{fd(t.deadline)}</span>
            </div>
          </div>
        );})}
      </div>}
      {!pAll.length&&!tAll.length&&<p style={{fontSize:11,color:"#aaa",margin:0}}>Aucune activité sur cette période.</p>}
    </div>
  );
}

function StatsView({projects,tasks,pilots}){
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState(TODAY);
  const [selPilot,setSelPilot]=useState("");
  const pilotList=selPilot?pilots.filter(p=>p.name===selPilot):pilots;
  return(
    <div>
      <div style={{background:"#f8f8f8",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Filtres</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div><label style={ss.lbl}>Du</label><input type="date" style={{...ss.inp,width:145}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
          <div><label style={ss.lbl}>Au</label><input type="date" style={{...ss.inp,width:145}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>
          <div><label style={ss.lbl}>Pilote</label>
            <select style={ss.sel} value={selPilot} onChange={e=>setSelPilot(e.target.value)}>
              <option value="">Tous</option>{pilots.map(p=><option key={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button style={ss.btnS} onClick={()=>{setDateFrom("");setDateTo(TODAY);setSelPilot("");}}>Réinitialiser</button>
        </div>
      </div>
      <WorkloadChart projects={projects} tasks={tasks} pilots={pilotList}/>
      <WorkloadTable projects={projects} tasks={tasks} pilots={pilotList}/>
      {pilotList.map(p=><PilotCard key={p.id} pilot={p.name} projects={projects} tasks={tasks} dateFrom={dateFrom} dateTo={dateTo}/>)}
    </div>
  );
}

function ReportModal({html,onClose}){
  const [print,setPrint]=useState(false);
  if(print)return(
    <div style={{position:"fixed",inset:0,zIndex:999,background:"#fff",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:"#1a6bbf",flexShrink:0}}>
        <span style={{fontWeight:700,fontSize:14,color:"#fff"}}>Ctrl+P → Enregistrer en PDF</span>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setPrint(false)} style={{padding:"5px 12px",fontSize:12,background:"#fff",color:"#1a6bbf",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>← Retour</button>
          <button onClick={onClose} style={{padding:"5px 12px",fontSize:12,background:"#e74c3c",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>✕ Fermer</button>
        </div>
      </div>
      <iframe srcDoc={html} style={{flex:1,border:"none",width:"100%"}} title="Rapport"/>
    </div>
  );
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:900,height:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #eee",background:"#f8f8f8",borderRadius:"12px 12px 0 0",flexShrink:0}}>
          <span style={{fontWeight:700,fontSize:14}}>Aperçu du bilan</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setPrint(true)} style={{padding:"6px 14px",fontSize:12,background:"#1a6bbf",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>🖨 Imprimer / PDF</button>
            <button onClick={onClose} style={{background:"#eee",border:"none",cursor:"pointer",fontSize:14,borderRadius:5,padding:"3px 10px"}}>✕</button>
          </div>
        </div>
        <div style={{background:"#FFF8DC",borderBottom:"1px solid #f0e68c",padding:"7px 16px",fontSize:11,color:"#7a6000",flexShrink:0}}>
          Clique sur <strong>Imprimer / PDF</strong> puis <strong>Ctrl+P</strong> pour enregistrer en PDF.
        </div>
        <iframe srcDoc={html} style={{flex:1,border:"none",borderRadius:"0 0 12px 12px",width:"100%"}} title="Aperçu"/>
      </div>
    </div>
  );
}

function applySort(items,key,dir){
  if(!key)return items;
  if(key==="site"){
    return [...items].sort((a,b)=>{
      const va=a.site||"",vb=b.site||"";
      if(va<vb)return dir==="asc"?-1:1;
      if(va>vb)return dir==="asc"?1:-1;
      return (a.name||"").localeCompare(b.name||"");
    });
  }
  return [...items].sort((a,b)=>{
    let va,vb;
    if(key==="priority"){va=PRIOR_ORDER[a.priority]??9;vb=PRIOR_ORDER[b.priority]??9;}
    else if(key==="deadline"){va=a.deadline||"9999";vb=b.deadline||"9999";}
    else if(key==="progress"){va=a.progress??0;vb=b.progress??0;}
    else if(key==="status"){va=STATUS_ORDER[a.status]??9;vb=STATUS_ORDER[b.status]??9;}
    else return 0;
    if(va<vb)return dir==="asc"?-1:1;
    if(va>vb)return dir==="asc"?1:-1;
    return 0;
  });
}

export default function App(){
  const [projects,setProjects]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [pilots,setPilots]=useState([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("projects");
  const [fSt,setFSt]=useState(""); const [fPil,setFPil]=useState(""); const [fSite,setFSite]=useState("");
  const [fTPrj,setFTPrj]=useState(""); const [fTSt,setFTSt]=useState(""); const [fTSite,setFTSite]=useState("");
  const [sortKey,setSortKey]=useState(""); const [sortDir,setSortDir]=useState("asc");
  const [pModal,setPModal]=useState(null); const [tModal,setTModal]=useState(null);
  const [gantt,setGantt]=useState(false); const [pilotsModal,setPilotsModal]=useState(false); const [reportModal,setReportModal]=useState(false);

  const fetchAll=useCallback(async()=>{
    setLoading(true);
    const [p,t,pl]=await Promise.all([sbGet("projects"),sbGet("tasks"),sbGet("pilots","*&order=position")]);
    setProjects(Array.isArray(p)?p:[]); setTasks(Array.isArray(t)?t:[]); setPilots(Array.isArray(pl)?pl:[]);
    setLoading(false);
  },[]);
  useEffect(()=>{fetchAll();},[fetchAll]);

  const EP={name:"",status:"En cours",priority:"Moyenne",deadline:"",progress:0,pilot:pilots[0]?.name||"",site:SITES[0],description:"",notes:"",weight:0,created_at:TODAY};
  const ET={project_id:null,name:"",status:"En attente",priority:"Moyenne",pilot:pilots[0]?.name||"",site:SITES[0],deadline:"",notes:"",weight:0,created_at:TODAY,completion_date:""};

  async function saveP(f){
    const{id,...d}=f;
    d.progress=calcProgress(f.id,tasks);
    if(pModal.mode==="edit")await sbUpd("projects",id,d);else await sbIns("projects",d);
    setPModal(null);fetchAll();
  }
  async function saveT(f){
    const{id,...d}=f;
    d.project_id=d.project_id?Number(d.project_id):null;
    if(!d.completion_date)d.completion_date=null;
    if(!d.deadline)d.deadline=null;
    if(!d.created_at)d.created_at=TODAY;
    let res;
    if(tModal.mode==="edit")res=await sbUpd("tasks",id,d);else res=await sbIns("tasks",d);
    if(res&&res.error){
      alert("Erreur Supabase ("+res.status+") : "+JSON.stringify(res.detail));
      console.error("Supabase error:",res);
      return;
    }
    if(!res||(Array.isArray(res)&&res.length===0)){
      alert("L'enregistrement n'a renvoyé aucune donnée. Vérifie les policies RLS sur la table tasks.");
      return;
    }
    const pid=d.project_id;
    setTModal(null);
    await fetchAll();
    if(pid){
      const updTasks=await sbGet("tasks");
      const prog=calcProgress(pid,Array.isArray(updTasks)?updTasks:[]);
      await sbUpd("projects",pid,{progress:prog});
      fetchAll();
    }
  }
  async function delP(id){if(!window.confirm("Supprimer ce projet et ses tâches ?"))return;await sbDel("projects",id);fetchAll();}
  async function delT(id){
    const t=tasks.find(x=>x.id===id);
    await sbDel("tasks",id);
    if(t&&t.project_id){const updTasks=tasks.filter(x=>x.id!==id);const prog=calcProgress(t.project_id,updTasks);await sbUpd("projects",t.project_id,{progress:prog});}
    fetchAll();
  }

  function toggleSort(k){if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortKey(k);setSortDir("asc");}}
  function sortIcon(k){return sortKey!==k?"↕":sortDir==="asc"?"↑":"↓";}

  const fp=applySort(projects.filter(p=>(!fSt||p.status===fSt)&&(!fPil||p.pilot===fPil)&&(!fSite||p.site===fSite)),sortKey,sortDir);
  const ft=applySort(tasks.filter(t=>(!fTPrj||t.project_id===Number(fTPrj))&&(!fTSt||t.status===fTSt)&&(!fPil||t.pilot===fPil)&&(!fTSite||t.site===fTSite)),sortKey,sortDir);
  const activeN=projects.filter(p=>p.status!=="Terminé").length;
  const odN=tasks.filter(t=>isOD(t.deadline,t.status)).length;
  const doneN=tasks.filter(t=>t.status==="Terminé").length;
  const avgN=projects.length?Math.round(projects.reduce((s,p)=>s+calcProgress(p.id,tasks),0)/projects.length):0;

  function buildReport(){
    const now=new Date();
    const dl=now.toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
    const d2=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
    d2.setUTCDate(d2.getUTCDate()+4-(d2.getUTCDay()||7));
    const wn=Math.ceil((((d2-new Date(Date.UTC(d2.getUTCFullYear(),0,1)))/86400000)+1)/7);
    const sb=s=>{const c=SC[s]||{bg:"#eee",tx:"#333"};return'<span style="background:'+c.bg+';color:'+c.tx+';font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px">'+s+'</span>';};
    const pb2=s=>{const c=PC[s]||{bg:"#eee",tx:"#333"};return'<span style="background:'+c.bg+';color:'+c.tx+';font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px">'+s+'</span>';};
    const bar=v=>{const col=pgCol(v||0);return'<div style="background:#e8e8e8;border-radius:3px;height:7px;margin:5px 0 2px"><div style="width:'+(v||0)+'%;height:100%;background:'+col+';border-radius:3px"></div></div>';};
    const odT=tasks.filter(t=>isOD(t.deadline,t.status));
    const odB=odT.length?'<div class="no-break" style="margin-bottom:10px;border:1px solid #f09595;border-radius:6px;overflow:hidden"><div style="background:#FCEBEB;padding:5px 10px;font-weight:700;font-size:11px;color:#791F1F">Taches en retard ('+odT.length+')</div><table><thead><tr><th>Tache</th><th>Projet</th><th>Pilote</th><th>Echeance</th></tr></thead><tbody>'+odT.map(t=>{const prj=projects.find(p=>p.id===t.project_id);return'<tr><td>'+t.name+'</td><td>'+(prj?prj.name:"-")+'</td><td>'+t.pilot+'</td><td style="color:#a32d2d;font-weight:700">'+fd(t.deadline)+'</td></tr>';}).join("")+'</tbody></table></div>':"";
    const rows=projects.map(p=>{
      const pt=tasks.filter(t=>t.project_id===p.id);
      const prog=calcProgress(p.id,tasks);
      const odP=isOD(p.deadline,p.status);
      const sc=SC[p.status]||{bg:"#eee",tx:"#333"};
      const pc2=PC[p.priority||"Moyenne"]||{bg:"#eee",tx:"#333"};
      const col=pgCol(prog);
      const tr=pt.length?'<table><thead><tr><th>Tache</th><th>Statut</th><th>Pilote</th><th>Echeance</th></tr></thead><tbody>'+pt.map(t=>{const tod=isOD(t.deadline,t.status);const sc2=SC[t.status]||{bg:"#eee",tx:"#333"};return'<tr><td>'+t.name+'</td><td><span class="badge" style="background:'+sc2.bg+';color:'+sc2.tx+'">'+t.status+'</span></td><td>'+t.pilot+'</td><td'+(tod?' style="color:#a32d2d;font-weight:700"':"")+'>'+(tod?"(!!) ":"")+fd(t.deadline)+'</td></tr>';}).join("")+'</tbody></table>'
        :'<p style="padding:5px 10px;font-size:10px;color:#999">Aucune tache.</p>';
      return'<div class="proj no-break"><div class="proj-head">'
        +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
        +'<span class="badge" style="background:'+sc.bg+';color:'+sc.tx+'">'+p.status+'</span>'
        +'<span class="badge" style="background:'+pc2.bg+';color:'+pc2.tx+'">'+p.priority+'</span>'
        +'<span class="proj-name">'+p.name+'</span>'
        +(p.site?'<span class="badge" style="background:#eee;color:#555">'+p.site+'</span>':"")
        +'</div>'
        +'<div class="meta">Pilote: '+p.pilot+' | Echeance: <span style="'+(odP?"color:#a32d2d;font-weight:700":"")+'">'+(odP?"(!!) ":"")+fd(p.deadline)+'</span> | '
        +pt.filter(t=>t.status==="Terminé").length+'/'+pt.length+' taches | '+prog+'%</div>'
        +'<div class="bar-wrap"><div style="width:'+prog+'%;height:100%;background:'+col+';border-radius:3px"></div></div>'
        +(p.notes?'<div class="note">'+p.notes+'</div>':"")
        +'</div>'+tr+'</div>';
    }).join("");
    const {svg:ganttSvg}=buildGanttSVG(projects,tasks,760);
    const chargeSvg=buildChargeSVG(projects,tasks,pilots,700);
    return'<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bilan S'+wn+'</title><style>'
      +'*{box-sizing:border-box;margin:0;padding:0}'
      +'body{font-family:Arial,sans-serif;font-size:11px;color:#222;background:#fff}'
      +'@page{size:A4 landscape;margin:10mm 12mm}'
      +'@media print{'
      +'  body{width:277mm;min-height:190mm}'
      +'  .no-break{page-break-inside:avoid}'
      +'  h2{page-break-before:auto}'
      +'  .page-break{page-break-before:always}'
      +'}'
      +'.wrap{padding:8mm 0}'
      +'.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #1a6bbf}'
      +'.title{font-size:15px;font-weight:700;color:#1a6bbf}'
      +'.subtitle{font-size:9px;color:#666;margin-top:2px}'
      +'.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}'
      +'.kc{background:#f5f5f5;border-radius:5px;padding:6px 8px}'
      +'.kl{font-size:9px;color:#666;margin-bottom:1px}'
      +'.kv{font-size:17px;font-weight:700}'
      +'h2{font-size:11px;font-weight:700;border-bottom:1px solid #ddd;padding-bottom:3px;margin:10px 0 7px;color:#1a6bbf}'
      +'.proj{border:1px solid #d0d0d0;border-radius:6px;overflow:hidden;margin-bottom:8px}'
      +'.proj-head{background:#f8f8f8;padding:6px 10px;border-bottom:1px solid #ddd}'
      +'.proj-name{font-weight:700;font-size:12px}'
      +'.badge{font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;display:inline-block}'
      +'.meta{font-size:10px;color:#666;margin-top:3px}'
      +'.bar-wrap{background:#e8e8e8;border-radius:3px;height:6px;margin:4px 0 0}'
      +'.note{font-size:10px;color:#555;background:#fffbee;border:1px solid #f0e68c;border-radius:3px;padding:3px 7px;margin-top:4px}'
      +'table{width:100%;border-collapse:collapse;font-size:10px}'
      +'th{padding:3px 7px;text-align:left;background:#f0f0f0;font-weight:700;color:#555}'
      +'td{padding:3px 7px;border-bottom:1px solid #f0f0f0}'
      +'</style></head><body><div class="wrap">'
      +'<div class="header"><div><div class="title">Bilan hebdomadaire — Physique Médicale</div><div class="subtitle">Sites Galilée &amp; Bourgogne | Semaine '+wn+' | '+dl+'</div></div><div style="font-size:9px;color:#aaa;text-align:right">Confidentiel interne</div></div>'
      +'<div class="kg">'
      +'<div class="kc"><div class="kl">Projets actifs</div><div class="kv">'+activeN+'</div></div>'
      +'<div class="kc"><div class="kl">Taches en retard</div><div class="kv" style="color:'+(odN>0?"#a32d2d":"#222")+'">'+odN+'</div></div>'
      +'<div class="kc"><div class="kl">Taches terminees</div><div class="kv">'+doneN+'</div></div>'
      +'<div class="kc"><div class="kl">Avancement moyen</div><div class="kv">'+avgN+'%</div></div>'
      +'</div>'
      +odB
      +'<h2>Diagramme de Gantt</h2><div style="overflow:hidden;margin-bottom:10px">'+ganttSvg+'</div>'
      +'<div class="page-break"></div>'
      +'<h2>Charge des pilotes sur 12 mois</h2><div style="margin-bottom:10px">'+chargeSvg+'</div>'
      +'<h2>Détail des projets</h2>'+rows
      +'</div></body></html>';
  }

  if(loading)return <Spinner/>;

  return(
    <div style={{padding:"1rem 0",fontFamily:"Arial,sans-serif",color:"#111"}}>
      {pModal&&<Modal title={pModal.mode==="edit"?"Modifier le projet":"Nouveau projet"} onClose={()=>setPModal(null)}><ProjForm data={pModal.data} pilots={pilots} tasks={tasks} onSave={saveP} onClose={()=>setPModal(null)}/></Modal>}
      {tModal&&<Modal title={tModal.mode==="edit"?"Modifier la tâche":"Nouvelle tâche"} onClose={()=>setTModal(null)}><TaskForm data={tModal.data} projects={projects} pilots={pilots} onSave={saveT} onClose={()=>setTModal(null)}/></Modal>}
      {gantt&&<Modal title="Gantt — cliquer ▶ pour voir les tâches" onClose={()=>setGantt(false)} wide><GanttView projects={projects} tasks={tasks}/><div style={{textAlign:"right",marginTop:12}}><button style={ss.btnS} onClick={()=>setGantt(false)}>Fermer</button></div></Modal>}
      {pilotsModal&&<Modal title="Gérer les pilotes" onClose={()=>setPilotsModal(false)}><PilotsForm pilots={pilots} onClose={()=>setPilotsModal(false)} onRefresh={fetchAll}/></Modal>}
      {reportModal&&<ReportModal html={buildReport()} onClose={()=>setReportModal(false)}/>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:700}}>Suivi des projets — Physique Médicale</div>
          <div style={{fontSize:11,color:"#666",marginTop:2}}>Sites Galilée &amp; Bourgogne</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button style={ss.btnS} onClick={fetchAll}>↻</button>
          <button style={ss.btnS} onClick={()=>setPilotsModal(true)}>👥 Pilotes</button>
          <button style={ss.btnS} onClick={()=>setGantt(true)}>Gantt</button>
          <button style={ss.btnP} onClick={()=>setReportModal(true)}>Bilan PDF</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[{l:"Projets actifs",v:activeN},{l:"Tâches en retard",v:odN,d:odN>0},{l:"Tâches terminées",v:doneN},{l:"Avancement moyen",v:avgN+"%"}].map(k=>(
          <div key={k.l} style={{background:"#f4f4f4",borderRadius:8,padding:"9px 11px"}}>
            <div style={{fontSize:10,color:k.d?"#a32d2d":"#666",marginBottom:3}}>{k.l}</div>
            <div style={{fontSize:22,fontWeight:700,color:k.d?"#a32d2d":"#111"}}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",borderBottom:"1px solid #ddd",marginBottom:12}}>
        {[["projects","Projets ("+projects.length+")"],["tasks","Tâches ("+tasks.length+")"],["stats","Statistiques pilotes"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:"6px 15px",fontSize:12,background:"none",border:"none",borderBottom:view===v?"2px solid #111":"2px solid transparent",color:view===v?"#111":"#666",cursor:"pointer",fontWeight:view===v?700:400}}>{l}</button>
        ))}
      </div>

      {view==="stats"&&<StatsView projects={projects} tasks={tasks} pilots={pilots}/>}

      {view!=="stats"&&<>
        <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
          <select style={ss.sel} value={fSt} onChange={e=>setFSt(e.target.value)}><option value="">Tous les statuts</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
          <select style={ss.sel} value={fPil} onChange={e=>setFPil(e.target.value)}><option value="">Tous les pilotes</option>{pilots.map(p=><option key={p.id}>{p.name}</option>)}</select>
          {view==="projects"&&<select style={ss.sel} value={fSite} onChange={e=>setFSite(e.target.value)}><option value="">Tous les sites</option>{SITES.map(s=><option key={s}>{s}</option>)}</select>}
          {view==="tasks"&&<><select style={ss.sel} value={fTPrj} onChange={e=>setFTPrj(e.target.value)}><option value="">Tous les projets</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select style={ss.sel} value={fTSt} onChange={e=>setFTSt(e.target.value)}><option value="">Tous les statuts</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select><select style={ss.sel} value={fTSite} onChange={e=>setFTSite(e.target.value)}><option value="">Tous les sites</option>{SITES.map(s=><option key={s}>{s}</option>)}</select></>}
          <div style={{marginLeft:"auto"}}>
            {view==="projects"&&<button style={ss.btnP} onClick={()=>setPModal({mode:"add",data:{...EP,pilot:pilots[0]?.name||""}})}>+ Nouveau projet</button>}
            {view==="tasks"&&<button style={ss.btnP} onClick={()=>setTModal({mode:"add",data:{...ET,pilot:pilots[0]?.name||""}})}>+ Nouvelle tâche</button>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:11,color:"#666"}}>Trier :</span>
          {[{k:"priority",l:"Priorité"},{k:"deadline",l:"Échéance"},{k:"progress",l:"Avancement"},{k:"status",l:"Statut"}].map(({k,l})=>(
            <button key={k} onClick={()=>toggleSort(k)} style={{...ss.btnS,fontSize:11,padding:"3px 9px",background:sortKey===k?"#e8f0fb":"#f0f0f0",color:sortKey===k?"#1a6bbf":"#333",fontWeight:sortKey===k?700:400}}>{l} {sortIcon(k)}</button>
          ))}
          {view==="projects"&&<button onClick={()=>toggleSort("site")} style={{...ss.btnS,fontSize:11,padding:"3px 9px",background:sortKey==="site"?"#e8f0fb":"#f0f0f0",color:sortKey==="site"?"#1a6bbf":"#333",fontWeight:sortKey==="site"?700:400}}>Site {sortIcon("site")}</button>}
          {sortKey&&<button onClick={()=>setSortKey("")} style={{...ss.btnD,fontSize:11,padding:"3px 9px"}}>✕</button>}
        </div>
      </>}

      {view==="projects"&&<div>
        {fp.length===0&&<p style={{color:"#888",fontSize:13}}>Aucun projet.</p>}
        {fp.map(p=>{
          const tc=tasks.filter(t=>t.project_id===p.id).length;
          const prog=calcProgress(p.id,tasks);
          const od=isOD(p.deadline,p.status);
          const done=tasks.filter(t=>t.project_id===p.id&&t.status==="Terminé").length;
          return(
            <div key={p.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"11px 13px",marginBottom:9}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:8,flexWrap:"wrap",marginBottom:5}}>
                <span style={{fontWeight:700,fontSize:13,flex:1}}>{p.name}</span>
                <Badge label={p.status} c={SC[p.status]||{bg:"#eee",tx:"#333"}}/>
                <Badge label={p.priority||"Moyenne"} c={PC[p.priority||"Moyenne"]}/>
                {p.site&&<Badge label={p.site} c={SIC[p.site]||{bg:"#eee",tx:"#555"}}/>}
              </div>
              {p.description&&<div style={{fontSize:11,color:"#666",marginBottom:5}}>{p.description}</div>}
              {p.notes&&<div style={{fontSize:11,color:"#555",background:"#fffbee",border:"1px solid #f0e68c",borderRadius:6,padding:"5px 9px",marginBottom:6,whiteSpace:"pre-wrap"}}>📝 {p.notes}</div>}
              <div style={{display:"flex",gap:12,fontSize:11,color:"#666",marginBottom:7,flexWrap:"wrap"}}>
                <span>Pilote : {p.pilot}</span>
                {p.deadline&&<span style={{color:od?"#a32d2d":"#666"}}>Échéance : {fd(p.deadline)}{od?" (!!)":""}</span>}
                <span style={{color:"#bbb"}}>Ajouté : {fd(p.created_at)}</span>
                <span>{done}/{tc} tâche{tc>1?"s":""} terminée{done>1?"s":""}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                <PBar v={prog}/><span style={{fontSize:11,color:"#666",minWidth:32}}>{prog}%</span>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button style={ss.btnS} onClick={()=>setPModal({mode:"edit",data:{...p}})}>Modifier</button>
                <button style={ss.btnS} onClick={()=>{setView("tasks");setFTPrj(String(p.id));}}>Tâches</button>
                <button style={ss.btnD} onClick={()=>delP(p.id)}>Supprimer</button>
              </div>
            </div>
          );
        })}
      </div>}

      {view==="tasks"&&<div>
        {ft.length===0&&<p style={{color:"#888",fontSize:13}}>Aucune tâche.</p>}
        {ft.map(t=>{
          const prj=projects.find(p=>p.id===t.project_id),od=isOD(t.deadline,t.status);
          return(
            <div key={t.id} style={{background:"#fff",border:"1px solid "+(od?"#f09595":"#e0e0e0"),borderRadius:8,padding:"9px 12px",marginBottom:7}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:t.notes?6:0}}>
                <div style={{flex:1,minWidth:140}}>
                  <div style={{fontWeight:700,fontSize:12}}>{t.name}</div>
                  <div style={{fontSize:10,color:"#888"}}>{prj?prj.name:"— Indépendante —"}</div>
                </div>
                <Badge label={t.status} c={SC[t.status]||{bg:"#eee",tx:"#333"}}/>
                {t.priority&&<Badge label={t.priority} c={PC[t.priority]||{bg:"#eee",tx:"#555"}}/>}
                {t.site&&<Badge label={t.site} c={SIC[t.site]||{bg:"#eee",tx:"#555"}}/>}
                <span style={{fontSize:11,color:"#666"}}>Pilote : {t.pilot}</span>
                {t.deadline&&<span style={{fontSize:11,color:od?"#a32d2d":"#666"}}>Éch. {fd(t.deadline)}{od?" (!!)":""}</span>}
                {t.completion_date&&<span style={{fontSize:11,color:"#27500A"}}>Fin réelle : {fd(t.completion_date)}</span>}
                <span style={{fontSize:10,color:"#bbb"}}>Début : {fd(t.created_at)}</span>
                {(t.weight||0)>0&&<span style={{background:"#f0f0f0",borderRadius:4,padding:"1px 7px",fontSize:10,color:"#555",fontWeight:600}}>⏱ {t.weight}%</span>}
                <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
                  <button style={ss.btnS} onClick={()=>setTModal({mode:"edit",data:{...t}})}>Modifier</button>
                  <button style={ss.btnD} onClick={()=>delT(t.id)}>Suppr.</button>
                </div>
              </div>
              {t.notes&&<div style={{fontSize:11,color:"#555",background:"#fffbee",border:"1px solid #f0e68c",borderRadius:5,padding:"4px 9px",whiteSpace:"pre-wrap"}}>📝 {t.notes}</div>}
            </div>
          );
        })}
      </div>}
    </div>
  );
}
