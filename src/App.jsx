// ═══════════════════════════════════════════════════════════════
//  WebQuote — by MediaVolt
//  src/App.jsx — produkčný root komponent
//
//  INŠTRUKCIA:
//  1. Vezmi celý obsah web-builder-v7.jsx
//  2. Nahraď riadky 1-2 (SUPABASE_URL / SUPABASE_ANON):
//       const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
//       const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
//  3. Vlep celý obsah DO TOHTO SÚBORU pred tento riadok (za importy)
//  4. Zmaž pôvodný "export default function App()" blok z web-builder-v7.jsx
//  5. Tento súbor obsahuje nový App komponent — nechaj ho na konci
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";

// ─── MediaVolt / WebQuote brand tokens ───────────────────────
const MV = {
  // Farby podľa mediavolt.org
  bg:          "#05060d",   // deep space black
  surface:     "#0c0d1a",   // tmavá surface
  surfaceHigh: "#12142a",   // karta
  border:      "#1a1c35",   // jemná hranica
  borderHi:    "#252850",   // zvýraznená hranica
  text:        "#e8eef5",   // hlavný text
  muted:       "#5a6080",   // sekundárny text
  desc:        "#3d4260",   // popis / hint
  cyan:        "#22d3ee",   // primárny akcent — elektro cyan
  cyanDim:     "#22d3ee22", // priesvitný cyan
  violet:      "#a855f7",   // sekundárny akcent
  green:       "#22c55e",   // systémová zelená (ONLINE)
  fontDisplay: "'Syne', 'Space Grotesk', sans-serif",
  fontBody:    "'Space Grotesk', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', monospace",
};

// ─── ADMIN GATE — login s MediaVolt dizajnom ─────────────────
function AdminGate({ children }) {
  const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD || "";
  const [authed, setAuthed] = useState(false);
  const [pw, setPw]         = useState("");
  const [err, setErr]       = useState(false);
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
        setAuthed(true);
        setErr(false);
      } else {
        setErr(true);
        setPw("");
      }
      setLoading(false);
    }, 400);
  };

  if (authed) return children;

  return (
    <div style={{
      minHeight:"100vh",
      background:MV.bg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:MV.fontBody,
      // Sieťový grid pattern ako na mediavolt.org
      backgroundImage:`
        linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)
      `,
      backgroundSize:"40px 40px",
    }}>
      <style>{`
        @keyframes mv-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes mv-glow  { 0%,100%{box-shadow:0 0 20px ${MV.cyanDim}} 50%{box-shadow:0 0 40px ${MV.cyan}44} }
        @keyframes mv-scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        .wq-inp:focus { border-color:${MV.cyan} !important; box-shadow:0 0 0 3px ${MV.cyanDim}; }
        .wq-btn:hover { background:${MV.cyan} !important; color:${MV.bg} !important; }
      `}</style>

      {/* Scan line efekt */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:0,
      }}>
        <div style={{
          position:"absolute", left:0, right:0, height:2,
          background:`linear-gradient(transparent, ${MV.cyan}40, transparent)`,
          animation:"mv-scan 6s linear infinite",
        }}/>
      </div>

      <form onSubmit={submit} style={{
        position:"relative", zIndex:1,
        background:MV.surface,
        border:`1px solid ${MV.borderHi}`,
        borderRadius:16,
        padding:"2.5rem 2rem",
        width:"100%", maxWidth:380,
        display:"flex", flexDirection:"column", gap:"1.25rem",
        boxShadow:`0 0 60px ${MV.cyanDim}, 0 24px 80px rgba(0,0,0,0.7)`,
        animation:"mv-glow 4s ease-in-out infinite",
      }}>
        {/* Logo + název */}
        <div style={{textAlign:"center"}}>
          <div style={{
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:56, height:56, borderRadius:14,
            background:`linear-gradient(135deg, ${MV.cyan}22, ${MV.violet}22)`,
            border:`1px solid ${MV.borderHi}`,
            fontSize:"1.6rem", marginBottom:"1rem",
          }}>⚡</div>

          <div style={{
            fontFamily:MV.fontDisplay,
            fontWeight:800, fontSize:"1.5rem",
            color:MV.text, letterSpacing:"-0.03em",
            lineHeight:1.1, marginBottom:"0.25rem",
          }}>
            Web<span style={{color:MV.cyan}}>Quote</span>
          </div>

          <div style={{
            fontSize:"0.65rem", color:MV.muted,
            fontFamily:MV.fontMono, letterSpacing:"0.12em",
            textTransform:"uppercase",
          }}>
            ADMIN ACCESS · AUTHENTICATION REQUIRED
          </div>
        </div>

        {/* Status indikátor */}
        <div style={{
          display:"flex", alignItems:"center", gap:"0.5rem",
          padding:"0.5rem 0.75rem",
          background:`${MV.green}10`,
          border:`1px solid ${MV.green}30`,
          borderRadius:8,
        }}>
          <div style={{
            width:6, height:6, borderRadius:"50%",
            background:MV.green,
            animation:"mv-pulse 2s infinite",
          }}/>
          <span style={{fontSize:"0.65rem", color:MV.green, fontFamily:MV.fontMono, letterSpacing:"0.08em"}}>
            SYSTEM · ONLINE · UPLINK STABLE
          </span>
        </div>

        <input
          type="password"
          autoFocus
          placeholder="Administrátorské heslo"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          className="wq-inp"
          style={{
            background:MV.bg,
            border:`1.5px solid ${err ? "#ef4444" : MV.border}`,
            borderRadius:10, padding:"0.75rem 1rem",
            color:MV.text,
            fontFamily:MV.fontMono, fontSize:"0.875rem",
            outline:"none", transition:"all .2s",
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

        <button
          type="submit"
          disabled={loading}
          className="wq-btn"
          style={{
            background:`linear-gradient(135deg, ${MV.cyan}22, ${MV.violet}22)`,
            border:`1.5px solid ${MV.cyan}`,
            color:MV.cyan,
            borderRadius:10, padding:"0.75rem",
            cursor:"pointer",
            fontFamily:MV.fontBody, fontWeight:700, fontSize:"0.875rem",
            letterSpacing:"0.04em",
            transition:"all .2s",
          }}
        >
          {loading ? "VERIFYING…" : "PRIHLÁSIŤ SA →"}
        </button>

        {/* Powered by */}
        <div style={{
          textAlign:"center", paddingTop:"0.5rem",
          borderTop:`1px solid ${MV.border}`,
        }}>
          <a
            href="https://mediavolt.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize:"0.62rem", color:MV.desc,
              fontFamily:MV.fontMono, letterSpacing:"0.08em",
              textDecoration:"none",
              display:"inline-flex", alignItems:"center", gap:"0.4rem",
              transition:"color .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = MV.cyan}
            onMouseLeave={e => e.currentTarget.style.color = MV.desc}
          >
            POWERED BY ⬡ MEDIAVOLT
          </a>
        </div>
      </form>
    </div>
  );
}

// ─── POWERED BY BADGE — footer baner ─────────────────────────
// Prilepený dole na každej stránke (klient aj admin)
function PoweredByBadge() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="https://mediavolt.org"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:"fixed", bottom:12, right:12, zIndex:9998,
        display:"flex", alignItems:"center", gap:"0.4rem",
        padding:"0.35rem 0.65rem 0.35rem 0.5rem",
        background: hovered ? MV.surface : `${MV.bg}ee`,
        border:`1px solid ${hovered ? MV.cyan : MV.border}`,
        borderRadius:20,
        textDecoration:"none",
        backdropFilter:"blur(8px)",
        transition:"all .2s",
        boxShadow: hovered ? `0 0 16px ${MV.cyanDim}` : "0 2px 12px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{
        display:"flex", alignItems:"center", justifyContent:"center",
        width:16, height:16, borderRadius:4,
        background: hovered ? MV.cyan : MV.cyanDim,
        fontSize:"0.6rem",
        transition:"all .2s",
        color: hovered ? MV.bg : MV.cyan,
        fontWeight:800,
      }}>⬡</span>
      <span style={{
        fontSize:"0.62rem",
        fontFamily:MV.fontMono, letterSpacing:"0.06em",
        color: hovered ? MV.cyan : MV.muted,
        transition:"color .2s",
        whiteSpace:"nowrap",
      }}>
        Powered by <strong style={{color:hovered?MV.cyan:MV.text}}>MediaVolt</strong>
      </span>
    </a>
  );
}

// ─── WEBQUOTE SESSION SHARE — admin link helper ───────────────
// Admin vidí tlačidlo na skopírovanie klientského linku
function SessionShareBar({ sessionId, isAdmin }) {
  const [copied, setCopied] = useState(false);
  if (!isAdmin) return null;

  const clientUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;

  const copy = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"0.5rem",
      padding:"0.3rem 0.75rem 0.3rem 0.5rem",
      background:`${MV.cyanDim}`,
      border:`1px solid ${MV.cyan}40`,
      borderRadius:8,
      fontFamily:MV.fontMono, fontSize:"0.62rem",
    }}>
      <span style={{color:MV.muted, letterSpacing:"0.06em"}}>KLIENT →</span>
      <span style={{
        color:MV.cyan, flex:1,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        maxWidth:200,
      }}>{clientUrl}</span>
      <button onClick={copy} style={{
        background: copied ? MV.green : MV.cyan,
        color: MV.bg,
        border:"none", borderRadius:5,
        padding:"0.2rem 0.5rem",
        cursor:"pointer", fontFamily:MV.fontMono,
        fontSize:"0.58rem", fontWeight:700,
        whiteSpace:"nowrap",
        transition:"background .2s",
      }}>
        {copied ? "✓ OK" : "KOPÍROVAŤ"}
      </button>
    </div>
  );
}

// ─── PRODUKČNÝ ROOT ───────────────────────────────────────────
//
//  Admin:  ?admin=1&session=XXXX   → admin view, chránené heslom
//  Klient: ?session=XXXX           → klientský view
//
//  Realtime sync: Admin broadcast → Klienti dostávajú live update
//
//  URL príklady:
//    Admin:  https://webquote.mediavolt.org/?admin=1&session=ABC123
//    Klient: https://webquote.mediavolt.org/?session=ABC123

export default function App() {
  const isAdmin   = getRole() === "admin";
  const sessionId = getSessionId();

  const [brief,  setBrief] = useState(DEFAULT_BRIEF);
  const [theme,  setTheme] = useState("dark");
  const channelRef = useRef(null);

  // ── Supabase Realtime sync ──────────────────────────────────
  useEffect(() => {
    const supaUrl = import.meta.env.VITE_SUPABASE_URL || "";
    if (!supaUrl || supaUrl.includes("YOUR_PROJECT")) {
      console.warn("[WebQuote] Supabase nie je nastavený — live sync vypnutý.");
      return;
    }
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

  const builderView = (
    <>
      <style>{`
        /* ── WebQuote global overrides — MediaVolt theme ── */
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        * { font-family: 'Space Grotesk', system-ui, sans-serif !important; }

        /* Scanline overlay */
        body::after {
          content:'';
          position:fixed; inset:0; pointer-events:none; z-index:9990;
          background:repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(34,211,238,0.012) 2px,
            rgba(34,211,238,0.012) 4px
          );
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${MV.bg}; }
        ::-webkit-scrollbar-thumb { background:${MV.borderHi}; border-radius:2px; }
        ::-webkit-scrollbar-thumb:hover { background:${MV.cyan}66; }

        @keyframes mv-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes mv-slide-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Session share bar — len admin */}
      {isAdmin && (
        <div style={{
          position:"fixed", top:0, left:0, right:0, zIndex:9997,
          display:"flex", justifyContent:"center", padding:"0.375rem 1rem",
          background:`${MV.bg}ee`, borderBottom:`1px solid ${MV.border}`,
          backdropFilter:"blur(8px)",
          gap:"0.75rem", alignItems:"center",
        }}>
          <span style={{
            fontFamily:MV.fontMono, fontSize:"0.6rem",
            color:MV.muted, letterSpacing:"0.08em",
          }}>
            ⚡ WEBQUOTE ADMIN
          </span>
          <SessionShareBar sessionId={sessionId} isAdmin={isAdmin} />
        </div>
      )}

      <div style={{ paddingTop: isAdmin ? 36 : 0 }}>
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
    </>
  );

  if (isAdmin) {
    return <AdminGate>{builderView}</AdminGate>;
  }
  return builderView;
}
