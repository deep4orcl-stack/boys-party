import { useState, useEffect } from "react";

const DEFAULT_MEMBERS = [
  "You (Admin)", "Naresh Kasiraju", "Suneel Talasila", "Vayunandan Reddy",
  "Vivek Kumar Voja", "Jagan Buchireddy", "Naresh Wells", "Sattibabu Wells", "Sravan Wells"
];
const STORAGE_KEY = "booze-party-legends-v3";

function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function fmtLong(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function load() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function persist(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function shortName(n) {
  return n.replace(" Kasiraju","").replace(" Talasila","").replace(" Reddy","")
    .replace(" Buchireddy","").replace(" Wells","").replace(" Voja","")
    .split(" ").slice(0,2).join(" ");
}

export default function App() {
  const [tab, setTab]         = useState("tracker");
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [results, setResults] = useState(Array(9).fill(null));
  const [date, setDate]       = useState(todayStr());
  const [payments, setPayments] = useState({});
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName]       = useState("");
  const [copied, setCopied]   = useState(false);
  const [toast, setToast]     = useState("");
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const s = load();
    if (s) {
      if (s.members)  setMembers(s.members);
      if (s.results)  setResults(s.results);
      if (s.payments) setPayments(s.payments);
      if (s.sessions) setSessions(s.sessions);
    }
  }, []);

  useEffect(() => { persist({ members, results, payments, sessions }); }, [members, results, payments, sessions]);

  const amt  = (i) => results[i] === "W" ? 100 : results[i] === "L" ? 200 : null;
  const pk   = (i) => `${date}-${i}`;
  const paid = (i) => !!payments[pk(i)];

  const toggleR = (i, v) => {
    setResults(p => { const u=[...p]; u[i] = p[i]===v ? null : v; return u; });
    setPayments(p => { const u={...p}; delete u[pk(i)]; return u; });
  };
  const toggleP = (i) => {
    if (!results[i]) { showToast("Set W or L first! 🏏"); return; }
    setPayments(p => { const k=pk(i); const u={...p}; u[k] ? delete u[k] : u[k]=true; return u; });
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const winners     = members.filter((_,i) => results[i]==="W");
  const losers      = members.filter((_,i) => results[i]==="L");
  const paidList    = members.filter((_,i) => paid(i));
  const pendingList = members.filter((_,i) => results[i] && !paid(i));
  const notSet      = members.filter((_,i) => !results[i]);
  const eligible    = members.filter((_,i) => results[i] !== null).length;
  const totalExp    = results.reduce((s,r) => s+(r==="W"?100:r==="L"?200:0), 0);
  const totalColl   = members.reduce((s,_,i) => paid(i)?s+(amt(i)||0):s, 0);
  const progress    = totalExp>0 ? Math.round(totalColl/totalExp*100) : 0;

  const saveSession = () => {
    const memberData = members.map((name,i) => ({
      name, result: results[i], paid: paid(i),
      amount: paid(i) ? (amt(i)||0) : 0,
      due: results[i] && !paid(i) ? (amt(i)||0) : 0
    }));
    setSessions(prev => {
      const filtered = prev.filter(s => s.date !== date);
      return [{ date, memberData, totalColl, totalExp }, ...filtered]
        .sort((a,b) => b.date.localeCompare(a.date));
    });
    showToast("Session saved ✓");
  };

  const resetDay = () => {
    setResults(Array(9).fill(null));
    setPayments(p => { const u={...p}; members.forEach((_,i)=>delete u[pk(i)]); return u; });
    showToast("Reset! ✓");
  };

  const genMsg = () => {
    const wl = winners.length>0  ? winners.map(m=>`🏆 ${m} — ₹100`).join("\n") : "None";
    const ll = losers.length>0   ? losers.map(m=>`💀 ${m} — ₹200`).join("\n")  : "None";
    const pl = paidList.length>0 ? paidList.map(m=>{const i=members.indexOf(m);return `✅ ${m} (₹${amt(i)})`;}).join("\n") : "None yet";
    const pe = pendingList.length>0 ? pendingList.map(m=>{const i=members.indexOf(m);return `⏳ ${m} — ₹${amt(i)} pending`;}).join("\n") : "All paid! 🎉";
    return `🍻 *Booze Party – ${fmtDate(date)}*\n_Legends Cricket Association_ 🏏\n\n🎮 *Game Results:*\n${wl}\n${ll}\n\n💰 *Collected:* ₹${totalColl} / ₹${totalExp}\n\n✅ *Paid:*\n${pl}\n\n⏳ *Pending:*\n${pe}\n\n_Pay up or next round is on you! 😄_`;
  };

  const copyMsg = async (text) => {
    try {
      await navigator.clipboard.writeText(text || genMsg());
      setCopied(true); showToast("Copied! Paste in WhatsApp 🍻");
      setTimeout(() => setCopied(false), 3000);
    } catch { showToast("Copy failed."); }
  };

  const BG = "linear-gradient(160deg,#0a0f1a 0%,#0a1a0a 40%,#1a0d00 100%)";

  // ── TRACKER ─────────────────────────────────────────────────────────────────
  const TrackerView = () => (
    <div>
      {/* Date picker */}
      <div style={card}>
        <span>📅</span>
        <div style={{flex:1}}>
          <div style={sublabel}>Match Date</div>
          <div style={{color:"#ff9a3c",fontSize:13,fontWeight:700}}>{fmtDate(date)}</div>
        </div>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{background:"rgba(255,154,60,0.12)",border:"1px solid rgba(255,154,60,0.3)",color:"#ff9a3c",padding:"5px 8px",borderRadius:10,fontSize:13,outline:"none"}} />
      </div>

      {/* Mini stats */}
      <div style={{...card,marginBottom:12}}>
        <div style={{flex:1}}>
          <div style={sublabel}>Today's Collection</div>
          <div style={{color:"#fff",fontSize:20,fontWeight:900}}>₹{totalColl} <span style={{color:"rgba(255,200,120,0.35)",fontSize:13,fontWeight:400}}>/ ₹{totalExp}</span></div>
        </div>
        <StatPill value={`${winners.length} 🏆`} label="winners" color="#4ade80"/>
        <StatPill value={`${losers.length} 💀`}  label="losers"  color="#f87171"/>
        <StatPill value={`${progress}%`}          label="done"    color="#ffd700"/>
      </div>

      <div style={{textAlign:"center",color:"rgba(255,200,120,0.3)",fontSize:12,marginBottom:10}}>
        Tap <span style={{color:"#4ade80",fontWeight:700}}>W</span> / <span style={{color:"#f87171",fontWeight:700}}>L</span> → then ✓ when paid
      </div>

      {members.map((name,i) => {
        const r=results[i]; const p=paid(i); const a=amt(i);
        return (
          <div key={i} style={{
            background: p?"rgba(255,215,0,0.07)":r?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)",
            border:`1px solid ${p?"rgba(255,215,0,0.25)":r==="W"?"rgba(74,222,128,0.2)":r==="L"?"rgba(248,113,113,0.2)":"rgba(255,255,255,0.06)"}`,
            borderRadius:14,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8
          }}>
            <div onClick={()=>toggleP(i)} style={{
              width:30,height:30,borderRadius:8,cursor:r?"pointer":"not-allowed",flexShrink:0,
              background:p?"linear-gradient(135deg,#ffd700,#ff9a3c)":"rgba(255,255,255,0.05)",
              border:`2px solid ${p?"transparent":r?"rgba(255,154,60,0.3)":"rgba(255,255,255,0.08)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:15,color:"#1a0a00",fontWeight:900,opacity:r?1:0.3
            }}>{p?"✓":""}</div>

            {editingName===i ? (
              <input autoFocus value={tempName} onChange={e=>setTempName(e.target.value)}
                onBlur={()=>{ if(tempName.trim()){const u=[...members];u[i]=tempName.trim();setMembers(u);} setEditingName(null); }}
                onKeyDown={e=>e.key==="Enter"&&e.target.blur()}
                style={{flex:1,background:"rgba(255,154,60,0.1)",border:"1px solid rgba(255,154,60,0.4)",color:"#fff",padding:"4px 8px",borderRadius:6,fontSize:13,outline:"none"}} />
            ) : (
              <div onClick={()=>{setEditingName(i);setTempName(name);}} style={{flex:1,cursor:"text"}}>
                <div style={{color:p?"#ffd700":r==="W"?"#4ade80":r==="L"?"#f87171":"#fff",fontSize:14,fontWeight:p?700:500}}>{shortName(name)}</div>
                {name!==shortName(name)&&<div style={{color:"rgba(255,255,255,0.2)",fontSize:10}}>{name}</div>}
              </div>
            )}

            {a&&<span style={{fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:6,
              background:r==="W"?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.12)",
              color:r==="W"?"#4ade80":"#f87171",
              border:`1px solid ${r==="W"?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"}`}}>₹{a}</span>}

            <button onClick={()=>toggleR(i,"W")} style={{...wlBtn, background:r==="W"?"#4ade80":"rgba(74,222,128,0.08)", color:r==="W"?"#0d1a0d":"rgba(74,222,128,0.4)", boxShadow:r==="W"?"0 0 12px rgba(74,222,128,0.4)":"none"}}>W</button>
            <button onClick={()=>toggleR(i,"L")} style={{...wlBtn, background:r==="L"?"#f87171":"rgba(248,113,113,0.08)", color:r==="L"?"#1a0000":"rgba(248,113,113,0.4)", boxShadow:r==="L"?"0 0 12px rgba(248,113,113,0.4)":"none"}}>L</button>
          </div>
        );
      })}

      <div style={{display:"flex",gap:10,marginTop:6}}>
        <button onClick={saveSession} style={btnOrange}>💾 Save Session</button>
        <button onClick={resetDay}    style={btnGhost}>🔄 Reset</button>
      </div>
    </div>
  );

  // ── TODAY SUMMARY ────────────────────────────────────────────────────────────
  const SummaryView = () => (
    <div style={{paddingBottom:20}}>
      <div style={bigCard}>
        <div style={{textAlign:"center",borderBottom:"1px solid rgba(255,154,60,0.15)",paddingBottom:14,marginBottom:16}}>
          <div style={{fontSize:11,color:"rgba(255,200,120,0.45)",letterSpacing:3,textTransform:"uppercase"}}>Legends Cricket Association 🏏</div>
          <div style={{fontSize:22,fontWeight:900,color:"#ff9a3c",marginTop:4}}>🍻 Booze Party</div>
          <div style={{fontSize:13,color:"rgba(255,200,120,0.5)",marginTop:2}}>{fmtLong(date)}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[
            {label:"Collected",value:`₹${totalColl}`,sub:`of ₹${totalExp}`,color:"#ffd700"},
            {label:"Winners 🏆",value:winners.length,sub:"₹100 each",color:"#4ade80"},
            {label:"Losers 💀",value:losers.length,sub:"₹200 each",color:"#f87171"},
          ].map((s,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 6px",textAlign:"center",border:`1px solid ${s.color}22`}}>
              <div style={{color:s.color,fontSize:20,fontWeight:900}}>{s.value}</div>
              <div style={{color:"rgba(255,255,255,0.45)",fontSize:10,textTransform:"uppercase"}}>{s.label}</div>
              <div style={{color:"rgba(255,255,255,0.25)",fontSize:10,marginTop:2}}>{s.sub}</div>
            </div>
          ))}
        </div>

        <ProgressBar pct={progress} />
        <div style={{color:"rgba(255,200,120,0.35)",fontSize:11,textAlign:"center",marginBottom:16}}>{paidList.length} paid · {pendingList.length} pending · {notSet.length} not set · {progress}%</div>

        <SectionRows title={`✅ PAID (${paidList.length})`} titleColor="#4ade80" divColor="rgba(74,222,128,0.2)"
          items={paidList.map(m=>{const i=members.indexOf(m);return{name:shortName(m),icon:results[i]==="W"?"🏆":"💀",amount:amt(i),badge:"PAID",badgeBg:"rgba(74,222,128,0.2)",badgeColor:"#4ade80",rowBg:"rgba(74,222,128,0.06)",rowBorder:"rgba(74,222,128,0.15)",amtColor:results[i]==="W"?"#4ade80":"#f87171"};})}/>

        <SectionRows title={`⏳ PENDING (${pendingList.length})`} titleColor="#f87171" divColor="rgba(248,113,113,0.2)"
          items={pendingList.map(m=>{const i=members.indexOf(m);return{name:shortName(m),icon:results[i]==="W"?"🏆":"💀",amount:amt(i),badge:"DUE",badgeBg:"rgba(248,113,113,0.15)",badgeColor:"#f87171",rowBg:"rgba(248,113,113,0.05)",rowBorder:"rgba(248,113,113,0.15)",amtColor:results[i]==="W"?"#4ade80":"#f87171"};})}/>

        {notSet.length>0&&(
          <div style={{marginTop:12}}>
            <Divider label={`⚪ NOT SET (${notSet.length})`} color="rgba(255,255,255,0.3)" divColor="rgba(255,255,255,0.08)"/>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
              {notSet.map((m,i)=><span key={i} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.35)",fontSize:12,padding:"4px 10px",borderRadius:20}}>{shortName(m)}</span>)}
            </div>
          </div>
        )}

        {progress===100&&eligible===9&&(
          <div style={{textAlign:"center",marginTop:14,padding:"12px",background:"rgba(74,222,128,0.1)",borderRadius:12,border:"1px solid rgba(74,222,128,0.25)"}}>
            <div style={{fontSize:24}}>🎉</div>
            <div style={{color:"#4ade80",fontSize:15,fontWeight:700}}>All collected! Cheers! 🍻</div>
          </div>
        )}
      </div>
      <button onClick={()=>copyMsg()} style={btnWhatsApp}>{copied?"✓ Copied!":"📲 Copy WhatsApp Message"}</button>
    </div>
  );

  // ── ALL DAYS ─────────────────────────────────────────────────────────────────
  const AllDaysView = () => {
    const [expanded, setExpanded] = useState(null);

    if (sessions.length===0) return (
      <div style={{textAlign:"center",padding:"60px 20px"}}>
        <div style={{fontSize:48,marginBottom:12}}>📭</div>
        <div style={{color:"rgba(255,200,120,0.4)",fontSize:16}}>No sessions saved yet</div>
        <div style={{color:"rgba(255,200,120,0.25)",fontSize:13,marginTop:8}}>Go to Tracker → enter results → tap 💾 Save Session</div>
      </div>
    );

    const memberTotals = members.map(name => {
      let totalPaid=0,totalDue=0,wins=0,losses=0,days=0;
      sessions.forEach(s=>{
        const md=s.memberData?.find(m=>m.name===name);
        if(md&&md.result){days++;if(md.result==="W")wins++;else losses++;totalPaid+=md.amount||0;totalDue+=md.due||0;}
      });
      return {name,totalPaid,totalDue,wins,losses,days};
    });

    const grandTotal    = sessions.reduce((s,x)=>s+(x.totalColl||0),0);
    const grandExpected = sessions.reduce((s,x)=>s+(x.totalExp||0),0);
    const totalDueAll   = memberTotals.reduce((s,m)=>s+m.totalDue,0);

    const genAllMsg = () => {
      let msg=`🍻 *Booze Party – All Sessions Summary*\n_Legends Cricket Association_ 🏏\n\n`;
      msg+=`📅 *Total Sessions:* ${sessions.length}\n💰 *Total Collected:* ₹${grandTotal} / ₹${grandExpected}\n`;
      if(totalDueAll>0) msg+=`⚠️ *Total Pending:* ₹${totalDueAll}\n`;
      msg+=`\n👤 *Member-wise Summary:*\n`;
      memberTotals.forEach(m=>{
        const status=m.totalDue>0?`⏳ ₹${m.totalDue} due`:m.days>0?"✅ All clear":"—";
        msg+=`\n*${shortName(m.name)}*: Paid ₹${m.totalPaid} | 🏆${m.wins} 💀${m.losses} | ${status}`;
      });
      msg+=`\n\n_Cheers! 🍻_`;
      return msg;
    };

    return (
      <div style={{paddingBottom:20}}>
        {/* Grand total card */}
        <div style={bigCard}>
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{color:"rgba(255,200,120,0.4)",fontSize:10,textTransform:"uppercase",letterSpacing:2}}>All Sessions · Till Date</div>
            <div style={{color:"#ff9a3c",fontSize:20,fontWeight:900,marginTop:4}}>📊 Overall Summary</div>
            <div style={{color:"rgba(255,200,120,0.35)",fontSize:12}}>{sessions.length} sessions recorded</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {[
              {label:"Collected",value:`₹${grandTotal}`,color:"#ffd700"},
              {label:"Expected",value:`₹${grandExpected}`,color:"#ff9a3c"},
              {label:"Still Due",value:`₹${totalDueAll}`,color:totalDueAll>0?"#f87171":"#4ade80"},
            ].map((s,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 6px",textAlign:"center",border:`1px solid ${s.color}22`}}>
                <div style={{color:s.color,fontSize:17,fontWeight:900}}>{s.value}</div>
                <div style={{color:"rgba(255,255,255,0.35)",fontSize:10,marginTop:3}}>{s.label}</div>
              </div>
            ))}
          </div>
          <ProgressBar pct={grandExpected>0?Math.round(grandTotal/grandExpected*100):0}/>
          <div style={{color:"rgba(255,200,120,0.35)",fontSize:11,textAlign:"center",marginTop:6}}>
            {grandExpected>0?Math.round(grandTotal/grandExpected*100):0}% collected overall
          </div>
        </div>

        {/* Per-member totals */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,154,60,0.15)",borderRadius:18,padding:"16px",marginBottom:14}}>
          <div style={{color:"#ff9a3c",fontSize:14,fontWeight:700,marginBottom:12,textAlign:"center"}}>👤 Member-wise Total</div>
          {memberTotals.map((m,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<memberTotals.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
              <div style={{width:32,height:32,borderRadius:8,background:m.totalDue>0?"rgba(248,113,113,0.15)":m.days>0?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                {m.totalDue>0?"⏳":m.days>0?"✅":"—"}
              </div>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontSize:14,fontWeight:600}}>{shortName(m.name)}</div>
                <div style={{color:"rgba(255,255,255,0.3)",fontSize:11}}>{m.days} sessions &nbsp;·&nbsp; <span style={{color:"#4ade80"}}>🏆{m.wins}</span> <span style={{color:"#f87171"}}>💀{m.losses}</span></div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:"#ffd700",fontSize:15,fontWeight:800}}>₹{m.totalPaid}</div>
                {m.totalDue>0&&<div style={{color:"#f87171",fontSize:11}}>₹{m.totalDue} due</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Day-by-day */}
        <div style={{marginBottom:14}}>
          <div style={{color:"#ff9a3c",fontSize:14,fontWeight:700,marginBottom:10,textAlign:"center"}}>📅 Day-by-Day Breakdown</div>
          {sessions.map((s,si)=>{
            const isExp=expanded===s.date;
            const sPaid    = s.memberData?.filter(m=>m.paid)||[];
            const sPending = s.memberData?.filter(m=>m.result&&!m.paid)||[];
            const sWinners = s.memberData?.filter(m=>m.result==="W")||[];
            const sLosers  = s.memberData?.filter(m=>m.result==="L")||[];
            return (
              <div key={si} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,154,60,0.12)",borderRadius:14,marginBottom:8,overflow:"hidden"}}>
                <div onClick={()=>setExpanded(isExp?null:s.date)} style={{display:"flex",alignItems:"center",padding:"12px 14px",cursor:"pointer"}}>
                  <div style={{flex:1}}>
                    <div style={{color:"#ff9a3c",fontSize:14,fontWeight:700}}>{fmtDate(s.date)}</div>
                    <div style={{color:"rgba(255,255,255,0.3)",fontSize:11,marginTop:2}}>
                      🏆{sWinners.length} &nbsp;💀{sLosers.length} &nbsp;·&nbsp; {sPaid.length} paid · {sPending.length} pending
                    </div>
                  </div>
                  <div style={{textAlign:"right",marginRight:10}}>
                    <div style={{color:"#ffd700",fontSize:16,fontWeight:800}}>₹{s.totalColl}</div>
                    <div style={{color:"rgba(255,200,120,0.35)",fontSize:11}}>of ₹{s.totalExp}</div>
                  </div>
                  <div style={{color:"rgba(255,200,120,0.4)",fontSize:16}}>{isExp?"▲":"▼"}</div>
                </div>
                {isExp&&(
                  <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"12px 14px"}}>
                    {sPaid.length>0&&<>
                      <div style={{color:"#4ade80",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>✅ Paid</div>
                      {sPaid.map((m,mi)=>(
                        <div key={mi} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                          <span style={{color:"#fff",fontSize:13}}>{m.result==="W"?"🏆":"💀"} {shortName(m.name)}</span>
                          <span style={{color:"#4ade80",fontSize:13,fontWeight:700}}>₹{m.amount}</span>
                        </div>
                      ))}
                    </>}
                    {sPending.length>0&&<>
                      <div style={{color:"#f87171",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,margin:"10px 0 6px"}}>⏳ Pending</div>
                      {sPending.map((m,mi)=>(
                        <div key={mi} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                          <span style={{color:"rgba(255,255,255,0.6)",fontSize:13}}>{m.result==="W"?"🏆":"💀"} {shortName(m.name)}</span>
                          <span style={{color:"#f87171",fontSize:13,fontWeight:700}}>₹{m.due} due</span>
                        </div>
                      ))}
                    </>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={()=>copyMsg(genAllMsg())} style={btnWhatsApp}>📲 Copy Full Summary to WhatsApp</button>
      </div>
    );
  };

  // ── SHARED COMPONENTS ────────────────────────────────────────────────────────
  const ProgressBar = ({pct}) => (
    <div style={{background:"rgba(255,255,255,0.07)",borderRadius:999,height:10,overflow:"hidden",marginBottom:6}}>
      <div style={{height:"100%",borderRadius:999,background:pct===100?"linear-gradient(90deg,#4ade80,#22c55e)":"linear-gradient(90deg,#ff6b35,#ff9a3c,#ffd700)",width:`${pct}%`,transition:"width 0.5s",boxShadow:"0 0 12px rgba(255,154,60,0.5)"}}/>
    </div>
  );

  const Divider = ({label,color,divColor}) => (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:1,background:divColor}}/>
      <span style={{color,fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:divColor}}/>
    </div>
  );

  const SectionRows = ({title,titleColor,divColor,items}) => {
    if(!items||items.length===0) return null;
    return (
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

  const StatPill = ({value,label,color}) => (
    <div style={{textAlign:"center"}}>
      <div style={{color,fontWeight:800,fontSize:14}}>{value}</div>
      <div style={{color:"rgba(255,255,255,0.3)",fontSize:10}}>{label}</div>
    </div>
  );

  const tabs = [["tracker","🎮 Track"],["summary","📊 Today"],["alldays","📅 All Days"]];

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Segoe UI',sans-serif",paddingBottom:40}}>
      {toast&&<div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:"#0a0f1a",color:"#fff",padding:"10px 22px",borderRadius:30,fontSize:14,zIndex:999,boxShadow:"0 4px 24px rgba(255,120,0,0.4)",border:"1px solid rgba(255,150,50,0.4)",whiteSpace:"nowrap"}}>{toast}</div>}

      <div style={{textAlign:"center",padding:"24px 16px 12px"}}>
        <div style={{fontSize:11,color:"rgba(255,200,120,0.35)",letterSpacing:3,textTransform:"uppercase"}}>Legends Cricket Association</div>
        <div style={{fontSize:32,margin:"4px 0"}}>🏏🍻</div>
        <h1 style={{color:"#ff9a3c",margin:0,fontSize:22,fontWeight:900,letterSpacing:-1,textShadow:"0 0 30px rgba(255,154,60,0.5)"}}>Booze Party Tracker</h1>
      </div>

      <div style={{display:"flex",margin:"0 16px 14px",background:"rgba(255,255,255,0.05)",borderRadius:14,padding:4,gap:3}}>
        {tabs.map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px 4px",borderRadius:10,border:"none",cursor:"pointer",
            background:tab===t?"rgba(255,154,60,0.25)":"transparent",
            color:tab===t?"#ff9a3c":"rgba(255,200,120,0.35)",
            fontSize:12,fontWeight:tab===t?700:400,
            boxShadow:tab===t?"0 0 16px rgba(255,154,60,0.2)":"none",transition:"all 0.2s"}}>{label}</button>
        ))}
      </div>

      <div style={{padding:"0 16px"}}>
        {tab==="tracker"&&<TrackerView/>}
        {tab==="summary"&&<SummaryView/>}
        {tab==="alldays"&&<AllDaysView/>}
      </div>
    </div>
  );
}

// ── STYLE CONSTANTS ──────────────────────────────────────────────────────────
const card = {
  background:"rgba(255,154,60,0.07)",borderRadius:14,padding:"11px 14px",
  marginBottom:12,border:"1px solid rgba(255,154,60,0.18)",display:"flex",alignItems:"center",gap:10
};
const bigCard = {
  background:"linear-gradient(145deg,#0f1f0f,#1a1200,#0f0f1f)",
  border:"1px solid rgba(255,154,60,0.25)",borderRadius:20,padding:"20px 16px",marginBottom:14
};
const sublabel = { color:"rgba(255,200,120,0.4)",fontSize:10,textTransform:"uppercase",letterSpacing:1 };
const wlBtn = { width:34,height:34,borderRadius:8,cursor:"pointer",border:"none",fontSize:13,fontWeight:800,transition:"all 0.15s" };
const btnOrange = { flex:1,background:"rgba(255,154,60,0.12)",color:"#ff9a3c",border:"1px solid rgba(255,154,60,0.25)",borderRadius:12,padding:"13px",fontSize:13,fontWeight:600,cursor:"pointer" };
const btnGhost  = { flex:1,background:"rgba(255,255,255,0.04)",color:"rgba(255,200,120,0.5)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px",fontSize:13,cursor:"pointer" };
const btnWhatsApp = { width:"100%",background:"linear-gradient(135deg,#25D366,#128C7E)",color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 20px rgba(37,211,102,0.3)" };
