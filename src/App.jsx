import { useState, useEffect, useCallback, useRef } from "react";

// ─── SPARK CONFIG ─────────────────────────────────────────────────────────────
const SPARK = {
  host: "https://excel.uat.us.coherent.global",
  tenant: "icea_lion",
  folder: "Coherent - Front End for Banca Endowment",
  service: "ICEA LION - Banco Endowment Modelling",
  apiKey: "0afb95d9-835b-448a-a4f4-57e2530ac614",
  versionId: "33b9c0a5-9a02-44e1-a05b-24aeae4c64df",
};

const encodedPath = `${encodeURIComponent(SPARK.folder)}/services/${encodeURIComponent(SPARK.service)}`;
const EXECUTE_URL    = `${SPARK.host}/${SPARK.tenant}/api/v3/folders/${encodedPath}/execute`;
const VALIDATION_URL = `${SPARK.host}/${SPARK.tenant}/api/v3/folders/${encodedPath}/validation`;

const HEADERS = {
  "Content-Type": "application/json",
  "x-synthetic-key": SPARK.apiKey,
  "x-tenant-name": SPARK.tenant,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n, dec = 0) =>
  n == null ? "—" : Number(n).toLocaleString("en-KE", {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });
const fmtKES = (n) => n == null ? "—" : `KES ${fmt(n)}`;
const fmtNum = (n, dec = 2) =>
  n == null ? "—" : Number(n).toLocaleString("en-KE", {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });

function newRef() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.floor(Math.random()*90000+10000)}`;
}

// ─── LOGOS ────────────────────────────────────────────────────────────────────
// ICEA Lion - constructed SVG matching their actual brand mark
function IceaLionMark({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="4" fill="white"/>
      {/* Lion body - simplified faithful representation */}
      <ellipse cx="50" cy="58" rx="20" ry="16" fill="#003C7A"/>
      {/* Mane ring */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i) => (
        <rect key={i} x="48.5" y="28" width="3" height="10" rx="1.5"
          fill="#003C7A" transform={`rotate(${deg} 50 44)`}/>
      ))}
      {/* Head */}
      <ellipse cx="50" cy="44" rx="14" ry="12" fill="#003C7A"/>
      <ellipse cx="50" cy="43" rx="10" ry="9" fill="#27AAE1"/>
      <ellipse cx="50" cy="43" rx="7" ry="6.5" fill="white"/>
      {/* Eyes */}
      <circle cx="46.5" cy="41" r="1.8" fill="#003C7A"/>
      <circle cx="53.5" cy="41" r="1.8" fill="#003C7A"/>
      <circle cx="46.9" cy="40.6" r="0.6" fill="white"/>
      <circle cx="53.9" cy="40.6" r="0.6" fill="white"/>
      {/* Nose */}
      <ellipse cx="50" cy="45" rx="2" ry="1.2" fill="#27AAE1" opacity="0.6"/>
      {/* Ears */}
      <polygon points="39,35 36,28 43,32" fill="#003C7A"/>
      <polygon points="61,35 64,28 57,32" fill="#003C7A"/>
      <polygon points="39.5,34 37.5,29.5 42,32.5" fill="#27AAE1" opacity="0.5"/>
      <polygon points="60.5,34 62.5,29.5 58,32.5" fill="#27AAE1" opacity="0.5"/>
      {/* Paws */}
      <ellipse cx="36" cy="73" rx="7" ry="5" fill="#003C7A"/>
      <ellipse cx="64" cy="73" rx="7" ry="5" fill="#003C7A"/>
      {/* Tail */}
      <path d="M68 62 Q80 52 77 40 Q74 33 70 36" stroke="#003C7A" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="70" cy="36" rx="4" ry="3" fill="#003C7A" transform="rotate(-30 70 36)"/>
      {/* Paw lines */}
      <line x1="33" y1="74" x2="39" y2="74" stroke="#27AAE1" strokeWidth="0.8" opacity="0.6"/>
      <line x1="61" y1="74" x2="67" y2="74" stroke="#27AAE1" strokeWidth="0.8" opacity="0.6"/>
    </svg>
  );
}

// Coherent logo - their wordmark style
function CoherentLogo({ height = 28 }) {
  return (
    <svg height={height} viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Coherent hex/diamond mark */}
      <polygon points="12,4 20,4 24,16 20,28 12,28 8,16" fill="#00B5CC" opacity="0.15"/>
      <polygon points="13,8 19,8 22,16 19,24 13,24 10,16" fill="#00B5CC"/>
      <text x="30" y="22" fontFamily="'Inter','Helvetica Neue',sans-serif" fontSize="14"
        fontWeight="700" fill="#1a202c" letterSpacing="0.3">coherent</text>
    </svg>
  );
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = "#003C7A" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${color}22`, borderTop: `2px solid ${color}`,
      borderRadius: "50%", animation: "spin 0.75s linear infinite", flexShrink: 0,
    }}/>
  );
}

// ─── FIELD ────────────────────────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.07em", textTransform: "uppercase",
        color: "#4a5568", marginBottom: 5,
      }}>{label}</label>
      {children}
      {error && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>{error}</div>}
      {!error && hint && <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
function Toggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", borderRadius: 7, overflow: "hidden", border: "1.5px solid #e2e8f0" }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            flex: 1, padding: "9px 10px", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: "inherit",
            background: active ? "#003C7A" : "#fff",
            color: active ? "#fff" : "#4a5568",
            transition: "all 0.15s",
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// ─── SECTION HEADING ─────────────────────────────────────────────────────────
function SH({ children }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
      fontWeight: 700, color: "#27AAE1", marginBottom: 14,
      paddingBottom: 7, borderBottom: "1.5px solid #e8eef4",
    }}>{children}</div>
  );
}

// ─── STAT BOX ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, sub, accent }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 9,
      background: accent ? "#003C7A" : "#f7fafc",
      border: accent ? "none" : "1px solid #e8eef4",
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
        color: accent ? "rgba(255,255,255,0.55)" : "#718096", marginBottom: 5, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 19, fontWeight: 700,
        color: accent ? "#fff" : "#1a202c", fontFamily: "Georgia, serif" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: accent ? "rgba(255,255,255,0.45)" : "#a0aec0", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── PDF QUOTATION DOCUMENT (rendered in modal, printed via browser) ──────────
function QuotationDocument({ data, inputs, quoteRef, callMeta }) {
  const { annualPremium, monthlyPremium, sumAssured, maturityEst, bonusEst } = data;
  const quotationNo = quoteRef;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const tdStyle = { padding: "5px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0" };
  const thStyle = { padding: "5px 8px", fontSize: 11, fontWeight: 700, background: "#f0f4f8", borderBottom: "1px solid #ccc", textAlign: "left" };

  return (
    <div id="quotation-print-area" style={{
      width: 680, margin: "0 auto", fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: 12, color: "#1a1a1a", background: "#fff", padding: "36px 48px",
    }}>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #003C7A" }}>
        {/* Left: logo + company name */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <IceaLionMark size={72}/>
          <div style={{ paddingTop: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#003C7A", letterSpacing: "0.02em" }}>
              ICEA LION LIFE ASSURANCE
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#003C7A", letterSpacing: "0.02em", marginBottom: 4 }}>
              COMPANY LIMITED
            </div>
            <div style={{ fontSize: 10, color: "#555", lineHeight: 1.6 }}>
              ICEA LION CENTRE, RIVERSIDE PARK<br/>
              P O BOX 46143, 00100<br/>
              00100 NAIROBI GPO<br/>
              contactcentre@icealion.com<br/>
              +254 719 071999
            </div>
          </div>
        </div>
        {/* Right: quotation meta */}
        <div style={{ textAlign: "right", fontSize: 11, lineHeight: 1.9 }}>
          <div>Quotation No: <strong>{quotationNo}</strong></div>
          <div>Quotation Date: <strong>{today}</strong></div>
          <div>Intermediary: <strong>798</strong></div>
        </div>
      </div>

      {/* ── QUOTATION SCHEDULE TITLE ── */}
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", marginBottom: 20, textDecoration: "underline" }}>
        QUOTATION SCHEDULE
      </div>

      {/* ── POLICY DETAILS TABLE ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 12 }}>
        <tbody>
          {[
            ["Life Assured", "Bank Partner Client"],
            ["Date Of Birth", `—    Age Next Birthday: ${inputs.age} Years    Gender: ${inputs.gender === "M" ? "M" : "F"}`],
            ["Term", `${inputs.term} Years`],
            ["Premium Frequency", "MONTHLY"],
            ["Product", "SUMMIT ENDOWMENT PLAN"],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={{ ...tdStyle, fontWeight: 700, width: 180, color: "#222" }}>{k}</td>
              <td style={{ ...tdStyle, color: "#003C7A", fontWeight: 500 }}>:&nbsp;&nbsp;{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── BENEFIT TABLE ── */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, textDecoration: "underline" }}>BENEFIT</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: "40%" }}>Cover Name</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Sum Assured (KES)</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Annual Premium (KES)</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Monthly Premium (KES)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>SUMMIT ENDOWMENT PLAN</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(sumAssured)}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(annualPremium)}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(monthlyPremium)}</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, color: "#555" }}>PCF</td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={{ ...tdStyle, textAlign: "right", color: "#555" }}>—</td>
            </tr>
            <tr style={{ background: "#f7fafc" }}>
              <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid #003C7A", paddingTop: 8 }} colSpan={3}>
                TOTAL PREMIUM (KES)
              </td>
              <td style={{ ...tdStyle, fontWeight: 700, textAlign: "right", borderTop: "2px solid #003C7A", paddingTop: 8 }}>
                {fmtNum(monthlyPremium)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── MATURITY ESTIMATE TABLE ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 12, marginBottom: 8, letterSpacing: "0.04em" }}>
          Maturity Estimate
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: "20%" }}>End of Year</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Total Premium Paid</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Maturity Estimate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, textAlign: "center" }}>{inputs.term}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(annualPremium * inputs.term)}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(maturityEst)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: "#555", fontStyle: "italic", marginTop: 8, lineHeight: 1.5 }}>
          NOTE: The above table shows the maturity estimates that are only payable at the end of the policy term.
          Bonuses are applied on Sum Assured on a simple interest basis.
        </div>
      </div>

      {/* ── NOTES ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 12, textDecoration: "underline", marginBottom: 8 }}>Notes</div>
        {[
          "The maturity value is composed of the Sum Assured and bonuses which may vary year on year depending on market performance.",
          "Annual bonuses are applied on Sum Assured and on maturity a Final Bonus is payable.",
          "You may cash out of your policy after three calendar years and payment of full premium.",
          "The premium quoted is subject to the completion and submission of a proposal form. A medical report may be required in some cases.",
          "As part of our compliance with Anti-Money Laundering (AML) Laws, we may require you to fill in a financial questionnaire. Additionally, the Company will regularly review your premium payments and may require additional AML documentation from you.",
          "The quotation is valid for three (3) months, provided that the age of the next birthday remains the same as at the time the quotation was issued.",
        ].map((n, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 11, color: "#333", lineHeight: 1.55 }}>
            <span style={{ flexShrink: 0, fontWeight: 600 }}>{i+1}.</span>
            <span>{n}</span>
          </div>
        ))}
      </div>

      {/* ── PROVISIONS ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 12, textDecoration: "underline", marginBottom: 8 }}>Provisions</div>
        {[
          "On Death due to illness, the benefit payable is equal to the Sum Assured plus the accrued bonuses as at the date of death.",
          "On Death due to accident, an additional benefit of the Sum Assured is payable.",
          "On Permanent and Total Disability, the Sum Assured is payable if an accidental or an illness related disability is diagnosed for the first time and confirmed by a qualified medical practitioner to be irreversible.",
          "For Critical Illness, where applicable, the benefit as per the Policy Schedule is payable if the listed illness is diagnosed for the first time by a qualified medical practitioner.",
        ].map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 11, color: "#333", lineHeight: 1.55 }}>
            <span style={{ flexShrink: 0, fontWeight: 600 }}>{i+1}.</span>
            <span>{p}</span>
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "1px solid #ccc", paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888" }}>
        <span>ICEA LION Life Assurance Company Limited · Bancassurance Partner Portal</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

// ─── PDF MODAL ────────────────────────────────────────────────────────────────
function PdfModal({ open, onClose, data, inputs, quoteRef, callMeta }) {
  if (!open) return null;

  function handlePrint() {
    const content = document.getElementById("quotation-print-area");
    const w = window.open("", "_blank", "width=800,height=900");
    w.document.write(`
      <html><head><title>Quotation ${quoteRef}</title>
      <style>
        @media print { body { margin: 0; } }
        body { margin: 0; background: white; font-family: Georgia, serif; }
      </style></head>
      <body>${content.innerHTML}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "flex-start", justifyContent: "center",
      padding: "32px 16px", overflowY: "auto",
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 14, maxWidth: 760, width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        animation: "slideIn 0.25s ease-out",
      }}>
        {/* Modal toolbar */}
        <div style={{
          padding: "14px 24px", borderBottom: "1px solid #e2e8f0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, background: "#fff", zIndex: 10,
          borderRadius: "14px 14px 0 0",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a202c" }}>Quotation Schedule</div>
            <div style={{ fontSize: 11, color: "#718096", marginTop: 1 }}>Ref: {quoteRef}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handlePrint} style={{
              padding: "8px 18px", background: "#003C7A", color: "#fff",
              border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", display: "flex",
              alignItems: "center", gap: 7,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Download / Print PDF
            </button>
            <button onClick={onClose} style={{
              padding: "8px 14px", background: "#f7fafc", color: "#4a5568",
              border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12,
              cursor: "pointer", fontFamily: "inherit",
            }}>Close</button>
          </div>
        </div>

        {/* Document body */}
        <div style={{ padding: "0", overflowX: "auto" }}>
          <QuotationDocument data={data} inputs={inputs} quoteRef={quoteRef} callMeta={callMeta}/>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ICEALionBancaPortal() {
  const [validation, setValidation]        = useState(null);
  const [validationLoading, setValLoading] = useState(true);
  const [validationError, setValError]     = useState(null);

  const [calcby, setCalcby]   = useState("Sum Assured");
  const [age, setAge]         = useState("");
  const [gender, setGender]   = useState("M");
  const [sa, setSa]           = useState("");
  const [premium, setPremium] = useState("");
  const [term, setTerm]       = useState(5);
  const [fieldErrors, setFieldErrors] = useState({});
  const [focused, setFocused] = useState(null);

  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [callMeta, setCallMeta]       = useState(null);
  const [apiError, setApiError]       = useState(null);
  const [quoteRef]                    = useState(newRef());

  // Accept flow state
  const [acceptState, setAcceptState]   = useState("idle"); // idle | accepting | accepted | declined
  const [finalLoading, setFinalLoading] = useState(false);
  const [finalCallMeta, setFinalCallMeta] = useState(null);
  const [pdfOpen, setPdfOpen]           = useState(false);

  // Stored inputs for final quotation call
  const lastInputs = useRef({});

  // ── Load validations on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(VALIDATION_URL, {
          method: "POST", headers: HEADERS,
          body: JSON.stringify({ request_data: {}, request_meta: {} }),
        });
        const data = await res.json();
        const v = data?.response_data?.outputs;
        if (v) {
          setValidation(v);
          if (v.Age?.default_value)     setAge(String(v.Age.default_value));
          if (v.Gender?.default_value)  setGender(v.Gender.default_value);
          if (v.SA?.default_value)      setSa(String(v.SA.default_value));
          if (v.Premium?.default_value) setPremium(String(v.Premium.default_value));
          if (v.Term?.default_value)    setTerm(v.Term.default_value);
          if (v.Calcby?.default_value)  setCalcby(v.Calcby.default_value);
        } else {
          setValError("Could not load form rules.");
        }
      } catch {
        setValError("Network error loading form rules.");
      } finally {
        setValLoading(false);
      }
    })();
  }, []);

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    const errs = {};
    const v = validation;
    if (!age || isNaN(Number(age))) { errs.age = "Age is required."; }
    else if (v?.Age) {
      const n = Number(age);
      if (v.Age.min != null && n < v.Age.min) errs.age = v.Age.error_message || `Min age is ${v.Age.min}.`;
      if (v.Age.max != null && n > v.Age.max) errs.age = v.Age.error_message || `Max age is ${v.Age.max}.`;
    }
    if (calcby === "Sum Assured" && (!sa || Number(sa) <= 0)) errs.sa = "Please enter a valid Sum Assured.";
    if (calcby === "Premium" && (!premium || Number(premium) <= 0)) errs.premium = "Please enter a valid Annual Premium.";
    return errs;
  }, [age, sa, premium, calcby, validation]);

  // ── Build inputs object ────────────────────────────────────────────────────
  function buildInputs() {
    return {
      Age: Number(age), Gender: gender, Term: Number(term), Calcby: calcby,
      SA:      calcby === "Sum Assured" ? Number(sa)      : (Number(sa) || 1000000),
      Premium: calcby === "Premium"     ? Number(premium) : (Number(premium) || 192461),
    };
  }

  // ── Call Spark ─────────────────────────────────────────────────────────────
  async function callSpark(callPurpose) {
    const inputs = buildInputs();
    const res = await fetch(EXECUTE_URL, {
      method: "POST", headers: HEADERS,
      body: JSON.stringify({
        request_data: { inputs },
        request_meta: {
          version_id: SPARK.versionId,
          call_purpose: callPurpose,
          source_system: "Banca Partner Portal",
          correlation_id: quoteRef,
          service_category: "All",
        },
      }),
    });
    const data = await res.json();
    return data;
  }

  // ── Get Quote ──────────────────────────────────────────────────────────────
  async function handleGetQuote() {
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true); setApiError(null); setResult(null); setCallMeta(null);
    setAcceptState("idle"); setFinalCallMeta(null);
    lastInputs.current = buildInputs();
    try {
      const data = await callSpark("Get Quote");
      if (data?.response_data?.outputs) {
        setResult(data.response_data.outputs);
        setCallMeta(data.response_meta);
        setAcceptState("pending"); // show accept/decline
      } else {
        setApiError(data?.error || "Unexpected response. Please try again.");
      }
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // ── Accept Quote ───────────────────────────────────────────────────────────
  async function handleAccept() {
    setFinalLoading(true);
    try {
      const data = await callSpark("Final Quotation");
      if (data?.response_meta) setFinalCallMeta(data.response_meta);
    } catch { /* non-blocking */ }
    finally {
      setFinalLoading(false);
      setAcceptState("accepted");
      setPdfOpen(true);
    }
  }

  // ── Decline / Reset ────────────────────────────────────────────────────────
  function handleDecline() {
    setResult(null); setCallMeta(null); setApiError(null);
    setAcceptState("idle"); setFinalCallMeta(null);
    setSa(""); setPremium("");
    setAge(validation?.Age?.default_value ? String(validation.Age.default_value) : "");
    setGender(validation?.Gender?.default_value || "M");
    setTerm(validation?.Term?.default_value || 5);
    setCalcby(validation?.Calcby?.default_value || "Sum Assured");
    setFieldErrors({});
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const termOptions   = validation?.Term?.options   || [5, 6, 7];
  const genderOptions = validation?.Gender?.options || ["M", "F"];
  const ageMin = validation?.Age?.min ?? 18;
  const ageMax = validation?.Age?.max ?? 65;

  const annualPremium  = result?.APrem;
  const monthlyPremium = annualPremium ? annualPremium / 12 : null;
  const sumAssured     = result?.SA;
  const maturityEst    = result?.MaturityEst;
  const bonusEst       = result?.BonusEst;
  const totalPremiums  = annualPremium ? annualPremium * Number(term) : null;
  const growthPct      = (totalPremiums && maturityEst)
    ? ((maturityEst / totalPremiums - 1) * 100).toFixed(1) : null;

  const inputStyle = (field) => ({
    width: "100%", padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
    border: `1.5px solid ${fieldErrors[field] ? "#c0392b" : focused === field ? "#003C7A" : "#e2e8f0"}`,
    borderRadius: 7, outline: "none", background: "#fff", color: "#1a202c",
    transition: "border-color 0.15s", boxSizing: "border-box",
  });
  const selectStyle = {
    ...inputStyle(""), paddingRight: 32, cursor: "pointer", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%23718096' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  };

  // PDF data object
  const pdfData = result ? { annualPremium, monthlyPremium, sumAssured, maturityEst, bonusEst } : null;
  const pdfInputs = { age, gender, term, calcby };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Inter','Helvetica Neue',sans-serif", color: "#1a202c" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
      `}</style>

      {/* ══ HEADER ══ */}
      <header style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "0 36px", height: 66,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {/* Left: ICEA Lion */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IceaLionMark size={42}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#003C7A", lineHeight: 1.2 }}>ICEA LION</div>
            <div style={{ fontSize: 10, color: "#27AAE1", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Life Assurance</div>
          </div>
        </div>

        {/* Centre: Coherent */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 9, color: "#a0aec0", letterSpacing: "0.06em", textTransform: "uppercase" }}>Powered by</div>
          <CoherentLogo height={22}/>
        </div>

        {/* Right: portal label + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {validationLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#a0aec0" }}>
              <Spinner size={12} color="#a0aec0"/> Connecting…
            </div>
          )}
          {!validationLoading && validation && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#38a169", fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#38a169", display: "inline-block" }}/>
              Engine Live
            </div>
          )}
          <div style={{
            background: "#eef4fb", border: "1px solid #c3d9ef",
            borderRadius: 6, padding: "5px 12px",
            fontSize: 11, fontWeight: 700, color: "#003C7A",
            letterSpacing: "0.07em", textTransform: "uppercase",
          }}>
            Bancassurance Partner Portal
          </div>
        </div>
      </header>

      {/* ══ TITLE BAND ══ */}
      <div style={{ background: "#003C7A", padding: "22px 36px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
          {/* Left: empty for balance */}
          <div/>
          {/* Centre: product name + page title */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif", letterSpacing: "0.01em" }}>
              Summit Endowment Plan
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#27AAE1", marginTop: 5, fontWeight: 600 }}>
              Quotation Generator
            </div>
          </div>
          {/* Right: ref + date */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 2, letterSpacing: "0.08em" }}>QUOTATION REF</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>{quoteRef}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* ══ TWO-COLUMN MAIN ══ */}
      <div style={{ maxWidth: 1120, margin: "24px auto", padding: "0 36px", display: "grid", gridTemplateColumns: "400px 1fr", gap: 22, alignItems: "start" }}>

        {/* ─── LEFT: INPUTS ─── */}
        <div style={{ background: "#fff", borderRadius: 13, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "16px 22px 12px", borderBottom: "1px solid #e8eef4" }}>
            <SH>Policy Inputs</SH>
            <p style={{ margin: 0, fontSize: 12, color: "#718096", lineHeight: 1.5 }}>
              Enter client details. All fields are required to generate a quotation.
            </p>
          </div>

          <div style={{ padding: "20px 22px" }}>
            {validationError && (
              <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 7, padding: "9px 13px", fontSize: 12, color: "#c53030", marginBottom: 16 }}>
                ⚠ {validationError}
              </div>
            )}

            {/* Quote mode */}
            <SH>Quote Direction</SH>
            <Field
              label="I want to quote by"
              hint={calcby === "Sum Assured"
                ? "Enter the coverage amount — the required premium will be calculated."
                : "Enter the premium amount — the coverage amount will be calculated."}
            >
              <Toggle
                value={calcby}
                onChange={(v) => { setCalcby(v); setResult(null); setAcceptState("idle"); setFieldErrors({}); }}
                options={[
                  { value: "Sum Assured", label: "Sum Assured" },
                  { value: "Premium",     label: "Premium Amount" },
                ]}
              />
            </Field>

            {calcby === "Sum Assured" ? (
              <Field label="Sum Assured (KES)" error={fieldErrors.sa}>
                <input type="number" style={inputStyle("sa")} value={sa}
                  onChange={e => { setSa(e.target.value); setResult(null); setAcceptState("idle"); }}
                  onFocus={() => setFocused("sa")} onBlur={() => setFocused(null)}
                  placeholder="e.g. 1,000,000"/>
              </Field>
            ) : (
              <Field label="Annual Premium (KES)" error={fieldErrors.premium}>
                <input type="number" style={inputStyle("premium")} value={premium}
                  onChange={e => { setPremium(e.target.value); setResult(null); setAcceptState("idle"); }}
                  onFocus={() => setFocused("premium")} onBlur={() => setFocused(null)}
                  placeholder="e.g. 192,461"/>
              </Field>
            )}

            <div style={{ height: 1, background: "#e8eef4", margin: "4px 0 18px" }}/>
            <SH>Life Assured Details</SH>

            <Field
              label="Age at Entry"
              error={fieldErrors.age}
              hint={!fieldErrors.age ? `Accepted age range: ${ageMin}–${ageMax} years` : undefined}
            >
              <input type="number" style={inputStyle("age")} value={age}
                min={ageMin} max={ageMax}
                onChange={e => { setAge(e.target.value); setResult(null); setAcceptState("idle"); }}
                onFocus={() => setFocused("age")} onBlur={() => setFocused(null)}
                placeholder={`${ageMin}–${ageMax}`}/>
            </Field>

            <Field label="Gender">
              <Toggle
                value={gender}
                onChange={(v) => { setGender(v); setResult(null); setAcceptState("idle"); }}
                options={genderOptions.map(g => ({ value: g, label: g === "M" ? "Male" : "Female" }))}
              />
            </Field>

            <div style={{ height: 1, background: "#e8eef4", margin: "4px 0 18px" }}/>
            <SH>Policy Terms</SH>

            <Field
              label="Policy Term"
              hint={validation?.Term?.error_message || undefined}
            >
              <select style={selectStyle} value={term}
                onChange={e => { setTerm(Number(e.target.value)); setResult(null); setAcceptState("idle"); }}>
                {termOptions.map(t => <option key={t} value={t}>{t} Years</option>)}
              </select>
            </Field>

            <div style={{ height: 1, background: "#e8eef4", margin: "4px 0 18px" }}/>

            {/* CTA */}
            <button
              onClick={handleGetQuote}
              disabled={loading || validationLoading}
              style={{
                width: "100%", padding: "12px",
                background: loading || validationLoading ? "#e2e8f0" : "#003C7A",
                color: loading || validationLoading ? "#a0aec0" : "#fff",
                border: "none", borderRadius: 8, cursor: loading || validationLoading ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                transition: "background 0.15s",
              }}
            >
              {loading ? <><Spinner size={14} color="#a0aec0"/> Calculating…</> : "Get Quote"}
            </button>
          </div>
        </div>

        {/* ─── RIGHT: OUTPUTS ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Empty state */}
          {!result && !loading && !apiError && (
            <div style={{
              background: "#fff", borderRadius: 13, border: "1px dashed #cbd5e0",
              padding: "52px 36px", textAlign: "center",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "#eef4fb", border: "1.5px solid #c3d9ef",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#003C7A" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M8 12h8M12 8v8"/>
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2d3748", marginBottom: 5 }}>No quotation yet</div>
              <div style={{ fontSize: 12, color: "#a0aec0", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
                Complete the fields on the left and click <strong style={{ color: "#003C7A" }}>Get Quote</strong>.
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ background: "#fff", borderRadius: 13, border: "1px solid #e2e8f0", padding: "48px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <Spinner size={30} color="#003C7A"/>
              <div style={{ marginTop: 14, fontSize: 13, color: "#718096" }}>Calculating your quotation…</div>
            </div>
          )}

          {/* Error */}
          {apiError && !loading && (
            <div style={{ background: "#fff5f5", borderRadius: 13, border: "1px solid #fed7d7", padding: "18px 22px", fontSize: 13, color: "#c53030" }}>
              ⚠ {apiError}
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div style={{ animation: "slideIn 0.3s ease-out" }}>

              {/* Result card */}
              <div style={{ background: "#fff", borderRadius: 13, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 16 }}>

                {/* Blue header */}
                <div style={{ background: "#003C7A", padding: "15px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#27AAE1", marginBottom: 3, fontWeight: 600 }}>Quotation Result</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif" }}>Summit Endowment Plan</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", marginBottom: 2 }}>MONTHLY PREMIUM</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif" }}>
                      {monthlyPremium != null ? `KES ${fmt(monthlyPremium)}` : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>KES {fmt(annualPremium)} per year</div>
                  </div>
                </div>

                {/* Policy strip */}
                <div style={{ padding: "9px 22px", background: "#f7fafc", borderBottom: "1px solid #e8eef4", display: "flex", gap: 22, flexWrap: "wrap" }}>
                  {[
                    ["Age",          `${age} years · ${gender === "M" ? "Male" : "Female"}`],
                    ["Policy Term",  `${term} Years`],
                    ["Ref",          quoteRef],
                    ["Date",         new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase", color: "#a0aec0", fontWeight: 600 }}>{k}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#2d3748", marginTop: 1 }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Stat boxes */}
                <div style={{ padding: "16px 22px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <StatBox label="Sum Assured"       value={fmtKES(sumAssured)}  sub="Base coverage"/>
                    <StatBox label="Maturity Estimate" value={fmtKES(maturityEst)} sub={`End of year ${term}`}/>
                    <StatBox label="Bonus Estimate"    value={fmtKES(bonusEst)}    sub="Simple interest on SA"/>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <StatBox label={`Total Premiums (${term} yrs)`} value={fmtKES(totalPremiums)} sub="Sum of annual premiums"/>
                    <StatBox label="Maturity Growth" value={growthPct != null ? `+${growthPct}%` : "—"} sub="vs total premiums paid" accent/>
                  </div>

                  {/* Year-by-year placeholder */}
                  <div style={{ background: "#fffbeb", border: "1px solid #f6e05e", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#744210", marginBottom: 3 }}>Year-by-year maturity projection</div>
                    <div style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
                      Currently showing end-of-term estimate only (KES {fmt(maturityEst)}).
                      Annual year-by-year figures require additional model outputs — pending actuary update.
                    </div>
                  </div>

                  {/* Quotation notes */}
                  <div style={{ background: "#f7fafc", borderRadius: 7, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#718096", fontWeight: 700, marginBottom: 7 }}>Notes</div>
                    {[
                      "The maturity value comprises the Sum Assured and bonuses which may vary year on year.",
                      "Annual bonuses are applied on Sum Assured; a Final Bonus is payable at maturity.",
                      "This quotation is valid for 3 months, provided age at next birthday remains unchanged.",
                      "The premium is subject to completion of a proposal form. A medical report may be required.",
                    ].map((note, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 11, color: "#4a5568", lineHeight: 1.5 }}>
                        <span style={{ color: "#27AAE1", fontWeight: 700, flexShrink: 0 }}>{i+1}.</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── ACCEPT QUOTE PANEL ── */}
              {acceptState === "pending" && (
                <div style={{
                  background: "#fff", borderRadius: 13,
                  border: "1.5px solid #003C7A",
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(0,60,122,0.12)",
                  animation: "slideIn 0.3s ease-out",
                }}>
                  <div style={{ background: "linear-gradient(135deg, #003C7A, #0057a8)", padding: "18px 24px" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#27AAE1", marginBottom: 4, fontWeight: 600 }}>
                      Client Decision
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif" }}>
                      Accept this quotation?
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                      Monthly premium of <strong style={{ color: "#fff" }}>KES {fmt(monthlyPremium)}</strong> · Sum Assured <strong style={{ color: "#fff" }}>KES {fmt(sumAssured)}</strong>
                    </div>
                  </div>
                  <div style={{ padding: "20px 24px", display: "flex", gap: 12, alignItems: "center" }}>
                    <button
                      onClick={handleAccept}
                      disabled={finalLoading}
                      style={{
                        flex: 1, padding: "12px 20px",
                        background: finalLoading ? "#e2e8f0" : "#003C7A",
                        color: finalLoading ? "#a0aec0" : "#fff",
                        border: "none", borderRadius: 8, cursor: finalLoading ? "not-allowed" : "pointer",
                        fontSize: 13, fontWeight: 700, letterSpacing: "0.05em",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "all 0.15s",
                      }}
                    >
                      {finalLoading
                        ? <><Spinner size={14} color="#a0aec0"/> Processing…</>
                        : <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Yes — Accept Quote
                          </>
                      }
                    </button>
                    <button
                      onClick={handleDecline}
                      disabled={finalLoading}
                      style={{
                        flex: 1, padding: "12px 20px",
                        background: "#fff", color: "#4a5568",
                        border: "1.5px solid #e2e8f0", borderRadius: 8,
                        cursor: finalLoading ? "not-allowed" : "pointer",
                        fontSize: 13, fontWeight: 600, letterSpacing: "0.05em",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "all 0.15s",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      No — Start Over
                    </button>
                  </div>
                </div>
              )}

              {/* Accepted state */}
              {acceptState === "accepted" && (
                <div style={{
                  background: "#f0faf4", borderRadius: 13,
                  border: "1.5px solid #68d391", padding: "18px 22px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  animation: "fadeIn 0.3s ease-out",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#38a169", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#276749" }}>Quote Accepted</div>
                      <div style={{ fontSize: 11, color: "#48bb78", marginTop: 1 }}>Final quotation has been recorded.</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setPdfOpen(true)} style={{
                      padding: "9px 16px", background: "#003C7A", color: "#fff",
                      border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      View PDF
                    </button>
                    <button onClick={handleDecline} style={{
                      padding: "9px 16px", background: "#fff", color: "#4a5568",
                      border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12,
                      fontWeight: 600, cursor: "pointer",
                    }}>New Quote</button>
                  </div>
                </div>
              )}


            </div>
          )}
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={{ maxWidth: 1120, margin: "8px auto 0", padding: "14px 36px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#a0aec0" }}>
        <span>© 2026 ICEA LION Life Assurance Company Limited · For authorised bank partners only</span>
        <span>Powered by <strong style={{ color: "#003C7A" }}>Coherent</strong></span>
      </footer>

      {/* ══ PDF MODAL ══ */}
      {pdfData && (
        <PdfModal
          open={pdfOpen}
          onClose={() => setPdfOpen(false)}
          data={pdfData}
          inputs={pdfInputs}
          quoteRef={quoteRef}
          callMeta={finalCallMeta || callMeta}
        />
      )}
    </div>
  );
}

