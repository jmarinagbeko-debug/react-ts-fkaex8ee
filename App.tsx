import React from 'react';
// ═══════════════════════════════════════════════════════════════════════
// MY HUB — ADHD PLANNER  |  Mobile-First  |  Supabase Sync Ready
// ═══════════════════════════════════════════════════════════════════════
//
// SETUP (5 min):
// 1. supabase.com → New Project → SQL Editor → paste SUPABASE_SETUP.sql → Run
// 2. Project Settings → API → copy URL + anon key → paste below
// 3. Deploy to Vercel/Stackblitz → share URL with partner
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";

// ── 🔑 YOUR SUPABASE CREDENTIALS ─────────────────────────────────────
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_KEY = "YOUR_ANON_KEY";
// ─────────────────────────────────────────────────────────────────────

const DEMO = SUPABASE_URL.includes("YOUR_PROJECT");

// ── Supabase REST client ──────────────────────────────────────────────
const sb = {
  h: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
  async get(t, q="") { try { const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?${q}&order=created_at.asc`,{headers:this.h}); return r.ok?await r.json():[]; } catch{return[];} },
  async insert(t, d) { try { const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:this.h,body:JSON.stringify(d)}); return r.ok?await r.json():null; } catch{return null;} },
  async update(t, id, d) { try { const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`,{method:"PATCH",headers:this.h,body:JSON.stringify(d)}); return r.ok; } catch{return false;} },
  async upsert(t, d) { try { const h={...this.h,"Prefer":"resolution=merge-duplicates,return=representation"}; const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:h,body:JSON.stringify(d)}); return r.ok?await r.json():null; } catch{return null;} },
  async del(t, id) { try { const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`,{method:"DELETE",headers:this.h}); return r.ok; } catch{return false;} },
};

// ── Palette ───────────────────────────────────────────────────────────
const C = {
  mocha:"#5C3D2E", brown:"#7A5C3E", brownLt:"#A07850",
  sage:"#8BAF8D", sageDk:"#6A8F6C", sand:"#D9CCBA",
  beige:"#EDE5D4", cream:"#F5F0E8", warm:"#E8DFD0",
  white:"#FDFAF5", accent:"#C9A87C", muted:"#9E8E7A",
  text:"#3D2E1E", textLt:"#6B5A48",
  event:"#A8C5C8", errand:"#D4A76A", chore:"#8BAF8D",
  task:"#C9A87C", appt:"#9090C8", remind:"#C47A6A",
};
const TYPE_C = { Event:C.event, Appointment:C.appt, Errand:C.errand, Chore:C.chore, Task:C.task, Reminder:C.remind, Schedule:C.sage };
const TAG_C  = { Personal:C.brownLt, Work:C.sage, Kids:C.event, Family:C.errand, Couple:C.remind, Home:C.appt, Other:C.muted };
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ENERGY_RULES = {
  "Low Energy":    "Rest mode: 1 essential task only. Delegate the rest. Be gentle with yourself.",
  "Medium Energy": "Focused mode: Main priority + 1 medium. 25 min on / 5 min break.",
  "High Energy":   "Power mode: Hit all priorities! Deep work first, errands after 2PM.",
  "Post-Call":     "Recovery mode: Bare minimum. Hydrate, eat, rest. Delegate everything.",
  "On Call":       "Alert mode: Interruptible tasks only. Keep schedule very loose.",
};
const QUOTES = [
  "You don't have to be perfect to make progress.",
  "Done is better than perfect.",
  "One thing at a time. One day at a time.",
  "Progress, not perfection.",
  "Small steps every day add up.",
  "You are doing better than you think.",
  "Rest is productive. You earned it.",
  "Be where your feet are.",
];

// ── Helpers ───────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2,"0");
const mkKey = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const todayObj = () => { const d=new Date(); return {y:d.getFullYear(),m:d.getMonth(),d:d.getDate(),dow:d.getDay()}; };
const daysInMonth = (y,m) => new Date(y,m+1,0).getDate();
const firstDow = (y,m) => new Date(y,m,1).getDay();
const fmt12 = h => h===0?"12 AM":h<12?`${h} AM`:h===12?"12 PM":`${h-12} PM`;
const T = todayObj();
const TK = mkKey(T.y,T.m,T.d);
const weekDates = dt => {
  const d=new Date(dt.y,dt.m,dt.d); d.setDate(d.getDate()-d.getDay());
  return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return{y:x.getFullYear(),m:x.getMonth(),d:x.getDate(),dow:i};});
};

// ── Seed data ─────────────────────────────────────────────────────────
const SEED_EVENTS = { [TK]: [
  {id:1,date:TK,title:"School Pickup",time:"4:00 PM",type:"Event",tag:"Kids",done:false},
  {id:2,date:TK,title:"Grocery store",time:"",type:"Errand",tag:"Home",done:false},
  {id:3,date:TK,title:"Load of laundry",time:"",type:"Chore",tag:"Home",done:false},
  {id:4,date:TK,title:"Update planner",time:"",type:"Task",tag:"Work",done:false},
  {id:5,date:TK,title:"Email contractor",time:"",type:"Task",tag:"Work",done:false},
]};
const SEED_MEALS = { [TK]: {breakfast:"Greek yogurt + berries",lunch:"Beef bowl",dinner:"Taco night 🌮",snack:"Cheese + crackers",opt2:"Quesadillas + salad",opt3:"Sheet pan chicken"} };
const SEED_PRIS  = { [TK]: {main:"Finish ADHD Hub",medium:["Workout","Grocery order"],small:["Reply emails","Declutter desk","Call Mom"]} };
const SEED_SET   = { energy:"Medium Energy", mood:"😊 Great", brain_dump:"", intention:"I will focus on progress, not perfection.", theme:"Momentum Monday", weekly_theme:"Launch Week", weekly_focus:"Ship it", weekly_goals:["Finish Hub","4 Workouts","Meal prep"], weekly_progress:{Work:70,Health:50,Home:60,Personal:80,Family:75}, reminders:["Pack school lunches","Prep dinner","Check freezer"] };
const KIDS = [{name:"Yayra",main:"Turkey wrap",fruit:"Berries",snack:"Cheese stick",drink:"Water"},{name:"Seysey",main:"Pasta salad",fruit:"Grapes",snack:"Crackers",drink:"Water"}];

// ── Global CSS ────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Nunito:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{font-family:'Nunito',sans-serif;background:${C.cream};color:${C.text};overscroll-behavior:none;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-thumb{background:${C.sand};border-radius:2px;}
input,textarea,select{font-family:'Nunito',sans-serif;font-size:16px;}
input[type=checkbox]{accent-color:${C.sage};width:18px;height:18px;cursor:pointer;flex-shrink:0;}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.slide-up{animation:slideUp .28s ease;}
.fade-in{animation:fadeIn .2s ease;}

/* Cards */
.card{background:${C.white};border-radius:16px;padding:16px;border:1px solid ${C.beige};box-shadow:0 2px 12px rgba(90,60,30,.07);}
.card-beige{background:${C.beige};border-radius:16px;padding:14px;border:1px solid ${C.sand};}

/* Typography */
.display{font-family:'Playfair Display',serif;}
.sec-title{font-size:11px;font-weight:800;letter-spacing:1.1px;color:${C.brownLt};text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px;}

/* Form elements */
.inp{border:1.5px solid ${C.sand};border-radius:10px;padding:10px 14px;font-size:15px;background:${C.white};color:${C.text};outline:none;width:100%;transition:border .15s;}
.inp:focus{border-color:${C.sage};}
.sel{border:1.5px solid ${C.sand};border-radius:10px;padding:10px 12px;font-size:14px;background:${C.white};color:${C.text};outline:none;width:100%;cursor:pointer;}
textarea.inp{resize:none;line-height:1.5;}

/* Buttons */
.btn{border:none;border-radius:12px;padding:12px 20px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;transition:all .15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.btn-sage{background:${C.sage};color:#fff;} .btn-sage:active{background:${C.sageDk};}
.btn-brown{background:${C.brown};color:#fff;} .btn-brown:active{background:${C.mocha};}
.btn-muted{background:${C.sand};color:${C.textLt};}
.btn-sm{padding:7px 14px;font-size:12px;border-radius:8px;}
.btn-icon{width:40px;height:40px;padding:0;border-radius:12px;font-size:18px;}

/* Check rows */
.check-row{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid ${C.beige};}
.check-row:last-child{border-bottom:none;}
.check-row label{font-size:14px;color:${C.textLt};cursor:pointer;flex:1;line-height:1.4;padding-top:1px;}
.check-row.done label{text-decoration:line-through;opacity:.4;}

/* Tags & pills */
.tag{border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;display:inline-block;}
.pill{border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:4px;}

/* Bottom nav */
.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:${C.mocha};display:flex;align-items:center;justify-content:space-around;padding:8px 4px;padding-bottom:calc(8px + env(safe-area-inset-bottom));box-shadow:0 -4px 20px rgba(0,0,0,.2);z-index:100;}
.nav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 12px;border-radius:12px;cursor:pointer;transition:all .15s;border:none;background:transparent;font-family:'Nunito',sans-serif;min-width:52px;}
.nav-item .icon{font-size:20px;line-height:1;}
.nav-item .label{font-size:9px;font-weight:800;letter-spacing:.5px;color:${C.sand};text-transform:uppercase;}
.nav-item.active{background:rgba(255,255,255,.15);}
.nav-item.active .label{color:${C.white};}

/* Modal overlay */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;z-index:200;padding:0;}
.modal-sheet{background:${C.white};border-radius:24px 24px 0 0;padding:24px 20px;padding-bottom:calc(24px + env(safe-area-inset-bottom));width:100%;max-width:600px;max-height:85vh;overflow-y:auto;animation:slideUp .25s ease;}
.modal-handle{width:40px;height:4px;background:${C.sand};border-radius:2px;margin:0 auto 20px;}

/* Time row */
.time-row{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px dashed ${C.beige};min-height:36px;}
.time-row:last-child{border-bottom:none;}
.time-lbl{color:${C.muted};width:50px;flex-shrink:0;font-size:11px;font-weight:700;padding-top:3px;}

/* Progress bar */
.prog-track{height:8px;background:${C.beige};border-radius:4px;overflow:hidden;}
.prog-fill{height:100%;background:${C.sage};border-radius:4px;transition:width .4s;}

/* Section divider */
.divider{height:1px;background:${C.beige};margin:12px 0;}

/* Sync dot */
@keyframes syncPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
.sync-live{color:${C.sage};animation:none;}
.sync-connecting{color:${C.accent};animation:pulse 1.2s infinite;}
.sync-error{color:${C.remind};}
.sync-demo{color:${C.accent};}

/* Responsive: tablet+ gets 2-col */
@media(min-width:640px){
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  .three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
}
`;

// ═══════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════
const TagBadge = ({tag}) => { const c=TAG_C[tag]||C.muted; return <span className="tag" style={{background:c+"22",color:c}}>{tag}</span>; };
const TypeDot  = ({type,size=8}) => <span style={{width:size,height:size,borderRadius:"50%",background:TYPE_C[type]||C.muted,display:"inline-block",flexShrink:0}}/>;
const SecTitle = ({icon,children,right}) => (
  <div className="sec-title" style={{justifyContent:"space-between"}}>
    <span style={{display:"flex",alignItems:"center",gap:6}}>{icon&&<span>{icon}</span>}{children}</span>
    {right}
  </div>
);
function CheckItem({label,done,onChange,tag,time,onDelete}){
  return (
    <div className={`check-row${done?" done":""}`}>
      <input type="checkbox" checked={!!done} onChange={onChange}/>
      <label onClick={onChange}>
        {time&&<span style={{color:C.muted,fontSize:12,marginRight:5}}>{time}</span>}
        {label}
        {tag&&<span style={{marginLeft:6}}><TagBadge tag={tag}/></span>}
      </label>
      {onDelete&&<button onClick={onDelete} style={{border:"none",background:"none",color:C.muted,fontSize:16,cursor:"pointer",padding:"0 4px",flexShrink:0}}>×</button>}
    </div>
  );
}
function ProgBar({value}){ return <div className="prog-track"><div className="prog-fill" style={{width:`${Math.min(100,value||0)}%`}}/></div>; }

function BottomSheet({onClose,title,children}){
  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div className="modal-sheet" onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"/>
        {title&&<div className="display" style={{fontSize:20,fontWeight:700,color:C.brown,marginBottom:18}}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function App(){
  const [view,setView]     = useState("hub");
  const [cur,setCur]       = useState(todayObj());
  const [sync,setSync]     = useState(DEMO?"demo":"connecting");
  const [events,setEvents] = useState(SEED_EVENTS);
  const [meals,setMeals]   = useState(SEED_MEALS);
  const [pris,setPris]     = useState(SEED_PRIS);
  const [set,setSet]       = useState(SEED_SET);
  const [addSheet,setAddSheet] = useState(null);
  const [newItem,setNewItem]   = useState({title:"",time:"",type:"Task",tag:"Personal"});
  const [setupOpen,setSetupOpen] = useState(false);

  const dk = mkKey(cur.y,cur.m,cur.d);
  const dayEvs  = events[dk]||[];
  const dayMls  = meals[dk]||{};
  const dayPri  = pris[dk]||{main:"",medium:["",""],small:["","",""]};
  const wkDays  = weekDates(cur);
  const quote   = QUOTES[(cur.d+cur.m)%QUOTES.length];

  // ── Load from Supabase ──────────────────────────────────────────────
  useEffect(()=>{
    if(DEMO) return;
    load();
  },[]);

  async function load(){
    setSync("connecting");
    try {
      const [evs,mls,ps,st] = await Promise.all([
        sb.get("events","select=*"),
        sb.get("meals","select=*"),
        sb.get("priorities","select=*"),
        sb.get("hub_settings","select=*&limit=1"),
      ]);
      const em={};(evs||[]).forEach(e=>{if(!em[e.date])em[e.date]=[];em[e.date].push(e);});
      if(Object.keys(em).length) setEvents(em);
      const mm={};(mls||[]).forEach(m=>{mm[m.date]=m;});
      if(Object.keys(mm).length) setMeals(mm);
      const pm={};(ps||[]).forEach(p=>{pm[p.date]=p;});
      if(Object.keys(pm).length) setPris(pm);
      if(st&&st[0]) setSet(s=>({...s,...st[0]}));
      setSync("live");
    } catch { setSync("error"); }
  }

  // ── Sync helpers ────────────────────────────────────────────────────
  const syncSet = useCallback(async(k,v)=>{
    setSet(s=>({...s,[k]:v}));
    if(!DEMO) await sb.upsert("hub_settings",{id:1,[k]:v});
  },[]);
  const syncPri = useCallback(async(f,v)=>{
    const u={...dayPri,[f]:v};
    setPris(p=>({...p,[dk]:u}));
    if(!DEMO) await sb.upsert("priorities",{date:dk,...u});
  },[dk,dayPri]);
  const syncMeal = useCallback(async(f,v)=>{
    const u={...dayMls,[f]:v};
    setMeals(m=>({...m,[dk]:u}));
    if(!DEMO) await sb.upsert("meals",{date:dk,...u});
  },[dk,dayMls]);
  const toggleEv = useCallback(async(key,id)=>{
    const ev=(events[key]||[]).find(e=>e.id===id);
    if(!ev) return;
    const nd=!ev.done;
    setEvents(es=>({...es,[key]:(es[key]||[]).map(e=>e.id===id?{...e,done:nd}:e)}));
    if(!DEMO) await sb.update("events",id,{done:nd});
  },[events]);
  const addEv = useCallback(async()=>{
    if(!newItem.title.trim()) return;
    const key=addSheet?.dk||dk;
    const item={...newItem,date:key,done:false};
    if(DEMO){
      setEvents(es=>({...es,[key]:[...(es[key]||[]),{...item,id:Date.now()}]}));
    } else {
      const r=await sb.insert("events",item);
      if(r&&r[0]) setEvents(es=>({...es,[key]:[...(es[key]||[]),r[0]]}));
    }
    setNewItem({title:"",time:"",type:"Task",tag:"Personal"});
    setAddSheet(null);
  },[newItem,addSheet,dk]);
  const delEv = useCallback(async(key,id)=>{
    setEvents(es=>({...es,[key]:(es[key]||[]).filter(e=>e.id!==id)}));
    if(!DEMO) await sb.del("events",id);
  },[]);

  const syncDot = {live:"🟢",demo:"🟡",connecting:"🟡",error:"🔴"}[sync];
  const syncTxt = {live:"Live",demo:"Demo",connecting:"…",error:"Offline"}[sync];

  const shared = {cur,setCur,dk,dayEvs,dayMls,dayPri,wkDays,events,meals,quote,set,syncSet,syncPri,syncMeal,toggleEv,addEv,delEv,setAddSheet,KIDS};

  const TABS = [
    {id:"hub",   icon:"🏠", label:"Hub"},
    {id:"daily", icon:"📅", label:"Daily"},
    {id:"weekly",icon:"📆", label:"Weekly"},
    {id:"monthly",icon:"🗓",label:"Month"},
    {id:"more",  icon:"⋯",  label:"More"},
  ];

  return (
    <>
      <style>{CSS}</style>

      {/* Demo banner */}
      {DEMO&&(
        <div style={{background:C.brownLt,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <span style={{fontSize:12,color:C.white,fontWeight:600}}>🔌 Demo mode — tap to connect sync</span>
          <button className="btn btn-sm" style={{background:"rgba(255,255,255,.25)",color:C.white,flexShrink:0}} onClick={()=>setSetupOpen(true)}>Connect →</button>
        </div>
      )}

      {/* Sync bar (live mode) */}
      {!DEMO&&(
        <div style={{background:C.mocha,padding:"6px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:C.sand,fontWeight:600}}>MY HUB</span>
          <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setSetupOpen(true)}>
            <span style={{fontSize:10}}>{syncDot}</span>
            <span style={{fontSize:11,color:C.sand,fontWeight:700}}>{syncTxt}</span>
            {sync==="error"&&<button className="btn btn-sm" style={{background:C.remind,color:C.white,padding:"3px 8px",fontSize:10}} onClick={e=>{e.stopPropagation();load();}}>Retry</button>}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{paddingBottom:80,minHeight:"100vh"}} className="slide-up" key={view}>
        {view==="hub"    && <HubView    {...shared}/>}
        {view==="daily"  && <DailyView  {...shared}/>}
        {view==="weekly" && <WeeklyView {...shared}/>}
        {view==="monthly"&& <MonthlyView {...shared}/>}
        {view==="more"   && <MoreView   {...shared} set={set} syncSet={syncSet}/>}
      </div>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {TABS.map(tab=>(
          <button key={tab.id} className={`nav-item${view===tab.id?" active":""}`} onClick={()=>setView(tab.id)}>
            <span className="icon">{tab.icon}</span>
            <span className="label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Add item sheet */}
      {addSheet&&(
        <BottomSheet title="Add Item" onClose={()=>setAddSheet(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input className="inp" placeholder="What needs to be done?" value={newItem.title} onChange={e=>setNewItem(n=>({...n,title:e.target.value}))} autoFocus onKeyDown={e=>e.key==="Enter"&&addEv()}/>
            <input className="inp" placeholder="Time e.g. 4:00 PM (optional)" value={newItem.time} onChange={e=>setNewItem(n=>({...n,time:e.target.value}))}/>
            <select className="sel" value={newItem.type} onChange={e=>setNewItem(n=>({...n,type:e.target.value}))}>
              {Object.keys(TYPE_C).map(t=><option key={t}>{t}</option>)}
            </select>
            <select className="sel" value={newItem.tag} onChange={e=>setNewItem(n=>({...n,tag:e.target.value}))}>
              {Object.keys(TAG_C).map(t=><option key={t}>{t}</option>)}
            </select>
            <button className="btn btn-sage" style={{width:"100%",padding:14,fontSize:15}} onClick={addEv}>Add Item</button>
          </div>
        </BottomSheet>
      )}

      {/* Setup sheet */}
      {setupOpen&&(
        <BottomSheet title="🔌 Real-Time Sync Setup" onClose={()=>setSetupOpen(false)}>
          <div style={{fontSize:14,color:C.textLt,lineHeight:1.8}}>
            <div style={{background:C.beige,borderRadius:14,padding:16,marginBottom:16}}>
              <div style={{fontWeight:800,color:C.brown,marginBottom:10,fontSize:15}}>5-minute setup:</div>
              <div>1. <a href="https://supabase.com" target="_blank" style={{color:C.sage,fontWeight:700}}>supabase.com</a> → Sign up free</div>
              <div>2. New Project → wait ~1 min to build</div>
              <div>3. SQL Editor → paste the <strong>SUPABASE_SETUP.sql</strong> file → Run</div>
              <div>4. Settings → API → copy <strong>URL</strong> + <strong>anon key</strong></div>
              <div>5. Paste both into the top of the <strong>.jsx</strong> file</div>
              <div>6. Redeploy → you and your partner sync live! 🎉</div>
            </div>
            <div style={{background:C.warm,borderRadius:14,padding:16,marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>{syncDot}</span>
              <div>
                <div style={{fontWeight:800,color:C.brown}}>Current: {syncTxt}</div>
                <div style={{fontSize:12,color:C.muted}}>{DEMO?"Data saves locally only — not shared yet":"Connected to Supabase — syncing with partner"}</div>
              </div>
            </div>
            <button className="btn btn-sage" style={{width:"100%"}} onClick={()=>setSetupOpen(false)}>Got it!</button>
          </div>
        </BottomSheet>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// HUB VIEW (Daily Dashboard)
// ═══════════════════════════════════════════════════════════════════════
function HubView({cur,dk,dayEvs,dayMls,dayPri,wkDays,events,quote,set,syncSet,syncPri,syncMeal,toggleEv,delEv,setAddSheet,KIDS}){
  const dt = new Date(cur.y,cur.m,cur.d);
  const gaugeMap = {"Low Energy":12,"Medium Energy":50,"High Energy":92,"Post-Call":8,"On Call":38};
  const gv = gaugeMap[set.energy]||50;
  const gc = gv>70?C.sage:gv>30?C.accent:C.remind;
  const grouped={};Object.keys(TYPE_C).forEach(t=>grouped[t]=[]);
  dayEvs.forEach(e=>{if(grouped[e.type])grouped[e.type].push(e);});
  const hours=Array.from({length:17},(_,i)=>i+6);
  const flowItems=[dayPri.main,...(dayPri.medium||[]),...(dayPri.small||[])].filter(Boolean);
  const [expandSchedule,setExpandSchedule]=useState(false);
  const [expandTasks,setExpandTasks]=useState(false);
  const weekNum=Math.ceil((dt-new Date(cur.y,0,1))/604800000);

  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}>

      {/* ── HEADER CARD ── */}
      <div style={{background:`linear-gradient(135deg,${C.mocha},${C.brown} 60%,${C.brownLt})`,borderRadius:20,padding:20,position:"relative",overflow:"hidden",boxShadow:"0 8px 28px rgba(90,50,20,.3)"}}>
        <div style={{position:"absolute",right:10,top:-10,fontSize:100,opacity:.07,pointerEvents:"none"}}>🌿</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div className="display" style={{fontSize:32,fontWeight:700,color:C.white,lineHeight:1}}>MY HUB</div>
            <div style={{fontFamily:"'Playfair Display'",fontStyle:"italic",fontSize:12,color:"rgba(255,255,255,.7)",marginTop:2}}>ADHD Planner</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.white}}>{DAYS[dt.getDay()].slice(0,3)}, {MONTHS[cur.m].slice(0,3)} {cur.d}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Week {weekNum} · {cur.y}</div>
          </div>
        </div>

        {/* Energy + Mood row */}
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <select className="sel" style={{flex:1,background:"rgba(255,255,255,.15)",color:C.white,border:"1px solid rgba(255,255,255,.3)",fontSize:13,padding:"8px 10px"}} value={set.energy} onChange={e=>syncSet("energy",e.target.value)}>
            {Object.keys(ENERGY_RULES).map(o=><option key={o} style={{color:C.text}}>{o}</option>)}
          </select>
          <select className="sel" style={{flex:1,background:"rgba(255,255,255,.15)",color:C.white,border:"1px solid rgba(255,255,255,.3)",fontSize:13,padding:"8px 10px"}} value={set.mood} onChange={e=>syncSet("mood",e.target.value)}>
            {["😊 Great","😐 Okay","😔 Low","😤 Stressed","😴 Tired"].map(m=><option key={m} style={{color:C.text}}>{m}</option>)}
          </select>
        </div>

        {/* Energy gauge */}
        <div style={{marginTop:10}}>
          <div style={{height:5,background:"rgba(255,255,255,.2)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${gv}%`,background:gc,borderRadius:3,transition:"width .5s"}}/>
          </div>
        </div>

        {/* Quote */}
        <div style={{marginTop:12,fontFamily:"'Playfair Display'",fontStyle:"italic",fontSize:13,color:"rgba(255,255,255,.85)",lineHeight:1.5}}>"{quote}"</div>
      </div>

      {/* ── INTENTION ── */}
      <div style={{background:C.sage,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:16,flexShrink:0}}>🌿</span>
        <input style={{flex:1,background:"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,.4)",padding:"2px 0",fontSize:14,color:C.white,outline:"none",fontFamily:"'Nunito'"}} value={set.intention||""} onChange={e=>syncSet("intention",e.target.value)} placeholder="Today's intention…"/>
      </div>

      {/* ── ADHD RULE ── */}
      <div style={{background:C.warm,borderRadius:14,padding:14,border:`1px solid ${C.sand}`,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:18,flexShrink:0}}>🧩</span>
        <div>
          <div style={{fontSize:12,fontWeight:800,color:C.brown,marginBottom:3}}>{set.energy}</div>
          <div style={{fontSize:13,color:C.textLt,lineHeight:1.5}}>{ENERGY_RULES[set.energy]}</div>
        </div>
      </div>

      {/* ── PRIORITIES ── */}
      <div className="card">
        <SecTitle icon="⭐" right={<span style={{fontSize:12,color:C.muted}}>{set.theme||""}</span>}>TOP PRIORITIES</SecTitle>
        <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:"1px",marginBottom:6}}>MAIN PRIORITY</div>
        <input className="inp" style={{background:C.beige,fontWeight:700,fontSize:15,marginBottom:12}} value={dayPri.main||""} onChange={e=>syncPri("main",e.target.value)} placeholder="Your #1 priority today…"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:C.muted,marginBottom:6}}>MEDIUM</div>
            {[0,1].map(i=><input key={i} className="inp" style={{marginBottom:6,fontSize:13}} value={(dayPri.medium||[])[i]||""} onChange={e=>{const m=[...(dayPri.medium||["",""])];m[i]=e.target.value;syncPri("medium",m);}} placeholder={`Medium ${i+1}…`}/>)}
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:C.muted,marginBottom:6}}>SMALL</div>
            {[0,1,2].map(i=><input key={i} className="inp" style={{marginBottom:6,fontSize:13}} value={(dayPri.small||[])[i]||""} onChange={e=>{const s=[...(dayPri.small||["","",""])];s[i]=e.target.value;syncPri("small",s);}} placeholder={`Small ${i+1}…`}/>)}
          </div>
        </div>
        {flowItems.length>0&&(
          <>
            <div className="divider"/>
            <div style={{fontSize:11,fontWeight:800,color:C.muted,marginBottom:8}}>▶ DO THIS FIRST</div>
            {flowItems.map((item,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.beige}`}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:i===0?C.brown:C.beige,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:i===0?C.white:C.textLt,flexShrink:0}}>{i+1}</div>
                <span style={{fontSize:14,color:C.textLt}}>{item}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── SCHEDULE ── */}
      <div className="card">
        <SecTitle icon="🗓" right={
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-sm btn-sage" onClick={()=>setAddSheet({dk})}>+ Add</button>
            <button className="btn btn-sm btn-muted" onClick={()=>setExpandSchedule(v=>!v)}>{expandSchedule?"Less":"Full"}</button>
          </div>
        }>TODAY'S SCHEDULE</SecTitle>
        {(expandSchedule?hours:hours.filter(h=>{
          const evs=dayEvs.filter(e=>{
            if(!e.time)return false;
            const m=e.time.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
            if(!m)return false;
            let hr=parseInt(m[1]);
            if(m[3].toUpperCase()==="PM"&&hr!==12)hr+=12;
            if(m[3].toUpperCase()==="AM"&&hr===12)hr=0;
            return hr===h;
          });
          const now=new Date().getHours();
          return evs.length>0||(h>=now&&h<=now+2);
        })).map(h=>{
          const now=new Date().getHours();
          const isNow=h===now&&dk===TK;
          const evs=dayEvs.filter(e=>{
            if(!e.time)return false;
            const m=e.time.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
            if(!m)return false;
            let hr=parseInt(m[1]);
            if(m[3].toUpperCase()==="PM"&&hr!==12)hr+=12;
            if(m[3].toUpperCase()==="AM"&&hr===12)hr=0;
            return hr===h;
          });
          return (
            <div key={h} className="time-row" style={{background:isNow?C.sage+"15":"transparent",borderRadius:8,paddingLeft:isNow?8:0}}>
              <span className="time-lbl" style={{color:isNow?C.sage:C.muted,fontWeight:isNow?800:700}}>{fmt12(h)}</span>
              <div style={{flex:1}}>
                {evs.map(e=>(
                  <div key={e.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,padding:"6px 10px",background:TYPE_C[e.type]+"22",borderLeft:`3px solid ${TYPE_C[e.type]||C.muted}`,borderRadius:"0 8px 8px 0"}}>
                    <span style={{fontSize:13,color:C.textLt,flex:1,textDecoration:e.done?"line-through":"none"}}>{e.title}</span>
                    <TagBadge tag={e.tag}/>
                    <input type="checkbox" checked={!!e.done} onChange={()=>toggleEv(dk,e.id)}/>
                  </div>
                ))}
              </div>
              {isNow&&<span style={{fontSize:9,color:C.sage,fontWeight:800,flexShrink:0}}>NOW</span>}
            </div>
          );
        })}
      </div>

      {/* ── TASKS ── */}
      <div className="card">
        <SecTitle icon="✅" right={<button className="btn btn-sm btn-sage" onClick={()=>setAddSheet({dk})}>+ Add</button>}>TODAY'S TASKS</SecTitle>
        {Object.entries(grouped).map(([type,items])=>{
          if(!items.length)return null;
          const col=TYPE_C[type];
          return (
            <div key={type} style={{marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:800,color:col,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                <TypeDot type={type}/>{type.toUpperCase()}S
              </div>
              {items.map(e=><CheckItem key={e.id} label={e.title} done={e.done} time={e.time} tag={e.tag} onChange={()=>toggleEv(dk,e.id)} onDelete={()=>delEv(dk,e.id)}/>)}
            </div>
          );
        })}
        {!dayEvs.length&&<div style={{fontSize:13,color:C.muted,textAlign:"center",padding:16}}>No tasks yet. Tap + Add to get started!</div>}
      </div>

      {/* ── MEALS ── */}
      <div className="card">
        <SecTitle icon="🍽">MEALS TODAY</SecTitle>
        <div className="two-col">
          {[["breakfast","🌅 Breakfast"],["lunch","☀️ Lunch"],["dinner","🌙 Dinner"],["snack","🍎 Snack"]].map(([k,l])=>(
            <div key={k}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:5}}>{l}</div>
              <input className="inp" style={{fontSize:13}} value={dayMls[k]||""} onChange={e=>syncMeal(k,e.target.value)} placeholder={`Add…`}/>
            </div>
          ))}
        </div>
        <div style={{marginTop:12,padding:12,background:C.beige,borderRadius:12}}>
          <div style={{fontSize:11,fontWeight:800,color:C.muted,marginBottom:8}}>DINNER OPTIONS</div>
          <div className="two-col">
            {[["opt2","Option 2"],["opt3","Option 3"]].map(([k,l])=>(
              <div key={k}>
                <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{l}</div>
                <input className="inp" style={{fontSize:13,background:C.white}} value={dayMls[k]||""} onChange={e=>syncMeal(k,e.target.value)} placeholder="Quick idea…"/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KIDS LUNCH ── */}
      <div className="card">
        <SecTitle icon="🎒">KIDS LUNCH BOX</SecTitle>
        {KIDS.map((kid,i)=>(
          <div key={i} style={{padding:12,background:C.beige,borderRadius:12,marginBottom:i<KIDS.length-1?10:0}}>
            <div style={{fontWeight:800,fontSize:14,color:C.brown,marginBottom:6}}>{kid.name}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:13,color:C.textLt}}>
              <span>🍱 {kid.main}</span>
              <span>🍎 {kid.fruit}</span>
              <span>🍪 {kid.snack}</span>
              <span>🥤 {kid.drink}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── BRAIN DUMP ── */}
      <div className="card">
        <SecTitle icon="🧠">BRAIN DUMP</SecTitle>
        <textarea className="inp" rows={4} placeholder="Write everything on your mind here. Get it out so you can focus on what matters." value={set.brain_dump||""} onChange={e=>syncSet("brain_dump",e.target.value)}/>
      </div>

      {/* ── REMINDERS ── */}
      <div className="card">
        <SecTitle icon="🔔">REMINDERS</SecTitle>
        {(set.reminders||[]).map((r,i)=>(
          <CheckItem key={i} label={r} onChange={()=>syncSet("reminders",(set.reminders||[]).filter((_,j)=>j!==i))}/>
        ))}
        <input className="inp" style={{marginTop:10}} placeholder="Add reminder + tap Enter…" onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){syncSet("reminders",[...(set.reminders||[]),e.target.value]);e.target.value="";}}}/>
      </div>

      {/* ── WEEK GLANCE ── */}
      <div className="card">
        <SecTitle icon="📅">WEEK AT A GLANCE</SecTitle>
        {wkDays.map(d=>{
          const k=mkKey(d.y,d.m,d.d);
          const isToday=k===TK;
          const evs=(events[k]||[]).slice(0,2);
          return (
            <div key={k} style={{display:"flex",gap:10,alignItems:"center",padding:"9px 10px",borderRadius:10,background:isToday?C.sage+"22":"transparent",border:`1px solid ${isToday?C.sage+"44":"transparent"}`,marginBottom:3}}>
              <div style={{width:36,flexShrink:0,textAlign:"center"}}>
                <div style={{fontSize:10,fontWeight:800,color:isToday?C.sage:C.muted}}>{DAYS[d.dow].slice(0,3).toUpperCase()}</div>
                <div style={{fontSize:15,fontWeight:800,color:isToday?C.brown:C.textLt}}>{d.d}</div>
              </div>
              <div style={{flex:1}}>
                {evs.length?evs.map(e=><div key={e.id} style={{fontSize:12,color:C.textLt,display:"flex",alignItems:"center",gap:5}}><TypeDot type={e.type} size={6}/>{e.title}</div>):<div style={{fontSize:12,color:C.muted}}>—</div>}
              </div>
              {isToday&&<span className="pill" style={{background:C.sage+"22",color:C.sage,fontSize:10}}>Today</span>}
            </div>
          );
        })}
      </div>

      {/* ── CLEANING ── */}
      <div className="card">
        <SecTitle icon="🧹">CLEANING ZONE</SecTitle>
        <div style={{padding:12,background:C.beige,borderRadius:12,marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:800,color:C.brown,marginBottom:4}}>TOP PRIORITY</div>
          <div style={{fontSize:13,color:C.textLt}}>Wipe counters + deep clean sink</div>
        </div>
        <div style={{fontSize:11,fontWeight:800,color:C.muted,marginBottom:6}}>IF MORE ENERGY</div>
        {["Clean fridge","Organize pantry"].map((t,i)=><CheckItem key={i} label={t}/>)}
        <div style={{fontSize:11,fontWeight:800,color:C.muted,margin:"10px 0 6px"}}>DELEGATE TO KIDS</div>
        {["Load dishwasher (Yayra)","Sweep floor (Seysey)"].map((t,i)=><CheckItem key={i} label={t}/>)}
      </div>

      {/* ── ROUTINES ── */}
      <div className="card">
        <SecTitle icon="🔄">ROUTINES & RESETS</SecTitle>
        <div className="two-col">
          {[["🌅 MORNING",["Hydrate 💧","Stretch 5 min","Plan my day","Top 3 priorities"]],
            ["🌙 EVENING",["Tidy up","Prep tomorrow","Gratitude","Wind down"]],
            ["☀️ AM RESET",["Brain dump","Check calendar","Top 3 tasks","Deep breath"]],
            ["🌛 PM RESET",["Review day","Plan tomorrow","Clear mind","Sleep mode"]]].map(([l,items])=>(
            <div key={l} style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:800,color:C.brownLt,marginBottom:6}}>{l}</div>
              {items.map((t,i)=><CheckItem key={i} label={t}/>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DAILY VIEW
// ═══════════════════════════════════════════════════════════════════════
function DailyView({cur,setCur,dk,dayEvs,dayMls,dayPri,set,syncPri,syncMeal,toggleEv,delEv,setAddSheet,KIDS}){
  const dt=new Date(cur.y,cur.m,cur.d);
  const move=n=>{const d=new Date(dt);d.setDate(dt.getDate()+n);setCur({y:d.getFullYear(),m:d.getMonth(),d:d.getDate(),dow:d.getDay()});};
  const hours=Array.from({length:17},(_,i)=>i+6);
  const grouped={};Object.keys(TYPE_C).forEach(t=>grouped[t]=[]);
  dayEvs.forEach(e=>{if(grouped[e.type])grouped[e.type].push(e);});
  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}>
      {/* Date nav */}
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button className="btn btn-brown btn-icon" onClick={()=>move(-1)}>‹</button>
        <div style={{flex:1,textAlign:"center"}}>
          <div className="display" style={{fontSize:20,fontWeight:700,color:C.brown}}>{DAYS[dt.getDay()]}</div>
          <div style={{fontSize:13,color:C.muted}}>{MONTHS[cur.m]} {cur.d}, {cur.y}</div>
        </div>
        <button className="btn btn-brown btn-icon" onClick={()=>move(1)}>›</button>
      </div>

      {/* ADHD rule */}
      <div style={{background:C.sage+"15",borderRadius:14,padding:12,border:`1px solid ${C.sage}44`,display:"flex",gap:10}}>
        <span style={{fontSize:16}}>🧩</span>
        <div style={{fontSize:13,color:C.textLt,lineHeight:1.5}}><strong>{set.energy}:</strong> {ENERGY_RULES[set.energy]}</div>
      </div>

      {/* Priorities */}
      <div className="card">
        <SecTitle icon="⭐" right={<button className="btn btn-sm btn-sage" onClick={()=>setAddSheet({dk})}>+ Add</button>}>PRIORITIES</SecTitle>
        <input className="inp" style={{background:C.beige,fontWeight:700,marginBottom:10}} value={dayPri.main||""} onChange={e=>syncPri("main",e.target.value)} placeholder="Main priority…"/>
        {[0,1].map(i=><input key={i} className="inp" style={{marginBottom:8,fontSize:13}} value={(dayPri.medium||[])[i]||""} onChange={e=>{const m=[...(dayPri.medium||["",""])];m[i]=e.target.value;syncPri("medium",m);}} placeholder={`Medium ${i+1}…`}/>)}
        {[0,1,2].map(i=><input key={i} className="inp" style={{marginBottom:i<2?8:0,fontSize:13}} value={(dayPri.small||[])[i]||""} onChange={e=>{const s=[...(dayPri.small||["","",""])];s[i]=e.target.value;syncPri("small",s);}} placeholder={`Small ${i+1}…`}/>)}
      </div>

      {/* Time blocks */}
      <div className="card">
        <SecTitle icon="⏱">TIME BLOCKS</SecTitle>
        {hours.map(h=>{
          const isNow=h===new Date().getHours()&&dk===TK;
          const evs=dayEvs.filter(e=>{
            if(!e.time)return false;
            const m=e.time.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
            if(!m)return false;
            let hr=parseInt(m[1]);
            if(m[3].toUpperCase()==="PM"&&hr!==12)hr+=12;
            if(m[3].toUpperCase()==="AM"&&hr===12)hr=0;
            return hr===h;
          });
          return (
            <div key={h} className="time-row" style={{background:isNow?C.sage+"15":"transparent",borderRadius:8}}>
              <span className="time-lbl" style={{color:isNow?C.sage:C.muted,fontWeight:isNow?800:700}}>{fmt12(h)}</span>
              <div style={{flex:1}}>
                {evs.map(e=>(
                  <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,padding:"6px 10px",background:TYPE_C[e.type]+"22",borderLeft:`3px solid ${TYPE_C[e.type]||C.muted}`,borderRadius:"0 8px 8px 0"}}>
                    <span style={{fontSize:13,color:C.textLt,flex:1,textDecoration:e.done?"line-through":"none"}}>{e.title}</span>
                    <input type="checkbox" checked={!!e.done} onChange={()=>toggleEv(dk,e.id)}/>
                    <button onClick={()=>delEv(dk,e.id)} style={{border:"none",background:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tasks */}
      <div className="card">
        <SecTitle icon="✅">TASKS</SecTitle>
        {Object.entries(grouped).map(([type,items])=>{
          if(!items.length)return null;
          return <div key={type} style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:800,color:TYPE_C[type],marginBottom:6,display:"flex",alignItems:"center",gap:5}}><TypeDot type={type}/>{type.toUpperCase()}S</div>
            {items.map(e=><CheckItem key={e.id} label={e.title} done={e.done} time={e.time} onChange={()=>toggleEv(dk,e.id)} onDelete={()=>delEv(dk,e.id)}/>)}
          </div>;
        })}
      </div>

      {/* Meals */}
      <div className="card">
        <SecTitle icon="🍽">MEALS</SecTitle>
        {[["breakfast","Breakfast"],["lunch","Lunch"],["dinner","Dinner"],["snack","Snack"]].map(([k,l])=>(
          <div key={k} style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:4}}>{l.toUpperCase()}</div>
            <input className="inp" style={{fontSize:13}} value={dayMls[k]||""} onChange={e=>syncMeal(k,e.target.value)} placeholder={`Add ${l.toLowerCase()}…`}/>
          </div>
        ))}
      </div>

      {/* Kids lunch */}
      <div className="card">
        <SecTitle icon="🎒">KIDS LUNCH</SecTitle>
        {KIDS.map((kid,i)=>(
          <div key={i} style={{padding:12,background:C.beige,borderRadius:12,marginBottom:i<KIDS.length-1?10:0}}>
            <div style={{fontWeight:800,fontSize:14,color:C.brown,marginBottom:6}}>{kid.name}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:13,color:C.textLt}}>
              <span>🍱 {kid.main}</span><span>🍎 {kid.fruit}</span>
              <span>🍪 {kid.snack}</span><span>🥤 {kid.drink}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WEEKLY VIEW
// ═══════════════════════════════════════════════════════════════════════
function WeeklyView({cur,setCur,wkDays,events,meals,set,syncSet,setAddSheet,toggleEv}){
  const move=n=>{const d=new Date(cur.y,cur.m,cur.d);d.setDate(d.getDate()+n*7);setCur({y:d.getFullYear(),m:d.getMonth(),d:d.getDate(),dow:d.getDay()});};
  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button className="btn btn-brown btn-icon btn-sm" onClick={()=>move(-1)}>‹</button>
        <div className="display" style={{flex:1,textAlign:"center",fontSize:16,fontWeight:700,color:C.brown}}>
          {MONTHS[wkDays[0].m].slice(0,3)} {wkDays[0].d} – {MONTHS[wkDays[6].m].slice(0,3)} {wkDays[6].d}
        </div>
        <button className="btn btn-brown btn-icon btn-sm" onClick={()=>move(1)}>›</button>
      </div>

      {/* Week strip */}
      <div className="card" style={{padding:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {wkDays.map(d=>{
            const k=mkKey(d.y,d.m,d.d);
            const isToday=k===TK;
            const count=(events[k]||[]).length;
            return (
              <div key={d.d} onClick={()=>setCur(d)} style={{textAlign:"center",padding:"8px 4px",borderRadius:10,cursor:"pointer",background:isToday?C.sage:"transparent",border:`1px solid ${isToday?C.sage:C.beige}`}}>
                <div style={{fontSize:10,fontWeight:800,color:isToday?C.white:C.muted}}>{DAYS[d.dow].slice(0,1)}</div>
                <div style={{fontSize:16,fontWeight:800,color:isToday?C.white:C.textLt}}>{d.d}</div>
                {count>0&&<div style={{width:6,height:6,borderRadius:"50%",background:isToday?C.white:C.sage,margin:"3px auto 0"}}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Week theme & goals */}
      <div className="card">
        <SecTitle icon="🌟">WEEK THEME</SecTitle>
        <input className="inp" style={{marginBottom:10,fontStyle:"italic",background:C.beige}} value={set.weekly_theme||""} onChange={e=>syncSet("weekly_theme",e.target.value)} placeholder="This week's theme…"/>
        <SecTitle icon="🎯">TOP 3 GOALS</SecTitle>
        {(set.weekly_goals||["","",""]).map((g,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:[C.brown,C.sage,C.accent][i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:C.white,flexShrink:0}}>{i+1}</div>
            <input className="inp" value={g} onChange={e=>{const gg=[...(set.weekly_goals||["","",""])];gg[i]=e.target.value;syncSet("weekly_goals",gg);}} placeholder={`Goal ${i+1}…`}/>
          </div>
        ))}
      </div>

      {/* Daily event list for each day */}
      {wkDays.map(d=>{
        const k=mkKey(d.y,d.m,d.d);
        const evs=events[k]||[];
        const isToday=k===TK;
        return (
          <div key={k} className="card" style={{border:`1px solid ${isToday?C.sage:C.beige}`}}>
            <SecTitle right={<button className="btn btn-sm btn-sage" onClick={()=>setAddSheet({dk:k})}>+</button>}>
              <span style={{color:isToday?C.sage:C.brown}}>{DAYS[d.dow]}, {MONTHS[d.m].slice(0,3)} {d.d}</span>
              {isToday&&<span className="pill" style={{background:C.sage+"22",color:C.sage,fontSize:10}}>Today</span>}
            </SecTitle>
            {evs.length?evs.map(e=>(
              <CheckItem key={e.id} label={e.title} done={e.done} time={e.time} tag={e.tag} onChange={()=>toggleEv(k,e.id)}/>
            )):<div style={{fontSize:13,color:C.muted}}>Nothing yet — tap + to add</div>}
          </div>
        );
      })}

      {/* Weekly meal plan */}
      <div className="card">
        <SecTitle icon="🥗">WEEKLY MEAL PLAN</SecTitle>
        {wkDays.map(d=>{
          const k=mkKey(d.y,d.m,d.d);
          const m=meals[k]||{};
          if(!m.breakfast&&!m.lunch&&!m.dinner) return null;
          return (
            <div key={k} style={{marginBottom:10,padding:10,background:C.beige,borderRadius:10}}>
              <div style={{fontWeight:800,fontSize:12,color:C.brown,marginBottom:4}}>{DAYS[d.dow].slice(0,3)}, {MONTHS[d.m].slice(0,3)} {d.d}</div>
              <div style={{fontSize:12,color:C.textLt,display:"flex",gap:12,flexWrap:"wrap"}}>
                {m.breakfast&&<span>🌅 {m.breakfast}</span>}
                {m.lunch&&<span>☀️ {m.lunch}</span>}
                {m.dinner&&<span>🌙 {m.dinner}</span>}
              </div>
            </div>
          );
        })}
        {!wkDays.some(d=>{const m=meals[mkKey(d.y,d.m,d.d)]||{};return m.breakfast||m.lunch||m.dinner;})&&
          <div style={{fontSize:13,color:C.muted}}>Add meals in the Hub view for each day.</div>}
      </div>

      {/* Progress */}
      <div className="card">
        <SecTitle icon="📊">WEEKLY PROGRESS</SecTitle>
        {Object.entries(set.weekly_progress||{}).map(([k,v])=>(
          <div key={k} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
              <span style={{color:C.textLt,fontWeight:600}}>{k}</span>
              <span style={{fontWeight:800,color:C.brownLt}}>{v}%</span>
            </div>
            <ProgBar value={v}/>
          </div>
        ))}
      </div>

      {/* Week reset */}
      <div className="card">
        <SecTitle icon="🔄">WEEK RESET</SecTitle>
        {["Review the week","Plan next week","Celebrate wins","Rest & recharge","Set new intentions"].map((t,i)=><CheckItem key={i} label={t}/>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MONTHLY VIEW
// ═══════════════════════════════════════════════════════════════════════
function MonthlyView({cur,setCur,events,setAddSheet}){
  const [vm,setVm]=useState({y:cur.y,m:cur.m});
  const dim=daysInMonth(vm.y,vm.m),fd=firstDow(vm.y,vm.m);
  const cells=Array.from({length:fd+dim},(_,i)=>i<fd?null:i-fd+1);
  while(cells.length%7!==0)cells.push(null);
  const selDk=mkKey(cur.y,cur.m,cur.d);
  const selEvs=events[selDk]||[];

  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button className="btn btn-brown btn-icon" onClick={()=>setVm(v=>v.m===0?{y:v.y-1,m:11}:{y:v.y,m:v.m-1})}>‹</button>
        <div className="display" style={{flex:1,textAlign:"center",fontSize:22,fontWeight:700,color:C.brown}}>{MONTHS[vm.m]} {vm.y}</div>
        <button className="btn btn-brown btn-icon" onClick={()=>setVm(v=>v.m===11?{y:v.y+1,m:0}:{y:v.y,m:v.m+1})}>›</button>
      </div>

      {/* Calendar */}
      <div className="card" style={{padding:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:8}}>
          {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:800,color:C.muted}}>{d.slice(0,2).toUpperCase()}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {cells.map((day,i)=>{
            if(!day)return <div key={i}/>;
            const k=mkKey(vm.y,vm.m,day);
            const evs=events[k]||[];
            const isToday=day===T.d&&vm.m===T.m&&vm.y===T.y;
            const isSel=k===selDk&&vm.m===cur.m&&vm.y===cur.y;
            return (
              <div key={i} onClick={()=>setCur({y:vm.y,m:vm.m,d:day,dow:new Date(vm.y,vm.m,day).getDay()})}
                style={{minHeight:52,padding:4,borderRadius:10,cursor:"pointer",background:isSel?C.sage+"33":isToday?C.accent+"22":C.white,border:`1px solid ${isSel?C.sage:isToday?C.accent:C.beige}`,transition:"all .15s"}}>
                <div style={{fontSize:13,fontWeight:800,color:isToday?C.brown:C.textLt,marginBottom:2}}>{day}</div>
                {evs.slice(0,2).map(e=><div key={e.id} style={{fontSize:8,color:TYPE_C[e.type]||C.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:1}}>● {e.title}</div>)}
                {evs.length>2&&<div style={{fontSize:8,color:C.muted}}>+{evs.length-2}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      <div className="card">
        <SecTitle right={<button className="btn btn-sm btn-sage" onClick={()=>setAddSheet({dk:selDk})}>+ Add</button>}>
          <span style={{color:C.brown}}>{DAYS[cur.dow]}, {MONTHS[cur.m].slice(0,3)} {cur.d}</span>
        </SecTitle>
        {selEvs.length?selEvs.map(e=>(
          <div key={e.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.beige}`,fontSize:13,color:C.textLt}}>
            <TypeDot type={e.type}/>
            <span style={{flex:1}}>{e.title}</span>
            {e.time&&<span style={{fontSize:11,color:C.muted}}>{e.time}</span>}
            <TagBadge tag={e.tag}/>
          </div>
        )):<div style={{fontSize:13,color:C.muted,textAlign:"center",padding:12}}>Nothing on this day. Tap + to add!</div>}
      </div>

      {/* Legend */}
      <div className="card">
        <SecTitle icon="🏷">LEGEND</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {Object.entries(TYPE_C).map(([t,c])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:c,display:"inline-block",flexShrink:0}}/>
              <span style={{fontSize:13,color:C.textLt}}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MORE VIEW (Yearly + Meals DB + Settings)
// ═══════════════════════════════════════════════════════════════════════
function MoreView({cur,setCur,events,set,syncSet}){
  const [tab,setTab]=useState("yearly");
  const months=[];
  for(let i=0;i<12;i++){let m=5+i,y=2026;if(m>11){m-=12;y++;}months.push({y,m});}
  const [mealDB,setMealDB]=useState([
    {id:1,name:"Burrito bowls",cat:"Dinner",prep:"15 min",tags:"Quick, Family"},
    {id:2,name:"Quesadillas",cat:"Dinner",prep:"15 min",tags:"Quick, Kids"},
    {id:3,name:"Sheet pan chicken",cat:"Dinner",prep:"25 min",tags:"Healthy"},
    {id:4,name:"Greek yogurt + berries",cat:"Breakfast",prep:"5 min",tags:"Quick"},
    {id:5,name:"Turkey wraps",cat:"Lunch",prep:"10 min",tags:"Kids"},
    {id:6,name:"Pasta salad",cat:"Lunch",prep:"15 min",tags:"Kids"},
  ]);
  const [newMeal,setNewMeal]=useState({name:"",cat:"Dinner",prep:"",tags:""});

  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}>
      {/* Sub tabs */}
      <div style={{display:"flex",gap:8,background:C.beige,borderRadius:14,padding:4}}>
        {[["yearly","🌿 Yearly"],["meals","🍽 Meals"],["settings","⚙️ Settings"]].map(([id,l])=>(
          <button key={id} className="btn" style={{flex:1,padding:"10px 8px",fontSize:12,background:tab===id?C.white:"transparent",color:tab===id?C.brown:C.muted,boxShadow:tab===id?"0 2px 8px rgba(0,0,0,.08)":"none",borderRadius:10}} onClick={()=>setTab(id)}>{l}</button>
        ))}
      </div>

      {/* YEARLY */}
      {tab==="yearly"&&(
        <>
          <div className="display" style={{fontSize:18,fontWeight:700,color:C.brown}}>Year at a Glance · Jun 2026 – May 2027</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {months.map(({y,m})=>{
              const dim=daysInMonth(y,m),fd=firstDow(y,m);
              const cells=Array.from({length:fd+dim},(_,i)=>i<fd?null:i-fd+1);
              while(cells.length%7!==0)cells.push(null);
              return (
                <div key={`${y}-${m}`} className="card" style={{padding:10}}>
                  <div className="display" style={{fontSize:13,fontWeight:700,color:C.brown,marginBottom:8}}>{MONTHS[m].slice(0,3)} {y}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:3}}>
                    {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{fontSize:8,fontWeight:800,color:C.muted,textAlign:"center"}}>{d}</div>)}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
                    {cells.map((day,i)=>{
                      if(!day)return <div key={i}/>;
                      const k=mkKey(y,m,day);
                      const has=(events[k]||[]).length>0;
                      const isToday=day===T.d&&m===T.m&&y===T.y;
                      const isSel=day===cur.d&&m===cur.m&&y===cur.y;
                      return <div key={i} onClick={()=>setCur({y,m,d:day,dow:new Date(y,m,day).getDay()})} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,cursor:"pointer",borderRadius:3,background:isSel?C.sage:isToday?C.accent+"44":has?C.beige:"transparent",color:isSel?C.white:isToday?C.brown:C.textLt,fontWeight:isToday||isSel?800:400}}>{day}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MEALS DB */}
      {tab==="meals"&&(
        <>
          {["Breakfast","Lunch","Dinner","Snack"].map(cat=>{
            const catM=mealDB.filter(m=>m.cat===cat);
            if(!catM.length)return null;
            return (
              <div key={cat} className="card">
                <SecTitle>{cat}</SecTitle>
                {catM.map(m=>(
                  <div key={m.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.beige}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontWeight:700,fontSize:14,color:C.brown}}>{m.name}</div>
                      <div style={{fontSize:11,color:C.muted}}>⏱ {m.prep}</div>
                    </div>
                    <div style={{marginTop:4,display:"flex",gap:4,flexWrap:"wrap"}}>
                      {(m.tags||"").split(",").filter(Boolean).map(t=><span key={t} style={{background:C.sage+"22",color:C.sageDk,borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{t.trim()}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="card">
            <SecTitle icon="✚">ADD MEAL</SecTitle>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input className="inp" placeholder="Meal name…" value={newMeal.name} onChange={e=>setNewMeal(n=>({...n,name:e.target.value}))}/>
              <select className="sel" value={newMeal.cat} onChange={e=>setNewMeal(n=>({...n,cat:e.target.value}))}>
                {["Breakfast","Lunch","Dinner","Snack"].map(c=><option key={c}>{c}</option>)}
              </select>
              <div style={{display:"flex",gap:8}}>
                <input className="inp" placeholder="Prep time…" value={newMeal.prep} onChange={e=>setNewMeal(n=>({...n,prep:e.target.value}))} style={{flex:1}}/>
                <input className="inp" placeholder="Tags…" value={newMeal.tags} onChange={e=>setNewMeal(n=>({...n,tags:e.target.value}))} style={{flex:1}}/>
              </div>
              <button className="btn btn-sage" style={{width:"100%"}} onClick={()=>{if(newMeal.name.trim()){setMealDB(m=>[...m,{...newMeal,id:Date.now()}]);setNewMeal({name:"",cat:"Dinner",prep:"",tags:""});}}}>Add Meal</button>
            </div>
          </div>
        </>
      )}

      {/* SETTINGS */}
      {tab==="settings"&&(
        <>
          <div className="card">
            <SecTitle icon="⚡">ENERGY & MOOD</SecTitle>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:6}}>ENERGY LEVEL</div>
              <select className="sel" value={set.energy} onChange={e=>syncSet("energy",e.target.value)}>
                {Object.keys(ENERGY_RULES).map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:6}}>MOOD</div>
              <select className="sel" value={set.mood} onChange={e=>syncSet("mood",e.target.value)}>
                {["😊 Great","😐 Okay","😔 Low","😤 Stressed","😴 Tired"].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="card">
            <SecTitle icon="🌟">THEMES</SecTitle>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:6}}>TODAY'S THEME</div>
              <input className="inp" value={set.theme||""} onChange={e=>syncSet("theme",e.target.value)} placeholder="Today's theme…"/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:6}}>WEEK THEME</div>
              <input className="inp" value={set.weekly_theme||""} onChange={e=>syncSet("weekly_theme",e.target.value)} placeholder="Week theme…"/>
            </div>
          </div>
          <div className="card">
            <SecTitle icon="📊">WEEKLY PROGRESS</SecTitle>
            {Object.entries(set.weekly_progress||{}).map(([k,v])=>(
              <div key={k} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
                  <span style={{fontWeight:700}}>{k}</span>
                  <span style={{fontWeight:800,color:C.brownLt}}>{v}%</span>
                </div>
                <ProgBar value={v}/>
                <input type="range" min={0} max={100} value={v} onChange={e=>syncSet("weekly_progress",{...set.weekly_progress,[k]:parseInt(e.target.value)})} style={{width:"100%",marginTop:6,accentColor:C.sage}}/>
              </div>
            ))}
          </div>
          <div className="card" style={{background:C.beige,border:`1px solid ${C.sand}`}}>
            <SecTitle icon="🔌">SYNC STATUS</SecTitle>
            <div style={{fontSize:13,color:C.textLt,lineHeight:1.7}}>
              {DEMO?(
                <>
                  <div style={{marginBottom:8}}>🟡 <strong>Demo mode</strong> — data saves locally on your device only.</div>
                  <div style={{marginBottom:12}}>To share with your partner in real-time, connect Supabase.</div>
                  <div style={{fontWeight:700,color:C.brown,marginBottom:8}}>Setup steps:</div>
                  <div>1. <a href="https://supabase.com" target="_blank" style={{color:C.sage}}>supabase.com</a> → free account</div>
                  <div>2. SQL Editor → run SUPABASE_SETUP.sql</div>
                  <div>3. Copy URL + anon key into the .jsx file</div>
                  <div>4. Redeploy → both of you sync live!</div>
                </>
              ):(
                <div>🟢 <strong>Connected</strong> — syncing with your partner in real time!</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
