// ═══════════════════════════════════════════════════════════════
//  WebQuote — Mini web preview (iba admin)
//  Úmyselne veľmi jednoduchý vizuálny náhľad webu z briefu:
//  brand farby + fonty + poradie sekcií. Nie je to reálny web —
//  slúži adminovi pri ladení promptu.
// ═══════════════════════════════════════════════════════════════

import { extraLabel } from "./i18n.js";
import { getIndustryExtras } from "./industryData.js";

// Sekcie, ktoré sa v náhľade kreslia „obsahovo" (karty/riadky)
const CARD_SECS = ["services","features","products","work","team","pricing","gallery","menu"];
const LINE_SECS = ["about","faq","blog","process","testimonials","reviews","events"];
const SKIP_SECS = ["cookies","scrolltop","404","maintenance","darkmode","loader","search","popup","language","nav","hero","footer"];

export default function MiniWebPreview({ brief, sections, note }) {
  const br = brief.brand || {};
  const bg      = br.bg      || "#0b0b12";
  const surface = br.surface || "#15151f";
  const border  = br.border  || "#26263a";
  const text    = br.text    || "#f0f0f5";
  const muted   = br.muted   || "#8a8aa3";
  const primary = br.primary || "#6366f1";
  const accent  = br.accent  || "#ec4899";
  const fd = `'${br.fontDisplay || "Space Grotesk"}', sans-serif`;
  const fb = `'${br.fontBody || "Space Grotesk"}', sans-serif`;

  const secs = (sections || []).filter(s => !SKIP_SECS.includes(s.id));
  const navItems = secs.slice(0, 4).map(s => s.label);
  const hasHero = (brief.sections || []).includes("hero");
  const hasFooter = (brief.sections || []).includes("footer");

  const extras = getIndustryExtras(brief.industry, brief.industrySubcat);
  const chosen = extras
    ? (brief.industryExtras || []).map(id => extras.options.find(o => o.id === id)).filter(Boolean)
    : [];

  const Card = ({ label }) => (
    <div style={{ background:surface, border:`1px solid ${border}`, borderRadius:6, padding:"0.5rem" }}>
      <div style={{ width:18, height:18, borderRadius:4, background:`${primary}33`, marginBottom:"0.35rem" }}/>
      <div style={{ fontSize:"0.5rem", fontWeight:700, color:text, fontFamily:fb, marginBottom:"0.2rem",
        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</div>
      <div style={{ height:3, borderRadius:2, background:border, marginBottom:"0.15rem" }}/>
      <div style={{ height:3, borderRadius:2, background:border, width:"70%" }}/>
    </div>
  );

  return (
    <div>
      {/* Browser frame */}
      <div style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${border}`, boxShadow:"0 8px 32px rgba(0,0,0,0.35)" }}>
        {/* Browser bar */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", padding:"0.4rem 0.6rem", background:"#1a1b1e", borderBottom:"1px solid #2a2b2e" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#ff5f57" }}/>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#ffbd2e" }}/>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#28c840" }}/>
          <div style={{ flex:1, marginLeft:"0.5rem", background:"#0f1012", borderRadius:5, padding:"0.15rem 0.5rem",
            fontSize:"0.52rem", color:"#777", fontFamily:"monospace", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {(brief.domains && brief.domains.find(d => d.trim())) || "www." + (brief.projectName || "projekt").toLowerCase().replace(/[^a-z0-9]+/g, "") + ".sk"}
          </div>
        </div>

        {/* Page */}
        <div style={{ background:bg, fontFamily:fb, maxHeight:520, overflowY:"auto" }}>
          {/* Nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"0.5rem 0.75rem", borderBottom:`1px solid ${border}`, position:"sticky", top:0, background:bg, zIndex:2 }}>
            <div style={{ fontFamily:fd, fontWeight:800, fontSize:"0.62rem", color:text }}>
              {brief.projectName || "Logo"}
            </div>
            <div style={{ display:"flex", gap:"0.55rem", alignItems:"center" }}>
              {navItems.map((n, i) => (
                <span key={i} style={{ fontSize:"0.5rem", color:muted, whiteSpace:"nowrap" }}>{n}</span>
              ))}
              <span style={{ fontSize:"0.5rem", fontWeight:700, color:"#fff", background:primary, padding:"0.15rem 0.45rem", borderRadius:4, whiteSpace:"nowrap" }}>
                Kontakt
              </span>
            </div>
          </div>

          {/* Hero */}
          {hasHero && (
            <div style={{ padding:"1.4rem 0.9rem 1.2rem", textAlign:"center",
              background:`radial-gradient(ellipse at 50% 0%, ${primary}22, transparent 65%)` }}>
              <div style={{ fontFamily:fd, fontWeight:800, fontSize:"0.95rem", lineHeight:1.2, color:text, marginBottom:"0.4rem" }}>
                {brief.heroSeo || brief.projectName || "Hlavný nadpis webu"}
              </div>
              <div style={{ fontSize:"0.55rem", color:muted, marginBottom:"0.65rem", maxWidth:280, marginInline:"auto", lineHeight:1.45 }}>
                {brief.goal || brief.tone || "Podnadpis — hodnota pre návštevníka v jednej vete."}
              </div>
              <div style={{ display:"flex", gap:"0.4rem", justifyContent:"center" }}>
                <span style={{ fontSize:"0.55rem", fontWeight:700, color:"#fff", background:primary, padding:"0.28rem 0.7rem", borderRadius:5 }}>
                  Primárne CTA
                </span>
                <span style={{ fontSize:"0.55rem", fontWeight:600, color:text, border:`1px solid ${border}`, padding:"0.28rem 0.7rem", borderRadius:5 }}>
                  Viac info
                </span>
              </div>
            </div>
          )}

          {/* Sekcie */}
          {secs.map(s => (
            <div key={s.id} style={{ padding:"0.8rem 0.9rem", borderTop:`1px solid ${border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.35rem", marginBottom:"0.5rem" }}>
                <span style={{ fontSize:"0.55rem" }}>{s.icon}</span>
                <span style={{ fontFamily:fd, fontWeight:700, fontSize:"0.62rem", color:text }}>{s.label}</span>
              </div>
              {s.id === "services" && chosen.length > 0 ? (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.4rem" }}>
                  {chosen.slice(0, 6).map(o => <Card key={o.id} label={extraLabel(o, brief.lang || "sk")} />)}
                </div>
              ) : CARD_SECS.includes(s.id) ? (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.4rem" }}>
                  <Card label="—" /><Card label="—" /><Card label="—" />
                </div>
              ) : LINE_SECS.includes(s.id) ? (
                <div>
                  <div style={{ height:4, borderRadius:2, background:border, marginBottom:"0.25rem" }}/>
                  <div style={{ height:4, borderRadius:2, background:border, marginBottom:"0.25rem", width:"85%" }}/>
                  <div style={{ height:4, borderRadius:2, background:border, width:"60%" }}/>
                </div>
              ) : s.id === "cta" ? (
                <div style={{ background:`linear-gradient(135deg, ${primary}, ${accent})`, borderRadius:6, padding:"0.6rem", textAlign:"center" }}>
                  <span style={{ fontSize:"0.55rem", fontWeight:800, color:"#fff" }}>Výzva k akcii →</span>
                </div>
              ) : (s.id === "contact" || s.id === "leadform" || s.id === "booking" || s.id === "newsletter") ? (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.4rem" }}>
                  <div style={{ height:14, borderRadius:4, background:surface, border:`1px solid ${border}` }}/>
                  <div style={{ height:14, borderRadius:4, background:surface, border:`1px solid ${border}` }}/>
                  <div style={{ gridColumn:"1 / -1", height:22, borderRadius:4, background:surface, border:`1px solid ${border}` }}/>
                  <div style={{ width:64, height:12, borderRadius:4, background:primary }}/>
                </div>
              ) : (s.id === "stats" || s.id === "logos") ? (
                <div style={{ display:"flex", gap:"0.6rem", justifyContent:"space-around" }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ textAlign:"center" }}>
                      <div style={{ fontFamily:fd, fontWeight:800, fontSize:"0.7rem", color:primary }}>{s.id === "stats" ? i * 25 + "+" : "◆"}</div>
                      <div style={{ width:26, height:3, borderRadius:2, background:border, marginTop:"0.2rem" }}/>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height:26, borderRadius:5, background:surface, border:`1px dashed ${border}` }}/>
              )}
            </div>
          ))}

          {/* Footer */}
          {hasFooter && (
            <div style={{ padding:"0.7rem 0.9rem", borderTop:`1px solid ${border}`, background:surface }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontFamily:fd, fontWeight:800, fontSize:"0.55rem", color:text }}>{brief.projectName || "Logo"}</div>
                <div style={{ fontSize:"0.45rem", color:muted }}>© {new Date().getFullYear()} {brief.companyName || brief.projectName || ""}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {note && (
        <div style={{ fontSize:"0.6rem", color:"#888", marginTop:"0.5rem", lineHeight:1.4 }}>
          {note}
        </div>
      )}
    </div>
  );
}
