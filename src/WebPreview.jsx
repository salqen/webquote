// ═══════════════════════════════════════════════════════════════
//  WebQuote — Mini web preview
//  Jednoduchý vizuálny náhľad webu z briefu: brand farby + fonty
//  + poradie sekcií + VYBRANÉ FUNKCIE (hamburger, socials, carousel,
//  dark mode, jazyk, search, cookies, scroll-top, chatbot…).
//  Props:
//    fill   — vyplní rodiča na 100 % výšky (rámiky zariadení)
//    mobile — mobilné zobrazenie (bez browser bar, 1-stĺpcové gridy)
// ═══════════════════════════════════════════════════════════════

import { extraLabel } from "./i18n.js";
import { getIndustryExtras } from "./industryData.js";

// Sekcie, ktoré sa v náhľade kreslia „obsahovo" (karty/riadky)
const CARD_SECS = ["services","features","products","work","team","pricing","gallery","menu"];
const LINE_SECS = ["about","faq","blog","process","testimonials","reviews","events"];
const SKIP_SECS = ["cookies","scrolltop","404","maintenance","darkmode","loader","search","popup","language","nav","hero","footer","chatbot"];

const SLIDER_LABELS = {
  fade:"Fade", slide:"Slide", coverflow:"Coverflow", kenburns:"Ken Burns",
  cube:"Cube", split:"Split", circle:"Circle", cards:"Cards",
};

export default function MiniWebPreview({ brief, sections, note, fill=false, mobile=false }) {
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
  const navItems = secs.slice(0, mobile ? 0 : 4).map(s => s.label);
  const has = (id) => (brief.sections || []).includes(id);
  const hasHero = has("hero");
  const hasFooter = has("footer");

  // Vybrané funkcie z briefu — náhľad ich vizuálne zobrazí
  const hamburger  = mobile || !!brief.navAlwaysHamburger;
  const navSocials = !!brief.navSocials;
  const navLogoPos = brief.navLogo || "left";
  const darkToggle = has("darkmode");
  const langSwitch = has("language");
  const searchIcon = has("search");
  const cookieBar  = has("cookies");
  const scrollTop  = has("scrolltop");
  const chatBubble = has("chatbot");
  const heroMedia  = brief.heroMedia || "none";
  const sliderLbl  = SLIDER_LABELS[brief.heroSlider] || "";

  const extras = getIndustryExtras(brief.industry, brief.industrySubcat);
  const chosen = extras
    ? (brief.industryExtras || []).map(id => extras.options.find(o => o.id === id)).filter(Boolean)
    : [];

  const cardCols = mobile ? "1fr" : "1fr 1fr 1fr";

  const Card = ({ label }) => (
    <div style={{ background:surface, border:`1px solid ${border}`, borderRadius:6, padding:"0.5rem" }}>
      <div style={{ width:18, height:18, borderRadius:4, background:`${primary}33`, marginBottom:"0.35rem" }}/>
      <div style={{ fontSize:"0.5rem", fontWeight:700, color:text, fontFamily:fb, marginBottom:"0.2rem",
        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</div>
      <div style={{ height:3, borderRadius:2, background:border, marginBottom:"0.15rem" }}/>
      <div style={{ height:3, borderRadius:2, background:border, width:"70%" }}/>
    </div>
  );

  // Malé ikonky sociálnych sietí
  const SocialDots = () => (
    <span style={{ display:"inline-flex", gap:"0.25rem", alignItems:"center" }}>
      {["f","𝕏","in"].map(g => (
        <span key={g} style={{
          width:11, height:11, borderRadius:"50%", background:`${primary}28`,
          color:text, fontSize:"0.38rem", fontWeight:800,
          display:"inline-flex", alignItems:"center", justifyContent:"center",
        }}>{g}</span>
      ))}
    </span>
  );

  // Logo blok
  const Logo = () => (
    <div style={{ fontFamily:fd, fontWeight:800, fontSize:"0.62rem", color:text, whiteSpace:"nowrap" }}>
      {brief.projectName || "Logo"}
    </div>
  );

  // Pravá strana navigácie — funkčné ikony podľa briefu
  const NavIcons = () => (
    <div style={{ display:"flex", gap:"0.4rem", alignItems:"center" }}>
      {!hamburger && navItems.map((n, i) => (
        <span key={i} style={{ fontSize:"0.5rem", color:muted, whiteSpace:"nowrap" }}>{n}</span>
      ))}
      {navSocials && <SocialDots/>}
      {searchIcon && <span style={{ fontSize:"0.5rem", color:muted }}>🔍</span>}
      {langSwitch && (
        <span style={{ fontSize:"0.42rem", color:muted, border:`1px solid ${border}`,
          borderRadius:3, padding:"0.08rem 0.25rem", fontWeight:700 }}>SK ▾</span>
      )}
      {darkToggle && (
        <span style={{ fontSize:"0.42rem", background:surface, border:`1px solid ${border}`,
          borderRadius:8, padding:"0.08rem 0.28rem" }}>🌙</span>
      )}
      {!mobile && (
        <span style={{ fontSize:"0.5rem", fontWeight:700, color:"#fff", background:primary,
          padding:"0.15rem 0.45rem", borderRadius:4, whiteSpace:"nowrap" }}>Kontakt</span>
      )}
      {hamburger && (
        <span style={{ fontSize:"0.6rem", color:text, fontWeight:800, lineHeight:1 }}>☰</span>
      )}
    </div>
  );

  // Hero médium — vizuálne podľa výberu
  const HeroMediaViz = () => {
    if (heroMedia === "carousel") return (
      <div style={{ position:"relative", margin:"0.55rem auto 0", maxWidth:mobile?"92%":300 }}>
        <div style={{
          height:mobile?48:62, borderRadius:6, border:`1px solid ${border}`,
          background:`linear-gradient(120deg, ${primary}30, ${accent}25)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"0.5rem", color:muted, fontWeight:700, letterSpacing:"0.06em",
        }}>
          {sliderLbl ? `CAROUSEL · ${sliderLbl.toUpperCase()}` : "CAROUSEL"}
        </div>
        <span style={{ position:"absolute", left:5, top:"38%", color:text, fontSize:"0.55rem" }}>‹</span>
        <span style={{ position:"absolute", right:5, top:"38%", color:text, fontSize:"0.55rem" }}>›</span>
        <div style={{ display:"flex", gap:4, justifyContent:"center", marginTop:5 }}>
          <span style={{ width:10, height:3, borderRadius:2, background:primary }}/>
          <span style={{ width:3, height:3, borderRadius:"50%", background:border }}/>
          <span style={{ width:3, height:3, borderRadius:"50%", background:border }}/>
        </div>
      </div>
    );
    if (heroMedia === "video") return (
      <div style={{
        margin:"0.55rem auto 0", maxWidth:mobile?"92%":300, height:mobile?48:62,
        borderRadius:6, border:`1px solid ${border}`, background:`${surface}`,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <span style={{
          width:20, height:20, borderRadius:"50%", background:primary,
          display:"inline-flex", alignItems:"center", justifyContent:"center",
          color:"#fff", fontSize:"0.5rem",
        }}>▶</span>
      </div>
    );
    if (heroMedia === "image" || heroMedia === "custom") return (
      <div style={{
        margin:"0.55rem auto 0", maxWidth:mobile?"92%":300, height:mobile?48:62,
        borderRadius:6, border:`1px dashed ${border}`,
        background:`linear-gradient(160deg, ${primary}18, transparent)`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"0.62rem",
      }}>🖼</div>
    );
    if (heroMedia === "3dscene") return (
      <div style={{
        margin:"0.55rem auto 0", maxWidth:mobile?"92%":300, height:mobile?48:62,
        borderRadius:6, border:`1px solid ${border}`,
        background:`radial-gradient(circle at 60% 40%, ${accent}30, transparent 70%)`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"0.7rem",
      }}>🧊</div>
    );
    return null;
  };

  const pageInner = (
    <div style={{ background:bg, fontFamily:fb, position:"relative",
      ...(fill ? { height:"100%", overflowY:"auto" } : { maxHeight:520, overflowY:"auto" }) }}>
      {/* Nav — pozícia loga + funkčné ikony podľa briefu */}
      <div style={{
        display:"flex", alignItems:"center", gap:"0.5rem",
        justifyContent: navLogoPos==="center" ? "center" : "space-between",
        flexDirection: navLogoPos==="right" ? "row-reverse" : "row",
        padding: mobile ? "0.75rem 0.6rem 0.4rem" : "0.5rem 0.75rem",
        borderBottom:`1px solid ${border}`, position:"sticky", top:0, background:bg, zIndex:2,
      }}>
        {navLogoPos==="center" ? (
          <>
            <div style={{ position:"absolute", left:"0.6rem" }}>{hamburger && <span style={{ fontSize:"0.6rem", color:text, fontWeight:800 }}>☰</span>}</div>
            <Logo/>
            <div style={{ position:"absolute", right:"0.6rem", display:"flex", gap:"0.35rem", alignItems:"center" }}>
              {navSocials && <SocialDots/>}
              {darkToggle && <span style={{ fontSize:"0.42rem" }}>🌙</span>}
            </div>
          </>
        ) : (
          <>
            <Logo/>
            <NavIcons/>
          </>
        )}
      </div>

      {/* Hero */}
      {hasHero && (
        <div style={{ padding: mobile ? "1.1rem 0.7rem 1rem" : "1.4rem 0.9rem 1.2rem", textAlign:"center",
          background:`radial-gradient(ellipse at 50% 0%, ${primary}22, transparent 65%)` }}>
          <div style={{ fontFamily:fd, fontWeight:800, fontSize:mobile?"0.8rem":"0.95rem", lineHeight:1.2, color:text, marginBottom:"0.4rem" }}>
            {brief.heroSeo || brief.projectName || "Hlavný nadpis webu"}
          </div>
          <div style={{ fontSize:"0.55rem", color:muted, marginBottom:"0.65rem", maxWidth:280, marginInline:"auto", lineHeight:1.45 }}>
            {brief.goal || brief.tone || "Podnadpis — hodnota pre návštevníka v jednej vete."}
          </div>
          <div style={{ display:"flex", gap:"0.4rem", justifyContent:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:"0.55rem", fontWeight:700, color:"#fff", background:primary, padding:"0.28rem 0.7rem", borderRadius:5 }}>
              Primárne CTA
            </span>
            {!mobile && (
              <span style={{ fontSize:"0.55rem", fontWeight:600, color:text, border:`1px solid ${border}`, padding:"0.28rem 0.7rem", borderRadius:5 }}>
                Viac info
              </span>
            )}
          </div>
          <HeroMediaViz/>
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
            <div style={{ display:"grid", gridTemplateColumns:cardCols, gap:"0.4rem" }}>
              {chosen.slice(0, mobile ? 3 : 6).map(o => <Card key={o.id} label={extraLabel(o, brief.lang || "sk")} />)}
            </div>
          ) : CARD_SECS.includes(s.id) ? (
            <div style={{ display:"grid", gridTemplateColumns:cardCols, gap:"0.4rem" }}>
              <Card label="—" />{!mobile && <><Card label="—" /><Card label="—" /></>}
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
            <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:"0.4rem" }}>
              <div style={{ height:14, borderRadius:4, background:surface, border:`1px solid ${border}` }}/>
              <div style={{ height:14, borderRadius:4, background:surface, border:`1px solid ${border}` }}/>
              <div style={{ gridColumn:"1 / -1", height:22, borderRadius:4, background:surface, border:`1px solid ${border}` }}/>
              <div style={{ width:64, height:12, borderRadius:4, background:primary }}/>
            </div>
          ) : (s.id === "stats" || s.id === "logos") ? (
            <div style={{ display:"flex", gap:"0.6rem", justifyContent:"space-around" }}>
              {(mobile?[1,2,3]:[1,2,3,4]).map(i => (
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
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"0.5rem" }}>
            <div style={{ fontFamily:fd, fontWeight:800, fontSize:"0.55rem", color:text }}>{brief.projectName || "Logo"}</div>
            {navSocials && <SocialDots/>}
            <div style={{ fontSize:"0.45rem", color:muted }}>© {new Date().getFullYear()} {brief.companyName || brief.projectName || ""}</div>
          </div>
        </div>
      )}

      {/* Plávajúce prvky — scroll-top a chatbot */}
      {(scrollTop || chatBubble) && (
        <div style={{ position:"sticky", bottom:6, zIndex:3,
          display:"flex", justifyContent:"flex-end", gap:"0.3rem", paddingRight:"0.5rem" }}>
          {chatBubble && (
            <span style={{ width:18, height:18, borderRadius:"50%", background:accent,
              display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:"0.45rem" }}>💬</span>
          )}
          {scrollTop && (
            <span style={{ width:18, height:18, borderRadius:"50%", background:primary, color:"#fff",
              display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:"0.5rem", fontWeight:800 }}>↑</span>
          )}
        </div>
      )}

      {/* Cookie banner — ak je vybraná sekcia cookies */}
      {cookieBar && (
        <div style={{
          position:"sticky", bottom:0, zIndex:4,
          display:"flex", alignItems:"center", gap:"0.4rem",
          background:surface, borderTop:`1px solid ${border}`,
          padding:"0.35rem 0.6rem",
        }}>
          <span style={{ fontSize:"0.48rem" }}>🍪</span>
          <span style={{ fontSize:"0.42rem", color:muted, flex:1 }}>Táto stránka používa cookies…</span>
          <span style={{ fontSize:"0.42rem", fontWeight:700, color:"#fff", background:primary, borderRadius:3, padding:"0.1rem 0.3rem" }}>OK</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={fill ? { height:"100%", display:"flex", flexDirection:"column" } : undefined}>
      {/* Browser frame — nie v mobilnom rámiku */}
      <div style={{
        borderRadius: fill ? 0 : 10, overflow:"hidden",
        border: fill ? "none" : `1px solid ${border}`,
        boxShadow: fill ? "none" : "0 8px 32px rgba(0,0,0,0.35)",
        ...(fill ? { flex:1, display:"flex", flexDirection:"column", minHeight:0 } : {}),
      }}>
        {!mobile && (
          <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", padding:"0.4rem 0.6rem", background:"#1a1b1e", borderBottom:"1px solid #2a2b2e", flexShrink:0 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#ff5f57" }}/>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#ffbd2e" }}/>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#28c840" }}/>
            <div style={{ flex:1, marginLeft:"0.5rem", background:"#0f1012", borderRadius:5, padding:"0.15rem 0.5rem",
              fontSize:"0.52rem", color:"#777", fontFamily:"monospace", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {(brief.domains && brief.domains.find(d => d.trim())) || "www." + (brief.projectName || "projekt").toLowerCase().replace(/[^a-z0-9]+/g, "") + ".sk"}
            </div>
          </div>
        )}
        {fill ? <div style={{ flex:1, minHeight:0 }}>{pageInner}</div> : pageInner}
      </div>

      {note && (
        <div style={{ fontSize:"0.6rem", color:"#888", marginTop:"0.5rem", lineHeight:1.4 }}>
          {note}
        </div>
      )}
    </div>
  );
}
// EOF
