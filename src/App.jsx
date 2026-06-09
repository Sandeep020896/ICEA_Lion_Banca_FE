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
const LOG_URL     = `${SPARK.host}/${SPARK.tenant}/api/v3/folders/${encPath}/log`;
const LOG_CSV_URL = `${SPARK.host}/${SPARK.tenant}/api/v3/folders/${encPath}/log/downloadcsv`;
const LOG_JSON_URL= `${SPARK.host}/${SPARK.tenant}/api/v3/folders/${encPath}/log/downloadjson`;
const HEADERS     = { "Content-Type":"application/json","x-synthetic-key":SPARK.apiKey,"x-tenant-name":SPARK.tenant };

// ─── BANK PARTNER CONFIG (URL param ?bank=crdb) ───────────────────────────────
const BANK_CONFIG = {
  equity: {
    name:      "Equity Bank Kenya",
    shortName: "Equity Bank",
    tagline:   "Equity Bank · Bancassurance Portal",
    logo:      "/equity_logo.png",
  },
  kcb: {
    name:      "KCB Bank Kenya",
    shortName: "KCB",
    tagline:   "KCB Bank · Bancassurance Portal",
    logo:      null, // set to "/kcb_logo.png" when available
  },
  cooperative: {
    name:      "Cooperative Bank of Kenya",
    shortName: "Co-op Bank",
    tagline:   "Co-op Bank · Bancassurance Portal",
    logo:      null, // set to "/coop_logo.png" when available
  },
  stanbic_ug: {
    name:      "Stanbic Bank Uganda",
    shortName: "Stanbic",
    tagline:   "Stanbic Bank · Bancassurance Portal",
    logo:      null, // set to "/stanbic_logo.png" when available
  },
  default: {
    name:      "Equity Bank Kenya",
    shortName: "Equity Bank",
    tagline:   "Equity Bank · Bancassurance Portal",
    logo:      "/equity_logo.png",
  },
};
function getBankConfig() {
  try {
    const p   = new URLSearchParams(window.location.search);
    const key = (p.get("bank") || "default").toLowerCase();
    return BANK_CONFIG[key] || BANK_CONFIG.default;
  } catch { return BANK_CONFIG.default; }
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PASSWORD        = "Coherent!";
const IDLE_MS         = 30 * 60 * 1000;
const WARN_MS         = 2  * 60 * 1000;
const VALIDITY_DAYS   = 90;
const ICEA_NAVY       = "#003C7A";
const ICEA_TEAL       = "#27AAE1";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmt(n, dec=0) {
  return n==null ? "-" : Number(n).toLocaleString("en-KE",{minimumFractionDigits:dec,maximumFractionDigits:dec});
}
// KES compact: ≥1M → Mn, ≥1k → k, else full
function fmtCompact(n) {
  if (n==null) return "-";
  const v = Number(n);
  if (Math.abs(v) >= 1_000_000) return `KES ${(v/1_000_000).toFixed(2)}Mn`;
  if (Math.abs(v) >= 1_000)     return `KES ${(v/1_000).toFixed(1)}k`;
  return `KES ${fmt(v)}`;
}
function fmtKES(n, compact=false) {
  return n==null ? "-" : compact ? fmtCompact(n) : `KES ${fmt(n)}`;
}
function fmtNum(n, dec=2) {
  return n==null ? "-" : Number(n).toLocaleString("en-KE",{minimumFractionDigits:dec,maximumFractionDigits:dec});
}
function addDays(d, n) { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function fmtDate(d) { return d.toLocaleDateString("en-KE",{day:"numeric",month:"long",year:"numeric"}); }
function fmtDateTime(s) {
  if (!s) return "-";
  try { return new Date(s).toLocaleString("en-KE",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
  catch { return s; }
}
function stripCommas(s) { return String(s).replace(/,/g,""); }

// ─── ANIMATED NUMBER ──────────────────────────────────────────────────────────
function AnimatedNumber({ target, compact=false }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target==null) return;
    cancelAnimationFrame(rafRef.current);
    const from=display, to=Number(target), dur=800, t0=performance.now();
    function tick(now) {
      const p=Math.min((now-t0)/dur,1), e=1-Math.pow(1-p,3);
      setDisplay(from+(to-from)*e);
      if (p<1) rafRef.current=requestAnimationFrame(tick);
    }
    rafRef.current=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[target]);
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
        width:15,height:15,borderRadius:"50%",background:ICEA_TEAL,color:"#fff",
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

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner({ size=16, color=ICEA_NAVY }) {
  return <span style={{ display:"inline-block",width:size,height:size,
    border:`2px solid ${color}22`,borderTop:`2px solid ${color}`,
    borderRadius:"50%",animation:"spin 0.75s linear infinite",flexShrink:0 }}/>;
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
      <div style={{ marginTop:16,fontSize:13,fontWeight:600,color:ICEA_NAVY,letterSpacing:"0.04em" }}>
        Calculating your quotation...
      </div>
      <div style={{ marginTop:4,fontSize:11,color:"#a0aec0" }}>Powered by Coherent Spark</div>
    </div>
  );
}

// ─── FIELD ────────────────────────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block",fontSize:11,fontWeight:600,
        letterSpacing:"0.06em",textTransform:"uppercase",color:"#4a5568",marginBottom:5 }}>
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
    <div style={{ display:"flex",borderRadius:7,overflow:"hidden",
      border:"1.5px solid #e2e8f0",opacity:disabled?0.5:1,
      pointerEvents:disabled?"none":"auto" }}>
      {options.map(o=>{
        const active=value===o.value;
        return (
          <button key={o.value} onClick={()=>onChange(o.value)} style={{
            flex:1,padding:"9px 10px",border:"none",cursor:"pointer",
            fontSize:12,fontWeight:active?700:500,fontFamily:"inherit",
            background:active?ICEA_NAVY:"#fff",color:active?"#fff":"#4a5568",
            transition:"all 0.15s" }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function SH({ children }) {
  return <div style={{ fontSize:10,letterSpacing:"0.13em",textTransform:"uppercase",
    fontWeight:700,color:ICEA_TEAL,marginBottom:14,paddingBottom:7,
    borderBottom:`1.5px solid #e8eef4` }}>{children}</div>;
}

function StatBox({ label, value, sub, accent, teal, tooltip }) {
  return (
    <div style={{ padding:"14px 16px",borderRadius:9,
      background:accent?ICEA_NAVY:teal?"#EAF9F9":"#f7fafc",
      border:accent?"none":teal?`1px solid ${ICEA_TEAL}`:"1px solid #e8eef4" }}>
      <div style={{ fontSize:10,letterSpacing:"0.09em",textTransform:"uppercase",
        color:accent?"rgba(255,255,255,0.55)":teal?"#1a7a7a":"#718096",
        marginBottom:5,fontWeight:600 }}>
        {tooltip ? <Tip text={tooltip}>{label}</Tip> : label}
      </div>
      <div style={{ fontSize:19,fontWeight:700,
        color:accent?"#fff":teal?"#1a7a7a":"#1a202c",fontFamily:"inherit" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11,
        color:accent?"rgba(255,255,255,0.45)":teal?"#2a9d9d":"#a0aec0",marginTop:3 }}>{sub}</div>}
    </div>
  );
}

// ─── PASSWORD SCREEN ──────────────────────────────────────────────────────────
function PasswordScreen({ onUnlock, bankConfig }) {
  const [pw,setPw]     = useState("");
  const [err,setErr]   = useState(false);
  const [show,setShow] = useState(false);

  function submit() {
    if (pw===PASSWORD) onUnlock();
    else { setErr(true); setPw(""); setTimeout(()=>setErr(false),2000); }
  }

  return (
    <div style={{ minHeight:"100vh",
      background:`linear-gradient(160deg,#001f3f 0%,${ICEA_NAVY} 60%,#0057a8 100%)`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'Montserrat','Segoe UI',sans-serif" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
      <div style={{ background:"#fff",borderRadius:18,padding:"44px 44px 36px",width:420,
        boxShadow:"0 32px 100px rgba(0,0,0,0.35)",textAlign:"center" }}>

        {/* Logos: ICEA Lion + Bank Partner */}
        <div style={{ display:"flex",justifyContent:"center",alignItems:"center",gap:16,marginBottom:6 }}>
          <img src="/icea_lion_logo.png" alt="ICEA LION" style={{ height:52,objectFit:"contain" }}/>
          {bankConfig.logo && (
            <>
              <div style={{ width:1,height:40,background:"#e2e8f0" }}/>
              <img src={bankConfig.logo} alt={bankConfig.shortName}
                style={{ height:44,objectFit:"contain" }}/>
            </>
          )}
        </div>

        <div style={{ height:1,background:"#e8eef4",margin:"14px 0 12px" }}/>

        <div style={{ fontSize:16,fontWeight:700,color:ICEA_NAVY,marginBottom:3 }}>
          Summit Endowment Plan
        </div>
        <div style={{ fontSize:11,color:"#718096",marginBottom:6,lineHeight:1.6 }}>
          ICEA LION Life Assurance
        </div>

        {/* Bank partner badge */}
        <div style={{ display:"inline-block",background:"#f7fafc",
          border:"1px solid #e2e8f0",borderRadius:6,
          padding:"4px 14px",fontSize:11,fontWeight:600,
          color:"#4a5568",marginBottom:20,letterSpacing:"0.04em" }}>
          In partnership with {bankConfig.name}
        </div>

        <div style={{ fontSize:11,color:"#a0aec0",marginBottom:18 }}>
          Bancassurance Partner Quotation System
        </div>

        <div style={{ position:"relative",marginBottom:err?8:16 }}>
          <input type={show?"text":"password"} value={pw}
            onChange={e=>{setPw(e.target.value);setErr(false);}}
            onKeyDown={e=>e.key==="Enter"&&submit()}
            placeholder="Enter access code"
            autoFocus
            style={{ width:"100%",boxSizing:"border-box",
              padding:"12px 44px 12px 16px",fontSize:14,
              border:`1.5px solid ${err?"#c0392b":"#e2e8f0"}`,
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
          background:ICEA_NAVY,color:"#fff",border:"none",borderRadius:9,
          fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",
          textTransform:"uppercase",fontFamily:"inherit",marginBottom:20 }}>
          Enter Portal
        </button>

        <div style={{ height:1,background:"#e8eef4",marginBottom:16 }}/>

        {/* Coherent logo */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
          <div style={{ fontSize:9,color:"#a0aec0",letterSpacing:"0.08em",textTransform:"uppercase" }}>
            Powered by
          </div>
          <img src="/coherent_logo.png" alt="Coherent" style={{ height:18,objectFit:"contain" }}/>
        </div>
        <div style={{ marginTop:10,fontSize:10,color:"#a0aec0" }}>
          For authorised bank partners only
        </div>
      </div>
    </div>
  );
}

// ─── TIMEOUT MODAL ────────────────────────────────────────────────────────────
function TimeoutModal({ onStay, onLogout, countdown }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.6)",
      display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:"#fff",borderRadius:14,padding:"36px 40px",
        width:380,textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",
        fontFamily:"'Montserrat','Segoe UI',sans-serif" }}>
        <div style={{ fontSize:36,marginBottom:12 }}>⏱</div>
        <div style={{ fontSize:15,fontWeight:700,color:"#1a202c",marginBottom:8 }}>
          Session Expiring Soon
        </div>
        <div style={{ fontSize:12,color:"#718096",marginBottom:8,lineHeight:1.6 }}>
          Your session will expire due to inactivity in
        </div>
        <div style={{ fontSize:32,fontWeight:700,color:ICEA_NAVY,marginBottom:16 }}>
          {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,"0")}
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onStay} style={{ flex:1,padding:"11px",background:ICEA_NAVY,
            color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit" }}>Stay Logged In</button>
          <button onClick={onLogout} style={{ flex:1,padding:"11px",background:"#f7fafc",
            color:"#4a5568",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,
            fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>Log Out</button>
        </div>
      </div>
    </div>
  );
}

// ─── EMAIL MODAL ──────────────────────────────────────────────────────────────
function EmailModal({ open, onClose, result, inputs, quoteRef, pdfUrl, bankName }) {
  const [recipient,setRecipient] = useState("");
  const [recipName,setRecipName] = useState("");
  const [copyMe,setCopyMe]       = useState(false);
  const [sender,setSender]       = useState("");
  if (!open||!result) return null;

  const monthly   = result.APrem ? result.APrem/12 : null;
  const validDate = fmtDate(addDays(new Date(),VALIDITY_DAYS));
  const subject   = `Quotation ${quoteRef} - ICEA LION Summit Endowment Plan`;
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
      ? `To attach the PDF: download it from the quotation viewer and attach to this email.`
      : "A PDF copy will be forwarded to you separately.",
    "",
    "To proceed, please complete the proposal form.",
    "",
    "Warm regards,",
    sender||"[Your Name]",
    `${bankName} - ICEA LION Bancassurance Partner`,
  ].join("\n");

  const mailto = `mailto:${encodeURIComponent(recipient)}`
    +`?subject=${encodeURIComponent(subject)}`
    +`&body=${encodeURIComponent(body)}`
    +(copyMe&&sender?`&cc=${encodeURIComponent(sender)}`:"");

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,0.5)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"24px" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff",borderRadius:14,width:520,
        boxShadow:"0 24px 80px rgba(0,0,0,0.25)",overflow:"hidden",
        animation:"slideIn 0.25s ease-out",fontFamily:"'Montserrat','Segoe UI',sans-serif" }}>
        <div style={{ background:ICEA_NAVY,padding:"16px 24px",
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",
              color:ICEA_TEAL,marginBottom:2,fontWeight:600 }}>Email Quotation</div>
            <div style={{ fontSize:14,fontWeight:700,color:"#fff" }}>Send to Client</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",
            color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:20 }}>x</button>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <div style={{ background:"#f0f7ff",border:"1px solid #c3d9ef",borderRadius:8,
            padding:"10px 14px",marginBottom:16,fontSize:11,color:"#2c5282",lineHeight:1.6 }}>
            <strong>To attach the PDF:</strong> click Download PDF in the quotation viewer
            first, then attach the saved file to this email.
          </div>
          {[
            ["Recipient Email *","email",recipient,setRecipient,"client@example.com"],
            ["Recipient Name","text",recipName,setRecipName,inputs.clientName||"Client name"],
            ["Your Name / Branch","text",sender,setSender,`e.g. John Kamau - ${bankName}`],
          ].map(([label,type,val,setter,ph])=>(
            <div key={label} style={{ marginBottom:12 }}>
              <label style={{ display:"block",fontSize:11,fontWeight:600,
                letterSpacing:"0.07em",textTransform:"uppercase",color:"#4a5568",marginBottom:4 }}>
                {label}
              </label>
              <input type={type} value={val} onChange={e=>setter(e.target.value)}
                placeholder={ph} style={{ width:"100%",boxSizing:"border-box",
                  padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:7,
                  fontSize:13,fontFamily:"inherit",outline:"none" }}/>
            </div>
          ))}
          <div style={{ marginBottom:16,display:"flex",alignItems:"center",gap:8 }}>
            <input type="checkbox" id="copyMe" checked={copyMe}
              onChange={e=>setCopyMe(e.target.checked)}/>
            <label htmlFor="copyMe" style={{ fontSize:12,color:"#4a5568",cursor:"pointer" }}>
              Send me a copy
            </label>
          </div>
          <a href={mailto} onClick={onClose} style={{ display:"block",textDecoration:"none" }}>
            <button style={{ width:"100%",padding:"12px",
              background:recipient?ICEA_NAVY:"#e2e8f0",
              color:recipient?"#fff":"#a0aec0",border:"none",borderRadius:8,
              fontSize:13,fontWeight:700,cursor:recipient?"pointer":"not-allowed",
              letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              Open in Email Client
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── PDF PREVIEW MODAL ────────────────────────────────────────────────────────
function PdfModal({ open, onClose, pdfUrl, quoteRef, clientName }) {
  const [downloading,setDownloading] = useState(false);
  const [embedFailed,setEmbedFailed] = useState(false);
  useEffect(()=>{ if(open) setEmbedFailed(false); },[open,pdfUrl]);
  if (!open||!pdfUrl) return null;

  const fileName = `ICEA_LION_Quotation_${quoteRef}.pdf`;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res=await fetch(pdfUrl); const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download=fileName; a.click();
      URL.revokeObjectURL(url);
    } catch { window.open(pdfUrl,"_blank"); }
    finally { setDownloading(false); }
  }

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1200,background:"rgba(0,0,0,0.65)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"flex-start",padding:"24px 16px",overflowY:"auto" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff",borderRadius:14,width:"100%",maxWidth:860,
        boxShadow:"0 24px 80px rgba(0,0,0,0.35)",display:"flex",flexDirection:"column",
        animation:"slideIn 0.25s ease-out",fontFamily:"'Montserrat','Segoe UI',sans-serif" }}>
        <div style={{ padding:"14px 20px",borderBottom:"1px solid #e2e8f0",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          borderRadius:"14px 14px 0 0" }}>
          <div>
            <div style={{ fontSize:13,fontWeight:700,color:"#1a202c" }}>Quotation Schedule</div>
            <div style={{ fontSize:11,color:"#718096",marginTop:1 }}>
              {clientName&&<span>{clientName} - </span>}Ref: {quoteRef}
            </div>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={handleDownload} disabled={downloading}
              style={{ padding:"8px 16px",
                background:downloading?"#e2e8f0":ICEA_NAVY,
                color:downloading?"#a0aec0":"#fff",
                border:"none",borderRadius:7,fontSize:12,fontWeight:700,
                cursor:downloading?"not-allowed":"pointer",
                display:"flex",alignItems:"center",gap:7 }}>
              {downloading
                ? <><Spinner size={12} color="#a0aec0"/> Downloading...</>
                : "Download PDF"}
            </button>
            <button onClick={onClose} style={{ padding:"8px 14px",background:"#f7fafc",
              color:"#4a5568",border:"1px solid #e2e8f0",borderRadius:7,
              fontSize:12,fontWeight:600,cursor:"pointer" }}>Close</button>
          </div>
        </div>
        <div style={{ background:"#525659",borderRadius:"0 0 14px 14px",
          overflow:"hidden",minHeight:700 }}>
          {!embedFailed ? (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
              title="Quotation PDF" width="100%" height="700px"
              style={{ display:"block",border:"none" }}
              onError={()=>setEmbedFailed(true)}/>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",height:500,gap:20,padding:"40px",textAlign:"center" }}>
              <div style={{ fontSize:14,fontWeight:700,color:"#fff",marginBottom:8 }}>
                Inline preview not available
              </div>
              <div style={{ fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.7,maxWidth:340,margin:"0 auto" }}>
                Use Download PDF above to save, or open directly below.
              </div>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                <button style={{ padding:"10px 24px",background:ICEA_TEAL,color:"#fff",
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

// ─── API CALL HISTORY PAGE ────────────────────────────────────────────────────
function CallHistoryPage({ onBack, bankName }) {
  const [calls, setCalls]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [filter, setFilter]       = useState("");
  const [purposeFilter, setPurposeFilter] = useState("All");
  const [downloading, setDownloading]     = useState(false);
  const [expandedRow, setExpandedRow]     = useState(null);

  const SAMPLE_CALLS = [
    { call_id:"cf836931-e95c-418d-9d88-cad2065018fb", request_timestamp:"2026-06-05T08:42:40Z",
      call_purpose:"Get Quotation", source_system:"Banca Partner Portal - Equity Bank Kenya",
      correlation_id:"20260605-Amara-0001", process_time:49, version:"0.3.0", error:null },
    { call_id:"d739564c-3f19-4494-97c8-9fe2e9be4b51", request_timestamp:"2026-06-05T08:43:12Z",
      call_purpose:"Final Quotation", source_system:"Banca Partner Portal - Equity Bank Kenya",
      correlation_id:"20260605-Amara-0001", process_time:317, version:"0.3.0", error:null },
    { call_id:"b0b8650a-0488-4e87-aa34-78d3e0090ea5", request_timestamp:"2026-06-05T09:11:05Z",
      call_purpose:"Get Quotation", source_system:"Banca Partner Portal - Equity Bank Kenya",
      correlation_id:"20260605-David-0002", process_time:126, version:"0.3.0", error:null },
    { call_id:"469c3e42-6516-4b02-baf8-61233fa8cd19", request_timestamp:"2026-06-05T09:14:38Z",
      call_purpose:"Final Quotation", source_system:"Banca Partner Portal - Equity Bank Kenya",
      correlation_id:"20260605-David-0002", process_time:294, version:"0.3.0", error:null },
    { call_id:"7a3f9c12-1234-4567-abcd-ef0123456789", request_timestamp:"2026-06-05T10:02:17Z",
      call_purpose:"Get Quotation", source_system:"Banca Partner Portal - Equity Bank Kenya",
      correlation_id:"20260605-Grace-0003", process_time:62, version:"0.3.0", error:null },
  ];

  // Parse CSV text into row objects
  function parseCSV(text) {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    // Normalise header names - strip quotes, lowercase, replace spaces with underscores
    const headers = lines[0].split(",").map(h=>
      h.replace(/^"|"$/g,"").trim().toLowerCase().replace(/[\s\-\/]+/g,"_")
    );
    // Log actual headers to console so we can see what Spark returns
    console.log("Spark CSV headers:", headers);
    return lines.slice(1).map(line=>{
      const values = []; let cur="", inQ=false;
      for (let i=0; i<line.length; i++) {
        if (line[i]==='"') { inQ=!inQ; }
        else if (line[i]==="," && !inQ) { values.push(cur.replace(/^"|"$/g,"")); cur=""; }
        else { cur+=line[i]; }
      }
      values.push(cur.replace(/^"|"$/g,""));
      const obj={};
      headers.forEach((h,i)=>{ obj[h]=values[i]||""; });
      const get = (...keys) => { for (const k of keys) if (obj[k]) return obj[k]; return ""; };
      return {
        call_id:           get("call_id","callid","id","execution_id"),
        request_timestamp: get("log_time","logtime","request_timestamp","timestamp","date","call_date","created_at","time"),
        call_purpose:      get("call_purpose","callpurpose","purpose","call_type"),
        source_system:     get("source_system","sourcesystem","source","client","caller"),
        correlation_id:    get("correlation_id","correlationid","reference","ref","correlation"),
        process_time:      get("calc_time_(ms)","total_time_(ms)","calc_time_ms","total_time_ms","process_time","processtime","duration","duration_ms","execution_time","response_time","time_ms","elapsed"),
        version:           get("version","model_version","service_version","ver"),
        compiler_type:     get("compiler_type","compiler","compiler_version"),
        service_id:        get("service_id","serviceid"),
        version_id:        get("version_id","versionid"),
        engine_id:         get("engine_id","engineid"),
        error:             get("error_details","error","errors","error_message")||null,
      };
    }).filter(r=>r.call_id||r.call_purpose||r.correlation_id);
  }

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        // Step 1: POST to start the async CSV export job
        const jobRes = await fetch(LOG_CSV_URL, {
          method:"POST", headers: HEADERS,
          body: JSON.stringify({
            request_data: { start_date:"2026-01-01", end_date:"" },
            request_meta: {}
          })
        });
        if (!jobRes.ok) throw new Error(`HTTP ${jobRes.status}`);
        const jobData = await jobRes.json();
        const jobId = jobData?.response_data?.job_id || jobData?.job_id;
        if (!jobId) throw new Error("No job_id returned");

        // Step 2: Poll for completion and download_url
        let downloadUrl = null;
        for (let i=0; i<15; i++) {
          await new Promise(r=>setTimeout(r,2000));
          const statusRes = await fetch(
            `${LOG_CSV_URL}/status/${jobId}`,
            { headers: HEADERS }
          );
          const statusData = await statusRes.json();
          const url = statusData?.response_data?.download_url || statusData?.download_url;
          if (url) { downloadUrl=url; break; }
        }
        if (!downloadUrl) throw new Error("Timed out waiting for download URL");

        // Step 3: Load JSZip dynamically, fetch ZIP, extract first CSV file
        const JSZip = (await import("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js")).default
          || window.JSZip;

        const zipRes  = await fetch(downloadUrl);
        const zipBuf  = await zipRes.arrayBuffer();
        const zip     = await JSZip.loadAsync(zipBuf);

        // Find first CSV file in the ZIP
        let csvText = null;
        for (const [name, file] of Object.entries(zip.files)) {
          if (name.endsWith(".csv") && !file.dir) {
            csvText = await file.async("string");
            break;
          }
        }

        if (csvText) {
          const rows = parseCSV(csvText);
          if (rows.length > 0) {
            setCalls(rows);
          } else {
            setCalls(SAMPLE_CALLS);
            setError("sample");
          }
        } else {
          setCalls(SAMPLE_CALLS);
          setError("sample");
        }
      } catch(e) {
        // Any failure - show sample data with amber note
        setCalls(SAMPLE_CALLS);
        setError("sample");
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  // Filter calls
  const filtered = calls.filter(c => {
    const q = filter.toLowerCase();
    const matchText = !q ||
      (c.call_purpose||"").toLowerCase().includes(q) ||
      (c.correlation_id||"").toLowerCase().includes(q) ||
      (c.source_system||"").toLowerCase().includes(q) ||
      (c.call_id||"").toLowerCase().includes(q);
    const matchPurpose = purposeFilter==="All" ||
      (c.call_purpose||"").toLowerCase().includes(purposeFilter.toLowerCase());
    return matchText && matchPurpose;
  });

  // Download CSV - triggers the same job but opens the ZIP download URL directly
  async function handleDownloadCSV() {
    setDownloading(true);
    try {
      const jobRes = await fetch(LOG_CSV_URL, {
        method:"POST", headers: HEADERS,
        body: JSON.stringify({ request_data:{ start_date:"2026-01-01", end_date:"" }, request_meta:{} })
      });
      const jobData = await jobRes.json();
      const jobId = jobData?.response_data?.job_id || jobData?.job_id;
      if (!jobId) throw new Error("No job_id");

      for (let i=0; i<15; i++) {
        await new Promise(r=>setTimeout(r,2000));
        const st = await fetch(`${LOG_CSV_URL}/status/${jobId}`,{headers:HEADERS});
        const sd = await st.json();
        const url = sd?.response_data?.download_url||sd?.download_url;
        if (url) { window.open(url,"_blank"); setDownloading(false); return; }
      }
      throw new Error("Timed out");
    } catch {
      // Fallback: generate CSV from whatever data we have in memory
      const hdrs = ["Timestamp","Call ID","Call Purpose","Source System","Correlation ID","Process Time (ms)","Version","Status"];
      const rows = filtered.map(c=>[
        c.request_timestamp||"", c.call_id||"", c.call_purpose||"",
        c.source_system||"", c.correlation_id||"", c.process_time||"",
        c.version||"", c.error?"Error":"Success",
      ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
      const csv  = [hdrs.join(","),...rows].join("\n");
      const blob = new Blob([csv],{type:"text/csv"});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href=url; a.download=`ICEA_Calls_${new Date().toISOString().split("T")[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  }

  const purposes = ["All","Get Quotation","Final Quotation","Validation"];

  const statusColor = (c) => c.error ? { bg:"#fff5f5",dot:"#c0392b",text:"Error" }
    : { bg:"#f0faf4",dot:"#38a169",text:"Success" };

  return (
    <div style={{ minHeight:"100vh",background:"#f0f4f8",
      fontFamily:"'Montserrat','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <header style={{ background:"#fff",borderBottom:"1px solid #e2e8f0",
        padding:"0 36px",height:96,display:"grid",gridTemplateColumns:"1fr auto 1fr",
        alignItems:"center",position:"sticky",top:0,zIndex:100,
        boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex",alignItems:"center" }}>
          <img src="/icea_lion_logo.png" alt="ICEA LION" style={{ height:52,objectFit:"contain" }}/>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ background:"#eef4fb",border:`1px solid ${ICEA_TEAL}40`,
            borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:700,
            color:ICEA_NAVY,letterSpacing:"0.06em",textTransform:"uppercase" }}>
            API Call History
          </div>
          <div style={{ fontSize:11,color:"#718096" }}>
            {bankName}
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end" }}>
          <img src="/coherent_logo.png" alt="Coherent" style={{ height:22,objectFit:"contain" }}/>
        </div>
      </header>

      {/* Title band */}
      <div style={{ background:ICEA_NAVY,padding:"24px 36px 22px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",
              color:ICEA_TEAL,marginBottom:6,fontWeight:600 }}>Coherent Spark</div>
            <div style={{ fontSize:22,fontWeight:700,color:"#fff" }}>
              Quotation API Call History
            </div>
          </div>
          <button onClick={onBack} style={{ padding:"8px 18px",
            background:"rgba(255,255,255,0.1)",color:"#fff",
            border:"1px solid rgba(255,255,255,0.2)",borderRadius:7,
            fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
            display:"flex",alignItems:"center",gap:7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to Portal
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth:1200,margin:"24px auto",padding:"0 36px" }}>

        {/* Toolbar */}
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",
          padding:"16px 20px",marginBottom:18,display:"flex",
          gap:14,alignItems:"center",flexWrap:"wrap",
          boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          {/* Search */}
          <div style={{ flex:1,minWidth:200,position:"relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#a0aec0" strokeWidth="2" strokeLinecap="round"
              style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" value={filter} onChange={e=>setFilter(e.target.value)}
              placeholder="Search by purpose, ref, source..."
              style={{ width:"100%",boxSizing:"border-box",padding:"8px 12px 8px 32px",
                border:"1.5px solid #e2e8f0",borderRadius:7,fontSize:12,
                fontFamily:"inherit",outline:"none" }}/>
          </div>
          {/* Purpose filter */}
          <div style={{ display:"flex",gap:6 }}>
            {purposes.map(p=>(
              <button key={p} onClick={()=>setPurposeFilter(p)} style={{
                padding:"6px 12px",borderRadius:6,border:"1.5px solid",
                borderColor:purposeFilter===p?ICEA_NAVY:"#e2e8f0",
                background:purposeFilter===p?ICEA_NAVY:"#fff",
                color:purposeFilter===p?"#fff":"#718096",
                fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                {p}
              </button>
            ))}
          </div>
          {/* Stats */}
          <div style={{ fontSize:11,color:"#718096",whiteSpace:"nowrap" }}>
            {filtered.length} of {calls.length} calls
          </div>
          {/* Download */}
          <button onClick={handleDownloadCSV} disabled={downloading||filtered.length===0}
            style={{ padding:"8px 16px",
              background:downloading||filtered.length===0?"#e2e8f0":ICEA_NAVY,
              color:downloading||filtered.length===0?"#a0aec0":"#fff",
              border:"none",borderRadius:7,fontSize:11,fontWeight:700,
              cursor:downloading||filtered.length===0?"not-allowed":"pointer",
              fontFamily:"inherit",display:"flex",alignItems:"center",gap:7 }}>
            {downloading ? <><Spinner size={12} color="#a0aec0"/> Preparing...</> : "Download CSV"}
          </button>
        </div>

        {/* Table */}
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",
          overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>

          {loading && (
            <div style={{ padding:"60px",textAlign:"center" }}>
              <Spinner size={32} color={ICEA_NAVY}/>
              <div style={{ marginTop:16,fontSize:13,color:"#718096" }}>
                Loading call history from Coherent Spark...
              </div>
            </div>
          )}

          {error==="sample" && !loading && (
            <div style={{ padding:"10px 20px",background:"#fffbeb",
              borderBottom:"1px solid #f6e05e",
              fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#92400e" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Showing sample call log data. To enable live logs, ask your Coherent account manager
              to assign <strong>Spark.DownloadCsvLog.json</strong> permissions to this API key.
            </div>
          )}

          {!loading && !error && filtered.length===0 && (
            <div style={{ padding:"60px",textAlign:"center" }}>
              <div style={{ fontSize:13,color:"#a0aec0" }}>
                {calls.length===0
                  ? "No call history found for this service."
                  : "No calls match your search."}
              </div>
            </div>
          )}

          {!loading && !error && filtered.length>0 && (
            <div style={{ overflowX:"auto" }}>
              {/* Table header - added Version + Log Time */}
              <div style={{ display:"grid",
                gridTemplateColumns:"160px 140px 1fr 1fr 1fr 80px 70px 40px",
                padding:"10px 20px",background:"#f7fafc",
                borderBottom:"1px solid #e2e8f0",fontSize:10,
                fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",
                color:"#718096",gap:12 }}>
                <div>Log Time</div>
                <div>Version</div>
                <div>Call Purpose</div>
                <div>Correlation ID (Ref)</div>
                <div>Source System</div>
                <div>Time (ms)</div>
                <div>Status</div>
                <div></div>
              </div>
              {filtered.map((c,i)=>{
                const st = statusColor(c);
                const expanded = expandedRow===i;
                return (
                  <div key={c.call_id||i}>
                    <div style={{ display:"grid",
                      gridTemplateColumns:"160px 140px 1fr 1fr 1fr 80px 70px 40px",
                      padding:"12px 20px",borderBottom:"1px solid #f0f0f0",
                      fontSize:12,color:"#2d3748",gap:12,alignItems:"center",
                      background:i%2===0?"#fff":"#fafafa",
                      cursor:"pointer",transition:"background 0.1s" }}
                      onClick={()=>setExpandedRow(expanded?null:i)}>
                      {/* Log Time */}
                      <div style={{ fontSize:11,color:"#718096" }}>
                        {fmtDateTime(c.request_timestamp)||"-"}
                      </div>
                      {/* Version */}
                      <div style={{ fontSize:11,fontWeight:600,color:ICEA_NAVY }}>
                        {c.version ? `v${c.version}` : "-"}
                      </div>
                      {/* Call Purpose */}
                      <div style={{ fontWeight:600,fontSize:11 }}>
                        {c.call_purpose||"-"}
                      </div>
                      {/* Correlation ID */}
                      <div style={{ fontSize:11,fontFamily:"monospace",color:ICEA_NAVY }}>
                        {c.correlation_id||"-"}
                      </div>
                      {/* Source System */}
                      <div style={{ fontSize:11,color:"#4a5568" }}>
                        {c.source_system||"-"}
                      </div>
                      {/* Process Time */}
                      <div style={{ fontSize:12,fontWeight:600 }}>
                        {c.process_time && c.process_time!=="0" ? `${c.process_time}ms` : "-"}
                      </div>
                      {/* Status */}
                      <div>
                        <span style={{ display:"inline-flex",alignItems:"center",gap:5,
                          background:st.bg,borderRadius:5,padding:"3px 8px",
                          fontSize:10,fontWeight:700 }}>
                          <span style={{ width:6,height:6,borderRadius:"50%",
                            background:st.dot,display:"inline-block" }}/>
                          {st.text}
                        </span>
                      </div>
                      <div style={{ textAlign:"center",color:"#a0aec0",fontSize:14 }}>
                        {expanded?"▲":"▼"}
                      </div>
                    </div>
                    {/* Expanded row */}
                    {expanded && (
                      <div style={{ padding:"16px 20px",background:"#f7fafc",
                        borderBottom:"1px solid #e2e8f0" }}>
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
                          gap:16,marginBottom:12 }}>
                          {[
                            ["Call ID", c.call_id],
                            ["Version", c.version],
                            ["Compiler", c.compiler_type],
                            ["Service ID", c.service_id],
                            ["Version ID", c.version_id],
                            ["Engine ID", c.engine_id],
                          ].map(([k,v])=>(
                            <div key={k}>
                              <div style={{ fontSize:9,letterSpacing:"0.1em",
                                textTransform:"uppercase",color:"#a0aec0",fontWeight:700,marginBottom:3 }}>{k}</div>
                              <div style={{ fontSize:11,fontFamily:"monospace",color:"#2d3748",wordBreak:"break-all" }}>
                                {v||"-"}
                              </div>
                            </div>
                          ))}
                        </div>
                        {c.error && (
                          <div style={{ background:"#fff5f5",border:"1px solid #fed7d7",
                            borderRadius:7,padding:"10px 14px",fontSize:11,color:"#c0392b" }}>
                            <strong>Error:</strong> {JSON.stringify(c.error)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{ marginTop:14,fontSize:11,color:"#a0aec0",textAlign:"center",lineHeight:1.6 }}>
          Showing API calls from Coherent Spark tenant: <strong style={{ color:"#4a5568" }}>icea_lion</strong>
          {" "} - Service: <strong style={{ color:"#4a5568" }}>ICEA LION - Banco Endowment Modelling</strong>
          {" "} - Market: <strong style={{ color:"#4a5568" }}>Kenya / Uganda</strong>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function ICEALionBancaPortal() {
  const bankConfig = getBankConfig();

  // ── Page ───────────────────────────────────────────────────────────────────
  const [page, setPage] = useState("portal"); // "portal" | "history"

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [unlocked,setUnlocked]       = useState(false);
  const [showTimeout,setShowTimeout] = useState(false);
  const [countdown,setCountdown]     = useState(120);
  const idleRef   = useRef(null);
  const warnRef   = useRef(null);
  const ctdnRef   = useRef(null);
  const resultsRef = useRef(null);

  // ── Validation ─────────────────────────────────────────────────────────────
  const [validation,setValidation]     = useState(null);
  const [valLoading,setValLoading]     = useState(true);
  const [valError,setValError]         = useState(null);
  const [modelVersion,setModelVersion] = useState(null);
  const [processTime,setProcessTime]   = useState(null);

  // ── Form ───────────────────────────────────────────────────────────────────
  const [calcby,setCalcby]           = useState("Sum Assured");
  const [age,setAge]                 = useState("");
  const [gender,setGender]           = useState("M");
  const [saDisplay,setSaDisplay]     = useState("");
  const [saRaw,setSaRaw]             = useState("");
  const [premDisplay,setPremDisplay] = useState("");
  const [premRaw,setPremRaw]         = useState("");
  const [term,setTerm]               = useState(5);
  const [clientName,setClientName]   = useState("");
  const [fieldErrors,setFieldErrors] = useState({});
  const [focused,setFocused]         = useState(null);

  // ── Quote ──────────────────────────────────────────────────────────────────
  const [loading,setLoading]           = useState(false);
  const [result,setResult]             = useState(null);
  const [apiError,setApiError]         = useState(null);
  const [quoteRef,setQuoteRef]         = useState("");
  const [quoteDate,setQuoteDate]       = useState(null);
  const [pdfUrl,setPdfUrl]             = useState(null);
  const [acceptState,setAcceptState]   = useState("idle");
  const [finalLoading,setFinalLoading] = useState(false);
  const [showAccepted,setShowAccepted] = useState(false);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [compact,setCompact]               = useState(false);
  const [emailOpen,setEmailOpen]           = useState(false);
  const [pdfOpen,setPdfOpen]               = useState(false);

  // ── Session timer ──────────────────────────────────────────────────────────
  function clearAll() { clearTimeout(idleRef.current); clearTimeout(warnRef.current); clearInterval(ctdnRef.current); }
  function resetIdle() {
    if (!unlocked) return;
    clearAll(); setShowTimeout(false);
    warnRef.current = setTimeout(()=>{ setShowTimeout(true); startCtdn(); }, IDLE_MS-WARN_MS);
    idleRef.current = setTimeout(()=>forceLogout(), IDLE_MS);
  }
  function startCtdn() {
    setCountdown(120); clearInterval(ctdnRef.current);
    ctdnRef.current = setInterval(()=>setCountdown(c=>c<=1?(clearInterval(ctdnRef.current),0):c-1),1000);
  }
  function forceLogout() { clearAll(); setShowTimeout(false); setUnlocked(false); handleClear(); }

  useEffect(()=>{
    if (!unlocked) return;
    const evts=["mousemove","keydown","click","scroll","touchstart"];
    evts.forEach(e=>window.addEventListener(e,resetIdle));
    resetIdle();
    return ()=>{ evts.forEach(e=>window.removeEventListener(e,resetIdle)); clearAll(); };
  },[unlocked]);

  useEffect(()=>{ document.title="ICEA LION - Summit Endowment - Bancassurance Portal"; },[]);

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

  // ── Input handlers ─────────────────────────────────────────────────────────
  function handleSaChange(e) {
    const raw=stripCommas(e.target.value); setSaRaw(raw);
    const n=parseFloat(raw); setSaDisplay(isNaN(n)?raw:fmt(n));
    setResult(null); setAcceptState("idle");
  }
  function handlePremChange(e) {
    const raw=stripCommas(e.target.value); setPremRaw(raw);
    const n=parseFloat(raw); setPremDisplay(isNaN(n)?raw:fmt(n,2));
    setResult(null); setAcceptState("idle");
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = useCallback(()=>{
    const errs={};
    if (!clientName.trim()) errs.clientName="Client name is required.";
    if (!age||isNaN(Number(age))) { errs.age="Age is required."; }
    else if (validation?.Age) {
      const n=Number(age);
      if (validation.Age.min!=null&&n<validation.Age.min) errs.age=validation.Age.error_message||`Min ${validation.Age.min}.`;
      if (validation.Age.max!=null&&n>validation.Age.max) errs.age=validation.Age.error_message||`Max ${validation.Age.max}.`;
    }
    if (calcby==="Sum Assured"&&(!saRaw||Number(saRaw)<=0)) errs.sa="Please enter a valid Sum Assured.";
    if (calcby==="Premium"    &&(!premRaw||Number(premRaw)<=0)) errs.premium="Please enter a valid Annual Premium.";
    return errs;
  },[age,saRaw,premRaw,calcby,validation,clientName]);

  function buildInputs() {
    return {
      Age:Number(age),Gender:gender,Term:Number(term),Calcby:calcby,
      ClientName:clientName,
      SA:      calcby==="Sum Assured"?Number(saRaw)  :(Number(saRaw)||1000000),
      Premium: calcby==="Premium"    ?Number(premRaw):(Number(premRaw)||192461),
    };
  }

  async function callSpark(callPurpose, correlationId, withPdf=false) {
    const inputs=buildInputs();
    const body={
      request_data:{ inputs:{
        ...inputs,
        ...(withPdf?{QUOTATION:JSON.stringify({FileName:`quotation_${correlationId}.pdf`})}:{}),
      }},
      request_meta:{
        version_id:      SPARK.versionId,
        call_purpose:    callPurpose,               // "Get Quotation" or "Final Quotation"
        source_system:   `Banca Partner Portal - ${bankConfig.name}`,
        correlation_id:  correlationId,             // quotation ref
        service_category:"All",
        ...(withPdf?{xreport_options:{produce_pdfs:true,page_numbers:false}}:{}),
      },
    };
    const res=await fetch(EXECUTE_URL,{method:"POST",headers:HEADERS,body:JSON.stringify(body)});
    return res.json();
  }

  async function handleGetQuote() {
    const errs=validate(); setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    const d=new Date();
    const dp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
    const firstName=clientName.trim().split(/\s+/)[0]||"Client";
    const ck=`qc_${dp}`; const counter=parseInt(sessionStorage.getItem(ck)||"0")+1;
    sessionStorage.setItem(ck,String(counter));
    const ref=`${dp}-${firstName}-${String(counter).padStart(4,"0")}`;
    setQuoteRef(ref); setQuoteDate(new Date());
    setLoading(true); setApiError(null); setResult(null);
    setPdfUrl(null); setAcceptState("idle"); setProcessTime(null);

    try {
      const data=await callSpark("Get Quotation", ref, false);
      if (data?.response_data?.outputs) {
        setResult(data.response_data.outputs);
        if (data.response_meta?.version)      setModelVersion(data.response_meta.version);
        if (data.response_meta?.process_time) setProcessTime(data.response_meta.process_time);
        setAcceptState("pending");
        setTimeout(()=>{
          if (window.innerWidth<900&&resultsRef.current)
            resultsRef.current.scrollIntoView({behavior:"smooth",block:"start"});
        },100);
      } else setApiError(data?.error||"Unexpected response. Please try again.");
    } catch { setApiError("Network error. Please check your connection."); }
    finally  { setLoading(false); }
  }

  async function handleAccept() {
    setFinalLoading(true);
    try {
      const data=await callSpark("Final Quotation", quoteRef, true);
      if (data?.response_meta?.version)      setModelVersion(data.response_meta.version);
      if (data?.response_meta?.process_time) setProcessTime(data.response_meta.process_time);
      const qOut=data?.response_data?.outputs?.QUOTATION;
      if (qOut?.PDFUrl) setPdfUrl(qOut.PDFUrl);
    } catch { /* non-blocking */ }
    finally {
      setFinalLoading(false); setAcceptState("accepted");
      setShowAccepted(true); setTimeout(()=>setShowAccepted(false),4000);
    }
  }

  function handleClear() {
    setResult(null); setApiError(null); setAcceptState("idle");
    setPdfUrl(null); setQuoteRef(""); setQuoteDate(null); setProcessTime(null);
    const v=validation;
    setAge(v?.Age?.default_value?String(v.Age.default_value):"");
    setGender(v?.Gender?.default_value||"M");
    setSaRaw(v?.SA?.default_value?String(v.SA.default_value):"");
    setSaDisplay(v?.SA?.default_value?fmt(v.SA.default_value):"");
    setPremRaw(v?.Premium?.default_value?String(v.Premium.default_value):"");
    setPremDisplay(v?.Premium?.default_value?fmt(v.Premium.default_value,2):"");
    setTerm(v?.Term?.default_value||5); setCalcby(v?.Calcby?.default_value||"Sum Assured");
    setClientName(""); setFieldErrors({});
  }
  function handleDecline() { handleClear(); }

  // ── Derived ────────────────────────────────────────────────────────────────
  const termOptions   = validation?.Term?.options||[5,6,7];
  const genderOptions = validation?.Gender?.options||["M","F"];
  const ageMin=validation?.Age?.min??18, ageMax=validation?.Age?.max??65;
  const annualPremium=result?.APrem, sumAssured=result?.SA;
  const maturityEst=result?.MaturityEst, bonusEst=result?.BonusEst;
  const totalPremiums=annualPremium?annualPremium*Number(term):null;
  const growthPct=(totalPremiums&&maturityEst)?((maturityEst/totalPremiums-1)*100).toFixed(1):null;
  const validUntil=quoteDate?fmtDate(addDays(quoteDate,VALIDITY_DAYS)):null;
  const displayPremium=annualPremium?annualPremium/12:null;

  const inp=(field)=>({
    width:"100%",boxSizing:"border-box",padding:"9px 12px",fontSize:13,
    fontFamily:"inherit",
    border:`1.5px solid ${fieldErrors[field]?"#c0392b":focused===field?ICEA_NAVY:"#e2e8f0"}`,
    borderRadius:7,outline:"none",background:"#fff",color:"#1a202c",
    transition:"border-color 0.15s",opacity:loading?0.6:1,
    pointerEvents:loading?"none":"auto",
  });
  const sel={...inp(""),paddingRight:32,cursor:"pointer",appearance:"none",
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%23718096' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center"};

  // ── Route to history page ──────────────────────────────────────────────────
  if (page==="history") return <CallHistoryPage onBack={()=>setPage("portal")} bankName={bankConfig.name}/>;

  // ── Password gate ──────────────────────────────────────────────────────────
  if (!unlocked) return <PasswordScreen onUnlock={()=>setUnlocked(true)} bankConfig={bankConfig}/>;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh",background:"#f0f4f8",
      fontFamily:"'Montserrat','Segoe UI',sans-serif",color:"#1a202c" }}
      onMouseMove={resetIdle} onKeyDown={resetIdle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        @keyframes spin       { to{transform:rotate(360deg)} }
        @keyframes slideIn    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
        @keyframes lionPulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes successPop { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @media print {
          .no-print{display:none!important}
          body{background:white}
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        *{box-sizing:border-box} button{font-family:inherit}
      `}</style>

      {/* ══ TIMEOUT ══ */}
      {showTimeout && (
        <TimeoutModal countdown={countdown}
          onStay={()=>{ setShowTimeout(false); clearAll(); resetIdle(); }}
          onLogout={()=>forceLogout()}/>
      )}

      {/* ══ MODALS ══ */}
      <EmailModal open={emailOpen} onClose={()=>setEmailOpen(false)}
        result={result} inputs={{term,clientName,calcby}}
        quoteRef={quoteRef} pdfUrl={pdfUrl} bankName={bankConfig.name}/>
      <PdfModal open={pdfOpen} onClose={()=>setPdfOpen(false)}
        pdfUrl={pdfUrl} quoteRef={quoteRef} clientName={clientName}/>

      {/* ══ HEADER ══ */}
      <header className="no-print" style={{ background:"#fff",borderBottom:"1px solid #e2e8f0",
        padding:"0 36px",height:96,display:"grid",gridTemplateColumns:"1fr auto 1fr",
        alignItems:"center",position:"sticky",top:0,zIndex:100,
        boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        {/* Left: ICEA Lion + Bank Partner logo */}
        <div style={{ display:"flex",alignItems:"center",gap:16 }}>
          <img src="/icea_lion_logo.png" alt="ICEA LION" style={{ height:52,objectFit:"contain" }}/>
          {bankConfig.logo && (
            <>
              <div style={{ width:1,height:44,background:"#e2e8f0" }}/>
              <img src={bankConfig.logo} alt={bankConfig.shortName}
                style={{ height:44,objectFit:"contain" }}/>
            </>
          )}
        </div>
        {/* Centre */}
        <div style={{ display:"flex",alignItems:"center",gap:14,justifyContent:"center" }}>
          {valLoading
            ? <div style={{ display:"flex",alignItems:"center",gap:7,fontSize:11,color:"#a0aec0" }}>
                <Spinner size={12} color="#a0aec0"/> Connecting...
              </div>
            : validation && (
              <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#38a169",fontWeight:600 }}>
                <span style={{ width:7,height:7,borderRadius:"50%",background:"#38a169",display:"inline-block" }}/>
                Engine Live
              </div>
            )
          }
          {/* Bank badge - no colour change per request */}
          <div style={{ background:"#eef4fb",border:`1px solid ${ICEA_TEAL}40`,
            borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:700,
            color:ICEA_NAVY,letterSpacing:"0.06em",textTransform:"uppercase" }}>
            {bankConfig.tagline}
          </div>
          {/* KES toggle - now handles k as well */}
          <button onClick={()=>setCompact(c=>!c)} style={{
            padding:"5px 11px",fontSize:10,fontWeight:700,
            background:compact?ICEA_NAVY:"#f7fafc",
            color:compact?"#fff":"#718096",
            border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",
            letterSpacing:"0.06em",textTransform:"uppercase",
            display:"flex",alignItems:"center",gap:5 }}>
            KES Mn/k {compact
              ? <span style={{ opacity:0.6,fontSize:9 }}>on</span>
              : <span style={{ opacity:0.6,fontSize:9 }}>off</span>}
          </button>
        </div>
        {/* Right: Coherent */}
        <div style={{ display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end" }}>
          <div style={{ fontSize:9,color:"#a0aec0",letterSpacing:"0.06em",textTransform:"uppercase" }}>
            Powered by
          </div>
          <img src="/coherent_logo.png" alt="Coherent" style={{ height:22,objectFit:"contain" }}/>
        </div>
      </header>

      {/* ══ TITLE BAND ══ */}
      <div className="no-print" style={{ background:ICEA_NAVY,padding:"10px 36px" }}>
        <div style={{ maxWidth:1120,margin:"0 auto" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:16 }}>
            {/* Left: version pill inline */}
            <div style={{ display:"flex",alignItems:"center" }}>
              {modelVersion && (
                <div style={{ background:"rgba(255,255,255,0.08)",
                  border:`1px solid rgba(39,170,225,0.25)`,
                  borderRadius:5,padding:"2px 9px",fontSize:9,fontWeight:600,
                  color:"rgba(255,255,255,0.45)",letterSpacing:"0.05em",
                  whiteSpace:"nowrap" }}>
                  Spark - Banca Endowment Quote Generator - v{modelVersion}
                </div>
              )}
            </div>
            {/* Centre: product name */}
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:15,fontWeight:700,color:"#fff",letterSpacing:"0.01em" }}>
                Summit Endowment Plan
              </div>
              <div style={{ fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",
                color:ICEA_TEAL,marginTop:3,fontWeight:600 }}>
                Quotation Generator
              </div>
            </div>
            {/* Right: quotation ref */}
            <div style={{ textAlign:"right" }}>
              {quoteRef && (
                <>
                  <div style={{ fontSize:9,color:"rgba(255,255,255,0.4)",
                    letterSpacing:"0.08em",marginBottom:1 }}>
                    QUOTATION REF
                  </div>
                  <div style={{ fontSize:11,fontWeight:700,
                    color:"rgba(255,255,255,0.75)",fontFamily:"monospace" }}>
                    {quoteRef}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ MAIN ══ */}
      <div style={{ maxWidth:1120,margin:"24px auto",padding:"0 36px",
        display:"grid",gridTemplateColumns:"400px 1fr",gap:22,alignItems:"start" }}>

        {/* ─── LEFT: INPUTS ─── */}
        <div className="no-print" style={{ background:"#fff",borderRadius:13,
          border:"1px solid #e2e8f0",overflow:"hidden",
          boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ padding:"18px 80px 16px",borderBottom:"1px solid #e8eef4",
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
              <div style={{ background:"#fff5f5",border:"1px solid #fed7d7",
                borderRadius:7,padding:"9px 13px",fontSize:12,color:"#c53030",
                marginBottom:16 }}>! {valError}</div>
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
                ?"Enter the coverage amount - the required premium will be calculated."
                :"Enter the premium amount - the coverage will be calculated."}>
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
                  onFocus={()=>{setFocused("sa");setSaDisplay(saRaw);}}
                  onBlur={()=>{setFocused(null);const n=parseFloat(saRaw);setSaDisplay(isNaN(n)?saRaw:fmt(n));}}
                  placeholder="e.g. 1,000,000"/>
              </Field>
            ) : (
              <Field label="Annual Premium (KES)" error={fieldErrors.premium}>
                <input type="text" inputMode="numeric" style={inp("premium")}
                  value={premDisplay} disabled={loading}
                  onChange={handlePremChange}
                  onFocus={()=>{setFocused("premium");setPremDisplay(premRaw);}}
                  onBlur={()=>{setFocused(null);const n=parseFloat(premRaw);setPremDisplay(isNaN(n)?premRaw:fmt(n,2));}}
                  placeholder="e.g. 192,461"/>
              </Field>
            )}

            <div style={{ height:1,background:"#e8eef4",margin:"4px 0 18px" }}/>
            <SH>Life Assured Details</SH>

            <Field label="Age at Entry" error={fieldErrors.age}
              hint={!fieldErrors.age?`Accepted range: ${ageMin}-${ageMax} years`:undefined}>
              <input type="number" style={inp("age")} value={age}
                min={ageMin} max={ageMax} disabled={loading}
                onChange={e=>{setAge(e.target.value);setResult(null);setAcceptState("idle");}}
                onFocus={()=>setFocused("age")} onBlur={()=>setFocused(null)}
                placeholder={`${ageMin}-${ageMax}`}/>
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
                background:loading||valLoading?"#e2e8f0":ICEA_NAVY,
                color:loading||valLoading?"#a0aec0":"#fff",
                border:"none",borderRadius:8,cursor:loading||valLoading?"not-allowed":"pointer",
                fontSize:13,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",
                display:"flex",alignItems:"center",justifyContent:"center",gap:9,
                transition:"background 0.15s" }}>
              {loading ? <><Spinner size={14} color="#a0aec0"/> Calculating...</> : "Generate Quotation"}
            </button>
          </div>
        </div>

        {/* ─── RIGHT: OUTPUTS ─── */}
        <div ref={resultsRef} style={{ display:"flex",flexDirection:"column",gap:16 }}>

          {!result&&!loading&&!apiError && (
            <div style={{ background:"#fff",borderRadius:13,border:"1px dashed #cbd5e0",
              padding:"52px 36px",textAlign:"center" }}>
              <div style={{ fontSize:14,fontWeight:700,color:"#2d3748",marginBottom:5 }}>
                No quotation yet
              </div>
              <div style={{ fontSize:12,color:"#a0aec0",lineHeight:1.6,maxWidth:260,margin:"0 auto" }}>
                Complete the form and click{" "}
                <strong style={{ color:ICEA_NAVY }}>Generate Quotation</strong>.
              </div>
            </div>
          )}

          {loading && (
            <div style={{ background:"#fff",borderRadius:13,border:"1px solid #e2e8f0",
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
              <RoaringLion/>
            </div>
          )}

          {apiError&&!loading && (
            <div style={{ background:"#fff5f5",borderRadius:13,
              border:"1px solid #fed7d7",padding:"18px 22px",fontSize:13,color:"#c53030" }}>
              ! {apiError}
            </div>
          )}

          {result&&!loading && (
            <div style={{ animation:"slideIn 0.3s ease-out" }}>
              <div style={{ background:"#fff",borderRadius:13,border:"1px solid #e2e8f0",
                overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",marginBottom:16 }}>
                <div style={{ background:ICEA_NAVY,padding:"18px 24px",
                  display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",
                      color:ICEA_TEAL,marginBottom:3,fontWeight:600 }}>Quotation Result</div>
                    <div style={{ fontSize:16,fontWeight:700,color:"#fff" }}>Summit Endowment Plan</div>
                    {clientName && (
                      <div style={{ fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:3 }}>
                        Prepared for <strong style={{ color:"#fff" }}>{clientName}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:9,color:"rgba(255,255,255,0.45)",marginBottom:2 }}>MONTHLY PREMIUM</div>
                    <div style={{ fontSize:32,fontWeight:700,color:"#fff" }}>
                      <AnimatedNumber target={displayPremium} compact={compact}/>
                    </div>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:1 }}>per month</div>
                  </div>
                </div>
                <div style={{ padding:"10px 22px",background:"#f7fafc",
                  borderBottom:"1px solid #e8eef4",display:"flex",gap:20,
                  flexWrap:"wrap",justifyContent:"center" }}>
                  {[
                    ["Client",clientName||"-"],
                    ["Age",`${age} yrs - ${gender==="M"?"Male":"Female"}`],
                    ["Term",`${term} Years`],
                    ["Ref",quoteRef],
                    ["Quotation Expiry",validUntil||"-"],
                  ].map(([k,v])=>(
                    <div key={k} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:9,letterSpacing:"0.09em",textTransform:"uppercase",
                        color:"#a0aec0",fontWeight:600 }}>{k}</div>
                      <div style={{ fontSize:12,fontWeight:600,color:"#2d3748",marginTop:1 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding:"16px 22px" }}>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10 }}>
                    <StatBox label="Sum Assured"
                      value={<AnimatedNumber target={sumAssured} compact={compact}/>}
                      sub={calcby==="Premium"?"Solved by engine":"Input value"}/>
                    <StatBox label="Maturity Estimate"
                      value={<AnimatedNumber target={maturityEst} compact={compact}/>}
                      sub={`End of year ${term}`}
                      tooltip="Estimated value payable at end of term - Sum Assured plus accumulated bonuses."/>
                    <StatBox label="Bonus Estimate"
                      value={<AnimatedNumber target={bonusEst} compact={compact}/>}
                      sub="Simple interest on SA"
                      tooltip="Projected bonus on Sum Assured. Actual bonuses declared annually."/>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
                    <StatBox label={`Total Premiums (${term} yrs)`}
                      value={<AnimatedNumber target={totalPremiums} compact={compact}/>}
                      sub="Sum of all premiums payable"/>
                    <StatBox label="Maturity Growth"
                      value={growthPct!=null?`+${growthPct}%`:"-"}
                      sub="vs total premiums paid" teal/>
                  </div>
                  <div style={{ background:"#fffbeb",border:"1px solid #f6e05e",
                    borderRadius:8,padding:"12px 16px",marginBottom:4 }}>
                    <div style={{ fontSize:11,fontWeight:700,color:"#744210",marginBottom:4 }}>
                      Year-by-year maturity projection
                    </div>
                    <div style={{ fontSize:11,color:"#92400e",lineHeight:1.6 }}>
                      End-of-term estimate: <strong>KES {fmt(maturityEst)}</strong>.
                      Annual year-by-year figures require additional model outputs - pending actuary update.
                    </div>
                  </div>
                </div>
              </div>

              {acceptState==="pending" && (
                <div style={{ background:"#fff",borderRadius:13,border:`1.5px solid ${ICEA_NAVY}`,
                  overflow:"hidden",boxShadow:"0 4px 20px rgba(0,60,122,0.12)",
                  animation:"slideIn 0.3s ease-out" }}>
                  <div style={{ background:`linear-gradient(135deg,${ICEA_NAVY},#0057a8)`,padding:"18px 24px" }}>
                    <div style={{ fontSize:10,letterSpacing:"0.16em",textTransform:"uppercase",
                      color:ICEA_TEAL,marginBottom:4,fontWeight:600 }}>Client Decision</div>
                    <div style={{ fontSize:16,fontWeight:700,color:"#fff" }}>Accept this quotation?</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:4 }}>
                      Monthly premium of{" "}
                      <strong style={{ color:"#fff" }}>{fmtKES(displayPremium,compact)}</strong>
                      {" "}- SA{" "}
                      <strong style={{ color:"#fff" }}>{fmtKES(sumAssured,compact)}</strong>
                    </div>
                  </div>
                  <div style={{ padding:"18px 24px",display:"flex",gap:12 }}>
                    <button onClick={handleAccept} disabled={finalLoading} style={{
                      flex:2,padding:"13px 20px",
                      background:finalLoading?"#e2e8f0":ICEA_NAVY,
                      color:finalLoading?"#a0aec0":"#fff",
                      border:"none",borderRadius:8,cursor:finalLoading?"not-allowed":"pointer",
                      fontSize:13,fontWeight:700,letterSpacing:"0.05em",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                      {finalLoading
                        ? <><Spinner size={14} color="#a0aec0"/> Processing...</>
                        : "Yes - Accept Quotation"}
                    </button>
                    <button onClick={handleDecline} disabled={finalLoading} style={{
                      flex:1,padding:"13px 20px",background:"transparent",
                      color:"#718096",border:"none",
                      cursor:finalLoading?"not-allowed":"pointer",fontSize:12,fontWeight:500 }}>
                      No - Start Over
                    </button>
                  </div>
                </div>
              )}

              {acceptState==="accepted" && (
                <div style={{ background:"#f0faf4",borderRadius:13,border:"1.5px solid #68d391",
                  padding:"24px 22px",animation:"fadeIn 0.3s ease-out",
                  display:"flex",flexDirection:"column",alignItems:"center",
                  textAlign:"center",gap:16 }}>
                  <div style={{ width:56,height:56,borderRadius:"50%",background:"#38a169",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    animation:showAccepted?"successPop 0.5s ease-out":"none" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:15,fontWeight:700,color:"#276749",marginBottom:4 }}>
                      Quotation Accepted - {clientName}
                    </div>
                    <div style={{ fontSize:12,color:"#2d7d46",lineHeight:1.6 }}>
                      Final quotation recorded and submitted to ICEA LION.
                      {pdfUrl?" Your quotation PDF is ready.":" PDF is being prepared."}
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
                    {pdfUrl ? (
                      <button onClick={()=>setPdfOpen(true)} style={{ padding:"9px 20px",
                        background:ICEA_NAVY,color:"#fff",border:"none",borderRadius:7,
                        fontSize:12,fontWeight:700,cursor:"pointer" }}>
                        View Quotation PDF
                      </button>
                    ) : (
                      <button disabled style={{ padding:"9px 20px",background:"#e2e8f0",
                        color:"#a0aec0",border:"none",borderRadius:7,fontSize:12,
                        fontWeight:700,cursor:"not-allowed",display:"flex",alignItems:"center",gap:7 }}>
                        <Spinner size={12} color="#a0aec0"/> Preparing PDF...
                      </button>
                    )}
                    <button onClick={()=>setEmailOpen(true)} style={{ padding:"9px 20px",
                      background:"#fff",color:ICEA_NAVY,border:`1.5px solid ${ICEA_NAVY}`,
                      borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer" }}>
                      Email Client
                    </button>
                    <button onClick={handleDecline} style={{ padding:"9px 20px",
                      background:"#fff",color:"#4a5568",border:"1px solid #e2e8f0",
                      borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer" }}>
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
      <footer className="no-print" style={{
        background:"#fff",
        borderTop:"1px solid #e2e8f0",
        padding:"14px 36px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        fontSize:11,color:"#a0aec0" }}>
        <span>© 2026 ICEA LION Life Assurance Company Limited - For authorised bank partners only</span>
        <div style={{ display:"flex",alignItems:"center",gap:16 }}>
          {processTime && (
            <span style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:"#38a169",display:"inline-block" }}/>
              Calculated in <strong style={{ color:"#2d3748",marginLeft:3 }}>{processTime}ms</strong>
            </span>
          )}
          <div style={{ display:"flex",alignItems:"center",gap:6,
            borderLeft:"1px solid #e2e8f0",paddingLeft:16 }}>
            <span style={{ fontSize:9,letterSpacing:"0.08em",textTransform:"uppercase" }}>Powered by</span>
            <img src="/coherent_logo.png" alt="Coherent" style={{ height:16,objectFit:"contain" }}/>
          </div>
          {/* API Logs - prominent button */}
          <button onClick={()=>setPage("history")} style={{
            display:"flex",alignItems:"center",gap:7,
            padding:"8px 16px",
            background:ICEA_NAVY,color:"#fff",
            border:"none",borderRadius:7,
            fontSize:11,fontWeight:700,cursor:"pointer",
            letterSpacing:"0.05em",textTransform:"uppercase",
            fontFamily:"inherit",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            API Logs
          </button>
        </div>
      </footer>

    </div>
  );
}