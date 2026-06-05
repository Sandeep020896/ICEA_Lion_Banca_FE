import { useState, useEffect, useCallback, useRef } from "react";

// ─── SPARK CONFIG ─────────────────────────────────────────────────────────────
const SPARK = {
  host:      "https://excel.uat.us.coherent.global",
  tenant:    "icea_lion",
  folder:    "Coherent - Front End for Banca Endowment",
  service:   "ICEA LION - Banco Endowment Modelling",
  apiKey:    "0afb95d9-835b-448a-a4f4-57e2530ac614",
  versionId: "39ebf947-d752-4d52-b089-8965ad279d7f",
};
const encPath     = `${encodeURIComponent(SPARK.folder)}/services/${encodeURIComponent(SPARK.service)}`;
const EXECUTE_URL = `${SPARK.host}/${SPARK.tenant}/api/v3/folders/${encPath}/execute`;
const VALID_URL   = `${SPARK.host}/${SPARK.tenant}/api/v3/folders/${encPath}/validation`;
const HEADERS     = { "Content-Type":"application/json","x-synthetic-key":SPARK.apiKey,"x-tenant-name":SPARK.tenant };

// ─── BANK PARTNER CONFIG (URL param ?bank=equity) ─────────────────────────────
const BANK_CONFIG = {
  equity: {
    name:       "Equity Bank",
    shortName:  "Equity Bank",
    color:      "#CC0000",
    tagline:    "Equity Bank · Bancassurance Portal",
  },
  kcb: {
    name:       "KCB Bank",
    shortName:  "KCB",
    color:      "#006633",
    tagline:    "KCB Bank · Bancassurance Portal",
  },
  default: {
    name:       "Partner Bank",
    shortName:  "Partner",
    color:      "#003C7A",
    tagline:    "Bancassurance Partner Portal",
  },
};
function getBankConfig() {
  const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const key = (p.get("bank") || "default").toLowerCase();
  return BANK_CONFIG[key] || BANK_CONFIG.default;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PASSWORD           = "Coherent!";
const IDLE_TIMEOUT_MS    = 30 * 60 * 1000; // 30 min idle
const WARN_BEFORE_MS     = 2  * 60 * 1000; // warn 2 min before
const VALIDITY_DAYS      = 90;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmt(n, dec=0) {
  return n==null ? "—" : Number(n).toLocaleString("en-KE",{minimumFractionDigits:dec,maximumFractionDigits:dec});
}
// Fixed KES compact: ≥1M → Mn, ≥1000 → k, else full
function fmtCompact(n) {
  if (n==null) return "—";
  const abs = Math.abs(Number(n));
  if (abs >= 1_000_000) return `KES ${(n/1_000_000).toFixed(2)}Mn`;
  if (abs >= 1_000)     return `KES ${fmt(n)}`;   // keep full for thousands
  return `KES ${fmt(n)}`;
}
function fmtKES(n, compact=false) {
  return n==null ? "—" : compact ? fmtCompact(n) : `KES ${fmt(n)}`;
}
function fmtNum(n, dec=2) {
  return n==null ? "—" : Number(n).toLocaleString("en-KE",{minimumFractionDigits:dec,maximumFractionDigits:dec});
}
function addDays(d, n) { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function fmtDate(d) { return d.toLocaleDateString("en-KE",{day:"numeric",month:"long",year:"numeric"}); }

// Format SA/Premium input with commas for display, strip for value
function formatInputDisplay(raw) {
  const num = raw.replace(/[^0-9.]/g,"");
  if (!num) return "";
  const n = parseFloat(num);
  if (isNaN(n)) return num;
  return n.toLocaleString("en-KE");
}
function stripCommas(s) { return s.replace(/,/g,""); }

// ─── ANIMATED NUMBER ──────────────────────────────────────────────────────────
function AnimatedNumber({ target, compact=false, prevTarget=0 }) {
  const [display, setDisplay] = useState(prevTarget || 0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target==null) return;
    cancelAnimationFrame(rafRef.current);
    const from = display;
    const to   = Number(target);
    const dur  = 800;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now-start)/dur,1);
      const ease = 1-Math.pow(1-p,3);
      setDisplay(from+(to-from)*ease);
      if (p<1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);
  return <span>{compact ? fmtCompact(display) : `KES ${fmt(display)}`}</span>;
}

// ─── TOOLTIP ──────────────────────────────────────────────────────────────────
function Tip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position:"relative",display:"inline-block" }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}
      onTouchStart={()=>setShow(s=>!s)}>
      {children}
      <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",
        width:16,height:16,borderRadius:"50%",background:"#27AAE1",color:"#fff",
        fontSize:9,fontWeight:700,marginLeft:5,cursor:"help",verticalAlign:"middle" }}>?</span>
      {show && (
        <div style={{ position:"absolute",bottom:"calc(100% + 6px)",left:"50%",
          transform:"translateX(-50%)",background:"#1a202c",color:"#fff",fontSize:11,
          lineHeight:1.5,padding:"8px 12px",borderRadius:7,width:230,zIndex:300,
          pointerEvents:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.25)" }}>
          {text}
        </div>
      )}
    </span>
  );
}

// ─── LOGOS ─────────────────────────────────────────────────────────────────────
// TO REPLACE: swap <IceaLionLogo/> with <img src="/icea_lion_logo.png" alt="ICEA LION" style={{height:38}}/>
function IceaLionLogo({ height=40 }) {
  return (
    <svg height={height} viewBox="0 0 160 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="44" height="44" x="0" y="2" rx="3" fill="white"/>
      <ellipse cx="22" cy="30" rx="13" ry="10" fill="#B8962E"/>
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((d,i)=>(
        <rect key={i} x="20.5" y="14" width="3" height="8" rx="1.5" fill="#B8962E"
          transform={`rotate(${d} 22 22)`} opacity="0.85"/>
      ))}
      <ellipse cx="22" cy="22" rx="9" ry="8" fill="#B8962E"/>
      <ellipse cx="22" cy="21" rx="6.5" ry="5.5" fill="#f5e6c0"/>
      <circle cx="19.5" cy="19.5" r="1.4" fill="#5c3d0a"/>
      <circle cx="24.5" cy="19.5" r="1.4" fill="#5c3d0a"/>
      <polygon points="16,17 14,12 19,15" fill="#B8962E"/>
      <polygon points="28,17 30,12 25,15" fill="#B8962E"/>
      <path d="M29 27 Q36 22 35 15" stroke="#B8962E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="35" cy="14" rx="3" ry="2.5" fill="#B8962E" transform="rotate(-20 35 14)"/>
      <text x="50" y="22" fontFamily="Georgia,serif" fontSize="13" fontWeight="bold" fill="#003C7A" letterSpacing="0.5">ICEA LION</text>
      <line x1="50" y1="26" x2="155" y2="26" stroke="#e2e8f0" strokeWidth="0.5"/>
      <text x="50" y="38" fontFamily="Georgia,serif" fontSize="9" fill="#B8962E" letterSpacing="1.2">LIFE ASSURANCE</text>
    </svg>
  );
}

// TO REPLACE: swap <CoherentLogo/> with <img src="/coherent_logo.png" alt="Coherent" style={{height:22}}/>
function CoherentLogo({ height=22 }) {
  return (
    <svg height={height} viewBox="0 0 110 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 22 Q4 16 8 10" stroke="#1a1a2e" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M13 22 Q9 16 13 10" stroke="#1a1a2e" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M18 18 Q14 12 18 8" stroke="#7c3aed" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <text x="28" y="21" fontFamily="'Inter','Helvetica Neue',sans-serif" fontSize="13"
        fontWeight="600" fill="#1a202c" letterSpacing="0.2">coherent</text>
    </svg>
  );
}

// ─── ROARING LION ─────────────────────────────────────────────────────────────
function RoaringLion() {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"52px 0" }}>
      <svg width="80" height="80" viewBox="0 0 100 100" fill="none"
        style={{ animation:"lionPulse 1.4s ease-in-out infinite" }}>
        <ellipse cx="50" cy="62" rx="22" ry="17" fill="#B8962E" opacity="0.9"/>
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((d,i)=>(
          <rect key={i} x="48" y="26" width="4" height="13" rx="2" fill="#B8962E"
            transform={`rotate(${d} 50 46)`} opacity="0.8"/>
        ))}
        <ellipse cx="50" cy="46" rx="16" ry="14" fill="#B8962E"/>
        <ellipse cx="50" cy="44" rx="12" ry="10" fill="#f5e6c0"/>
        <circle cx="44.5" cy="41" r="2.2" fill="#3d2006"/>
        <circle cx="55.5" cy="41" r="2.2" fill="#3d2006"/>
        <circle cx="45.2" cy="40.3" r="0.7" fill="white"/>
        <circle cx="56.2" cy="40.3" r="0.7" fill="white"/>
        <polygon points="42,36 39,29 46,33" fill="#B8962E"/>
        <polygon points="58,36 61,29 54,33" fill="#B8962E"/>
        <ellipse cx="50" cy="50" rx="5" ry="4" fill="#8B2500"/>
        <ellipse cx="50" cy="52" rx="4" ry="2.5" fill="#c0392b"/>
        <polygon points="47,47 50,44 53,47" fill="white" opacity="0.9"/>
        <path d="M36,68 Q30,60 33,50" stroke="#B8962E" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <ellipse cx="33" cy="49" rx="4" ry="3" fill="#B8962E" transform="rotate(20 33 49)"/>
        <ellipse cx="36" cy="78" rx="8" ry="5" fill="#B8962E"/>
        <ellipse cx="64" cy="78" rx="8" ry="5" fill="#B8962E"/>
        <path d="M72 65 Q82 55 79 43 Q76 35 71 38" stroke="#B8962E" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="71.5" cy="37" rx="5" ry="3.5" fill="#B8962E" transform="rotate(-25 71 37)"/>
      </svg>
      <div style={{ marginTop:16,fontSize:13,fontWeight:600,color:"#003C7A",letterSpacing:"0.04em" }}>
        Calculating your quotation…
      </div>
      <div style={{ marginTop:4,fontSize:11,color:"#a0aec0" }}>Powered by Coherent Spark</div>
    </div>
  );
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner({ size=16, color="#003C7A" }) {
  return <span style={{ display:"inline-block",width:size,height:size,
    border:`2px solid ${color}22`,borderTop:`2px solid ${color}`,
    borderRadius:"50%",animation:"spin 0.75s linear infinite",flexShrink:0 }}/>;
}

// ─── FIELD ────────────────────────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block",fontSize:11,fontWeight:600,
        letterSpacing:"0.07em",textTransform:"uppercase",color:"#4a5568",marginBottom:5 }}>
        {label}
      </label>
      {children}
      {error && <div style={{ fontSize:11,color:"#c0392b",marginTop:3 }}>{error}</div>}
      {!error && hint && <div style={{ fontSize:11,color:"#a0aec0",marginTop:3 }}>{hint}</div>}
    </div>
  );
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
function Toggle({ options, value, onChange, disabled }) {
  return (
    <div style={{ display:"flex",borderRadius:7,overflow:"hidden",border:"1.5px solid #e2e8f0",
      opacity:disabled?0.5:1,pointerEvents:disabled?"none":"auto" }}>
      {options.map(o => {
        const active = value===o.value;
        return (
          <button key={o.value} onClick={()=>onChange(o.value)} style={{
            flex:1,padding:"9px 10px",border:"none",cursor:"pointer",
            fontSize:12,fontWeight:active?700:500,fontFamily:"inherit",
            background:active?"#003C7A":"#fff",color:active?"#fff":"#4a5568",
            transition:"all 0.15s" }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function SH({ children }) {
  return <div style={{ fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",
    fontWeight:700,color:"#27AAE1",marginBottom:14,paddingBottom:7,
    borderBottom:"1.5px solid #e8eef4" }}>{children}</div>;
}

function StatBox({ label, value, sub, accent, teal, tooltip }) {
  return (
    <div style={{ padding:"14px 16px",borderRadius:9,
      background: accent?"#003C7A": teal?"#EAF9F9":"#f7fafc",
      border: accent?"none": teal?"1px solid #27AAE1":"1px solid #e8eef4" }}>
      <div style={{ fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",
        color: accent?"rgba(255,255,255,0.55)": teal?"#1a7a7a":"#718096",
        marginBottom:5,fontWeight:600 }}>
        {tooltip ? <Tip text={tooltip}>{label}</Tip> : label}
      </div>
      <div style={{ fontSize:19,fontWeight:700,
        color: accent?"#fff": teal?"#1a7a7a":"#1a202c",fontFamily:"Georgia,serif" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11,color: accent?"rgba(255,255,255,0.45)": teal?"#2a9d9d":"#a0aec0",marginTop:3 }}>{sub}</div>}
    </div>
  );
}

// ─── PASSWORD SCREEN ──────────────────────────────────────────────────────────
function PasswordScreen({ onUnlock }) {
  const [pw, setPw]     = useState("");
  const [err, setErr]   = useState(false);
  const [show, setShow] = useState(false);

  function submit() {
    if (pw===PASSWORD) { onUnlock(); }
    else { setErr(true); setPw(""); setTimeout(()=>setErr(false),2000); }
  }

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(160deg,#001f3f 0%,#003C7A 60%,#0057a8 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'Inter','Helvetica Neue',sans-serif" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
      <div style={{ background:"#fff",borderRadius:18,padding:"44px 44px 36px",width:400,
        boxShadow:"0 32px 100px rgba(0,0,0,0.35)",textAlign:"center" }}>

        {/* ICEA Lion logo — swap with <img src="/icea_lion_logo.png" style={{height:56}}/> */}
        <div style={{ display:"flex",justifyContent:"center",marginBottom:6 }}>
          <IceaLionLogo height={52}/>
        </div>

        <div style={{ height:1,background:"#e8eef4",margin:"16px 0 14px" }}/>

        <div style={{ fontSize:17,fontWeight:700,color:"#003C7A",
          fontFamily:"Georgia,serif",marginBottom:5 }}>
          Summit Endowment Plan
        </div>
        <div style={{ fontSize:11,color:"#718096",marginBottom:22,lineHeight:1.6 }}>
          ICEA LION Life Assurance · Bancassurance Partner Quotation System
        </div>

        <div style={{ position:"relative",marginBottom:err?8:16 }}>
          <input type={show?"text":"password"} value={pw}
            onChange={e=>{setPw(e.target.value);setErr(false);}}
            onKeyDown={e=>e.key==="Enter"&&submit()}
            placeholder="Enter access code"
            autoFocus
            style={{ width:"100%",boxSizing:"border-box",padding:"12px 44px 12px 16px",
              fontSize:14,border:`1.5px solid ${err?"#c0392b":"#e2e8f0"}`,
              borderRadius:9,outline:"none",fontFamily:"inherit",
              animation:err?"shake 0.3s ease-in-out":"none",
              transition:"border-color 0.15s",textAlign:"center",letterSpacing:"0.08em" }}/>
          <button onClick={()=>setShow(s=>!s)} style={{ position:"absolute",right:12,
            top:"50%",transform:"translateY(-50%)",background:"none",border:"none",
            cursor:"pointer",color:"#a0aec0",fontSize:11,fontWeight:600 }}>
            {show?"Hide":"Show"}
          </button>
        </div>
        {err && <div style={{ fontSize:11,color:"#c0392b",marginBottom:12 }}>
          Incorrect access code. Please try again.
        </div>}
        <button onClick={submit} style={{ width:"100%",padding:"13px",
          background:"#003C7A",color:"#fff",border:"none",borderRadius:9,
          fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",
          textTransform:"uppercase",fontFamily:"inherit",marginBottom:20 }}>
          Enter Portal
        </button>

        <div style={{ height:1,background:"#e8eef4",marginBottom:16 }}/>

        {/* Coherent logo — swap with <img src="/coherent_logo.png" style={{height:18}}/> */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
          <div style={{ fontSize:9,color:"#a0aec0",letterSpacing:"0.08em",textTransform:"uppercase" }}>
            Powered by
          </div>
          <CoherentLogo height={18}/>
        </div>
        <div style={{ marginTop:12,fontSize:10,color:"#a0aec0" }}>
          For authorised bank partners only
        </div>
      </div>
    </div>
  );
}

// ─── SESSION TIMEOUT MODAL (with 2-min countdown) ────────────────────────────
function TimeoutModal({ onStay, onLogout, countdown }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.6)",
      display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:"#fff",borderRadius:14,padding:"36px 40px",
        width:380,textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize:36,marginBottom:12 }}>⏱</div>
        <div style={{ fontSize:16,fontWeight:700,color:"#1a202c",marginBottom:8 }}>
          Session Expiring Soon
        </div>
        <div style={{ fontSize:13,color:"#718096",marginBottom:8,lineHeight:1.6 }}>
          Your session will expire due to inactivity in
        </div>
        <div style={{ fontSize:32,fontWeight:700,color:"#003C7A",marginBottom:16,
          fontFamily:"Georgia,serif" }}>
          {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,"0")}
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onStay} style={{ flex:1,padding:"11px",
            background:"#003C7A",color:"#fff",border:"none",borderRadius:8,
            fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
            Stay Logged In
          </button>
          <button onClick={onLogout} style={{ flex:1,padding:"11px",
            background:"#f7fafc",color:"#4a5568",border:"1px solid #e2e8f0",
            borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EMAIL MODAL ──────────────────────────────────────────────────────────────
function EmailModal({ open, onClose, result, inputs, quoteRef, pdfUrl, bankName }) {
  const [recipient, setRecipient] = useState("");
  const [recipName, setRecipName]  = useState("");
  const [copyMe, setCopyMe]        = useState(false);
  const [senderName, setSenderName] = useState("");

  if (!open||!result) return null;

  const monthly   = result.APrem ? result.APrem/12 : null;
  const validDate = fmtDate(addDays(new Date(), VALIDITY_DAYS));
  const subject   = `Quotation ${quoteRef} – ICEA LION Summit Endowment Plan`;

  const body = [
    `Dear ${recipName||inputs.clientName||"Sir/Madam"},`,
    "",
    "Thank you for your interest in the ICEA LION Summit Endowment Plan.",
    "Please find below the details of your personalised quotation.",
    "",
    `QUOTATION REFERENCE: ${quoteRef}`,
    `Product: Summit Endowment Plan`,
    `Policy Term: ${inputs.term} Years`,
    `Sum Assured: KES ${fmtNum(result.SA)}`,
    `Annual Premium: KES ${fmtNum(result.APrem)}`,
    `Monthly Premium: KES ${fmtNum(monthly)}`,
    `Estimated Maturity Value: KES ${fmtNum(result.MaturityEst)}`,
    `Estimated Bonus: KES ${fmtNum(result.BonusEst)}`,
    "",
    `This quotation is valid until: ${validDate}`,
    "",
    pdfUrl
      ? `A PDF copy of this quotation is available here: ${pdfUrl}`
      : "A PDF copy of this quotation will be forwarded to you separately.",
    "",
    "To proceed, please complete the proposal form. A medical report may be required.",
    "",
    "Warm regards,",
    senderName || "[Your Name]",
    `${bankName||"ICEA LION Life Assurance"} – Bancassurance Partner`,
  ].join("\n");

  const mailtoHref = `mailto:${encodeURIComponent(recipient)}`
    +`?subject=${encodeURIComponent(subject)}`
    +`&body=${encodeURIComponent(body)}`
    +(copyMe&&senderName ? `&cc=${encodeURIComponent(senderName)}` : "");

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,0.5)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"24px" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff",borderRadius:14,width:520,
        boxShadow:"0 24px 80px rgba(0,0,0,0.25)",overflow:"hidden",
        animation:"slideIn 0.25s ease-out" }}>
        <div style={{ background:"#003C7A",padding:"16px 24px",
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",
              color:"#27AAE1",marginBottom:2,fontWeight:600 }}>Email Quotation</div>
            <div style={{ fontSize:14,fontWeight:700,color:"#fff" }}>Send to Client</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",
            color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:20 }}>×</button>
        </div>
        <div style={{ padding:"20px 24px" }}>
          {/* Updated note - no apology, action-first */}
          <div style={{ background:"#f0f7ff",border:"1px solid #c3d9ef",
            borderRadius:8,padding:"10px 14px",marginBottom:16,
            fontSize:11,color:"#2c5282",lineHeight:1.6 }}>
            <strong>To attach the PDF:</strong> click <em>Download PDF</em> in the quotation
            viewer first, then attach the saved file to your email.
            {" "}<span style={{ color:"#718096" }}>Full auto-attach requires backend integration —
            available in production deployment.</span>
          </div>
          {[
            ["Recipient Email *","email",recipient,setRecipient,"client@example.com"],
            ["Recipient Name","text",recipName,setRecipName,inputs.clientName||"Client name"],
            ["Your Name / Branch","text",senderName,setSenderName,`e.g. John Kamau – ${bankName||"Branch"}`],
          ].map(([label,type,val,setter,ph])=>(
            <div key={label} style={{ marginBottom:12 }}>
              <label style={{ display:"block",fontSize:11,fontWeight:600,
                letterSpacing:"0.07em",textTransform:"uppercase",color:"#4a5568",marginBottom:4 }}>
                {label}
              </label>
              <input type={type} value={val} onChange={e=>setter(e.target.value)}
                placeholder={ph}
                style={{ width:"100%",boxSizing:"border-box",padding:"9px 12px",
                  border:"1.5px solid #e2e8f0",borderRadius:7,fontSize:13,
                  fontFamily:"inherit",outline:"none" }}/>
            </div>
          ))}
          <div style={{ marginBottom:16,display:"flex",alignItems:"center",gap:8 }}>
            <input type="checkbox" id="copyMe" checked={copyMe}
              onChange={e=>setCopyMe(e.target.checked)} style={{ cursor:"pointer",width:14,height:14 }}/>
            <label htmlFor="copyMe" style={{ fontSize:12,color:"#4a5568",cursor:"pointer" }}>
              Send me a copy
            </label>
          </div>
          <div style={{ background:"#f7fafc",border:"1px solid #e8eef4",borderRadius:7,
            padding:"10px 14px",marginBottom:16 }}>
            <div style={{ fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",
              color:"#003C7A",fontWeight:700,marginBottom:5 }}>Email will include</div>
            <div style={{ fontSize:11,color:"#4a5568",lineHeight:1.7 }}>
              Ref: {quoteRef} · SA: KES {fmtNum(result.SA)} · Monthly: KES {fmtNum(monthly)}
              · Maturity: KES {fmtNum(result.MaturityEst)} · Valid until: {validDate}
              {pdfUrl && <span style={{ color:"#003C7A",fontWeight:600 }}> · PDF link included</span>}
            </div>
          </div>
          <a href={mailtoHref} onClick={onClose} style={{ display:"block",textDecoration:"none" }}>
            <button style={{ width:"100%",padding:"12px",
              background:recipient?"#003C7A":"#e2e8f0",
              color:recipient?"#fff":"#a0aec0",border:"none",borderRadius:8,
              fontSize:13,fontWeight:700,cursor:recipient?"pointer":"not-allowed",
              letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Open in Email Client
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── PDF PREVIEW MODAL ────────────────────────────────────────────────────────
function PdfPreviewModal({ open, onClose, pdfUrl, quoteRef, clientName }) {
  const [downloading, setDownloading] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [printing, setPrinting]       = useState(false);

  useEffect(()=>{ if(open) setEmbedFailed(false); },[open,pdfUrl]);
  if (!open||!pdfUrl) return null;

  const fileName = `ICEA_LION_Quotation_${quoteRef}.pdf`;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res  = await fetch(pdfUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href=url; a.download=fileName; a.click();
      URL.revokeObjectURL(url);
    } catch { window.open(pdfUrl,"_blank"); }
    finally { setDownloading(false); }
  }

  function handlePrint() {
    setPrinting(true);
    const w = window.open(pdfUrl,"_blank","width=900,height=700");
    if (w) {
      w.onload = () => { w.print(); setPrinting(false); };
      setTimeout(()=>setPrinting(false),3000);
    } else { setPrinting(false); }
  }

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1200,background:"rgba(0,0,0,0.65)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"flex-start",padding:"24px 16px",overflowY:"auto" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff",borderRadius:14,width:"100%",maxWidth:860,
        boxShadow:"0 24px 80px rgba(0,0,0,0.35)",display:"flex",flexDirection:"column",
        animation:"slideIn 0.25s ease-out" }}>
        {/* Toolbar */}
        <div style={{ padding:"14px 20px",borderBottom:"1px solid #e2e8f0",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          background:"#fff",borderRadius:"14px 14px 0 0",flexShrink:0 }}>
          <div>
            <div style={{ fontSize:13,fontWeight:700,color:"#1a202c" }}>Quotation Schedule</div>
            <div style={{ fontSize:11,color:"#718096",marginTop:1 }}>
              {clientName&&<span>{clientName} · </span>}Ref: {quoteRef}
            </div>
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            <button onClick={handlePrint} disabled={printing}
              style={{ padding:"8px 14px",background:"#f7fafc",color:"#4a5568",
                border:"1px solid #e2e8f0",borderRadius:7,fontSize:12,fontWeight:600,
                cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </button>
            <button onClick={handleDownload} disabled={downloading}
              style={{ padding:"8px 16px",
                background:downloading?"#e2e8f0":"#003C7A",
                color:downloading?"#a0aec0":"#fff",
                border:"none",borderRadius:7,fontSize:12,fontWeight:700,
                cursor:downloading?"not-allowed":"pointer",
                display:"flex",alignItems:"center",gap:7 }}>
              {downloading
                ? <><Spinner size={12} color="#a0aec0"/> Downloading…</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download PDF
                  </>
              }
            </button>
            <button onClick={onClose} style={{ padding:"8px 14px",background:"#f7fafc",
              color:"#4a5568",border:"1px solid #e2e8f0",borderRadius:7,
              fontSize:12,fontWeight:600,cursor:"pointer" }}>Close</button>
          </div>
        </div>
        {/* PDF embed */}
        <div style={{ background:"#525659",borderRadius:"0 0 14px 14px",
          overflow:"hidden",minHeight:700 }}>
          {!embedFailed ? (
            <object data={pdfUrl} type="application/pdf" width="100%" height="700px"
              style={{ display:"block",border:"none" }}
              onError={()=>setEmbedFailed(true)}>
              <embed src={pdfUrl} type="application/pdf" width="100%" height="700px"
                style={{ display:"block",border:"none" }}
                onError={()=>setEmbedFailed(true)}/>
            </object>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",height:500,gap:20,padding:"40px",textAlign:"center" }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="#a0aec0" strokeWidth="1.2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="9" y1="13" x2="15" y2="13"/>
                <line x1="9" y1="17" x2="15" y2="17"/>
              </svg>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:"#fff",marginBottom:8 }}>
                  Inline preview not available
                </div>
                <div style={{ fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.7,
                  maxWidth:340,margin:"0 auto" }}>
                  Use <strong style={{ color:"#fff" }}>Download PDF</strong> above to save,
                  or open directly below.
                </div>
              </div>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration:"none" }}>
                <button style={{ padding:"10px 24px",background:"#27AAE1",color:"#fff",
                  border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer" }}>
                  Open in New Tab
                </button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function ICEALionBancaPortal() {
  const bankConfig = getBankConfig();

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [unlocked, setUnlocked]       = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [countdown, setCountdown]     = useState(120); // seconds
  const idleTimer     = useRef(null);
  const warnTimer     = useRef(null);
  const countdownRef  = useRef(null);
  const resultsRef    = useRef(null);

  // ── Validation ─────────────────────────────────────────────────────────────
  const [validation, setValidation]     = useState(null);
  const [valLoading, setValLoading]     = useState(true);
  const [valError, setValError]         = useState(null);
  const [modelVersion, setModelVersion] = useState(null);
  const [processTime, setProcessTime]   = useState(null); // for success metric

  // ── Form ───────────────────────────────────────────────────────────────────
  const [calcby, setCalcby]         = useState("Sum Assured");
  const [age, setAge]               = useState("");
  const [gender, setGender]         = useState("M");
  const [saDisplay, setSaDisplay]   = useState("");   // formatted display
  const [saRaw, setSaRaw]           = useState("");   // raw numeric
  const [premDisplay, setPremDisplay] = useState(""); // formatted display
  const [premRaw, setPremRaw]         = useState(""); // raw numeric
  const [term, setTerm]             = useState(5);
  const [clientName, setClientName] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [focused, setFocused]       = useState(null);

  // ── Quote ──────────────────────────────────────────────────────────────────
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState(null);
  const [apiError, setApiError]           = useState(null);
  const [quoteRef, setQuoteRef]           = useState("");
  const [quoteDate, setQuoteDate]         = useState(null);
  const [pdfUrl, setPdfUrl]               = useState(null);
  const [acceptState, setAcceptState]     = useState("idle");
  const [finalLoading, setFinalLoading]   = useState(false);
  const [showAccepted, setShowAccepted]   = useState(false); // success flash

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [compact, setCompact]                 = useState(false);
  const [emailOpen, setEmailOpen]             = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen]   = useState(false);

  // ── Idle timer with 2-min warning ─────────────────────────────────────────
  function clearAllTimers() {
    clearTimeout(idleTimer.current);
    clearTimeout(warnTimer.current);
    clearInterval(countdownRef.current);
  }
  function resetIdle() {
    if (!unlocked) return;
    clearAllTimers();
    setShowTimeout(false);
    warnTimer.current  = setTimeout(()=>{ setShowTimeout(true); startCountdown(); },
                                    IDLE_TIMEOUT_MS - WARN_BEFORE_MS);
    idleTimer.current  = setTimeout(()=>{ forceLogout(); }, IDLE_TIMEOUT_MS);
  }
  function startCountdown() {
    setCountdown(120);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(()=>{
      setCountdown(c=>{ if(c<=1){ clearInterval(countdownRef.current); return 0; } return c-1; });
    },1000);
  }
  function forceLogout() {
    clearAllTimers(); setShowTimeout(false); setUnlocked(false); handleClear();
  }

  useEffect(()=>{
    if (!unlocked) return;
    const events = ["mousemove","keydown","click","scroll","touchstart"];
    events.forEach(e=>window.addEventListener(e,resetIdle));
    resetIdle();
    return ()=>{ events.forEach(e=>window.removeEventListener(e,resetIdle)); clearAllTimers(); };
  },[unlocked]);

  // ── Set page title ─────────────────────────────────────────────────────────
  useEffect(()=>{
    document.title = "ICEA LION · Summit Endowment · Bancassurance Portal";
  },[]);

  // ── Load validation ────────────────────────────────────────────────────────
  useEffect(()=>{
    if (!unlocked) return;
    (async()=>{
      setValLoading(true);
      try {
        const res  = await fetch(VALID_URL,{method:"POST",headers:HEADERS,
          body:JSON.stringify({request_data:{},request_meta:{}})});
        const data = await res.json();
        const v    = data?.response_data?.outputs;
        if (v) {
          setValidation(v);
          if (v.Age?.default_value)     setAge(String(v.Age.default_value));
          if (v.Gender?.default_value)  setGender(v.Gender.default_value);
          if (v.SA?.default_value)      { setSaRaw(String(v.SA.default_value)); setSaDisplay(fmt(v.SA.default_value)); }
          if (v.Premium?.default_value) { setPremRaw(String(v.Premium.default_value)); setPremDisplay(fmt(v.Premium.default_value,2)); }
          if (v.Term?.default_value)    setTerm(v.Term.default_value);
          if (v.Calcby?.default_value)  setCalcby(v.Calcby.default_value);
        } else setValError("Could not load form rules.");
        if (data?.response_meta?.version) setModelVersion(data.response_meta.version);
      } catch { setValError("Network error loading form."); }
      finally  { setValLoading(false); }
    })();
  },[unlocked]);

  // ── Input handlers with comma formatting ──────────────────────────────────
  function handleSaChange(e) {
    const raw = stripCommas(e.target.value);
    setSaRaw(raw);
    const n = parseFloat(raw);
    setSaDisplay(isNaN(n) ? raw : fmt(n));
    setResult(null); setAcceptState("idle");
  }
  function handlePremChange(e) {
    const raw = stripCommas(e.target.value);
    setPremRaw(raw);
    const n = parseFloat(raw);
    setPremDisplay(isNaN(n) ? raw : fmt(n,2));
    setResult(null); setAcceptState("idle");
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = useCallback(()=>{
    const errs = {};
    if (!clientName.trim()) errs.clientName = "Client name is required.";
    if (!age||isNaN(Number(age))) { errs.age = "Age is required."; }
    else if (validation?.Age) {
      const n = Number(age);
      if (validation.Age.min!=null&&n<validation.Age.min) errs.age = validation.Age.error_message||`Min ${validation.Age.min}.`;
      if (validation.Age.max!=null&&n>validation.Age.max) errs.age = validation.Age.error_message||`Max ${validation.Age.max}.`;
    }
    if (calcby==="Sum Assured"&&(!saRaw||Number(saRaw)<=0)) errs.sa = "Please enter a valid Sum Assured.";
    if (calcby==="Premium"    &&(!premRaw||Number(premRaw)<=0)) errs.premium = "Please enter a valid Annual Premium.";
    return errs;
  },[age,saRaw,premRaw,calcby,validation,clientName]);

  function buildInputs() {
    return {
      Age:Number(age), Gender:gender, Term:Number(term), Calcby:calcby,
      ClientName:clientName,
      SA:      calcby==="Sum Assured" ? Number(saRaw)   : (Number(saRaw)||1000000),
      Premium: calcby==="Premium"     ? Number(premRaw) : (Number(premRaw)||192461),
    };
  }

  async function callSpark(callPurpose, withPdf=false) {
    const inputs = buildInputs();
    const body = {
      request_data: { inputs: {
        ...inputs,
        ...(withPdf?{QUOTATION:JSON.stringify({FileName:`quotation_${quoteRef}.pdf`})}:{}),
      }},
      request_meta: {
        version_id:      SPARK.versionId,
        call_purpose:    callPurpose,
        source_system:   `Banca Partner Portal - ${bankConfig.name}`,
        correlation_id:  quoteRef,
        service_category:"All",
        ...(withPdf?{xreport_options:{produce_pdfs:true,page_numbers:false}}:{}),
      },
    };
    const res = await fetch(EXECUTE_URL,{method:"POST",headers:HEADERS,body:JSON.stringify(body)});
    return res.json();
  }

  async function handleGetQuote() {
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    const d = new Date();
    const datePart = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
    // Use first name only for cleaner ref
    const firstName = clientName.trim().split(/\s+/)[0] || "Client";
    const counterKey = `quoteCounter_${datePart}`;
    const counter = parseInt(sessionStorage.getItem(counterKey)||"0")+1;
    sessionStorage.setItem(counterKey,String(counter));
    const ref = `${datePart}-${firstName}-${String(counter).padStart(4,"0")}`;
    setQuoteRef(ref);
    setQuoteDate(new Date());

    setLoading(true); setApiError(null); setResult(null);
    setPdfUrl(null); setAcceptState("idle"); setFinalLoading(false); setProcessTime(null);

    try {
      const data = await callSpark(`Get Quotation - ${ref} - ${bankConfig.shortName}`, false);
      if (data?.response_data?.outputs) {
        setResult(data.response_data.outputs);
        if (data.response_meta?.version)      setModelVersion(data.response_meta.version);
        if (data.response_meta?.process_time) setProcessTime(data.response_meta.process_time);
        setAcceptState("pending");
        setTimeout(()=>{
          if (window.innerWidth<900&&resultsRef.current)
            resultsRef.current.scrollIntoView({behavior:"smooth",block:"start"});
        },100);
      } else {
        setApiError(data?.error||"Unexpected response. Please try again.");
      }
    } catch { setApiError("Network error. Please check your connection."); }
    finally  { setLoading(false); }
  }

  async function handleAccept() {
    setFinalLoading(true);
    const purpose = `Final Quotation - ${clientName.trim()||"Client"} - ${bankConfig.shortName}`;
    try {
      const data = await callSpark(purpose, true);
      if (data?.response_meta?.version)      setModelVersion(data.response_meta.version);
      if (data?.response_meta?.process_time) setProcessTime(data.response_meta.process_time);
      const qOut = data?.response_data?.outputs?.QUOTATION;
      if (qOut?.PDFUrl) setPdfUrl(qOut.PDFUrl);
    } catch { /* non-blocking */ }
    finally {
      setFinalLoading(false);
      setAcceptState("accepted");
      setShowAccepted(true);
      setTimeout(()=>setShowAccepted(false), 4000);
    }
  }

  function handleClear() {
    setResult(null); setApiError(null); setAcceptState("idle");
    setPdfUrl(null); setQuoteRef(""); setQuoteDate(null); setProcessTime(null);
    const v = validation;
    setAge(v?.Age?.default_value?String(v.Age.default_value):"");
    setGender(v?.Gender?.default_value||"M");
    setSaRaw(v?.SA?.default_value?String(v.SA.default_value):"");
    setSaDisplay(v?.SA?.default_value?fmt(v.SA.default_value):"");
    setPremRaw(v?.Premium?.default_value?String(v.Premium.default_value):"");
    setPremDisplay(v?.Premium?.default_value?fmt(v.Premium.default_value,2):"");
    setTerm(v?.Term?.default_value||5);
    setCalcby(v?.Calcby?.default_value||"Sum Assured");
    setClientName(""); setFieldErrors({});
  }
  function handleDecline() { handleClear(); }

  // ── Derived ────────────────────────────────────────────────────────────────
  const termOptions   = validation?.Term?.options   || [5,6,7];
  const genderOptions = validation?.Gender?.options || ["M","F"];
  const ageMin = validation?.Age?.min??18;
  const ageMax = validation?.Age?.max??65;

  const annualPremium = result?.APrem;
  const sumAssured    = result?.SA;
  const maturityEst   = result?.MaturityEst;
  const bonusEst      = result?.BonusEst;
  const totalPremiums = annualPremium ? annualPremium*Number(term) : null;
  const growthPct     = (totalPremiums&&maturityEst) ? ((maturityEst/totalPremiums-1)*100).toFixed(1) : null;
  const validUntil    = quoteDate ? fmtDate(addDays(quoteDate,VALIDITY_DAYS)) : null;
  const displayPremium = annualPremium ? annualPremium/12 : null;

  const inp = (field)=>({
    width:"100%",boxSizing:"border-box",padding:"9px 12px",fontSize:13,
    fontFamily:"inherit",
    border:`1.5px solid ${fieldErrors[field]?"#c0392b":focused===field?"#003C7A":"#e2e8f0"}`,
    borderRadius:7,outline:"none",background:"#fff",color:"#1a202c",
    transition:"border-color 0.15s",
    opacity:loading?0.6:1,pointerEvents:loading?"none":"auto",
  });
  const sel = {
    ...inp(""),paddingRight:32,cursor:"pointer",appearance:"none",
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%23718096' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center",
  };

  // ── Password gate ──────────────────────────────────────────────────────────
  if (!unlocked) return <PasswordScreen onUnlock={()=>setUnlocked(true)}/>;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh",background:"#f0f4f8",
      fontFamily:"'Inter','Helvetica Neue',sans-serif",color:"#1a202c" }}
      onMouseMove={resetIdle} onKeyDown={resetIdle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes slideIn   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes lionPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes successPop{ 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes shake     { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @media print {
          .no-print { display:none!important; }
          body { background:white; }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        *{box-sizing:border-box} button{font-family:inherit}
      `}</style>

      {/* ══ TIMEOUT MODAL ══ */}
      {showTimeout && (
        <TimeoutModal countdown={countdown}
          onStay={()=>{ setShowTimeout(false); clearAllTimers(); resetIdle(); }}
          onLogout={()=>forceLogout()}/>
      )}

      {/* ══ EMAIL MODAL ══ */}
      <EmailModal open={emailOpen} onClose={()=>setEmailOpen(false)}
        result={result} inputs={{term,clientName,calcby}}
        quoteRef={quoteRef} pdfUrl={pdfUrl} bankName={bankConfig.name}/>

      {/* ══ PDF PREVIEW MODAL ══ */}
      <PdfPreviewModal open={pdfPreviewOpen} onClose={()=>setPdfPreviewOpen(false)}
        pdfUrl={pdfUrl} quoteRef={quoteRef} clientName={clientName}/>

      {/* ══ HEADER ══ */}
      <header className="no-print" style={{ background:"#fff",borderBottom:"1px solid #e2e8f0",
        padding:"0 36px",height:66,display:"grid",gridTemplateColumns:"1fr auto 1fr",
        alignItems:"center",position:"sticky",top:0,zIndex:100,
        boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        {/* Left: ICEA Lion — swap with <img src="/icea_lion_logo.png" style={{height:38}}/> */}
        <div style={{ display:"flex",alignItems:"center" }}>
          <IceaLionLogo height={38}/>
        </div>
        {/* Centre: status + toggle + portal */}
        <div style={{ display:"flex",alignItems:"center",gap:14,justifyContent:"center" }}>
          {valLoading
            ? <div style={{ display:"flex",alignItems:"center",gap:7,fontSize:11,color:"#a0aec0" }}>
                <Spinner size={12} color="#a0aec0"/> Connecting…
              </div>
            : validation && (
              <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#38a169",fontWeight:600 }}>
                <span style={{ width:7,height:7,borderRadius:"50%",background:"#38a169",display:"inline-block" }}/>
                Engine Live
              </div>
            )
          }
          {/* KES toggle - clear label showing current state */}
          <button onClick={()=>setCompact(c=>!c)} style={{
            padding:"5px 11px",fontSize:10,fontWeight:700,
            background:compact?"#003C7A":"#f7fafc",
            color:compact?"#fff":"#718096",
            border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",
            letterSpacing:"0.06em",textTransform:"uppercase",
            display:"flex",alignItems:"center",gap:5 }}>
            {compact
              ? <><span>KES Mn</span><span style={{ opacity:0.6,fontSize:9 }}>· showing</span></>
              : <><span>KES Mn</span><span style={{ opacity:0.6,fontSize:9 }}>· off</span></>
            }
          </button>
          <div style={{ background:bankConfig.color==="#003C7A"?"#eef4fb":`${bankConfig.color}15`,
            border:`1px solid ${bankConfig.color}40`,
            borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:700,
            color:bankConfig.color,letterSpacing:"0.07em",textTransform:"uppercase" }}>
            {bankConfig.tagline}
          </div>
        </div>
        {/* Right: Powered by Coherent — swap with <img src="/coherent_logo.png" style={{height:22}}/> */}
        <div style={{ display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end" }}>
          <div style={{ fontSize:9,color:"#a0aec0",letterSpacing:"0.06em",textTransform:"uppercase" }}>
            Powered by
          </div>
          <CoherentLogo height={22}/>
        </div>
      </header>

      {/* ══ TITLE BAND ══ */}
      <div className="no-print" style={{ background:"#003C7A",padding:"28px 36px 20px" }}>
        <div style={{ maxWidth:1120,margin:"0 auto" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",
            alignItems:"center",gap:16,marginBottom:10 }}>
            <div/>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:22,fontWeight:700,color:"#fff",
                fontFamily:"Georgia,serif",letterSpacing:"0.01em" }}>
                Summit Endowment Plan
              </div>
              <div style={{ fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",
                color:"#27AAE1",marginTop:5,fontWeight:600 }}>
                Quotation Generator
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              {quoteRef && (
                <>
                  <div style={{ fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:"0.08em",marginBottom:2 }}>
                    QUOTATION REF
                  </div>
                  <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.75)",fontFamily:"monospace" }}>
                    {quoteRef}
                  </div>
                </>
              )}
            </div>
          </div>
          {modelVersion && (
            <div style={{ display:"flex",justifyContent:"flex-start" }}>
              <div style={{ background:"rgba(255,255,255,0.08)",border:"1px solid rgba(39,170,225,0.25)",
                borderRadius:5,padding:"3px 10px",fontSize:10,fontWeight:600,
                color:"rgba(255,255,255,0.5)",letterSpacing:"0.06em" }}>
                Spark · Banca Endowment Quote Generator · v{modelVersion}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ TWO-COLUMN MAIN ══ */}
      <div style={{ maxWidth:1120,margin:"24px auto",padding:"0 36px",
        display:"grid",gridTemplateColumns:"400px 1fr",gap:22,alignItems:"start" }}>

        {/* ─── LEFT: INPUTS ─── */}
        <div className="no-print" style={{ background:"#fff",borderRadius:13,
          border:"1px solid #e2e8f0",overflow:"hidden",
          boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ padding:"18px 22px 16px",borderBottom:"1px solid #e8eef4",
            position:"relative",textAlign:"center" }}>
            <div style={{ fontSize:14,fontWeight:700,color:"#1a202c",marginBottom:4 }}>
              Policy Inputs
            </div>
            <div style={{ fontSize:12,color:"#718096",lineHeight:1.5 }}>
              All fields required to generate a quotation.
            </div>
            {(result||clientName||age) && (
              <button onClick={handleClear} style={{ fontSize:11,fontWeight:600,
                color:"#718096",background:"#f7fafc",border:"1px solid #e2e8f0",
                borderRadius:6,padding:"5px 11px",cursor:"pointer",
                position:"absolute",right:22,top:"50%",transform:"translateY(-50%)" }}>
                Clear
              </button>
            )}
          </div>

          <div style={{ padding:"20px 22px" }}>
            {valError && (
              <div style={{ background:"#fff5f5",border:"1px solid #fed7d7",borderRadius:7,
                padding:"9px 13px",fontSize:12,color:"#c53030",marginBottom:16 }}>⚠ {valError}</div>
            )}

            <SH>Client Details</SH>
            <Field label="Client Name" error={fieldErrors.clientName}>
              <input type="text" style={inp("clientName")} value={clientName}
                onChange={e=>{setClientName(e.target.value);setResult(null);setAcceptState("idle");}}
                onFocus={()=>setFocused("clientName")} onBlur={()=>setFocused(null)}
                placeholder="e.g. Amara Wanjiku" disabled={loading}/>
            </Field>

            <div style={{ height:1,background:"#e8eef4",margin:"4px 0 18px" }}/>
            <SH>Quote Direction</SH>

            <Field label="I want to quote by"
              hint={calcby==="Sum Assured"
                ?"Enter the coverage amount — the required premium will be calculated."
                :"Enter the premium amount — the coverage will be calculated."}>
              <Toggle value={calcby}
                onChange={v=>{setCalcby(v);setResult(null);setAcceptState("idle");setFieldErrors({});}}
                disabled={loading}
                options={[{value:"Sum Assured",label:"Sum Assured"},{value:"Premium",label:"Premium Amount"}]}/>
            </Field>

            {calcby==="Sum Assured" ? (
              <Field label="Sum Assured (KES)" error={fieldErrors.sa}>
                <input type="text" inputMode="numeric" style={inp("sa")}
                  value={saDisplay} disabled={loading}
                  onChange={handleSaChange}
                  onFocus={()=>{setFocused("sa"); setSaDisplay(saRaw);}}
                  onBlur={()=>{ setFocused(null); const n=parseFloat(saRaw); setSaDisplay(isNaN(n)?saRaw:fmt(n)); }}
                  placeholder="e.g. 1,000,000"/>
              </Field>
            ) : (
              <Field label="Annual Premium (KES)" error={fieldErrors.premium}>
                <input type="text" inputMode="numeric" style={inp("premium")}
                  value={premDisplay} disabled={loading}
                  onChange={handlePremChange}
                  onFocus={()=>{setFocused("premium"); setPremDisplay(premRaw);}}
                  onBlur={()=>{ setFocused(null); const n=parseFloat(premRaw); setPremDisplay(isNaN(n)?premRaw:fmt(n,2)); }}
                  placeholder="e.g. 192,461"/>
              </Field>
            )}

            <div style={{ height:1,background:"#e8eef4",margin:"4px 0 18px" }}/>
            <SH>Life Assured Details</SH>

            <Field label="Age at Entry" error={fieldErrors.age}
              hint={!fieldErrors.age?`Accepted range: ${ageMin}–${ageMax} years`:undefined}>
              <input type="number" style={inp("age")} value={age}
                min={ageMin} max={ageMax} disabled={loading}
                onChange={e=>{setAge(e.target.value);setResult(null);setAcceptState("idle");}}
                onFocus={()=>setFocused("age")} onBlur={()=>setFocused(null)}
                placeholder={`${ageMin}–${ageMax}`}/>
            </Field>

            <Field label="Gender">
              <Toggle value={gender}
                onChange={v=>{setGender(v);setResult(null);setAcceptState("idle");}}
                disabled={loading}
                options={genderOptions.map(g=>({value:g,label:g==="M"?"Male":"Female"}))}/>
            </Field>

            <div style={{ height:1,background:"#e8eef4",margin:"4px 0 18px" }}/>
            <SH>Policy Terms</SH>

            <Field label="Policy Term" hint={validation?.Term?.error_message||undefined}>
              <select style={sel} value={term} disabled={loading}
                onChange={e=>{setTerm(Number(e.target.value));setResult(null);setAcceptState("idle");}}>
                {termOptions.map(t=><option key={t} value={t}>{t} Years</option>)}
              </select>
            </Field>

            <div style={{ height:1,background:"#e8eef4",margin:"4px 0 18px" }}/>

            <button onClick={handleGetQuote} disabled={loading||valLoading}
              style={{ width:"100%",padding:"12px",
                background:loading||valLoading?"#e2e8f0":"#003C7A",
                color:loading||valLoading?"#a0aec0":"#fff",
                border:"none",borderRadius:8,
                cursor:loading||valLoading?"not-allowed":"pointer",
                fontSize:13,fontWeight:700,letterSpacing:"0.06em",
                textTransform:"uppercase",
                display:"flex",alignItems:"center",justifyContent:"center",gap:9,
                transition:"background 0.15s" }}>
              {loading
                ? <><Spinner size={14} color="#a0aec0"/> Calculating…</>
                : "Generate Quotation"}
            </button>
          </div>
        </div>

        {/* ─── RIGHT: OUTPUTS ─── */}
        <div ref={resultsRef} style={{ display:"flex",flexDirection:"column",gap:16 }}>

          {/* Empty state */}
          {!result&&!loading&&!apiError && (
            <div style={{ background:"#fff",borderRadius:13,border:"1px dashed #cbd5e0",
              padding:"52px 36px",textAlign:"center" }}>
              <div style={{ width:48,height:48,borderRadius:"50%",
                background:"#eef4fb",border:"1.5px solid #c3d9ef",
                display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#003C7A" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M8 12h8M12 8v8"/>
                </svg>
              </div>
              <div style={{ fontSize:14,fontWeight:700,color:"#2d3748",marginBottom:5 }}>
                No quotation yet
              </div>
              <div style={{ fontSize:12,color:"#a0aec0",lineHeight:1.6,maxWidth:260,margin:"0 auto" }}>
                Complete the form and click{" "}
                <strong style={{ color:"#003C7A" }}>Generate Quotation</strong>.
              </div>
            </div>
          )}

          {/* Lion loading */}
          {loading && (
            <div style={{ background:"#fff",borderRadius:13,border:"1px solid #e2e8f0",
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
              <RoaringLion/>
            </div>
          )}

          {/* Error */}
          {apiError&&!loading && (
            <div style={{ background:"#fff5f5",borderRadius:13,
              border:"1px solid #fed7d7",padding:"18px 22px",
              fontSize:13,color:"#c53030" }}>⚠ {apiError}</div>
          )}

          {/* Results */}
          {result&&!loading && (
            <div style={{ animation:"slideIn 0.3s ease-out" }}>

              {/* Result card */}
              <div style={{ background:"#fff",borderRadius:13,border:"1px solid #e2e8f0",
                overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",marginBottom:16 }}>

                {/* Navy header */}
                <div style={{ background:"#003C7A",padding:"18px 24px",
                  display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",
                      color:"#27AAE1",marginBottom:3,fontWeight:600 }}>Quotation Result</div>
                    <div style={{ fontSize:16,fontWeight:700,color:"#fff",fontFamily:"Georgia,serif" }}>
                      Summit Endowment Plan
                    </div>
                    {clientName && (
                      <div style={{ fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:3 }}>
                        Prepared for <strong style={{ color:"#fff" }}>{clientName}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:9,color:"rgba(255,255,255,0.45)",marginBottom:2 }}>
                      MONTHLY PREMIUM
                    </div>
                    <div style={{ fontSize:32,fontWeight:700,color:"#fff",fontFamily:"Georgia,serif" }}>
                      <AnimatedNumber target={displayPremium} compact={compact}/>
                    </div>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:1 }}>per month</div>
                  </div>
                </div>

                {/* Policy strip - centred, NO duplicate validity bar below */}
                <div style={{ padding:"10px 22px",background:"#f7fafc",
                  borderBottom:"1px solid #e8eef4",display:"flex",gap:20,
                  flexWrap:"wrap",justifyContent:"center" }}>
                  {[
                    ["Client",            clientName||"—"],
                    ["Age",               `${age} yrs · ${gender==="M"?"Male":"Female"}`],
                    ["Term",              `${term} Years`],
                    ["Ref",               quoteRef],
                    ["Quotation Expiry",  validUntil||"—"],
                  ].map(([k,v])=>(
                    <div key={k} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:9,letterSpacing:"0.09em",textTransform:"uppercase",
                        color:"#a0aec0",fontWeight:600 }}>{k}</div>
                      <div style={{ fontSize:12,fontWeight:600,color:"#2d3748",marginTop:1 }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding:"16px 22px" }}>
                  {/* Stat boxes */}
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10 }}>
                    <StatBox label="Sum Assured"
                      value={<AnimatedNumber target={sumAssured} compact={compact}/>}
                      sub={calcby==="Premium"?"Solved by engine":"Input value"}/>
                    <StatBox label="Maturity Estimate"
                      value={<AnimatedNumber target={maturityEst} compact={compact}/>}
                      sub={`End of year ${term}`}
                      tooltip="The estimated value payable at the end of the policy term. Includes your Sum Assured plus accumulated bonuses. Bonuses may vary year on year based on market performance."/>
                    <StatBox label="Bonus Estimate"
                      value={<AnimatedNumber target={bonusEst} compact={compact}/>}
                      sub="Simple interest on SA"
                      tooltip="The projected bonus applied to your Sum Assured over the policy term. This is an estimate — actual bonuses are declared annually and depend on investment returns."/>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
                    <StatBox label={`Total Premiums (${term} yrs)`}
                      value={<AnimatedNumber target={totalPremiums} compact={compact}/>}
                      sub="Sum of all premiums payable"/>
                    {/* Maturity growth - teal accent, not dominant navy */}
                    <StatBox label="Maturity Growth"
                      value={growthPct!=null?`+${growthPct}%`:"—"}
                      sub="vs total premiums paid" teal/>
                  </div>
                </div>
              </div>

              {/* ── ACCEPT PANEL ── */}
              {acceptState==="pending" && (
                <div style={{ background:"#fff",borderRadius:13,border:"1.5px solid #003C7A",
                  overflow:"hidden",boxShadow:"0 4px 20px rgba(0,60,122,0.12)",
                  animation:"slideIn 0.3s ease-out" }}>
                  <div style={{ background:"linear-gradient(135deg,#003C7A,#0057a8)",padding:"18px 24px" }}>
                    <div style={{ fontSize:10,letterSpacing:"0.16em",textTransform:"uppercase",
                      color:"#27AAE1",marginBottom:4,fontWeight:600 }}>Client Decision</div>
                    <div style={{ fontSize:16,fontWeight:700,color:"#fff",fontFamily:"Georgia,serif" }}>
                      Accept this quotation?
                    </div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:4 }}>
                      Monthly premium of{" "}
                      <strong style={{ color:"#fff" }}>{fmtKES(displayPremium,compact)}</strong>
                      {" "}· SA{" "}
                      <strong style={{ color:"#fff" }}>{fmtKES(sumAssured,compact)}</strong>
                    </div>
                  </div>
                  <div style={{ padding:"18px 24px",display:"flex",gap:12 }}>
                    {/* Primary: dominant */}
                    <button onClick={handleAccept} disabled={finalLoading} style={{
                      flex:2,padding:"13px 20px",
                      background:finalLoading?"#e2e8f0":"#003C7A",
                      color:finalLoading?"#a0aec0":"#fff",
                      border:"none",borderRadius:8,cursor:finalLoading?"not-allowed":"pointer",
                      fontSize:13,fontWeight:700,letterSpacing:"0.05em",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                      transition:"all 0.15s" }}>
                      {finalLoading
                        ? <><Spinner size={14} color="#a0aec0"/> Processing…</>
                        : <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Yes — Accept Quotation
                          </>
                      }
                    </button>
                    {/* Secondary: subdued text link style */}
                    <button onClick={handleDecline} disabled={finalLoading} style={{
                      flex:1,padding:"13px 20px",
                      background:"transparent",color:"#718096",
                      border:"none",borderRadius:8,
                      cursor:finalLoading?"not-allowed":"pointer",
                      fontSize:12,fontWeight:500,
                      transition:"all 0.15s" }}>
                      No — Start Over
                    </button>
                  </div>
                </div>
              )}

              {/* ── ACCEPTED STATE with success animation ── */}
              {acceptState==="accepted" && (
                <div style={{ background:"#f0faf4",borderRadius:13,
                  border:"1.5px solid #68d391",padding:"24px 22px",
                  animation:"fadeIn 0.3s ease-out",
                  display:"flex",flexDirection:"column",alignItems:"center",
                  textAlign:"center",gap:16 }}>

                  {/* Animated success icon */}
                  <div style={{ width:56,height:56,borderRadius:"50%",
                    background:"#38a169",display:"flex",alignItems:"center",
                    justifyContent:"center",
                    animation: showAccepted?"successPop 0.5s ease-out":"none" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>

                  <div>
                    <div style={{ fontSize:15,fontWeight:700,color:"#276749",marginBottom:4 }}>
                      Quotation Accepted — {clientName}
                    </div>
                    <div style={{ fontSize:12,color:"#2d7d46",lineHeight:1.6 }}>
                      Final quotation recorded and submitted to ICEA LION.
                      {pdfUrl
                        ? " Your quotation PDF is ready to view."
                        : " PDF is being prepared — check back shortly."}
                    </div>
                  </div>

                  <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
                    {pdfUrl ? (
                      <button onClick={()=>setPdfPreviewOpen(true)}
                        style={{ padding:"9px 20px",background:"#003C7A",color:"#fff",
                          border:"none",borderRadius:7,fontSize:12,fontWeight:700,
                          cursor:"pointer",display:"flex",alignItems:"center",gap:7 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        View Quotation PDF
                      </button>
                    ) : (
                      <button disabled style={{ padding:"9px 20px",background:"#e2e8f0",
                        color:"#a0aec0",border:"none",borderRadius:7,
                        fontSize:12,fontWeight:700,cursor:"not-allowed",
                        display:"flex",alignItems:"center",gap:7 }}>
                        <Spinner size={12} color="#a0aec0"/> Preparing PDF…
                      </button>
                    )}
                    <button onClick={()=>setEmailOpen(true)}
                      style={{ padding:"9px 20px",background:"#fff",color:"#003C7A",
                        border:"1.5px solid #003C7A",borderRadius:7,
                        fontSize:12,fontWeight:700,cursor:"pointer",
                        display:"flex",alignItems:"center",gap:7 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Email Client
                    </button>
                    <button onClick={handleDecline}
                      style={{ padding:"9px 20px",background:"#fff",color:"#4a5568",
                        border:"1px solid #e2e8f0",borderRadius:7,
                        fontSize:12,fontWeight:600,cursor:"pointer" }}>
                      New Quote
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer className="no-print" style={{ maxWidth:1120,margin:"24px auto 0",
        padding:"14px 36px",borderTop:"1px solid #e2e8f0",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        fontSize:11,color:"#a0aec0" }}>
        <span>© 2026 ICEA LION Life Assurance Company Limited · For authorised bank partners only</span>
        {/* Success metric - process time */}
        {processTime && (
          <span style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#38a169",
              display:"inline-block" }}/>
            <span>Calculated in <strong style={{ color:"#2d3748" }}>{processTime}ms</strong> by Coherent Spark</span>
          </span>
        )}
        {!processTime && (
          <span>Powered by <strong style={{ color:"#003C7A" }}>Coherent</strong></span>
        )}
      </footer>

    </div>
  );
}