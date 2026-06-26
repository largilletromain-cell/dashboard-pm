import { useState, useEffect } from "react";

const DEFAULT_PILOTS = ["Louis-Henri","Romain Léry","Kasia","Vincent","Fabienne","Largillet Romain","Loïc"];
const STATUSES = ["En cours","En attente","Terminé","Bloqué"];
const PRIORITIES = ["Haute","Moyenne","Basse"];
const SITES = ["Centre Bourgogne","Centre Galilée"];
const GCOLS = ["#378ADD","#1D9E75","#BA7517","#D4537E","#7F77DD","#D85A30","#639922"];
const SC = {"En cours":{bg:"#E6F1FB",tx:"#0C447C"},"En attente":{bg:"#FAEEDA",tx:"#633806"},"Terminé":{bg:"#EAF3DE",tx:"#27500A"},"Bloqué":{bg:"#FCEBEB",tx:"#791F1F"}};
const PC = {"Haute":{bg:"#FAECE7",tx:"#712B13"},"Moyenne":{bg:"#FAEEDA",tx:"#633806"},"Basse":{bg:"#EAF3DE",tx:"#27500A"}};
const SITE_COLORS = {"Centre Bourgogne":{bg:"#EDE9FB",tx:"#3B1FA3"},"Centre Galilée":{bg:"#E6F1FB",tx:"#0C447C"}};
const TODAY = new Date().toISOString().split("T")[0];

function fd(d){if(!d)return"-";const[y,m,day]=d.split("-");return day+"/"+m+"/"+y;}
function isOD(d,s){return s!=="Terminé"&&!!d&&d<TODAY;}
function pgCol(v){return v>=70?"#639922":v>=40?"#BA7517":"#378ADD";}
function load(k,def){try{const s=sessionStorage.getItem(k);return s?JSON.parse(s):def;}catch{return def;}}
function save(k,v){try{sessionStorage.setItem(k,JSON.stringify(v));}catch{}}
function parseD(d){return d?new Date(d):null;}

const IP=[
  {id:1,name:"Inspection ASNR",status:"En cours",priority:"Haute",deadline:"2025-06-30",progress:40,pilot:"Louis-Henri",site:"Centre Bourgogne",description:"Préparation dossier inspection réglementaire",createdAt:"2025-01-15",notes:""},
  {id:2,name:"Migration RayStation",status:"En cours",priority:"Haute",deadline:"2025-09-01",progress:25,pilot:"Romain Léry",site:"Centre Galilée",description:"Migration depuis Pinnacle vers RayStation",createdAt:"2025-02-01",notes:""},
  {id:3,name:"Gating respiratoire",status:"En attente",priority:"Moyenne",deadline:"2025-12-01",progress:10,pilot:"Vincent",site:"Centre Galilée",description:"Protocole gating poumon TrueBeam",createdAt:"2025-03-10",notes:""},
  {id:4,name:"SBRT / Dosimétrie",status:"En cours",priority:"Moyenne",deadline:"2025-10-15",progress:60,pilot:"Kasia",site:"Centre Bourgogne",description:"Protocoles dosimétrie stéréotaxie",createdAt:"2025-01-20",notes:""},
];
const IT=[
  {id:1,projectId:1,name:"Analyse lettres inspection",status:"Terminé",pilot:"Louis-Henri",site:"Centre Bourgogne",deadline:"2025-04-15",createdAt:"2025-01-15",notes:"",priority:"Haute"},
  {id:2,projectId:1,name:"Mise à jour POPM",status:"En cours",pilot:"Fabienne",site:"Centre Bourgogne",deadline:"2025-05-20",createdAt:"2025-01-20",notes:"",priority:"Moyenne"},
  {id:3,projectId:1,name:"Désignation CRP",status:"En attente",pilot:"Largillet Romain",site:"Centre Bourgogne",deadline:"2025-06-01",createdAt:"2025-02-05",notes:"",priority:"Moyenne"},
  {id:4,projectId:2,name:"Modélisation faisceaux TrueBeam",status:"En cours",pilot:"Romain Léry",site:"Centre Galilée",deadline:"2025-07-01",createdAt:"2025-02-01",notes:"",priority:"Haute"},
  {id:5,projectId:2,name:"Formation équipe RayStation",status:"En attente",pilot:"Loïc",site:"Centre Galilée",deadline:"2025-08-01",createdAt:"2025-02-15",notes:"",priority:"Basse"},
  {id:6,projectId:4,name:"Rédaction protocole ICRU 91",status:"En cours",pilot:"Kasia",site:"Centre Bourgogne",deadline:"2025-09-30",createdAt:"2025-01-20",notes:"",priority:"Moyenne"},
];

const ss={
  inp:{width:"100%",padding:"6px 9px",fontSize:12,border:"1px solid #ccc",borderRadius:6,background:"#fff",color:"#111",boxSizing:"border-box"},
  lbl:{fontSize:11,color:"#555",display:"block",marginBottom:3},
  btnP:{padding:"6px 13px",fontSize:12,background:"#1a6bbf",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600},
  btnS:{padding:"5px 11px",fontSize:12,background:"#f0f0f0",color:"#333",border:"1px solid #ccc",borderRadius:6,cursor:"pointer"},
  btnD:{padding:"5px 9px",fontSize:12,background:"#fce8e8",color:"#a32d2d",border:"none",borderRadius:6,cursor:"pointer"},
  sel:{padding:"5px 8px",fontSize:12,border:"1px solid #ccc",borderRadius:6,background:"#fff",color:"#111"},
};

function Badge({label,c}){return <span style={{background:c.bg,color:c.tx,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:5,whiteSpace:"nowrap"}}>{label}</span>;}
function PBar({v}){return(<div style={{background:"#e8e8e8",borderRadius:4,height:7,flex:1,overflow:"hidden"}}><div style={{width:v+"%",height:"100%",background:pgCol(v),borderRadius:4}}/></div>);}

function Modal({title,onClose,wide,children}){
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#ffffff",borderRadius:12,border:"1px solid #ccc",padding:20,width:"100%",maxWidth:wide?920:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontWeight:700,fontSize:14,color:"#111"}}>{title}</span>
          <button onClick={onClose} style={{background:"#eee",border:"none",cursor:"pointer",fontSize:14,borderRadius:5,padding:"2px 9px",color:"#444"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PilotsForm({pilots,onChange,onClose}){
  const [list,setList]=useState([...pilots]);
  const [newName,setNewName]=useState("");
  function add(){const n=newName.trim();if(!n||list.includes(n))return;setList(l=>[...l,n]);setNewName("");}
  function remove(i){setList(l=>l.filter((_,idx)=>idx!==i));}
  function moveUp(i){if(i===0)return;const l=[...list];[l[i-1],l[i]]=[l[i],l[i-1]];setList(l);}
  function moveDown(i){if(i===list.length-1)return;const l=[...list];[l[i],l[i+1]]=[l[i+1],l[i]];setList(l);}
  return(
    <div>
      <div style={{marginBottom:12}}>
        {list.map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:i%2===0?"#f9f9f9":"#fff",borderRadius:6,marginBottom:4}}>
            <span style={{flex:1,fontSize:13,color:"#111"}}>{p}</span>
            <button onClick={()=>moveUp(i)} style={{...ss.btnS,padding:"2px 7px",fontSize:11}}>↑</button>
            <button onClick={()=>moveDown(i)} style={{...ss.btnS,padding:"2px 7px",fontSize:11}}>↓</button>
            <button onClick={()=>remove(i)} style={{...ss.btnD,padding:"2px 7px",fontSize:11}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <input style={{...ss.inp,flex:1}} value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Nouveau pilote"/>
        <button style={ss.btnP} onClick={add}>+ Ajouter</button>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={ss.btnP} onClick={()=>{onChange(list);onClose();}}>Enregistrer</button>
        <button style={ss.btnS} onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

function ProjForm({data,pilots,onSave,onClose}){
  const [f,setF]=useState({...data});
  const set=k=>e=>setF(x=>({...x,[k]:e.target.value}));
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Nom *</label><input style={ss.inp} value={f.name} onChange={set("name")} placeholder="Nom du projet"/></div>
      <div><label style={ss.lbl}>Statut</label><select style={ss.inp} value={f.status} onChange={set("status")}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Priorité</label><select style={ss.inp} value={f.priority} onChange={set("priority")}>{PRIORITIES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Pilote</label><select style={ss.inp} value={f.pilot} onChange={set("pilot")}>{pilots.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Site</label><select style={ss.inp} value={f.site||SITES[0]} onChange={set("site")}>{SITES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Avancement : {f.progress}%</label><input type="range" min={0} max={100} step={5} value={f.progress} onChange={e=>setF(x=>({...x,progress:Number(e.target.value)}))} style={{width:"100%"}}/></div>
      <div><label style={ss.lbl}>Pondération temps : {f.weight??0}%</label><input type="range" min={0} max={100} step={5} value={f.weight??0} onChange={e=>setF(x=>({...x,weight:Number(e.target.value)}))} style={{width:"100%"}}/></div>
      <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:18}}><span style={{fontSize:11,color:"#888"}}>0 = pas de temps · 100 = temps plein</span></div>
      <div><label style={ss.lbl}>Échéance</label><input type="date" style={ss.inp} value={f.deadline} onChange={set("deadline")}/></div>
      <div><label style={ss.lbl}>Date d'ajout</label><input type="date" style={ss.inp} value={f.createdAt} onChange={set("createdAt")}/></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Description</label><input style={ss.inp} value={f.description||""} onChange={set("description")} placeholder="Courte description"/></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Notes</label><textarea style={{...ss.inp,height:72,resize:"vertical",fontFamily:"Arial,sans-serif"}} value={f.notes||""} onChange={set("notes")} placeholder="Remarques, points de vigilance..."/></div>
      <div style={{gridColumn:"1/-1",display:"flex",gap:8,marginTop:4}}>
        <button style={ss.btnP} onClick={()=>f.name.trim()&&onSave(f)}>Enregistrer</button>
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
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Nom *</label><input style={ss.inp} value={f.name} onChange={set("name")} placeholder="Nom de la tâche"/></div>
      <div><label style={ss.lbl}>Projet</label><select style={ss.inp} value={f.projectId} onChange={e=>setF(x=>({...x,projectId:Number(e.target.value)}))}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div><label style={ss.lbl}>Statut</label><select style={ss.inp} value={f.status} onChange={set("status")}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Priorité</label><select style={ss.inp} value={f.priority||"Moyenne"} onChange={set("priority")}>{PRIORITIES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Pilote</label><select style={ss.inp} value={f.pilot} onChange={set("pilot")}>{pilots.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={ss.lbl}>Site</label><select style={ss.inp} value={f.site||SITES[0]} onChange={set("site")}>{SITES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Pondération temps : {f.weight??0}%</label><input type="range" min={0} max={100} step={5} value={f.weight??0} onChange={e=>setF(x=>({...x,weight:Number(e.target.value)}))} style={{width:"100%"}}/></div>
      <div><label style={ss.lbl}>Échéance</label><input type="date" style={ss.inp} value={f.deadline} onChange={set("deadline")}/></div>
      <div><label style={ss.lbl}>Date d'ajout</label><input type="date" style={ss.inp} value={f.createdAt} onChange={set("createdAt")}/></div>
      <div style={{gridColumn:"1/-1"}}><label style={ss.lbl}>Notes</label><textarea style={{...ss.inp,height:72,resize:"vertical",fontFamily:"Arial,sans-serif"}} value={f.notes||""} onChange={set("notes")} placeholder="Remarques, blocages..."/></div>
      <div style={{gridColumn:"1/-1",display:"flex",gap:8,marginTop:4}}>
        <button style={ss.btnP} onClick={()=>f.name.trim()&&onSave(f)}>Enregistrer</button>
        <button style={ss.btnS} onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

function WorkloadTable({projects,tasks,pilots}){
  const rows=pilots.map(pilot=>{
    const pW=projects.filter(p=>p.pilot===pilot&&p.status!=="Terminé").reduce((s,p)=>s+(p.weight||0),0);
    const tW=tasks.filter(t=>t.pilot===pilot&&t.status!=="Terminé").reduce((s,t)=>s+(t.weight||0),0);
    const total=pW+tW;
    const color=total>100?"#a32d2d":total>80?"#BA7517":"#27500A";
    const bgColor=total>100?"#FCEBEB":total>80?"#FAEEDA":"#EAF3DE";
    return{pilot,pW,tW,total,color,bgColor};
  });
  return(
    <div style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"14px",marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:13,color:"#111",marginBottom:10}}>
        Charge du jour — {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead>
          <tr style={{background:"#f4f4f4"}}>
            <th style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:"#555",borderRadius:"6px 0 0 0"}}>Pilote</th>
            <th style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#555"}}>Projets (%)</th>
            <th style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#555"}}>Tâches (%)</th>
            <th style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#555"}}>Total (%)</th>
            <th style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:"#555",borderRadius:"0 6px 0 0"}}>Charge</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={r.pilot} style={{borderBottom:"1px solid #f0f0f0",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"7px 10px",fontWeight:600,color:"#111"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{background:"#1a6bbf",color:"#fff",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{r.pilot[0]}</span>
                  {r.pilot}
                </div>
              </td>
              <td style={{padding:"7px 10px",textAlign:"center",color:"#555"}}>{r.pW}%</td>
              <td style={{padding:"7px 10px",textAlign:"center",color:"#555"}}>{r.tW}%</td>
              <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:r.color}}>{r.total}%</td>
              <td style={{padding:"7px 10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,background:"#e8e8e8",borderRadius:4,height:8,overflow:"hidden"}}>
                    <div style={{width:Math.min(r.total,100)+"%",height:"100%",background:r.color,borderRadius:4}}/>
                  </div>
                  <span style={{background:r.bgColor,color:r.color,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,whiteSpace:"nowrap"}}>
                    {r.total>100?"Surchargé":r.total>80?"Chargé":r.total>0?"OK":"Libre"}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GanttView({projects}){
  const active=projects.filter(p=>p.status!=="Terminé"&&p.createdAt&&p.deadline);
  if(!active.length)return <p style={{color:"#888",fontSize:13}}>Aucun projet actif avec dates définies.</p>;
  const dates=active.flatMap(p=>[new Date(p.createdAt),new Date(p.deadline)]);
  const minD=new Date(Math.min(...dates));minD.setDate(1);
  const maxD=new Date(Math.max(...dates));maxD.setMonth(maxD.getMonth()+1,1);
  const total=(maxD-minD)/86400000;
  const W=740,LBL=160,PAD=10,BH=16,ROW=30,cW=W-LBL-PAD,H=PAD+24+active.length*ROW+16;
  function tx(ds){return LBL+Math.max(0,Math.min(cW,((new Date(ds)-minD)/86400000/total*cW)));}
  const months=[];const mc=new Date(minD);
  while(mc<maxD){months.push(new Date(mc));mc.setMonth(mc.getMonth()+1);}
  const todayX=tx(TODAY);
  return(
    <div style={{overflowX:"auto"}}>
      <svg width={W} height={H} style={{fontFamily:"Arial,sans-serif",display:"block"}}>
        <rect width={W} height={H} fill="#fafafa" rx="6"/>
        {months.map((m,i)=>{const x=tx(m.toISOString().split("T")[0]);return<g key={i}><line x1={x} y1={PAD+18} x2={x} y2={H-8} stroke="#ddd" strokeWidth="1"/><text x={x+2} y={PAD+16} fontSize="9" fill="#aaa">{m.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"})}</text></g>;})}
        {active.map((p,i)=>{
          const x1=tx(p.createdAt),x2=Math.max(tx(p.deadline),x1+6),y=PAD+22+i*ROW,col=GCOLS[i%GCOLS.length],pw=(x2-x1)*p.progress/100,sn=p.name.length>26?p.name.slice(0,24)+"...":p.name;
          return(<g key={p.id}>
            <text x={LBL-4} y={y+BH/2+4} fontSize="10" fill="#222" textAnchor="end">{sn}</text>
            <rect x={x1} y={y} width={x2-x1} height={BH} rx="3" fill={col+"30"} stroke={col} strokeWidth="1.2"/>
            {pw>0&&<rect x={x1} y={y} width={pw} height={BH} rx="3" fill={col}/>}
            {pw>8&&<text x={x1+pw/2} y={y+BH/2+4} fontSize="9" fill="#fff" fontWeight="bold" textAnchor="middle">{p.progress}%</text>}
          </g>);
        })}
        <line x1={todayX} y1={PAD+18} x2={todayX} y2={H-8} stroke="#e24b4a" strokeWidth="2"/>
        <text x={todayX+2} y={H-2} fontSize="8" fill="#e24b4a" fontWeight="bold">Aujourd'hui</text>
      </svg>
    </div>
  );
}

function PilotCard({pilot,projects,tasks,dateFrom,dateTo}){
  function inRange(item){
    const d=parseD(item.deadline||item.createdAt);
    if(!d)return true;
    const from=dateFrom?new Date(dateFrom):null;
    const to=dateTo?new Date(dateTo):null;
    if(from&&d<from)return false;
    if(to&&d>to)return false;
    return true;
  }
  const pActive=projects.filter(p=>p.pilot===pilot&&p.status!=="Terminé");
  const pDone=projects.filter(p=>p.pilot===pilot&&p.status==="Terminé"&&inRange(p));
  const tActive=tasks.filter(t=>t.pilot===pilot&&t.status!=="Terminé");
  const tDone=tasks.filter(t=>t.pilot===pilot&&t.status==="Terminé"&&inRange(t));
  return(
    <div style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
      <div style={{fontWeight:700,fontSize:14,color:"#111",marginBottom:10,paddingBottom:6,borderBottom:"2px solid #1a6bbf",display:"flex",alignItems:"center",gap:8}}>
        <span style={{background:"#1a6bbf",color:"#fff",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{pilot[0]}</span>
        {pilot}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        <div style={{background:"#f0f6ff",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
          <div style={{fontSize:10,color:"#555",marginBottom:2}}>Projets en cours</div>
          <div style={{fontSize:20,fontWeight:700,color:"#1a6bbf"}}>{pActive.length}</div>
        </div>
        <div style={{background:"#eaf3de",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
          <div style={{fontSize:10,color:"#555",marginBottom:2}}>Projets terminés{dateFrom?" (période)":""}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#27500A"}}>{pDone.length}</div>
        </div>
        <div style={{background:"#f0f6ff",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
          <div style={{fontSize:10,color:"#555",marginBottom:2}}>Tâches en cours</div>
          <div style={{fontSize:20,fontWeight:700,color:"#1a6bbf"}}>{tActive.length}</div>
        </div>
        <div style={{background:"#eaf3de",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
          <div style={{fontSize:10,color:"#555",marginBottom:2}}>Tâches terminées{dateFrom?" (période)":""}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#27500A"}}>{tDone.length}</div>
        </div>
      </div>
      {pActive.length>0&&(
        <div style={{marginBottom:10}}>
          <div style={{fontWeight:600,fontSize:11,color:"#1a6bbf",marginBottom:4}}>Projets en cours :</div>
          {pActive.map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",background:"#f7f9ff",borderRadius:5,marginBottom:3,fontSize:11}}>
              <span style={{fontWeight:500,color:"#222"}}>{p.name}</span>
              <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                <span style={{background:PC[p.priority]?.bg||"#eee",color:PC[p.priority]?.tx||"#333",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3}}>{p.priority}</span>
                <span style={{fontSize:10,color:isOD(p.deadline,p.status)?"#a32d2d":"#888"}}>{fd(p.deadline)}</span>
                <span style={{background:"#e8e8e8",fontSize:9,padding:"1px 5px",borderRadius:3,color:"#555"}}>{p.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pDone.length>0&&(
        <div style={{marginBottom:6}}>
          <div style={{fontWeight:600,fontSize:11,color:"#27500A",marginBottom:4}}>Projets terminés{dateFrom?" (période)":""} :</div>
          {pDone.map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"3px 8px",background:"#f3fbee",borderRadius:5,marginBottom:3,fontSize:11}}>
              <span style={{color:"#333"}}>{p.name}</span>
              <span style={{fontSize:10,color:"#666"}}>{fd(p.deadline)}</span>
            </div>
          ))}
        </div>
      )}
      {tDone.length>0&&(
        <div>
          <div style={{fontWeight:600,fontSize:11,color:"#27500A",marginBottom:4}}>Tâches terminées{dateFrom?" (période)":""} :</div>
          {tDone.map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"3px 8px",background:"#f3fbee",borderRadius:5,marginBottom:3,fontSize:11}}>
              <span style={{color:"#333"}}>{t.name}</span>
              <span style={{fontSize:10,color:"#666"}}>{fd(t.deadline)}</span>
            </div>
          ))}
        </div>
      )}
      {pActive.length===0&&tActive.length===0&&pDone.length===0&&tDone.length===0&&(
        <p style={{fontSize:11,color:"#aaa",margin:0}}>Aucune activité sur cette période.</p>
      )}
    </div>
  );
}

function StatsView({projects,tasks,pilots}){
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState(TODAY);
  const [selPilot,setSelPilot]=useState("");

  function buildStatsPDF(){
    const now=new Date();
    const dateLabel=now.toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
    const d2=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
    d2.setUTCDate(d2.getUTCDate()+4-(d2.getUTCDay()||7));
    const wn=Math.ceil((((d2-new Date(Date.UTC(d2.getUTCFullYear(),0,1)))/86400000)+1)/7);
    function inRange(item){
      const d=parseD(item.deadline||item.createdAt);
      if(!d)return true;
      const from=dateFrom?new Date(dateFrom):null;
      const to=dateTo?new Date(dateTo):null;
      if(from&&d<from)return false;
      if(to&&d>to)return false;
      return true;
    }
    const pilotList=selPilot?[selPilot]:pilots;
    const periode=dateFrom?"Du "+fd(dateFrom)+" au "+fd(dateTo):"Toutes périodes";
    const rows=pilotList.map(pilot=>{
      const pActive=projects.filter(p=>p.pilot===pilot&&p.status!=="Terminé");
      const pDone=projects.filter(p=>p.pilot===pilot&&p.status==="Terminé"&&inRange(p));
      const tActive=tasks.filter(t=>t.pilot===pilot&&t.status!=="Terminé");
      const tDone=tasks.filter(t=>t.pilot===pilot&&t.status==="Terminé"&&inRange(t));
      const pActiveRows=pActive.map(p=>'<tr style="border-bottom:1px solid #eee"><td style="padding:4px 8px">'+p.name+'</td><td style="padding:4px 8px">'+p.priority+'</td><td style="padding:4px 8px">'+(p.site||"-")+'</td><td style="padding:4px 8px'+(isOD(p.deadline,p.status)?";color:#a32d2d;font-weight:700":"")+'">'+(isOD(p.deadline,p.status)?"(!!) ":"")+fd(p.deadline)+'</td><td style="padding:4px 8px">'+p.progress+'%</td></tr>').join("");
      const tActiveRows=tActive.map(t=>{const prj=projects.find(p=>p.id===t.projectId);return'<tr style="border-bottom:1px solid #eee"><td style="padding:4px 8px">'+t.name+'</td><td style="padding:4px 8px">'+(prj?prj.name:"-")+'</td><td style="padding:4px 8px">'+(t.site||"-")+'</td><td style="padding:4px 8px'+(isOD(t.deadline,t.status)?";color:#a32d2d;font-weight:700":"")+'">'+(isOD(t.deadline,t.status)?"(!!) ":"")+fd(t.deadline)+'</td><td style="padding:4px 8px">'+t.status+'</td></tr>';}).join("");
      const pDoneRows=pDone.map(p=>'<tr style="border-bottom:1px solid #eee"><td style="padding:4px 8px">'+p.name+'</td><td style="padding:4px 8px">'+(p.site||"-")+'</td><td style="padding:4px 8px">'+fd(p.deadline)+'</td></tr>').join("");
      const tDoneRows=tDone.map(t=>'<tr style="border-bottom:1px solid #eee"><td style="padding:4px 8px">'+t.name+'</td><td style="padding:4px 8px">'+(t.site||"-")+'</td><td style="padding:4px 8px">'+fd(t.deadline)+'</td></tr>').join("");
      return'<div style="margin-bottom:20px;border:1px solid #d0d0d0;border-radius:8px;overflow:hidden;page-break-inside:avoid">'
        +'<div style="background:#1a6bbf;padding:9px 14px"><span style="font-weight:700;font-size:14px;color:#fff">'+pilot+'</span></div>'
        +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid #ddd">'
        +'<div style="padding:8px 10px;text-align:center;border-right:1px solid #ddd"><div style="font-size:9px;color:#555">Projets en cours</div><div style="font-size:18px;font-weight:700;color:#1a6bbf">'+pActive.length+'</div></div>'
        +'<div style="padding:8px 10px;text-align:center;border-right:1px solid #ddd"><div style="font-size:9px;color:#555">Projets terminés</div><div style="font-size:18px;font-weight:700;color:#27500A">'+pDone.length+'</div></div>'
        +'<div style="padding:8px 10px;text-align:center;border-right:1px solid #ddd"><div style="font-size:9px;color:#555">Tâches en cours</div><div style="font-size:18px;font-weight:700;color:#1a6bbf">'+tActive.length+'</div></div>'
        +'<div style="padding:8px 10px;text-align:center"><div style="font-size:9px;color:#555">Tâches terminées</div><div style="font-size:18px;font-weight:700;color:#27500A">'+tDone.length+'</div></div>'
        +'</div>'
        +(pActive.length>0?'<div style="padding:8px 12px;border-bottom:1px solid #eee"><div style="font-weight:700;font-size:11px;color:#1a6bbf;margin-bottom:4px">Projets en cours</div><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f0f4ff"><th style="padding:4px 8px;text-align:left">Projet</th><th style="padding:4px 8px;text-align:left">Priorité</th><th style="padding:4px 8px;text-align:left">Site</th><th style="padding:4px 8px;text-align:left">Echeance</th><th style="padding:4px 8px;text-align:left">Avanc.</th></tr></thead><tbody>'+pActiveRows+'</tbody></table></div>':"")
        +(tActive.length>0?'<div style="padding:8px 12px;border-bottom:1px solid #eee"><div style="font-weight:700;font-size:11px;color:#1a6bbf;margin-bottom:4px">Tâches en cours</div><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f0f4ff"><th style="padding:4px 8px;text-align:left">Tâche</th><th style="padding:4px 8px;text-align:left">Projet</th><th style="padding:4px 8px;text-align:left">Site</th><th style="padding:4px 8px;text-align:left">Echeance</th><th style="padding:4px 8px;text-align:left">Statut</th></tr></thead><tbody>'+tActiveRows+'</tbody></table></div>':"")
        +(pDone.length>0?'<div style="padding:8px 12px;border-bottom:1px solid #eee"><div style="font-weight:700;font-size:11px;color:#27500A;margin-bottom:4px">Projets terminés</div><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f3fbee"><th style="padding:4px 8px;text-align:left">Projet</th><th style="padding:4px 8px;text-align:left">Site</th><th style="padding:4px 8px;text-align:left">Echeance</th></tr></thead><tbody>'+pDoneRows+'</tbody></table></div>':"")
        +(tDone.length>0?'<div style="padding:8px 12px"><div style="font-weight:700;font-size:11px;color:#27500A;margin-bottom:4px">Tâches terminées</div><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f3fbee"><th style="padding:4px 8px;text-align:left">Tâche</th><th style="padding:4px 8px;text-align:left">Site</th><th style="padding:4px 8px;text-align:left">Echeance</th></tr></thead><tbody>'+tDoneRows+'</tbody></table></div>':"")
        +(pActive.length===0&&tActive.length===0&&pDone.length===0&&tDone.length===0?'<p style="padding:8px 12px;font-size:11px;color:#aaa;margin:0">Aucune activite sur cette periode.</p>':"")
        +'</div>';
    }).join("");
    const html='<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bilan pilotes Semaine '+wn+'</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#222;padding:22px 26px;margin:0}@media print{body{padding:0;margin:0}}</style></head><body>'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">'
      +'<div><div style="font-size:16px;font-weight:700">Bilan pilotes — Physique Medicale</div>'
      +'<div style="font-size:10px;color:#666;margin-top:2px">Sites Galilee &amp; Bourgogne | Semaine '+wn+' | '+dateLabel+'</div>'
      +'<div style="font-size:10px;color:#888;margin-top:1px">Periode : '+periode+'</div></div></div>'
      +rows
      +'<p style="margin-top:18px;font-size:9px;color:#bbb;text-align:center">Genere le '+dateLabel+' - Confidentiel interne</p></body></html>';
    return html;
  }

  const [statsPDF,setStatsPDF]=useState(false);
  const pilotList=selPilot?[selPilot]:pilots;

  return(
    <div>
      {statsPDF&&<ReportModal html={buildStatsPDF()} onClose={()=>setStatsPDF(false)}/>}
      <div style={{background:"#f8f8f8",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div style={{fontWeight:700,fontSize:13,color:"#111"}}>Filtres</div>
          <button style={ss.btnP} onClick={()=>setStatsPDF(true)}>Bilan PDF pilotes</button>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div><label style={ss.lbl}>Du</label><input type="date" style={{...ss.inp,width:150}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
          <div><label style={ss.lbl}>Au</label><input type="date" style={{...ss.inp,width:150}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>
          <div><label style={ss.lbl}>Pilote</label>
            <select style={ss.sel} value={selPilot} onChange={e=>setSelPilot(e.target.value)}>
              <option value="">Tous les pilotes</option>
              {pilots.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <button style={ss.btnS} onClick={()=>{setDateFrom("");setDateTo(TODAY);setSelPilot("");}}>Réinitialiser</button>
        </div>
      </div>

      <WorkloadTable projects={projects} tasks={tasks} pilots={pilotList}/>

      <div>
        {pilotList.map(pilot=>(
          <PilotCard key={pilot} pilot={pilot} projects={projects} tasks={tasks} dateFrom={dateFrom} dateTo={dateTo}/>
        ))}
      </div>
    </div>
  );
}

function ReportModal({html,onClose}){
  const [showPrint,setShowPrint]=useState(false);
  if(showPrint){
    return(
      <div style={{position:"fixed",inset:0,zIndex:999,background:"#fff",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:"#1a6bbf",flexShrink:0}}>
          <span style={{fontWeight:700,fontSize:14,color:"#fff"}}>Rapport — prêt à imprimer</span>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,color:"#cce0ff"}}>Ctrl+P puis "Enregistrer en PDF"</span>
            <button onClick={()=>setShowPrint(false)} style={{padding:"5px 12px",fontSize:12,background:"#fff",color:"#1a6bbf",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>← Retour</button>
            <button onClick={onClose} style={{padding:"5px 12px",fontSize:12,background:"#e74c3c",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>✕ Fermer</button>
          </div>
        </div>
        <iframe srcDoc={html} style={{flex:1,border:"none",width:"100%"}} title="Rapport"/>
      </div>
    );
  }
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #ccc",width:"100%",maxWidth:900,height:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #eee",flexShrink:0,background:"#f8f8f8",borderRadius:"12px 12px 0 0"}}>
          <span style={{fontWeight:700,fontSize:14,color:"#111"}}>Aperçu du bilan</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowPrint(true)} style={{padding:"6px 14px",fontSize:12,background:"#1a6bbf",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>🖨 Imprimer / PDF</button>
            <button onClick={onClose} style={{background:"#eee",border:"none",cursor:"pointer",fontSize:14,borderRadius:5,padding:"3px 10px",color:"#444"}}>✕</button>
          </div>
        </div>
        <div style={{background:"#FFF8DC",borderBottom:"1px solid #f0e68c",padding:"7px 16px",fontSize:11,color:"#7a6000",flexShrink:0}}>
          Clique sur <strong>"Imprimer / PDF"</strong> puis Ctrl+P pour enregistrer en PDF ou imprimer.
        </div>
        <iframe srcDoc={html} style={{flex:1,border:"none",borderRadius:"0 0 12px 12px",width:"100%"}} title="Aperçu"/>
      </div>
    </div>
  );
}

const PRIOR_ORDER={"Haute":0,"Moyenne":1,"Basse":2};
const STATUS_ORDER={"En cours":0,"Bloqué":1,"En attente":2,"Terminé":3};

function applySort(items,sortKey,sortDir){
  if(!sortKey)return items;
  return [...items].sort((a,b)=>{
    let va,vb;
    if(sortKey==="priority"){va=PRIOR_ORDER[a.priority]??9;vb=PRIOR_ORDER[b.priority]??9;}
    else if(sortKey==="deadline"){va=a.deadline||"9999";vb=b.deadline||"9999";}
    else if(sortKey==="progress"){va=a.progress??0;vb=b.progress??0;}
    else if(sortKey==="status"){va=STATUS_ORDER[a.status]??9;vb=STATUS_ORDER[b.status]??9;}
    else return 0;
    if(va<vb)return sortDir==="asc"?-1:1;
    if(va>vb)return sortDir==="asc"?1:-1;
    return 0;
  });
}

export default function App(){
  const [projects,setProjects]=useState(()=>load("pm8_p",IP));
  const [tasks,setTasks]=useState(()=>load("pm8_t",IT));
  const [pilots,setPilots]=useState(()=>load("pm8_pilots",DEFAULT_PILOTS));
  const [view,setView]=useState("projects");
  const [fSt,setFSt]=useState("");
  const [fPil,setFPil]=useState("");
  const [fSite,setFSite]=useState("");
  const [fTPrj,setFTPrj]=useState("");
  const [fTSt,setFTSt]=useState("");
  const [fTSite,setFTSite]=useState("");
  const [sortKey,setSortKey]=useState("");
  const [sortDir,setSortDir]=useState("asc");
  const [pModal,setPModal]=useState(null);
  const [tModal,setTModal]=useState(null);
  const [gantt,setGantt]=useState(false);
  const [pilotsModal,setPilotsModal]=useState(false);
  const [reportModal,setReportModal]=useState(false);

  useEffect(()=>{save("pm8_p",projects);},[projects]);
  useEffect(()=>{save("pm8_t",tasks);},[tasks]);
  useEffect(()=>{save("pm8_pilots",pilots);},[pilots]);

  const EP={name:"",status:"En cours",priority:"Moyenne",deadline:"",progress:0,pilot:pilots[0]||"",site:SITES[0],description:"",createdAt:TODAY,notes:""};
  const ET={projectId:projects[0]?.id||1,name:"",status:"En attente",priority:"Moyenne",pilot:pilots[0]||"",site:SITES[0],deadline:"",createdAt:TODAY,notes:""};

  function saveP(f){if(pModal.mode==="edit")setProjects(ps=>ps.map(p=>p.id===f.id?f:p));else setProjects(ps=>[...ps,{...f,id:Date.now()}]);setPModal(null);}
  function saveT(f){const nf={...f,projectId:Number(f.projectId)};if(tModal.mode==="edit")setTasks(ts=>ts.map(t=>t.id===nf.id?nf:t));else setTasks(ts=>[...ts,{...nf,id:Date.now()}]);setTModal(null);}
  function delP(id){if(!window.confirm("Supprimer ce projet et ses tâches ?"))return;setProjects(ps=>ps.filter(p=>p.id!==id));setTasks(ts=>ts.filter(t=>t.projectId!==id));}
  function delT(id){setTasks(ts=>ts.filter(t=>t.id!==id));}
  function toggleSort(k){if(sortKey===k){setSortDir(d=>d==="asc"?"desc":"asc");}else{setSortKey(k);setSortDir("asc");}}
  function sortIcon(k){if(sortKey!==k)return"↕";return sortDir==="asc"?"↑":"↓";}

  const fp=applySort(projects.filter(p=>(!fSt||p.status===fSt)&&(!fPil||p.pilot===fPil)&&(!fSite||p.site===fSite)),sortKey,sortDir);
  const ft=applySort(tasks.filter(t=>(!fTPrj||t.projectId===Number(fTPrj))&&(!fTSt||t.status===fTSt)&&(!fPil||t.pilot===fPil)&&(!fTSite||t.site===fTSite)),sortKey,sortDir);

  const activeN=projects.filter(p=>p.status!=="Terminé").length;
  const odN=tasks.filter(t=>isOD(t.deadline,t.status)).length;
  const doneN=tasks.filter(t=>t.status==="Terminé").length;
  const avgN=projects.length?Math.round(projects.reduce((s,p)=>s+p.progress,0)/projects.length):0;

  function buildReport(){
    const now=new Date();
    const dateLabel=now.toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
    const d2=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
    d2.setUTCDate(d2.getUTCDate()+4-(d2.getUTCDay()||7));
    const wn=Math.ceil((((d2-new Date(Date.UTC(d2.getUTCFullYear(),0,1)))/86400000)+1)/7);
    const sb=s=>{const c=SC[s]||{bg:"#eee",tx:"#333"};return'<span style="background:'+c.bg+';color:'+c.tx+';font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px">'+s+'</span>';};
    const pb2=s=>{const c=PC[s]||{bg:"#eee",tx:"#333"};return'<span style="background:'+c.bg+';color:'+c.tx+';font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px">'+s+'</span>';};
    const bar=v=>{const col=pgCol(v);return'<div style="background:#e8e8e8;border-radius:3px;height:7px;margin:5px 0 2px"><div style="width:'+v+'%;height:100%;background:'+col+';border-radius:3px"></div></div>';};
    const actP=projects.filter(p=>p.status!=="Terminé"&&p.createdAt&&p.deadline);
    let ganttSVG="";
    if(actP.length){
      const dts=actP.flatMap(p=>[new Date(p.createdAt),new Date(p.deadline)]);
      const mD=new Date(Math.min(...dts));mD.setDate(1);
      const xD=new Date(Math.max(...dts));xD.setMonth(xD.getMonth()+1,1);
      const tot=(xD-mD)/86400000,W=660,LBL=145,BH=15,ROW=26,PAD=8,cW=W-LBL-8,H=PAD+20+actP.length*ROW+14;
      function gx(ds){return LBL+Math.max(0,Math.min(cW,((new Date(ds)-mD)/86400000/tot*cW)));}
      const mths=[];const mc=new Date(mD);while(mc<xD){mths.push(new Date(mc));mc.setMonth(mc.getMonth()+1);}
      const mL=mths.map(m=>{const x=gx(m.toISOString().split("T")[0]);return'<line x1="'+x+'" y1="'+(PAD+16)+'" x2="'+x+'" y2="'+(H-6)+'" stroke="#ddd" stroke-width="1"/><text x="'+(x+2)+'" y="'+(PAD+14)+'" font-size="9" fill="#aaa">'+m.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"})+'</text>';}).join("");
      const tdX=gx(TODAY);
      const bars=actP.map((p,i)=>{const x1=gx(p.createdAt),x2=Math.max(gx(p.deadline),x1+5),gy=PAD+20+i*ROW,col=GCOLS[i%GCOLS.length],pw=(x2-x1)*p.progress/100,sn=p.name.length>24?p.name.slice(0,22)+"...":p.name;return'<text x="'+(LBL-3)+'" y="'+(gy+BH/2+3)+'" font-size="9.5" fill="#222" text-anchor="end">'+sn+'</text><rect x="'+x1+'" y="'+gy+'" width="'+(x2-x1)+'" height="'+BH+'" rx="3" fill="'+col+'25" stroke="'+col+'" stroke-width="1.2"/>'+(pw>0?'<rect x="'+x1+'" y="'+gy+'" width="'+pw+'" height="'+BH+'" rx="3" fill="'+col+'"/>':"")+(pw>8?'<text x="'+(x1+pw/2)+'" y="'+(gy+BH/2+3.5)+'" font-size="8.5" fill="#fff" font-weight="bold" text-anchor="middle">'+p.progress+'%</text>':"");}).join("");
      ganttSVG='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" style="font-family:Arial,sans-serif;display:block"><rect width="'+W+'" height="'+H+'" fill="#fafafa" rx="6"/>'+mL+bars+'<line x1="'+tdX+'" y1="'+(PAD+16)+'" x2="'+tdX+'" y2="'+(H-6)+'" stroke="#e24b4a" stroke-width="2"/><text x="'+(tdX+2)+'" y="'+(H-1)+'" font-size="8" fill="#e24b4a" font-weight="bold">Aujourd\'hui</text></svg>';
    }
    const odT=tasks.filter(t=>isOD(t.deadline,t.status));
    const odB=odT.length?'<div style="margin-bottom:16px;border:1px solid #f09595;border-radius:7px;overflow:hidden"><div style="background:#FCEBEB;padding:7px 12px;border-bottom:1px solid #f09595;font-weight:700;font-size:12px;color:#791F1F">Taches en retard ('+odT.length+')</div><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#fdf0f0"><th style="padding:4px 8px;text-align:left">Tache</th><th style="padding:4px 8px;text-align:left">Projet</th><th style="padding:4px 8px;text-align:left">Pilote</th><th style="padding:4px 8px;text-align:left">Site</th><th style="padding:4px 8px;text-align:left">Echeance</th></tr></thead><tbody>'+odT.map(t=>{const prj=projects.find(p=>p.id===t.projectId);return'<tr style="border-bottom:1px solid #f5c0c0"><td style="padding:4px 8px">'+t.name+'</td><td style="padding:4px 8px">'+(prj?prj.name:"-")+'</td><td style="padding:4px 8px">'+t.pilot+'</td><td style="padding:4px 8px">'+(t.site||"-")+'</td><td style="padding:4px 8px;color:#a32d2d;font-weight:700">'+fd(t.deadline)+'</td></tr>';}).join("")+'</tbody></table></div>':"";
    const rows=projects.map(p=>{
      const pt=tasks.filter(t=>t.projectId===p.id),odP=isOD(p.deadline,p.status);
      const tr=pt.length?'<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f0f0f0"><th style="padding:4px 8px;text-align:left">Tache</th><th style="padding:4px 8px;text-align:left">Statut</th><th style="padding:4px 8px;text-align:left">Pilote</th><th style="padding:4px 8px;text-align:left">Site</th><th style="padding:4px 8px;text-align:left">Echeance</th></tr></thead><tbody>'+pt.map(t=>{const tod=isOD(t.deadline,t.status);return'<tr style="border-bottom:1px solid #eee"><td style="padding:4px 8px">'+t.name+'</td><td style="padding:4px 8px">'+sb(t.status)+'</td><td style="padding:4px 8px">'+t.pilot+'</td><td style="padding:4px 8px">'+(t.site||"-")+'</td><td style="padding:4px 8px'+(tod?';color:#a32d2d;font-weight:700':'')+'">'+(tod?"(!!) ":"")+fd(t.deadline)+'</td></tr>';}).join("")+'</tbody></table>'
        :'<p style="padding:6px 12px;font-size:11px;color:#999;margin:0">Aucune tache.</p>';
      return'<div style="margin-bottom:13px;border:1px solid #d0d0d0;border-radius:7px;overflow:hidden;page-break-inside:avoid"><div style="background:#f8f8f8;padding:9px 12px;border-bottom:1px solid #d0d0d0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">'+sb(p.status)+" "+pb2(p.priority)+' <span style="font-weight:700;font-size:13px">'+p.name+'</span><span style="font-size:10px;background:#eee;padding:2px 7px;border-radius:4px">'+(p.site||"")+'</span></div>'+(p.description?'<div style="font-size:11px;color:#666;margin-bottom:3px">'+p.description+'</div>':'')+'<div style="font-size:11px;color:#666">Pilote: '+p.pilot+' | Echeance: <span style="'+(odP?"color:#a32d2d;font-weight:700":"")+'">'+(odP?"(!!) ":"")+fd(p.deadline)+'</span> | Avancement: '+p.progress+'%</div>'+bar(p.progress)+(p.notes?'<div style="margin-top:4px;font-size:11px;color:#555;background:#fffbee;border:1px solid #f0e68c;border-radius:4px;padding:4px 8px">Notes : '+p.notes+'</div>':'')+'</div>'+tr+'</div>';
    }).join("");
    return'<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bilan Semaine '+wn+'</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#222;padding:22px 26px;margin:0}h2{font-size:12px;font-weight:700;border-bottom:1px solid #ddd;padding-bottom:3px;margin:16px 0 9px}.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:16px}.kc{background:#f5f5f5;border-radius:6px;padding:8px 10px}.kl{font-size:10px;color:#666;margin:0 0 2px}.kv{font-size:19px;font-weight:700;margin:0}@media print{body{padding:0;margin:0}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px"><div><div style="font-size:16px;font-weight:700">Bilan hebdomadaire - Physique Medicale</div><div style="font-size:10px;color:#666;margin-top:2px">Sites Galilee &amp; Bourgogne | Semaine '+wn+' | '+dateLabel+'</div></div></div><div class="kg"><div class="kc"><p class="kl">Projets actifs</p><p class="kv">'+activeN+'</p></div><div class="kc"><p class="kl">Taches en retard</p><p class="kv" style="color:'+(odN>0?"#a32d2d":"#222")+'">'+odN+'</p></div><div class="kc"><p class="kl">Taches terminees</p><p class="kv">'+doneN+'</p></div><div class="kc"><p class="kl">Avancement moyen</p><p class="kv">'+avgN+'%</p></div></div>'+odB+(ganttSVG?'<h2>Gantt</h2><div style="margin-bottom:16px">'+ganttSVG+'</div>':"")+'<h2>Detail des projets</h2>'+rows+'<p style="margin-top:18px;font-size:9px;color:#bbb;text-align:center">Genere le '+dateLabel+' - Confidentiel interne</p></body></html>';
  }

  return(
    <div style={{padding:"1rem 0",fontFamily:"Arial,sans-serif",color:"#111"}}>
      {pModal&&<Modal title={pModal.mode==="edit"?"Modifier le projet":"Nouveau projet"} onClose={()=>setPModal(null)}><ProjForm data={pModal.data} pilots={pilots} onSave={saveP} onClose={()=>setPModal(null)}/></Modal>}
      {tModal&&<Modal title={tModal.mode==="edit"?"Modifier la tâche":"Nouvelle tâche"} onClose={()=>setTModal(null)}><TaskForm data={tModal.data} projects={projects} pilots={pilots} onSave={saveT} onClose={()=>setTModal(null)}/></Modal>}
      {gantt&&<Modal title="Diagramme de Gantt" onClose={()=>setGantt(false)} wide><GanttView projects={projects}/><div style={{textAlign:"right",marginTop:12}}><button style={ss.btnS} onClick={()=>setGantt(false)}>Fermer</button></div></Modal>}
      {pilotsModal&&<Modal title="Gérer les pilotes" onClose={()=>setPilotsModal(false)}><PilotsForm pilots={pilots} onChange={setPilots} onClose={()=>setPilotsModal(false)}/></Modal>}
      {reportModal&&<ReportModal html={buildReport()} onClose={()=>setReportModal(false)}/>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:700,color:"#111"}}>Suivi des projets — Physique Médicale</div>
          <div style={{fontSize:11,color:"#666",marginTop:2}}>Sites Galilée &amp; Bourgogne</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
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
          <select style={ss.sel} value={fSt} onChange={e=>setFSt(e.target.value)}>
            <option value="">Tous les statuts</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select style={ss.sel} value={fPil} onChange={e=>setFPil(e.target.value)}>
            <option value="">Tous les pilotes</option>{pilots.map(p=><option key={p}>{p}</option>)}
          </select>
          {view==="projects"&&<select style={ss.sel} value={fSite} onChange={e=>setFSite(e.target.value)}>
            <option value="">Tous les sites</option>{SITES.map(s=><option key={s}>{s}</option>)}
          </select>}
          {view==="tasks"&&<>
            <select style={ss.sel} value={fTPrj} onChange={e=>setFTPrj(e.target.value)}>
              <option value="">Tous les projets</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select style={ss.sel} value={fTSt} onChange={e=>setFTSt(e.target.value)}>
              <option value="">Tous les statuts</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <select style={ss.sel} value={fTSite} onChange={e=>setFTSite(e.target.value)}>
              <option value="">Tous les sites</option>{SITES.map(s=><option key={s}>{s}</option>)}
            </select>
          </>}
          <div style={{marginLeft:"auto"}}>
            {view==="projects"&&<button style={ss.btnP} onClick={()=>setPModal({mode:"add",data:{...EP}})}>+ Nouveau projet</button>}
            {view==="tasks"&&<button style={ss.btnP} onClick={()=>setTModal({mode:"add",data:{...ET}})}>+ Nouvelle tâche</button>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:11,color:"#666"}}>Trier par :</span>
          {[{k:"priority",l:"Priorité"},{k:"deadline",l:"Échéance"},{k:"progress",l:"Avancement"},{k:"status",l:"Statut"}].map(({k,l})=>(
            <button key={k} onClick={()=>toggleSort(k)} style={{...ss.btnS,fontSize:11,padding:"3px 9px",background:sortKey===k?"#e8f0fb":"#f0f0f0",color:sortKey===k?"#1a6bbf":"#333",fontWeight:sortKey===k?700:400}}>
              {l} {sortIcon(k)}
            </button>
          ))}
          {sortKey&&<button onClick={()=>setSortKey("")} style={{...ss.btnD,fontSize:11,padding:"3px 9px"}}>✕ Réinitialiser</button>}
        </div>
      </>}

      {view==="projects"&&(
        <div>
          {fp.length===0&&<p style={{color:"#888",fontSize:13}}>Aucun projet correspondant.</p>}
          {fp.map(p=>{
            const tc=tasks.filter(t=>t.projectId===p.id).length,od=isOD(p.deadline,p.status);
            const siteC=SITE_COLORS[p.site]||{bg:"#eee",tx:"#555"};
            return(
              <div key={p.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"11px 13px",marginBottom:9}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:8,flexWrap:"wrap",marginBottom:5}}>
                  <span style={{fontWeight:700,fontSize:13,flex:1,color:"#111"}}>{p.name}</span>
                  <Badge label={p.status} c={SC[p.status]}/>
                  <Badge label={p.priority} c={PC[p.priority]}/>
                  {p.site&&<Badge label={p.site} c={siteC}/>}
                </div>
                {p.description&&<div style={{fontSize:11,color:"#666",marginBottom:5}}>{p.description}</div>}
                {p.notes&&<div style={{fontSize:11,color:"#555",background:"#fffbee",border:"1px solid #f0e68c",borderRadius:6,padding:"5px 9px",marginBottom:6,whiteSpace:"pre-wrap"}}>📝 {p.notes}</div>}
                <div style={{display:"flex",gap:12,fontSize:11,color:"#666",marginBottom:7,flexWrap:"wrap"}}>
                  <span>Pilote : {p.pilot}</span>
                  {p.deadline&&<span style={{color:od?"#a32d2d":"#666"}}>Échéance : {fd(p.deadline)}{od?" (!!)":""}</span>}
                  <span style={{color:"#bbb"}}>Ajouté : {fd(p.createdAt)}</span>
                  <span>{tc} tâche{tc>1?"s":""}</span>
                  {(p.weight||0)>0&&<span style={{background:"#f0f0f0",borderRadius:4,padding:"1px 7px",color:"#555",fontWeight:600}}>⏱ {p.weight}% du temps</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                  <PBar v={p.progress}/><span style={{fontSize:11,color:"#666",minWidth:32}}>{p.progress}%</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button style={ss.btnS} onClick={()=>setPModal({mode:"edit",data:{...p}})}>Modifier</button>
                  <button style={ss.btnS} onClick={()=>{setView("tasks");setFTPrj(String(p.id));}}>Tâches</button>
                  <button style={ss.btnD} onClick={()=>delP(p.id)}>Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view==="tasks"&&(
        <div>
          {ft.length===0&&<p style={{color:"#888",fontSize:13}}>Aucune tâche correspondante.</p>}
          {ft.map(t=>{
            const prj=projects.find(p=>p.id===t.projectId),od=isOD(t.deadline,t.status);
            const siteC=SITE_COLORS[t.site]||{bg:"#eee",tx:"#555"};
            return(
              <div key={t.id} style={{background:"#fff",border:"1px solid "+(od?"#f09595":"#e0e0e0"),borderRadius:8,padding:"9px 12px",marginBottom:7}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:t.notes?6:0}}>
                  <div style={{flex:1,minWidth:140}}>
                    <div style={{fontWeight:700,fontSize:12,color:"#111"}}>{t.name}</div>
                    <div style={{fontSize:10,color:"#888"}}>{prj?prj.name:"-"}</div>
                  </div>
                  <Badge label={t.status} c={SC[t.status]}/>
                  {t.priority&&<Badge label={t.priority} c={PC[t.priority]||{bg:"#eee",tx:"#555"}}/>}
                  {t.site&&<Badge label={t.site} c={siteC}/>}
                  <span style={{fontSize:11,color:"#666"}}>Pilote : {t.pilot}</span>
                  {t.deadline&&<span style={{fontSize:11,color:od?"#a32d2d":"#666"}}>{fd(t.deadline)}{od?" (!!)":""}</span>}
                  <span style={{fontSize:10,color:"#bbb"}}>Ajouté : {fd(t.createdAt)}</span>
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
        </div>
      )}
    </div>
  );
}
