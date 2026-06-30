// ═══════════════════════════════════════════════════════════════
//  WebQuote — by MediaVolt
//  src/App.jsx — produkčný root
//
//  Importuje builder kód z ./builder.jsx
//  Pozri PATCH-web-builder-v7.md pre inštrukcie ako vytvoriť builder.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BuilderView,
  getRole,
  getSessionId,
  DEFAULT_BRIEF,
  createRealtimeChannel,
} from "./builder.jsx";

// ─── MediaVolt / WebQuote brand tokens ───────────────────────
const MV = {
  bg:          "#05060d",
  surface:     "#0d0e0f",
  surfaceHigh: "#141516",
  border:      "#1e1f20",
  borderHi:    "#2a2b2d",
  text:        "#f0f0f0",
  muted:       "#666870",
  desc:        "#44464a",
  orange:      "#ff6a00",   // volt orange — hlavná farba MediaVolt
  orangeDim:   "#ff6a0022",
  orangeLight: "#ff9540",   // svetlejší odtieň
  amber:       "#ffb020",   // jantárový odtieň
  green:       "#22c55e",
  fontDisplay: "'Syne', 'Space Grotesk', sans-serif",
  fontBody:    "'Space Grotesk', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', monospace",
};

// ─── ADMIN GATE (prihlásenie) ─────────────────────────────────
function AdminGate({ children }) {
  const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD || "";
  const [authed,  setAuthed]  = useState(false);
  const [pw,      setPw]      = useState("");
  const [err,     setErr]     = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ADMIN_PW) { setAuthed(true); return; }
    if (sessionStorage.getItem("wq_admin_auth") === "ok") setAuthed(true);
  }, [ADMIN_PW]);

  const submit = (e) => {
    e?.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (pw === ADMIN_PW) {
        sessionStorage.setItem("wq_admin_auth", "ok");
        setAuthed(true); setErr(false);
      } else {
        setErr(true); setPw("");
      }
      setLoading(false);
    }, 400);
  };

  if (authed) return children;

  return (
    <div style={{
      minHeight:"100vh", background:MV.bg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:MV.fontBody,
      backgroundImage:`
        linear-gradient(rgba(255,106,0,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,106,0,0.03) 1px, transparent 1px)
      `,
      backgroundSize:"40px 40px",
    }}>
      <style>{`
        @keyframes mv-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes mv-glow  { 0%,100%{box-shadow:0 0 20px ${MV.orangeDim}} 50%{box-shadow:0 0 40px ${MV.orange}44} }
        @keyframes mv-scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        .wq-inp:focus { outline:none; border-color:${MV.orange} !important; box-shadow:0 0 0 3px ${MV.orangeDim}; }
        .wq-btn:hover:not(:disabled) { background:${MV.orange} !important; color:${MV.bg} !important; }
      `}</style>

      {/* scan-line efekt */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
        <div style={{
          position:"absolute",left:0,right:0,height:2,
          background:`linear-gradient(transparent,${MV.orange}40,transparent)`,
          animation:"mv-scan 6s linear infinite",
        }}/>
      </div>

      <form onSubmit={submit} style={{
        position:"relative", zIndex:1,
        background:MV.surface, border:`1px solid ${MV.borderHi}`,
        borderRadius:16, padding:"2.5rem 2rem",
        width:"100%", maxWidth:380,
        display:"flex", flexDirection:"column", gap:"1.25rem",
        boxShadow:`0 0 60px ${MV.orangeDim}, 0 24px 80px rgba(0,0,0,0.7)`,
        animation:"mv-glow 4s ease-in-out infinite",
      }}>
        {/* Logo */}
        <div style={{textAlign:"center"}}>
          <div style={{
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:56, height:56, borderRadius:14, marginBottom:"1rem",
            background:`linear-gradient(135deg,${MV.orange}22,${MV.orangeLight}22)`,
            border:`1px solid ${MV.borderHi}`, fontSize:"1.6rem",
          }}>⚡</div>
          <div style={{
            fontFamily:MV.fontDisplay, fontWeight:800, fontSize:"1.5rem",
            color:MV.text, letterSpacing:"-0.03em", lineHeight:1.1, marginBottom:"0.25rem",
          }}>
            Web<span style={{color:MV.orange}}>Quote</span>
          </div>
          <div style={{
            fontSize:"0.65rem", color:MV.muted,
            fontFamily:MV.fontMono, letterSpacing:"0.12em", textTransform:"uppercase",
          }}>
            ADMIN ACCESS · AUTHENTICATION REQUIRED
          </div>
        </div>

        {/* Status pill */}
        <div style={{
          display:"flex", alignItems:"center", gap:"0.5rem",
          padding:"0.5rem 0.75rem",
          background:`${MV.green}10`, border:`1px solid ${MV.green}30`, borderRadius:8,
        }}>
          <div style={{width:6,height:6,borderRadius:"50%",background:MV.green,animation:"mv-pulse 2s infinite"}}/>
          <span style={{fontSize:"0.65rem",color:MV.green,fontFamily:MV.fontMono,letterSpacing:"0.08em"}}>
            SYSTEM · ONLINE · UPLINK STABLE
          </span>
        </div>

        {/* Heslo */}
        <input
          type="password" autoFocus
          placeholder="Administrátorské heslo"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          className="wq-inp"
          style={{
            background:MV.bg,
            border:`1.5px solid ${err?"#ef4444":MV.border}`,
            borderRadius:10, padding:"0.75rem 1rem",
            color:MV.text, fontFamily:MV.fontMono, fontSize:"0.875rem",
            transition:"all .2s",
          }}
        />

        {err && (
          <div style={{
            color:"#f87171", fontSize:"0.72rem", textAlign:"center",
            fontFamily:MV.fontMono, letterSpacing:"0.06em",
            background:"#ef444412", border:"1px solid #ef444430",
            borderRadius:8, padding:"0.5rem",
          }}>
            ✕ AUTH FAILED · INVALID CREDENTIALS
          </div>
        )}

        <button type="submit" disabled={loading} className="wq-btn" style={{
          background:`linear-gradient(135deg,${MV.orange}22,${MV.orangeLight}22)`,
          border:`1.5px solid ${MV.orange}`, color:MV.orange,
          borderRadius:10, padding:"0.75rem",
          cursor:"pointer", fontFamily:MV.fontBody,
          fontWeight:700, fontSize:"0.875rem", letterSpacing:"0.04em",
          transition:"all .2s",
        }}>
          {loading ? "VERIFYING…" : "PRIHLÁSIŤ SA →"}
        </button>

        {/* Powered by */}
        <div style={{textAlign:"center",paddingTop:"0.5rem",borderTop:`1px solid ${MV.border}`}}>
          <a href="https://mediavolt.org" target="_blank" rel="noopener noreferrer"
            style={{
              fontSize:"0.62rem", color:MV.desc,
              fontFamily:MV.fontMono, letterSpacing:"0.08em",
              textDecoration:"none",
              display:"inline-flex", alignItems:"center", gap:"0.4rem",
            }}
            onMouseEnter={e=>e.currentTarget.style.color=MV.orange}
            onMouseLeave={e=>e.currentTarget.style.color=MV.desc}
          >
            POWERED BY ⬡ MEDIAVOLT
          </a>
        </div>
      </form>
    </div>
  );
}

// ─── POWERED BY BADGE (fixed, vždy viditeľný) ─────────────────
function PoweredByBadge() {
  const [hov, setHov] = useState(false);
  return (
    <a href="https://mediavolt.org" target="_blank" rel="noopener noreferrer"
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        position:"fixed", bottom:12, right:12, zIndex:9999,
        display:"flex", alignItems:"center", gap:"0.4rem",
        padding:"0.35rem 0.65rem 0.35rem 0.5rem",
        background:hov?MV.surface:`${MV.bg}ee`,
        border:`1px solid ${hov?MV.orange:MV.border}`,
        borderRadius:20, textDecoration:"none",
        backdropFilter:"blur(8px)", transition:"all .2s",
        boxShadow:hov?`0 0 16px ${MV.orangeDim}`:"0 2px 12px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{
        display:"flex",alignItems:"center",justifyContent:"center",
        width:16,height:16,borderRadius:4,
        background:hov?MV.orange:MV.orangeDim,
        fontSize:"0.6rem",fontWeight:800,
        color:hov?MV.bg:MV.orange,transition:"all .2s",
      }}>⬡</span>
      <span style={{
        fontSize:"0.62rem",fontFamily:MV.fontMono,
        letterSpacing:"0.06em",whiteSpace:"nowrap",
        color:hov?MV.orange:MV.muted,transition:"color .2s",
      }}>
        Powered by <strong style={{color:hov?MV.orange:MV.text}}>MediaVolt</strong>
      </span>
    </a>
  );
}

// ─── ADMIN FLOW PANEL (zobrazí sa po prihlásení) ─────────────
function AdminFlowPanel({ sessionId }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const clientUrl = `${window.location.origin}/?session=${sessionId}`;

  const copy = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{
      position:"fixed", top:0, left:0, right:0, zIndex:9997,
      background:`${MV.bg}f5`, borderBottom:`1px solid ${MV.borderHi}`,
      backdropFilter:"blur(12px)",
      transition:"all .25s",
    }}>
      {collapsed ? (
        /* Zbalený stav — len úzky pruh */
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0.35rem 1.25rem",
        }}>
          <span style={{fontFamily:MV.fontMono, fontSize:"0.6rem", color:MV.muted, letterSpacing:"0.1em"}}>
            ⚡ WEBQUOTE ADMIN · SESSION <span style={{color:MV.orange}}>{sessionId.slice(0,8).toUpperCase()}</span>
          </span>
          <button onClick={()=>setCollapsed(false)} style={{
            background:"none", border:`1px solid ${MV.border}`, borderRadius:6,
            color:MV.muted, cursor:"pointer", padding:"0.15rem 0.5rem",
            fontFamily:MV.fontMono, fontSize:"0.58rem", letterSpacing:"0.06em",
          }}>
            ROZBALIŤ ↓
          </button>
        </div>
      ) : (
        /* Rozbalený stav — prehľadný flow */
        <div style={{padding:"0.75rem 1.25rem"}}>
          {/* Hlavička */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:"0.75rem",
          }}>
            <div style={{display:"flex", alignItems:"center", gap:"0.6rem"}}>
              <span style={{
                fontFamily:MV.fontDisplay, fontWeight:800, fontSize:"0.9rem",
                color:MV.text, letterSpacing:"-0.02em",
              }}>
                ⚡ Web<span style={{color:MV.orange}}>Quote</span>
              </span>
              <span style={{
                fontFamily:MV.fontMono, fontSize:"0.55rem", color:MV.muted,
                background:MV.surface, border:`1px solid ${MV.border}`,
                borderRadius:4, padding:"0.1rem 0.4rem", letterSpacing:"0.08em",
              }}>
                ADMIN
              </span>
            </div>
            <button onClick={()=>setCollapsed(true)} style={{
              background:"none", border:`1px solid ${MV.border}`, borderRadius:6,
              color:MV.muted, cursor:"pointer", padding:"0.15rem 0.5rem",
              fontFamily:MV.fontMono, fontSize:"0.58rem", letterSpacing:"0.06em",
            }}>
              ZBALIŤ ↑
            </button>
          </div>

          {/* Kroky */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr auto 1fr auto 1fr",
            gap:"0.5rem", alignItems:"center", marginBottom:"0.875rem",
          }}>
            {/* Krok 1 */}
            <div style={{
              background:`${MV.orange}12`, border:`1px solid ${MV.orange}40`,
              borderRadius:10, padding:"0.6rem 0.875rem",
              display:"flex", alignItems:"center", gap:"0.6rem",
            }}>
              <span style={{
                width:24, height:24, borderRadius:"50%",
                background:MV.orange, color:MV.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"0.7rem", fontWeight:800, flexShrink:0,
              }}>1</span>
              <div>
                <div style={{fontFamily:MV.fontBody, fontWeight:700, fontSize:"0.72rem", color:MV.text}}>
                  Vyplň brief
                </div>
                <div style={{fontFamily:MV.fontMono, fontSize:"0.58rem", color:MV.muted, marginTop:2}}>
                  Projektové info, technológie, obsah
                </div>
              </div>
            </div>

            <div style={{color:MV.muted, fontSize:"1rem", textAlign:"center"}}>→</div>

            {/* Krok 2 */}
            <div style={{
              background:`${MV.orangeLight}12`, border:`1px solid ${MV.orangeLight}40`,
              borderRadius:10, padding:"0.6rem 0.875rem",
              display:"flex", alignItems:"center", gap:"0.6rem",
            }}>
              <span style={{
                width:24, height:24, borderRadius:"50%",
                background:MV.orangeLight, color:"#fff",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"0.7rem", fontWeight:800, flexShrink:0,
              }}>2</span>
              <div>
                <div style={{fontFamily:MV.fontBody, fontWeight:700, fontSize:"0.72rem", color:MV.text}}>
                  Zdieľaj klientovi
                </div>
                <div style={{fontFamily:MV.fontMono, fontSize:"0.58rem", color:MV.muted, marginTop:2}}>
                  Skopíruj link nižšie
                </div>
              </div>
            </div>

            <div style={{color:MV.muted, fontSize:"1rem", textAlign:"center"}}>→</div>

            {/* Krok 3 */}
            <div style={{
              background:`${MV.green}10`, border:`1px solid ${MV.green}30`,
              borderRadius:10, padding:"0.6rem 0.875rem",
              display:"flex", alignItems:"center", gap:"0.6rem",
            }}>
              <span style={{
                width:24, height:24, borderRadius:"50%",
                background:MV.green, color:MV.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"0.7rem", fontWeight:800, flexShrink:0,
              }}>3</span>
              <div>
                <div style={{fontFamily:MV.fontBody, fontWeight:700, fontSize:"0.72rem", color:MV.text}}>
                  Live sync
                </div>
                <div style={{fontFamily:MV.fontMono, fontSize:"0.58rem", color:MV.muted, marginTop:2}}>
                  Klient vidí zmeny v reálnom čase
                </div>
              </div>
            </div>
          </div>

          {/* Klientský link — prominentný */}
          <div style={{
            display:"flex", alignItems:"center", gap:"0.75rem",
            background:MV.surface, border:`1.5px solid ${copied?MV.green:MV.borderHi}`,
            borderRadius:10, padding:"0.5rem 0.5rem 0.5rem 0.875rem",
            transition:"border-color .2s",
          }}>
            <span style={{
              fontFamily:MV.fontMono, fontSize:"0.6rem",
              color:MV.muted, letterSpacing:"0.08em", whiteSpace:"nowrap",
            }}>
              LINK PRE KLIENTA →
            </span>
            <span style={{
              fontFamily:MV.fontMono, fontSize:"0.68rem", color:MV.orange,
              flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            }}>
              {clientUrl}
            </span>
            <button onClick={copy} style={{
              background: copied ? MV.green : MV.orange,
              color: MV.bg, border:"none", borderRadius:8,
              padding:"0.5rem 1.25rem", cursor:"pointer",
              fontFamily:MV.fontBody, fontSize:"0.78rem",
              fontWeight:700, letterSpacing:"0.03em",
              whiteSpace:"nowrap", transition:"background .2s",
              display:"flex", alignItems:"center", gap:"0.4rem",
            }}>
              {copied ? "✓ Skopírované!" : "📋 Kopírovať link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  // Admin je VÝHRADNE na /admin ceste — klient na / nikdy nevie že admin existuje
  const isAdmin   = window.location.pathname.startsWith("/admin");
  const sessionId = getSessionId();

  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [theme, setTheme] = useState("dark");
  const channelRef = useRef(null);

  // Supabase realtime: admin broadcastuje, klient prijíma
  useEffect(() => {
    const supaUrl = import.meta.env.VITE_SUPABASE_URL || "";
    if (!supaUrl || supaUrl.includes("YOUR_PROJECT")) return;
    const channel = createRealtimeChannel(sessionId, (data) => {
      if (!isAdmin) setBrief(prev => ({ ...prev, ...data }));
    });
    channelRef.current = channel;
    return () => { channel.destroy(); channelRef.current = null; };
  }, [sessionId, isAdmin]);

  const handleBriefChange = useCallback((patch) => {
    setBrief(prev => {
      const next = { ...prev, ...patch };
      if (isAdmin && channelRef.current) channelRef.current.broadcast(next);
      return next;
    });
  }, [isAdmin]);

  const inner = (
    <>
      {/* Globálne štýly */}
      <style>{`
        body { background: ${MV.bg}; }
        * { font-family: 'Space Grotesk', system-ui, sans-serif !important; }
        body::after {
          content:''; position:fixed; inset:0; pointer-events:none; z-index:9990;
          background:repeating-linear-gradient(
            0deg,transparent,transparent 2px,
            rgba(255,106,0,0.012) 2px,rgba(255,106,0,0.012) 4px
          );
        }
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:${MV.bg};}
        ::-webkit-scrollbar-thumb{background:${MV.borderHi};border-radius:2px;}
      `}</style>

      {/* Admin flow panel (zbaletelný, s krokmi + link pre klienta) */}
      {isAdmin && <AdminFlowPanel sessionId={sessionId} />}

      {/* Builder — odsadenie pre admin panel (rozbalený ~130px, zbalený ~36px) */}
      <div style={{paddingTop: isAdmin ? 148 : 0}}>
        <BuilderView
          sessionId={sessionId}
          brief={brief}
          update={handleBriefChange}
          theme={theme}
          setTheme={setTheme}
          isAdmin={isAdmin}
        />
      </div>

      <PoweredByBadge />
 