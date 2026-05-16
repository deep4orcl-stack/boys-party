import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import html2canvas from "html2canvas";

// ── Config ────────────────────────────────────────────────────────────────────
const ADMIN_PIN  = "1947";   // ← change your PIN here
const W_AMT      = 100;
const L_AMT      = 200;

const DEFAULT_MEMBERS = [
  "You (Admin)", "Naresh Kasiraju", "Suneel Talasila", "Vayunandan Reddy",
  "Vivek Kumar Voja", "Jagan Buchireddy", "Naresh Wells", "Sattibabu Wells", "Sravan Wells",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split("T")[0];
const fmtShort  = (d) => d ? new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "";
const fmtLong   = (d) => d ? new Date(d+"T00:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"}) : "";
const fmtFull   = (d) => d ? new Date(d+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : "";
const short     = (n) => n.replace(/ Kasiraju| Talasila| Reddy| Buchireddy| Wells| Voja/g,"").split(" ").slice(0,2).join(" ");
const amtFor    = (r) => r==="W" ? W_AMT : r==="L" ? L_AMT : 0;

// ── Capture a ref'd div and share/download as image ──────────────────────────
async function shareAsImage(ref, filename = "boyz-party.png") {
  const el = ref.current;
  if (!el) return;
  const canvas = await html2canvas(el, {
    backgroundColor: "#0a0f1a",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
  const file = new File([blob], filename, { type: "image/png" });
  // Try Web Share API (works on iPhone Safari / Android Chrome)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "Boyz Party Results" });
  } else {
    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}

// Cell tap cycle: null → W(unpaid) → W(paid) → L(unpaid) → L(paid) → null
const cycleCell = (e) => {
  if (!e?.result)                          return { result:"W", paid:false };
  if (e.result==="W" && !e.paid)           return { result:"W", paid:true  };
  if (e.result==="W" &&  e.paid)           return { result:"L", paid:false };
  if (e.result==="L" && !e.paid)           return { result:"L", paid:true  };
  return null;
};

async function cloud(data) {
  await setDoc(doc(db,"boyz-party","state"), data); // let errors bubble up
}


// ── PIN Modal ─────────────────────────────────────────────────────────────────
function PinModal({ onSuccess, onClose }) {
  const [pin,setPin]     = useState("");
  const [error,setError] = useState(false);
  const [shake,setShake] = useState(false);

  const check = (p) => {
    if (p === ADMIN_PIN) { sessionStorage.setItem("bz-admin","1"); onSuccess(); }
    else { setError(true); setShake(true); setPin(""); setTimeout(()=>setShake(false),500); }
  };

  const tap = (d) => {
    if (d==="⌫") { setPin(p=>p.slice(0,-1)); setError(false); return; }
    if (d==="✓") { check(pin); return; }
    if (pin.length >= 4) return;
    const np = pin+d; setPin(np); setError(false);
    if (np.length===4) setTimeout(()=>check(np),120);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"linear-gradient(145deg,#0f1f0f,#1a1200)",border:"1px solid rgba(255,154,60,0.35)",borderRadius:24,padding:"28px 24px",width:"100%",maxWidth:320,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:8}}>🔐</div>
        <div style={{color:"#ff9a3c",fontSize:18,fontWeight:800,marginBottom:4}}>Admin Access</div>
        <div style={{color:"rgba(255,200,120,0.45)",fontSize:13,marginBottom:22}}>Enter PIN to edit data</div>
        <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:20,animation:shake?"shake 0.4s ease":"none"}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{width:16,height:16,borderRadius:"50%",background:pin.length>i?"#ff9a3c":"rgba(255,255,255,0.12)",border:"2px solid rgba(255,154,60,0.4)",transition:"all 0.15s"}}/>
          ))}
        </div>
        {error && <div style={{color:"#f87171",fontSize:12,marginBottom:10,fontWeight:600}}>❌ Wrong PIN</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
          {["1","2","3","4","5","6","7","8","9","⌫","0","✓"].map(d=>(
            <button key={d} onClick={()=>tap(d)} style={{padding:"15px",borderRadius:12,border:"none",cursor:"pointer",fontSize:18,fontWeight:700,
              background:d==="✓"?"linear-gradient(135deg,#ff9a3c,#ff6b35)":d==="⌫"?"rgba(248,113,113,0.15)":"rgba(255,255,255,0.07)",
              color:d==="✓"?"#fff":d==="⌫"?"#f87171":"#fff",
              boxShadow:d==="✓"?"0 4px 16px rgba(255,154,60,0.3)":"none"}}>{d}</button>
          ))}
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:"rgba(255,200,120,0.35)",fontSize:13,cursor:"pointer"}}>Cancel · Stay as viewer</button>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`}</style>
    </div>
  );
}

// ── Cell Badge ────────────────────────────────────────────────────────────────
function Cell({ entry, isAdmin, onTap }) {
  const r = entry?.result; const p = entry?.paid;
  const isW = r==="W";
  const base = {width:46,height:38,borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:isAdmin?"pointer":"default",transition:"all 0.15s",userSelect:"none"};
  if (!r) return (
    <div onClick={isAdmin?onTap:null} style={{...base,background:"rgba(255,255,255,0.03)",border:"1px dashed rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.15)",fontSize:16}}>—</div>
  );
  return (
    <div onClick={isAdmin?onTap:null} style={{...base,
      background:isW?(p?"rgba(74,222,128,0.22)":"rgba(74,222,128,0.07)"):(p?"rgba(248,113,113,0.22)":"rgba(248,113,113,0.07)"),
      border:`1.5px solid ${isW?(p?"#4ade80":"rgba(74,222,128,0.3)"):(p?"#f87171":"rgba(248,113,113,0.3)")}`,
      boxShadow:p?`0 0 8px ${isW?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}`:""
    }}>
      <span style={{color:isW?"#4ade80":"#f87171",fontSize:14,fontWeight:900,lineHeight:1}}>{r}</span>
      {p && <span style={{color:isW?"#4ade80":"#f87171",fontSize:9,lineHeight:1.2}}>✓paid</span>}
      {!p && r && <span style={{color:"rgba(255,200,120,0.35)",fontSize:8,lineHeight:1.2}}>unpaid</span>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]         = useState("tracker");
  const [members,setMembers] = useState(DEFAULT_MEMBERS);
  // sessions: [{date:string, entries:{memberName:{result,paid}}}]
  const [sessions,setSessions] = useState([]);
  const [isAdmin,setIsAdmin] = useState(()=>sessionStorage.getItem("bz-admin")==="1");
  const [showPin,setShowPin] = useState(false);
  const [toast,setToast]     = useState("");
  const [loading,setLoading] = useState(true);
  const [saving,setSaving]   = useState(false);

  // Tracker UI state
  const [newDateVal,setNewDateVal]     = useState(todayStr());
  const [showDatePicker,setShowDatePicker] = useState(false);
  const [newMember,setNewMember]       = useState("");
  const [showAddMember,setShowAddMember] = useState(false);
  const [confirmDelete,setConfirmDelete] = useState(null); // member name to delete

  // Fix: skip Firebase snapshot right after our own write to avoid overwriting local state
  const skipSnap = useRef(false);

  // ── Firebase real-time listener ─────────────────────────────────────────
  useEffect(()=>{
    const unsub = onSnapshot(doc(db,"boyz-party","state"),(snap)=>{
      if (skipSnap.current) return;
      if (snap.exists()){
        const d=snap.data();
        if (d.members)  setMembers(d.members);
        if (d.sessions) {
          const s = d.sessions;
          setSessions(s);
        }
      }
      setLoading(false);
    },(err)=>{
      setLoading(false);
      const msg = err?.code==="permission-denied"
        ? "❌ Firestore Rules error — set rules to allow read/write"
        : "❌ Firebase connection failed — check firebase.js config";
      setToast(msg);
    });
    return ()=>unsub();
  },[]);

  // ── Persist helper ──────────────────────────────────────────────────────
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const persist = async (m, s) => {
    setSaving(true);
    skipSnap.current = true;
    try {
      await cloud({ members:m, sessions:s });
      setTimeout(()=>{ skipSnap.current=false; setSaving(false); }, 1200);
    } catch(e) {
      setSaving(false);
      skipSnap.current = false;
      const msg = e?.code === "permission-denied"
        ? "❌ Firestore Rules blocking writes — fix in Firebase Console"
        : e?.code === "unavailable"
        ? "❌ No internet — check connection"
        : "❌ Save failed: " + (e?.code || e?.message || "Check firebase.js config");
      showToast(msg);
    }
  };

  // ── Session helpers ─────────────────────────────────────────────────────
  const getEntry = (memberName, date) =>
    sessions.find(s=>s.date===date)?.entries?.[memberName] ?? null;

  const setEntry = async (memberName, date, entry) => {
    let updated = false;
    let newSessions = sessions.map(s=>{
      if (s.date!==date) return s;
      updated = true;
      const entries = { ...s.entries };
      if (entry===null) delete entries[memberName];
      else entries[memberName] = entry;
      return { ...s, entries };
    });
    if (!updated) {
      const entries = {};
      if (entry!==null) entries[memberName] = entry;
      newSessions = [...newSessions, {date, entries}].sort((a,b)=>b.date.localeCompare(a.date));
    }
    setSessions(newSessions);
    await persist(members, newSessions);
  };

  // ── Tap a cell → cycle its state ────────────────────────────────────────
  const tapCell = async (memberName, date) => {
    if (!isAdmin) { showToast("🔒 Admin access required"); return; }
    const next = cycleCell(getEntry(memberName, date));
    await setEntry(memberName, date, next);
  };

  // ── Add / delete date ────────────────────────────────────────────────────
  const addDate = async () => {
    if (!newDateVal) return;
    if (sessions.find(s=>s.date===newDateVal)) { showToast("Date already exists!"); return; }
    const newSessions = [...sessions, {date:newDateVal, entries:{}}].sort((a,b)=>b.date.localeCompare(a.date));
    setSessions(newSessions);
    await persist(members, newSessions);
    setShowDatePicker(false);
    showToast(`Added ${fmtShort(newDateVal)} ✓`);
  };

  const deleteDate = async (date) => {
    const newSessions = sessions.filter(s=>s.date!==date);
    setSessions(newSessions);
    await persist(members, newSessions);
    showToast("Date removed ✓");
  };

  // ── Add / delete member ──────────────────────────────────────────────────
  const addMember = async () => {
    const name = newMember.trim();
    if (!name) return;
    if (members.includes(name)) { showToast("Member already exists!"); return; }
    const nm = [...members, name];
    setMembers(nm);
    await persist(nm, sessions);
    setNewMember(""); setShowAddMember(false);
    showToast(`${name} added ✓`);
  };

  const deleteMember = async (name) => {
    const nm = members.filter(m=>m!==name);
    const ns = sessions.map(s=>{ const e={...s.entries}; delete e[name]; return {...s,entries:e}; });
    setMembers(nm); setSessions(ns);
    await persist(nm, ns);
    setConfirmDelete(null);
    showToast(`${short(name)} removed ✓`);
  };

  // ── Member totals (across all sessions) ─────────────────────────────────
  const memberTotals = (name) => {
    let paid=0, due=0, wins=0, losses=0;
    sessions.forEach(s=>{
      const e=s.entries?.[name];
      if (e?.result){
        const a=amtFor(e.result);
        if (e.result==="W") wins++; else losses++;
        if (e.paid) paid+=a; else due+=a;
      }
    });
    return {paid,due,wins,losses};
  };

  const grandTotal   = sessions.reduce((sum,s)=>{ let t=0; Object.values(s.entries||{}).forEach(e=>{ if(e?.result&&e?.paid) t+=amtFor(e.result); }); return sum+t; },0);
  const grandDue     = sessions.reduce((sum,s)=>{ let t=0; Object.values(s.entries||{}).forEach(e=>{ if(e?.result&&!e?.paid) t+=amtFor(e.result); }); return sum+t; },0);
  const grandExpected= grandTotal+grandDue;

  // ── TRACKER VIEW (table) ─────────────────────────────────────────────────
  const TrackerView = () => {
    const tableRef = useRef(null);

    const COL_W = 52;   // date column width
    const NAME_W = 110; // name column width

    return (
      <div style={{paddingBottom:20}}>

        {/* View-only banner */}
        {!isAdmin && (
          <div style={{background:"rgba(255,154,60,0.08)",border:"1px solid rgba(255,154,60,0.2)",borderRadius:12,padding:"9px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
            <span>👁️</span>
            <div style={{flex:1}}>
              <div style={{color:"#ff9a3c",fontSize:13,fontWeight:700}}>View Only</div>
              <div style={{color:"rgba(255,200,120,0.4)",fontSize:11}}>Tap any cell to see, Admin PIN needed to edit</div>
            </div>
            <button onClick={()=>setShowPin(true)} style={{background:"rgba(255,154,60,0.2)",border:"1px solid rgba(255,154,60,0.35)",color:"#ff9a3c",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🔐 Admin</button>
          </div>
        )}

        {/* Legend */}
        <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
          {[
            {bg:"rgba(74,222,128,0.22)",border:"#4ade80",label:"W paid"},
            {bg:"rgba(74,222,128,0.07)",border:"rgba(74,222,128,0.3)",label:"W unpaid"},
            {bg:"rgba(248,113,113,0.22)",border:"#f87171",label:"L paid"},
            {bg:"rgba(248,113,113,0.07)",border:"rgba(248,113,113,0.3)",label:"L unpaid"},
          ].map((l,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:14,height:14,borderRadius:3,background:l.bg,border:`1.5px solid ${l.border}`}}/>
              <span style={{color:"rgba(255,200,120,0.45)",fontSize:11}}>{l.label}</span>
            </div>
          ))}
          {isAdmin && <span style={{color:"rgba(255,200,120,0.3)",fontSize:11,marginLeft:"auto"}}>Tap cell to cycle W→L→paid</span>}
        </div>

        {/* Scrollable table */}
        <div style={{overflowX:"auto",borderRadius:16,border:"1px solid rgba(255,154,60,0.15)",background:"rgba(0,0,0,0.25)"}} ref={tableRef}>
          <table style={{borderCollapse:"collapse",minWidth:"100%"}}>

            {/* Header row */}
            <thead>
              <tr style={{background:"rgba(255,154,60,0.1)"}}>
                {/* Name header */}
                <th style={{...thStyle,width:NAME_W,minWidth:NAME_W,position:"sticky",left:0,background:"rgba(15,20,15,0.98)",zIndex:10,textAlign:"left",paddingLeft:12}}>
                  <div style={{color:"#ff9a3c",fontSize:12,fontWeight:700}}>Name</div>
                  <div style={{color:"rgba(255,200,120,0.3)",fontSize:10}}>{members.length} members</div>
                </th>

                {/* Date headers */}
                {sessions.map(s=>(
                  <th key={s.date} style={{...thStyle,width:COL_W,minWidth:COL_W}}>
                    <div style={{color:"#ff9a3c",fontSize:11,fontWeight:700}}>{fmtShort(s.date)}</div>
                    {isAdmin && (
                      <div onClick={()=>deleteDate(s.date)} style={{color:"rgba(248,113,113,0.5)",fontSize:10,cursor:"pointer",marginTop:2}}>✕</div>
                    )}
                  </th>
                ))}

                {/* Total Paid & Due headers */}
                <th style={{...thStyle,width:70,minWidth:70,background:"rgba(255,215,0,0.06)"}}>
                  <div style={{color:"#ffd700",fontSize:11,fontWeight:700}}>Paid</div>
                  <div style={{color:"rgba(255,215,0,0.35)",fontSize:9}}>total</div>
                </th>
                <th style={{...thStyle,width:70,minWidth:70,background:"rgba(248,113,113,0.06)"}}>
                  <div style={{color:"#f87171",fontSize:11,fontWeight:700}}>Due</div>
                  <div style={{color:"rgba(248,113,113,0.35)",fontSize:9}}>total</div>
                </th>
              </tr>
            </thead>

            {/* Member rows */}
            <tbody>
              {members.map((name,mi)=>{
                const {paid,due,wins,losses} = memberTotals(name);
                const isEven = mi%2===0;
                return (
                  <tr key={name} style={{background:isEven?"rgba(255,255,255,0.015)":"transparent"}}>

                    {/* Name cell */}
                    <td style={{...tdStyle,position:"sticky",left:0,background:isEven?"rgba(15,22,15,0.99)":"rgba(12,18,12,0.99)",zIndex:5,paddingLeft:12,paddingRight:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:"#fff",fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{short(name)}</div>
                          <div style={{display:"flex",gap:4,marginTop:2}}>
                            <span style={{color:"rgba(74,222,128,0.6)",fontSize:9}}>🏆{wins}</span>
                            <span style={{color:"rgba(248,113,113,0.6)",fontSize:9}}>💀{losses}</span>
                          </div>
                        </div>
                        {isAdmin && (
                          <div onClick={()=>setConfirmDelete(name)} style={{color:"rgba(248,113,113,0.4)",fontSize:14,cursor:"pointer",flexShrink:0,paddingLeft:4}}>🗑</div>
                        )}
                      </div>
                    </td>

                    {/* Date cells */}
                    {sessions.map(s=>(
                      <td key={s.date} style={{...tdStyle,textAlign:"center",padding:"6px 3px"}}>
                        <Cell entry={getEntry(name,s.date)} isAdmin={isAdmin} onTap={()=>tapCell(name,s.date)}/>
                      </td>
                    ))}

                    {/* Totals */}
                    <td style={{...tdStyle,textAlign:"center",background:"rgba(255,215,0,0.04)"}}>
                      <div style={{color:"#ffd700",fontSize:14,fontWeight:800}}>₹{paid}</div>
                    </td>
                    <td style={{...tdStyle,textAlign:"center",background:"rgba(248,113,113,0.04)"}}>
                      <div style={{color:due>0?"#f87171":"rgba(74,222,128,0.6)",fontSize:14,fontWeight:800}}>₹{due}</div>
                    </td>
                  </tr>
                );
              })}

              {/* Grand total row */}
              <tr style={{background:"rgba(255,154,60,0.08)",borderTop:"1px solid rgba(255,154,60,0.2)"}}>
                <td style={{...tdStyle,position:"sticky",left:0,background:"rgba(20,15,5,0.99)",zIndex:5,paddingLeft:12}}>
                  <div style={{color:"#ff9a3c",fontSize:12,fontWeight:700}}>TOTAL</div>
                </td>
                {sessions.map(s=>{
                  const colPaid = Object.entries(s.entries||{}).reduce((sum,[,e])=>e?.paid?sum+amtFor(e.result):sum,0);
                  return (
                    <td key={s.date} style={{...tdStyle,textAlign:"center"}}>
                      <div style={{color:"rgba(255,200,120,0.5)",fontSize:11,fontWeight:700}}>₹{colPaid}</div>
                    </td>
                  );
                })}
                <td style={{...tdStyle,textAlign:"center",background:"rgba(255,215,0,0.08)"}}>
                  <div style={{color:"#ffd700",fontSize:14,fontWeight:900}}>₹{grandTotal}</div>
                </td>
                <td style={{...tdStyle,textAlign:"center",background:"rgba(248,113,113,0.08)"}}>
                  <div style={{color:grandDue>0?"#f87171":"#4ade80",fontSize:14,fontWeight:900}}>₹{grandDue}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:10}}>

            {/* Add date */}
            {showDatePicker ? (
              <div style={{background:"rgba(255,154,60,0.08)",border:"1px solid rgba(255,154,60,0.2)",borderRadius:14,padding:"12px 14px",display:"flex",gap:10,alignItems:"center"}}>
                <input type="date" value={newDateVal} onChange={e=>setNewDateVal(e.target.value)}
                  style={{flex:1,background:"rgba(255,154,60,0.12)",border:"1px solid rgba(255,154,60,0.3)",color:"#ff9a3c",padding:"8px 10px",borderRadius:10,fontSize:13,outline:"none"}}/>
                <button onClick={addDate} style={{background:"#ff9a3c",border:"none",color:"#1a0a00",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Add</button>
                <button onClick={()=>setShowDatePicker(false)} style={{background:"rgba(255,255,255,0.07)",border:"none",color:"rgba(255,200,120,0.5)",borderRadius:10,padding:"8px 12px",fontSize:13,cursor:"pointer"}}>✕</button>
              </div>
            ) : (
              <button onClick={()=>setShowDatePicker(true)} style={{...btnOrange,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                ➕ Add New Date Column
              </button>
            )}

            {/* Add member */}
            {showAddMember ? (
              <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:14,padding:"12px 14px",display:"flex",gap:10,alignItems:"center"}}>
                <input autoFocus value={newMember} onChange={e=>setNewMember(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addMember()}
                  placeholder="Enter member name..."
                  style={{flex:1,background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.25)",color:"#fff",padding:"8px 10px",borderRadius:10,fontSize:13,outline:"none"}}/>
                <button onClick={addMember} style={{background:"#4ade80",border:"none",color:"#0d1a0d",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Add</button>
                <button onClick={()=>{setShowAddMember(false);setNewMember("");}} style={{background:"rgba(255,255,255,0.07)",border:"none",color:"rgba(255,200,120,0.5)",borderRadius:10,padding:"8px 12px",fontSize:13,cursor:"pointer"}}>✕</button>
              </div>
            ) : (
              <button onClick={()=>setShowAddMember(true)} style={{...btnGhost,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                👤 Add / Delete Member
              </button>
            )}
          </div>
        )}

        {/* Saving indicator */}
        {saving && <div style={{textAlign:"center",color:"rgba(255,200,120,0.4)",fontSize:12,marginTop:10}}>☁️ Saving...</div>}
      </div>
    );
  };

  // ── ALL DAYS VIEW ─────────────────────────────────────────────────────────
  const AllDaysView = () => {
    const [expanded,setExpanded]=useState(null);

    const memberTotalsAll = members.map(name=>{
      const {paid,due,wins,losses}=memberTotals(name);
      return {name,paid,due,wins,losses,days:sessions.filter(s=>s.entries?.[name]?.result).length};
    });

    const genAllMsg=()=>{
      let msg=`🍻 *Boyz Party – All Sessions*\n_Legends Cricket Association_ 🏏\n\n`;
      msg+=`📅 *Sessions:* ${sessions.length}\n💰 *Collected:* ₹${grandTotal} / ₹${grandExpected}\n`;
      if(grandDue>0) msg+=`⚠️ *Pending:* ₹${grandDue}\n`;
      msg+=`\n👤 *Member Summary:*\n`;
      memberTotalsAll.forEach(m=>{
        const s=m.due>0?`⏳₹${m.due} due`:m.days>0?"✅clear":"—";
        msg+=`\n*${short(m.name)}*: ₹${m.paid} paid | 🏆${m.wins} 💀${m.losses} | ${s}`;
      });
      return msg+`\n\n_Cheers! 🍻_`;
    };

    if(sessions.length===0) return(
      <div style={{textAlign:"center",padding:"60px 20px"}}>
        <div style={{fontSize:48,marginBottom:12}}>📭</div>
        <div style={{color:"rgba(255,200,120,0.4)",fontSize:16}}>No sessions yet</div>
        <div style={{color:"rgba(255,200,120,0.25)",fontSize:13,marginTop:8}}>Add a date in Tracker and start marking</div>
      </div>
    );

    return (
      <div style={{paddingBottom:20}}>
        <div style={bigCard}>
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{color:"rgba(255,200,120,0.4)",fontSize:10,textTransform:"uppercase",letterSpacing:2}}>All Sessions · Till Date</div>
            <div style={{color:"#ff9a3c",fontSize:20,fontWeight:900,marginTop:4}}>📊 Overall Summary</div>
            <div style={{color:"rgba(255,200,120,0.35)",fontSize:12}}>{sessions.length} sessions · live ☁️</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {[{label:"Collected",value:`₹${grandTotal}`,color:"#ffd700"},{label:"Expected",value:`₹${grandExpected}`,color:"#ff9a3c"},{label:"Still Due",value:`₹${grandDue}`,color:grandDue>0?"#f87171":"#4ade80"}]
              .map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 6px",textAlign:"center",border:`1px solid ${s.color}22`}}>
                  <div style={{color:s.color,fontSize:17,fontWeight:900}}>{s.value}</div>
                  <div style={{color:"rgba(255,255,255,0.35)",fontSize:10,marginTop:3}}>{s.label}</div>
                </div>
              ))}
          </div>
          <ProgressBar pct={grandExpected>0?Math.round(grandTotal/grandExpected*100):0}/>
        </div>

        {/* Member wise */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,154,60,0.15)",borderRadius:18,padding:"14px",marginBottom:14}}>
          <div style={{color:"#ff9a3c",fontSize:14,fontWeight:700,marginBottom:12,textAlign:"center"}}>👤 Member-wise Total</div>
          {memberTotalsAll.map((m,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<memberTotalsAll.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
              <div style={{width:30,height:30,borderRadius:8,background:m.due>0?"rgba(248,113,113,0.15)":m.days>0?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                {m.due>0?"⏳":m.days>0?"✅":"—"}
              </div>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontSize:13,fontWeight:600}}>{short(m.name)}</div>
                <div style={{color:"rgba(255,255,255,0.3)",fontSize:11}}>{m.days} sessions · <span style={{color:"#4ade80"}}>🏆{m.wins}</span> <span style={{color:"#f87171"}}>💀{m.losses}</span></div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:"#ffd700",fontSize:14,fontWeight:800}}>₹{m.paid}</div>
                {m.due>0&&<div style={{color:"#f87171",fontSize:11}}>₹{m.due} due</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Day by day accordion */}
        <div style={{marginBottom:14}}>
          <div style={{color:"#ff9a3c",fontSize:14,fontWeight:700,marginBottom:10,textAlign:"center"}}>📅 Day-by-Day</div>
          {sessions.map((s,si)=>{
            const isExp=expanded===s.date;
            const ents=Object.entries(s.entries||{});
            const paidE=ents.filter(([,e])=>e?.paid);
            const pendE=ents.filter(([,e])=>e?.result&&!e?.paid);
            const colPaid=paidE.reduce((sum,[,e])=>sum+amtFor(e.result),0);
            const colDue=pendE.reduce((sum,[,e])=>sum+amtFor(e.result),0);
            return (
              <div key={si} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,154,60,0.12)",borderRadius:14,marginBottom:8,overflow:"hidden"}}>
                <div onClick={()=>setExpanded(isExp?null:s.date)} style={{display:"flex",alignItems:"center",padding:"12px 14px",cursor:"pointer"}}>
                  <div style={{flex:1}}>
                    <div style={{color:"#ff9a3c",fontSize:14,fontWeight:700}}>{fmtLong(s.date)}</div>
                    <div style={{color:"rgba(255,255,255,0.3)",fontSize:11,marginTop:2}}>{paidE.length} paid · {pendE.length} pending</div>
                  </div>
                  <div style={{textAlign:"right",marginRight:10}}>
                    <div style={{color:"#ffd700",fontSize:15,fontWeight:800}}>₹{colPaid}</div>
                    {colDue>0&&<div style={{color:"#f87171",fontSize:11}}>₹{colDue} due</div>}
                  </div>
                  <div style={{color:"rgba(255,200,120,0.4)"}}>{isExp?"▲":"▼"}</div>
                </div>
                {isExp&&(
                  <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"10px 14px"}}>
                    {paidE.length>0&&<><div style={{color:"#4ade80",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>✅ Paid</div>
                      {paidE.map(([n,e],i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                          <span style={{color:"#fff",fontSize:12}}>{e.result==="W"?"🏆":"💀"} {short(n)}</span>
                          <span style={{color:"#4ade80",fontSize:12,fontWeight:700}}>₹{amtFor(e.result)}</span>
                        </div>
                      ))}</>}
                    {pendE.length>0&&<><div style={{color:"#f87171",fontSize:11,fontWeight:700,textTransform:"uppercase",margin:"8px 0 5px"}}>⏳ Pending</div>
                      {pendE.map(([n,e],i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                          <span style={{color:"rgba(255,255,255,0.6)",fontSize:12}}>{e.result==="W"?"🏆":"💀"} {short(n)}</span>
                          <span style={{color:"#f87171",fontSize:12,fontWeight:700}}>₹{amtFor(e.result)} due</span>
                        </div>
                      ))}</>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Share buttons ── */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>doShareAll(memberTotalsAll)} style={btnShare}>
            📸 Share as Image to WhatsApp
          </button>
        </div>
      </div>
    );
  };

  // ── Build & share All-Days scorecard image ─────────────────────────────────
  const allCardRef = useRef(null);
  const [sharingAll, setSharingAll] = useState(false);
  const [allCardData, setAllCardData] = useState(null);

  const doShareAll = async (memberTotalsAll) => {
    setSharingAll(true);
    setAllCardData(memberTotalsAll);
    // Wait for card to render
    await new Promise(r => setTimeout(r, 300));
    try {
      await shareAsImage(allCardRef, "boyz-party-summary.png");
    } catch(e) { showToast("Share failed: " + e.message); }
    setSharingAll(false);
    setAllCardData(null);
  };

  // ── Shared components ─────────────────────────────────────────────────────
  const [copied,setCopied]=useState(false);
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); showToast("Copied! 🍻"); setTimeout(()=>setCopied(false),3000); }
    catch { showToast("Copy failed."); }
  };

  const ProgressBar=({pct})=>(
    <div style={{background:"rgba(255,255,255,0.07)",borderRadius:999,height:10,overflow:"hidden",marginBottom:6}}>
      <div style={{height:"100%",borderRadius:999,background:pct===100?"linear-gradient(90deg,#4ade80,#22c55e)":"linear-gradient(90deg,#ff6b35,#ff9a3c,#ffd700)",width:`${pct}%`,transition:"width 0.5s",boxShadow:"0 0 12px rgba(255,154,60,0.4)"}}/>
    </div>
  );
  const Divider=({label,color,divColor})=>(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:1,background:divColor}}/><span style={{color,fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span><div style={{flex:1,height:1,background:divColor}}/>
    </div>
  );
  const SectionRows=({title,titleColor,divColor,items})=>{
    if(!items?.length) return null;
    return(
      <div style={{marginBottom:14}}>
        <Divider label={title} color={titleColor} divColor={divColor}/>
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
          {items.map((m,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",background:m.rowBg,borderRadius:10,padding:"8px 12px",border:`1px solid ${m.rowBorder}`}}>
              <span style={{fontSize:16,marginRight:8}}>{m.icon}</span>
              <span style={{flex:1,color:"#fff",fontSize:14,fontWeight:600}}>{m.name}</span>
              <span style={{color:m.amtColor,fontSize:13,fontWeight:700,marginRight:8}}>₹{m.amount}</span>
              <span style={{background:m.badgeBg,color:m.badgeColor,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{m.badge}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (loading) return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
      <div style={{fontSize:48}}>🍻</div>
      <div style={{color:"#ff9a3c",fontSize:18,fontWeight:700}}>Loading...</div>
      <div style={{color:"rgba(255,200,120,0.4)",fontSize:13}}>Syncing with cloud ☁️</div>
    </div>
  );

  const tabs=[["tracker","🎮 Tracker"],["alldays","📅 All Days"]];

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Segoe UI',sans-serif",paddingBottom:40}}>

      {/* PIN modal */}
      {showPin&&<PinModal onSuccess={()=>{setIsAdmin(true);setShowPin(false);showToast("🔓 Admin unlocked!");}} onClose={()=>setShowPin(false)}/>}

      {/* Confirm delete member */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"linear-gradient(145deg,#1a0f0f,#1a0500)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:20,padding:"24px",width:"100%",maxWidth:300,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:10}}>🗑️</div>
            <div style={{color:"#f87171",fontSize:16,fontWeight:700,marginBottom:6}}>Remove Member?</div>
            <div style={{color:"rgba(255,200,120,0.5)",fontSize:13,marginBottom:20}}>Remove <b style={{color:"#fff"}}>{short(confirmDelete)}</b> and all their data?</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>deleteMember(confirmDelete)} style={{flex:1,background:"#f87171",border:"none",color:"#1a0000",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Yes, Remove</button>
              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,background:"rgba(255,255,255,0.08)",border:"none",color:"rgba(255,200,120,0.5)",borderRadius:12,padding:"12px",fontSize:14,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:"#0a0f1a",color:"#fff",padding:"12px 20px",borderRadius:16,fontSize:13,zIndex:999,boxShadow:`0 4px 24px ${toast.startsWith("❌")?"rgba(248,113,113,0.4)":"rgba(255,120,0,0.4)"}`,border:`1px solid ${toast.startsWith("❌")?"rgba(248,113,113,0.5)":"rgba(255,150,50,0.4)"}`,maxWidth:"90vw",textAlign:"center",lineHeight:1.4}}>{toast}</div>}

      {/* Header */}
      <div style={{textAlign:"center",padding:"22px 16px 10px",position:"relative"}}>
        <div style={{fontSize:11,color:"rgba(255,200,120,0.35)",letterSpacing:3,textTransform:"uppercase"}}>Legends Cricket Association</div>
        <div style={{fontSize:30,margin:"4px 0"}}>🏏🍻</div>
        <h1 style={{color:"#ff9a3c",margin:0,fontSize:21,fontWeight:900,letterSpacing:-1,textShadow:"0 0 30px rgba(255,154,60,0.5)"}}>Boyz Party Tracker</h1>
        <button onClick={()=>isAdmin?(sessionStorage.removeItem("bz-admin"),setIsAdmin(false),showToast("Switched to view mode 👁️")):setShowPin(true)} style={{position:"absolute",top:22,right:14,background:isAdmin?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.07)",border:`1px solid ${isAdmin?"rgba(255,215,0,0.35)":"rgba(255,255,255,0.12)"}`,borderRadius:10,padding:"6px 10px",cursor:"pointer",color:isAdmin?"#ffd700":"rgba(255,200,120,0.4)",fontSize:11,fontWeight:700}}>
          {isAdmin?"🔓 Admin":"🔒 View"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",margin:"8px 16px 14px",background:"rgba(255,255,255,0.05)",borderRadius:14,padding:4,gap:3}}>
        {tabs.map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px 4px",borderRadius:10,border:"none",cursor:"pointer",
            background:tab===t?"rgba(255,154,60,0.25)":"transparent",
            color:tab===t?"#ff9a3c":"rgba(255,200,120,0.35)",
            fontSize:12,fontWeight:tab===t?700:400,transition:"all 0.2s"}}>{label}</button>
        ))}
      </div>

      <div style={{padding:"0 16px"}}>
        {tab==="tracker"&&<TrackerView/>}
        {tab==="alldays"&&<AllDaysView/>}
      </div>

      {/* ── Hidden scorecard rendered off-screen for screenshot ── */}
      {allCardData && (
        <div style={{position:"fixed",left:"-9999px",top:0,zIndex:-1}}>
          <div ref={allCardRef} style={{width:380,background:"#0a0f1a",padding:"24px 20px",fontFamily:"'Segoe UI',sans-serif"}}>
            {/* Header */}
            <div style={{textAlign:"center",marginBottom:20,paddingBottom:16,borderBottom:"1px solid rgba(255,154,60,0.3)"}}>
              <div style={{fontSize:28,marginBottom:4}}>🏏🍻</div>
              <div style={{color:"#ff9a3c",fontSize:20,fontWeight:900,letterSpacing:-0.5}}>Boyz Party</div>
              <div style={{color:"rgba(255,200,120,0.5)",fontSize:11,letterSpacing:2,textTransform:"uppercase",marginTop:3}}>Legends Cricket Association</div>
              <div style={{color:"rgba(255,200,120,0.35)",fontSize:12,marginTop:6}}>{sessions.length} sessions · Till Date</div>
            </div>

            {/* Grand totals */}
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              {[
                {label:"Collected",value:`₹${grandTotal}`,color:"#ffd700",bg:"rgba(255,215,0,0.1)"},
                {label:"Expected", value:`₹${grandExpected}`,color:"#ff9a3c",bg:"rgba(255,154,60,0.1)"},
                {label:"Pending",  value:`₹${grandDue}`, color:grandDue>0?"#f87171":"#4ade80",bg:grandDue>0?"rgba(248,113,113,0.1)":"rgba(74,222,128,0.1)"},
              ].map((s,i)=>(
                <div key={i} style={{flex:1,background:s.bg,borderRadius:10,padding:"10px 6px",textAlign:"center",border:`1px solid ${s.color}33`}}>
                  <div style={{color:s.color,fontSize:16,fontWeight:900}}>{s.value}</div>
                  <div style={{color:"rgba(255,255,255,0.4)",fontSize:9,textTransform:"uppercase",marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Member table */}
            <div style={{borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,154,60,0.2)"}}>
              {/* Table header */}
              <div style={{display:"flex",background:"rgba(255,154,60,0.15)",padding:"8px 12px"}}>
                <div style={{flex:1,color:"#ff9a3c",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Member</div>
                <div style={{width:50,textAlign:"center",color:"#4ade80",fontSize:11,fontWeight:700}}>🏆 W</div>
                <div style={{width:50,textAlign:"center",color:"#f87171",fontSize:11,fontWeight:700}}>💀 L</div>
                <div style={{width:60,textAlign:"right",color:"#ffd700",fontSize:11,fontWeight:700}}>Paid</div>
                <div style={{width:55,textAlign:"right",color:"#f87171",fontSize:11,fontWeight:700}}>Due</div>
              </div>

              {/* Member rows */}
              {allCardData.map((m,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",padding:"10px 12px",background:i%2===0?"rgba(255,255,255,0.02)":"transparent",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{flex:1}}>
                    <div style={{color:"#fff",fontSize:13,fontWeight:600}}>{short(m.name)}</div>
                    <div style={{color:"rgba(255,255,255,0.3)",fontSize:10}}>{m.days} sessions</div>
                  </div>
                  <div style={{width:50,textAlign:"center",color:"#4ade80",fontSize:14,fontWeight:700}}>{m.wins}</div>
                  <div style={{width:50,textAlign:"center",color:"#f87171",fontSize:14,fontWeight:700}}>{m.losses}</div>
                  <div style={{width:60,textAlign:"right",color:"#ffd700",fontSize:14,fontWeight:800}}>₹{m.paid}</div>
                  <div style={{width:55,textAlign:"right",color:m.due>0?"#f87171":"rgba(74,222,128,0.5)",fontSize:14,fontWeight:800}}>₹{m.due}</div>
                </div>
              ))}

              {/* Totals row */}
              <div style={{display:"flex",alignItems:"center",padding:"10px 12px",background:"rgba(255,154,60,0.1)",borderTop:"1px solid rgba(255,154,60,0.25)"}}>
                <div style={{flex:1,color:"#ff9a3c",fontSize:13,fontWeight:700}}>TOTAL</div>
                <div style={{width:50}}/>
                <div style={{width:50}}/>
                <div style={{width:60,textAlign:"right",color:"#ffd700",fontSize:15,fontWeight:900}}>₹{grandTotal}</div>
                <div style={{width:55,textAlign:"right",color:grandDue>0?"#f87171":"#4ade80",fontSize:15,fontWeight:900}}>₹{grandDue}</div>
              </div>
            </div>

            {/* Date grid */}
            {sessions.length>0&&(
              <div style={{marginTop:20}}>
                <div style={{color:"rgba(255,200,120,0.4)",fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:10,textAlign:"center"}}>Game Results by Date</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{borderCollapse:"collapse",width:"100%"}}>
                    <thead>
                      <tr>
                        <th style={{color:"rgba(255,200,120,0.5)",fontSize:10,fontWeight:600,textAlign:"left",padding:"4px 6px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>Name</th>
                        {sessions.map(s=>(
                          <th key={s.date} style={{color:"#ff9a3c",fontSize:10,fontWeight:700,textAlign:"center",padding:"4px 4px",borderBottom:"1px solid rgba(255,255,255,0.08)",whiteSpace:"nowrap"}}>{fmtShort(s.date)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((name,mi)=>(
                        <tr key={name} style={{background:mi%2===0?"rgba(255,255,255,0.015)":"transparent"}}>
                          <td style={{color:"#fff",fontSize:11,padding:"5px 6px",borderBottom:"1px solid rgba(255,255,255,0.04)",whiteSpace:"nowrap"}}>{short(name)}</td>
                          {sessions.map(s=>{
                            const e=s.entries?.[name];
                            const isW=e?.result==="W"; const isL=e?.result==="L";
                            return (
                              <td key={s.date} style={{textAlign:"center",padding:"5px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                                {e?.result ? (
                                  <span style={{display:"inline-block",width:28,height:22,lineHeight:"22px",borderRadius:5,fontSize:10,fontWeight:800,textAlign:"center",
                                    background:isW?(e.paid?"rgba(74,222,128,0.3)":"rgba(74,222,128,0.08)"):(e.paid?"rgba(248,113,113,0.3)":"rgba(248,113,113,0.08)"),
                                    color:isW?"#4ade80":"#f87171",
                                    border:`1px solid ${isW?(e.paid?"#4ade80":"rgba(74,222,128,0.3)"):(e.paid?"#f87171":"rgba(248,113,113,0.3)")}`
                                  }}>{e.result}{e.paid?"✓":""}</span>
                                ) : <span style={{color:"rgba(255,255,255,0.15)",fontSize:10}}>—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{textAlign:"center",marginTop:20,paddingTop:14,borderTop:"1px solid rgba(255,154,60,0.2)"}}>
              <div style={{color:"rgba(255,200,120,0.25)",fontSize:10}}>Generated by Boyz Party Tracker 🏏</div>
            </div>
          </div>
        </div>
      )}

      {/* Sharing spinner overlay */}
      {sharingAll&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
          <div style={{fontSize:40}}>📸</div>
          <div style={{color:"#ff9a3c",fontSize:16,fontWeight:700}}>Generating image...</div>
          <div style={{color:"rgba(255,200,120,0.4)",fontSize:13}}>Share sheet will open shortly</div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const BG         = "linear-gradient(160deg,#0a0f1a 0%,#0a1a0a 40%,#1a0d00 100%)";
const bigCard    = {background:"linear-gradient(145deg,#0f1f0f,#1a1200,#0f0f1f)",border:"1px solid rgba(255,154,60,0.25)",borderRadius:20,padding:"18px 16px",marginBottom:14};
const thStyle    = {padding:"10px 4px",textAlign:"center",borderBottom:"1px solid rgba(255,154,60,0.15)",whiteSpace:"nowrap"};
const tdStyle    = {padding:"6px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)"};
const btnOrange  = {width:"100%",background:"rgba(255,154,60,0.12)",color:"#ff9a3c",border:"1px solid rgba(255,154,60,0.25)",borderRadius:12,padding:"13px",fontSize:13,fontWeight:600,cursor:"pointer"};
const btnGhost   = {width:"100%",background:"rgba(255,255,255,0.04)",color:"rgba(255,200,120,0.5)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px",fontSize:13,cursor:"pointer"};
const btnWhatsApp= {width:"100%",background:"linear-gradient(135deg,#25D366,#128C7E)",color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 20px rgba(37,211,102,0.3)"};
const btnShare   = {width:"100%",background:"linear-gradient(135deg,#25D366,#128C7E)",color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 20px rgba(37,211,102,0.3)"};
