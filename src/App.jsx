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
  DEFAULT_BRIEF,
  createRealtimeChannel,
  hasSupabase,
  dbLoadSession,
  dbSaveSession,
  dbListSessions,
  dbDeleteSession,
  dbRenameSession,
} from "./builder.jsx";

// ─── MediaVolt / WebQuote brand tokens ───────────────────────
const MV = {
  bg:          "#0a0604",   // teplá tmavá — ako mediavolt.org
  surface:     "#120b07",
  surfaceHigh: "#1a1009",
  border:      "#2a1d12",
  borderHi:    "#3a2a1a",
  text:        "#f4ece6",
  muted:       "#8f8378",
  desc:        "#6f6459",
  orange:      "#ff6a00",   // volt orange — hlavná farba MediaVolt
  orangeDim:   "#ff6a0022",
  orangeLight: "#ff9540",   // svetlejší odtieň
  amber:       "#ffb020",   // jantárový odtieň
  green:       "#22c55e",
  fontDisplay: "'Syne', 'Space Grotesk', sans-serif",
  fontBody:    "'Space Grotesk', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', monospace",
};

// ─── ADMIN PROJEKTY ───────────────────────────────────────────
// Primárny zdroj = Supabase tabuľka wq_sessions (pozri supabase-setup.sql).
// localStorage slúži len ako fallback, keď Supabase nie je nakonfigurovaný.
const PROJECTS_KEY = "wq_admin_projects";

function slugify(str) {
  return (str || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // odstráň diakritiku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return Object.entries(obj)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch { return []; }
}

function saveProjectsObj(obj) {
  try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(obj)); } catch {}
}

function upsertProject(id, name) {
  if (!id) return;
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[id] = { name: name || obj[id]?.name || "Bez názvu", updatedAt: Date.now() };
    saveProjectsObj(obj);
  } catch {}
}

function removeProject(id) {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    delete obj[id];
    saveProjectsObj(obj);
  } catch {}
}

// Premenuje slug (URL) projektu — zachová meno a dátum, presunie pod nový kľúč.
// Vráti true ak sa podarilo, false ak nový slug už existuje (a je iný než starý).
function renameProjectId(oldId, newId) {
  if (!newId || newId === oldId) return true;
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    if (obj[newId]) return false; // kolízia — URL už existuje
    obj[newId] = obj[oldId] || { name: "Bez názvu", updatedAt: Date.now() };
    delete obj[oldId];
    saveProjectsObj(obj);
    return true;
  } catch { return false; }
}

function generateRandomId() {
  return Math.random().toString(36).slice(2, 8).toLowerCase();
}

function uniqueSlug(base, existingIds) {
  const existing = new Set(existingIds ?? loadProjects().map(p => p.id));
  let slug = slugify(base) || generateRandomId();
  if (!existing.has(slug)) return slug;
  let i = 2;
  while (existing.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

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

// ─── ADMIN HOME (zoznam projektov) ─────────────────────────────
function AdminHome() {
  const [projects, setProjects] = useState(() => loadProjects());
  const [loading, setLoading] = useState(hasSupabase);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [renameErr, setRenameErr] = useState(false);

  const refresh = useCallback(async () => {
    if (hasSupabase) {
      const rows = await dbListSessions();
      if (rows) {
        setProjects(rows);
        // zosynchronizuj lokálny fallback register s DB
        const obj = {};
        rows.forEach(r => { obj[r.id] = { name: r.name, updatedAt: r.updatedAt }; });
        saveProjectsObj(obj);
      } else {
        setProjects(loadProjects()); // DB nedostupná — fallback
      }
    } else {
      setProjects(loadProjects());
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openProject = (id) => { window.location.href = `/admin?session=${id}`; };

  const createProject = async () => {
    const name = window.prompt("Názov nového projektu:", "");
    if (name === null) return; // zrušené
    const slug = uniqueSlug(name || "novy-projekt", projects.map(p => p.id));
    const displayName = name?.trim() || "Bez názvu";
    upsertProject(slug, displayName);
    if (hasSupabase) {
      await dbSaveSession(slug, { ...DEFAULT_BRIEF, projectName: displayName });
    }
    window.location.href = `/admin?session=${slug}`;
  };

  const startRename = (p) => { setRenamingId(p.id); setRenameVal(p.id); setRenameErr(false); };

  const confirmRename = async (oldId) => {
    const newSlug = slugify(renameVal) || oldId;
    if (newSlug === oldId) { setRenamingId(null); return; }
    if (hasSupabase) {
      const ok = await dbRenameSession(oldId, newSlug);
      if (!ok) { setRenameErr(true); return; }
    }
    renameProjectId(oldId, newSlug);
    setRenamingId(null);
    refresh();
  };

  const deleteProject = async (p) => {
    const msg = hasSupabase
      ? `Naozaj zmazať projekt "${p.name}"?\n\nToto natrvalo zmaže aj uložené dáta projektu z databázy.`
      : `Naozaj zmazať projekt "${p.name}" zo zoznamu?`;
    if (!window.confirm(msg)) return;
    if (hasSupabase) await dbDeleteSession(p.id);
    removeProject(p.id);
    refresh();
  };

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/?session=${id}`);
  };

  return (
    <div style={{
      minHeight:"100vh", background:MV.bg, fontFamily:MV.fontBody,
      padding:"2.5rem 1.5rem",
      backgroundImage:`
        linear-gradient(rgba(255,106,0,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,106,0,0.03) 1px, transparent 1px)
      `,
      backgroundSize:"40px 40px",
    }}>
      <style>{`
        .wq-row:hover { border-color:${MV.orange}66 !important; background:${MV.surfaceHigh} !important; }
        .wq-iconbtn:hover { background:${MV.orange}22 !important; border-color:${MV.orange} !important; color:${MV.orange} !important; }
      `}</style>

      <div style={{maxWidth:760, margin:"0 auto"}}>
        {/* Hlavička */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"2rem"}}>
          <div>
            <div style={{
              fontFamily:MV.fontDisplay, fontWeight:800, fontSize:"1.6rem",
              color:MV.text, letterSpacing:"-0.03em",
            }}>
              ⚡ Web<span style={{color:MV.orange}}>Quote</span>
            </div>
            <div style={{
              fontSize:"0.65rem", color:MV.muted, fontFamily:MV.fontMono,
              letterSpacing:"0.1em", textTransform:"uppercase", marginTop:2,
            }}>
              Projekty · {projects.length} {projects.length===1?"projekt":projects.length>=2&&projects.length<=4?"projekty":"projektov"}
            </div>
          </div>
          <button onClick={createProject} style={{
            background:`linear-gradient(135deg,${MV.orange}22,${MV.orangeLight}22)`,
            border:`1.5px solid ${MV.orange}`, color:MV.orange,
            borderRadius:10, padding:"0.65rem 1.1rem", cursor:"pointer",
            fontFamily:MV.fontBody, fontWeight:700, fontSize:"0.82rem",
            display:"flex", alignItems:"center", gap:"0.4rem",
          }}>
            + Nový projekt
          </button>
        </div>

        {/* Upozornenie ak chýba databáza */}
        {!hasSupabase && (
          <div style={{
            marginBottom:"1rem", padding:"0.6rem 0.9rem",
            background:"#ffb02012", border:"1px solid #ffb02040", borderRadius:10,
            color:MV.amber, fontSize:"0.72rem", fontFamily:MV.fontMono, letterSpacing:"0.03em",
          }}>
            ⚠ Supabase nie je nakonfigurovaný — projekty sa ukladajú len lokálne v tomto prehliadači.
            Doplň VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY do .env a spusti supabase-setup.sql.
          </div>
        )}

        {/* Zoznam projektov */}
        {loading ? (
          <div style={{
            border:`1px dashed ${MV.borderHi}`, borderRadius:14,
            padding:"3rem 1.5rem", textAlign:"center",
            color:MV.muted, fontSize:"0.8rem", fontFamily:MV.fontMono,
          }}>
            Načítavam projekty z databázy…
          </div>
        ) : projects.length === 0 ? (
          <div style={{
            border:`1px dashed ${MV.borderHi}`, borderRadius:14,
            padding:"3rem 1.5rem", textAlign:"center",
            color:MV.muted, fontSize:"0.85rem",
          }}>
            Zatiaľ žiadne projekty. Klikni na <strong style={{color:MV.text}}>+ Nový projekt</strong> a začni brief.
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:"0.6rem"}}>
            {projects.map(p => (
              <div key={p.id} className="wq-row" style={{
                display:"flex", alignItems:"center", gap:"0.75rem",
                background:MV.surface, border:`1.5px solid ${MV.border}`,
                borderRadius:12, padding:"0.85rem 1rem",
                transition:"all .15s", cursor:"pointer",
              }} onClick={(e)=>{ if (renamingId===p.id) return; openProject(p.id); }}>

                <div style={{
                  width:38, height:38, borderRadius:10, flexShrink:0,
                  background:`${MV.orange}14`, border:`1px solid ${MV.orange}33`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"1rem",
                }}>📋</div>

                <div style={{flex:1, minWidth:0}}>
                  <div style={{
                    fontWeight:700, fontSize:"0.88rem", color:MV.text,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                  }}>
                    {p.name || "Bez názvu"}
                  </div>

                  {renamingId === p.id ? (
                    <div onClick={e=>e.stopPropagation()} style={{display:"flex", alignItems:"center", gap:"0.4rem", marginTop:4}}>
                      <span style={{fontFamily:MV.fontMono, fontSize:"0.68rem", color:MV.muted}}>?session=</span>
                      <input autoFocus value={renameVal}
                        onChange={e=>{ setRenameVal(e.target.value); setRenameErr(false); }}
                        onKeyDown={e=>{ if(e.key==="Enter") confirmRename(p.id); if(e.key==="Escape") setRenamingId(null); }}
                        style={{
                          background:MV.bg, border:`1.5px solid ${renameErr?"#ef4444":MV.orange}`,
                          borderRadius:6, padding:"0.2rem 0.45rem", color:MV.text,
                          fontFamily:MV.fontMono, fontSize:"0.7rem", width:160,
                        }}
                      />
                      <button onClick={()=>confirmRename(p.id)} style={{
                        background:MV.green, color:MV.bg, border:"none", borderRadius:6,
                        padding:"0.2rem 0.55rem", fontSize:"0.68rem", fontWeight:700, cursor:"pointer",
                      }}>✓</button>
                      <button onClick={()=>setRenamingId(null)} style={{
                        background:"none", color:MV.muted, border:`1px solid ${MV.border}`, borderRadius:6,
                        padding:"0.2rem 0.55rem", fontSize:"0.68rem", cursor:"pointer",
                      }}>✕</button>
                      {renameErr && <span style={{fontSize:"0.62rem", color:"#f87171", fontFamily:MV.fontMono}}>URL už existuje</span>}
                    </div>
                  ) : (
                    <div style={{
                      fontFamily:MV.fontMono, fontSize:"0.68rem", color:MV.muted,
                      marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                    }}>
                      ?session={p.id} · {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("sk-SK") : "—"}
                    </div>
                  )}
                </div>

                {renamingId !== p.id && (
                  <div onClick={e=>e.stopPropagation()} style={{display:"flex", gap:"0.35rem", flexShrink:0}}>
                    <button className="wq-iconbtn" title="Kopírovať klientský link" onClick={()=>copyLink(p.id)} style={{
                      background:"none", border:`1px solid ${MV.border}`, color:MV.muted,
                      borderRadius:7, width:30, height:30, cursor:"pointer", fontSize:"0.78rem",
                    }}>📋</button>
                    <button className="wq-iconbtn" title="Upraviť URL projektu" onClick={()=>startRename(p)} style={{
                      background:"none", border:`1px solid ${MV.border}`, color:MV.muted,
                      borderRadius:7, width:30, height:30, cursor:"pointer", fontSize:"0.78rem",
                    }}>✏️</button>
                    <button className="wq-iconbtn" title="Zmazať zo zoznamu" onClick={()=>deleteProject(p)} style={{
                      background:"none", border:`1px solid ${MV.border}`, color:MV.muted,
                      borderRadius:7, width:30, height:30, cursor:"pointer", fontSize:"0.78rem",
                    }}>🗑</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN FLOW PANEL (zobrazí sa po prihlásení) ─────────────
function AdminFlowPanel({ sessionId, projectName }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(sessionId);
  const [renameErr, setRenameErr] = useState(false);
  const panelRef = useRef(null);
  const clientUrl = `${window.location.origin}/?session=${sessionId}`;

  // Reálna výška panelu → CSS premenná --wq-admin-h.
  // Obsah pod panelom sa odsadí presne — menu sa nikdy neprekryje s lištou linku.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const setH = () => document.documentElement.style.setProperty("--wq-admin-h", el.offsetHeight + "px");
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty("--wq-admin-h"); };
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const startRename = () => { setRenameVal(sessionId); setRenameErr(false); setRenaming(true); };

  const confirmRename = async () => {
    const newSlug = slugify(renameVal);
    if (!newSlug) { setRenameErr(true); return; }
    if (newSlug === sessionId) { setRenaming(false); return; }
    if (hasSupabase) {
      const ok = await dbRenameSession(sessionId, newSlug);
      if (!ok) { setRenameErr(true); return; }
      renameProjectId(sessionId, newSlug); // zosynchronizuj lokálny register
    } else {
      const ok = renameProjectId(sessionId, newSlug);
      if (!ok) { setRenameErr(true); return; }
    }
    // presmeruj na rovnaký projekt pod novým URL
    window.location.href = `/admin?session=${newSlug}`;
  };

  return (
    <div ref={panelRef} style={{
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
          <span style={{fontFamily:MV.fontMono, fontSize:"0.6rem", color:MV.muted, letterSpacing:"0.1em", display:"flex", alignItems:"center", gap:"0.6rem"}}>
            <a href="/admin" style={{color:MV.muted, textDecoration:"none"}}>← Projekty</a>
            ⚡ {projectName || "WEBQUOTE ADMIN"} · <span style={{color:MV.orange}}>{sessionId}</span>
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
              <a href="/admin" style={{
                fontFamily:MV.fontMono, fontSize:"0.62rem", color:MV.muted,
                textDecoration:"none", border:`1px solid ${MV.border}`,
                borderRadius:6, padding:"0.2rem 0.5rem", letterSpacing:"0.04em",
              }}>← Projekty</a>
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
            <button onClick={startRename} title="Upraviť URL projektu" style={{
              background:"none", border:`1px solid ${MV.border}`, color:MV.muted,
              borderRadius:8, padding:"0.5rem 0.65rem", cursor:"pointer",
              fontSize:"0.78rem", whiteSpace:"nowrap",
            }}>
              ✏️ URL
            </button>
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

          {/* Editácia URL projektu — nahradí session kód čitateľným slugom */}
          {renaming && (
            <div style={{
              display:"flex", alignItems:"center", gap:"0.5rem",
              marginTop:"0.5rem", background:MV.surface,
              border:`1.5px solid ${renameErr?"#ef4444":MV.orange}`,
              borderRadius:10, padding:"0.5rem 0.625rem 0.5rem 0.875rem",
            }}>
              <span style={{fontFamily:MV.fontMono, fontSize:"0.62rem", color:MV.muted, whiteSpace:"nowrap"}}>
                ?session=
              </span>
              <input
                autoFocus value={renameVal}
                onChange={e=>{ setRenameVal(e.target.value); setRenameErr(false); }}
                onKeyDown={e=>{ if(e.key==="Enter") confirmRename(); if(e.key==="Escape") setRenaming(false); }}
                placeholder="napr. cafe-paradise"
                style={{
                  flex:1, background:MV.bg, border:`1px solid ${MV.border}`,
                  borderRadius:6, padding:"0.3rem 0.55rem", color:MV.text,
                  fontFamily:MV.fontMono, fontSize:"0.72rem",
                }}
              />
              <button onClick={confirmRename} style={{
                background:MV.green, color:MV.bg, border:"none", borderRadius:7,
                padding:"0.35rem 0.75rem", fontSize:"0.7rem", fontWeight:700, cursor:"pointer",
              }}>✓ Uložiť</button>
              <button onClick={()=>setRenaming(false)} style={{
                background:"none", color:MV.muted, border:`1px solid ${MV.border}`, borderRadius:7,
                padding:"0.35rem 0.75rem", fontSize:"0.7rem", cursor:"pointer",
              }}>Zrušiť</button>
              {renameErr && <span style={{fontSize:"0.62rem", color:"#f87171", fontFamily:MV.fontMono, whiteSpace:"nowrap"}}>
                Neplatná alebo už použitá URL
              </span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SAVE BADGE (stav ukladania do databázy) ──────────────────
function SaveBadge({ state }) {
  if (!hasSupabase || state === "idle") return null;
  const cfg = {
    saving: { txt: "● Ukladám…",         color: MV.amber,  },
    saved:  { txt: "✓ Uložené",           color: MV.green,  },
    error:  { txt: "✕ Chyba ukladania",   color: "#f87171", },
  }[state];
  if (!cfg) return null;
  return (
    <div style={{
      position:"fixed", bottom:12, left:12, zIndex:9999,
      padding:"0.3rem 0.7rem", borderRadius:20,
      background:`${MV.bg}ee`, border:`1px solid ${cfg.color}50`,
      color:cfg.color, fontFamily:MV.fontMono, fontSize:"0.62rem",
      letterSpacing:"0.06em", backdropFilter:"blur(8px)",
      transition:"all .2s",
    }}>
      {cfg.txt}
    </div>
  );
}

// ─── LOADER (kým sa načíta session z databázy) ────────────────
function SessionLoader() {
  return (
    <div style={{
      minHeight:"100vh", background:MV.bg,
      display:"flex", alignItems:"center", justifyContent:"center",
      flexDirection:"column", gap:"1rem", fontFamily:MV.fontBody,
    }}>
      <style>{`@keyframes wq-spin { to { transform:rotate(360deg) } }`}</style>
      <div style={{
        width:36, height:36, borderRadius:"50%",
        border:`3px solid ${MV.border}`, borderTopColor:MV.orange,
        animation:"wq-spin .8s linear infinite",
      }}/>
      <div style={{fontFamily:MV.fontMono, fontSize:"0.65rem", color:MV.muted, letterSpacing:"0.1em"}}>
        NAČÍTAVAM PROJEKT…
      </div>
    </div>
  );
}

// ─── SESSION APP (builder pre konkrétnu session) ──────────────
function SessionApp({ sessionId, isAdmin }) {
  const [brief, setBrief]         = useState(DEFAULT_BRIEF);
  const [theme, setTheme]         = useState("dark");
  const [loaded, setLoaded]       = useState(!hasSupabase);
  const [saveState, setSaveState] = useState("idle");
  const channelRef   = useRef(null);
  const dirtyRef     = useRef(false);   // true = posledná zmena briefu je lokálna (treba broadcast + save)
  const saveTimerRef = useRef(null);
  const briefRef     = useRef(brief);
  useEffect(() => { briefRef.current = brief; }, [brief]);

  // 1) Načítaj uložený brief z databázy (perzistencia sessions)
  useEffect(() => {
    if (!hasSupabase) return;
    let alive = true;
    dbLoadSession(sessionId).then(saved => {
      if (!alive) return;
      if (saved) setBrief({ ...DEFAULT_BRIEF, ...saved });
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [sessionId]);

  // 2) Realtime kanál — obojsmerný sync admin ↔ klient
  //    (echo vlastných správ je potlačené cez TAB_ID v builder.jsx)
  useEffect(() => {
    if (!hasSupabase) return;
    const channel = createRealtimeChannel(sessionId, (data) => {
      setBrief(prev => ({ ...prev, ...data }));
    });
    channelRef.current = channel;
    return () => { channel.destroy(); channelRef.current = null; };
  }, [sessionId]);

  // 3) Po lokálnej zmene: broadcast hneď + autosave do DB (debounce 800 ms)
  useEffect(() => {
    if (!loaded || !dirtyRef.current) return;
    dirtyRef.current = false;
    channelRef.current?.broadcast(brief);
    if (!hasSupabase) return;
    setSaveState("saving");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;
      const ok = await dbSaveSession(sessionId, briefRef.current);
      setSaveState(ok ? "saved" : "error");
    }, 800);
  }, [brief, loaded, sessionId]);

  // 4) Flush — ulož rozpracované zmeny pri skrytí/zatvorení okna
  useEffect(() => {
    if (!hasSupabase) return;
    const flush = () => {
      if (document.visibilityState === "hidden" && saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        dbSaveSession(sessionId, briefRef.current);
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [sessionId]);

  // 5) Admin: zaregistruj/aktualizuj projekt v lokálnom fallback zozname
  useEffect(() => {
    if (isAdmin && loaded) upsertProject(sessionId, brief.projectName || "Bez názvu");
  }, [isAdmin, sessionId, brief.projectName, loaded]);

  const handleBriefChange = useCallback((patch) => {
    dirtyRef.current = true;
    setBrief(prev => ({ ...prev, ...patch }));
  }, []);

  // Kým sa nenačíta uložený stav, needituj — inak by load prepísal zmeny
  if (!loaded) return <SessionLoader />;

  return (
    <>
      {/* Globálne štýly */}
      <style>{`
        body { background: ${MV.bg}; font-family: 'Space Grotesk', system-ui, sans-serif; }
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
      {isAdmin && <AdminFlowPanel sessionId={sessionId} projectName={brief.projectName} />}

      {/* Builder — odsadenie presne podľa reálnej výšky admin panelu (--wq-admin-h) */}
      <div style={{paddingTop: isAdmin ? "var(--wq-admin-h, 148px)" : 0}}>
        <BuilderView
          sessionId={sessionId}
          brief={brief}
          update={handleBriefChange}
          theme={theme}
          setTheme={setTheme}
          isAdmin={isAdmin}
        />
      </div>

      <SaveBadge state={saveState} />
      <PoweredByBadge />
    </>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  // Admin je VÝHRADNE na /admin ceste — klient na / nikdy nevie že admin existuje
  const isAdmin = window.location.pathname.startsWith("/admin");
  const sessionParam = new URLSearchParams(window.location.search).get("session");

  // Admin bez ?session= → zoznam projektov (úvod), nie rovno builder
  if (isAdmin && !sessionParam) {
    return <AdminGate><AdminHome /></AdminGate>;
  }

  // Bez session linku → presmerovanie na admin login
  if (!sessionParam) {
    window.location.replace("/admin");
    return null;
  }

  const app = <SessionApp sessionId={sessionParam} isAdmin={isAdmin} />;
  return isAdmin ? <AdminGate>{app}</AdminGate> : app;
}
