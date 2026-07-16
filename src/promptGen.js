// ═══════════════════════════════════════════════════════════════
//  WebQuote — profesionálny prompt generátor v2
//  Vytvára ready-to-build zadanie pre AI web buildery (Claude, v0,
//  Lovable, Bolt...). Zásady:
//   · žiadne prázdne polia, pomlčky ani placeholder odpad — čo
//     klient nevyplnil, sa v prompte vôbec neobjaví
//   · surové texty klienta sa neposielajú ako finálna kópia — sú
//     označené ako "client input" s inštrukciou preformulovať ich
//     do profesionálnej podoby
//   · zo štruktúrovaných dát sa syntetizuje súvislý business
//     context v angličtine, aby AI chápala zámer, nie len polia
// ═══════════════════════════════════════════════════════════════

import { getIndustryExtras } from "./industryData.js";

const HERO_STYLES = {
  minimal:"Minimalist — generous whitespace, oversized typography, single focal CTA",
  "3d":"Advanced 3D — WebGL/CSS 3D elements, depth, parallax",
  modern:"Modern — bold gradients, glassmorphism accents, motion on scroll",
  info:"Informational — headline + concise value props + supporting visual",
  sales:"Sales-driven — benefit-led headline, urgency, social proof near CTA",
};
const HERO_MEDIA = {
  none:"No media — typographic hero", image:"Hero image", video:"Background video",
  "3dscene":"Interactive 3D scene", carousel:"Image carousel", custom:"Custom visual (see reference link)",
};

// Mapovanie jazykov briefu (SK názvy) na anglické názvy pre prompt
const LANG_EN = {
  "Slovenčina":"Slovak","Čeština":"Czech","Angličtina":"English","Nemčina":"German",
  "Maďarčina":"Hungarian","Poľština":"Polish","Francúzština":"French","Španielčina":"Spanish",
  "Taliančina":"Italian","Ruština":"Russian","Ukrajinčina":"Ukrainian","Rumunčina":"Romanian",
  "Portugalčina":"Portuguese","Japončina":"Japanese","Mandarínska čínština":"Mandarin Chinese",
  "Hindčina":"Hindi","Bengálčina":"Bengali","Urdčina":"Urdu","Štandardná arabčina":"Arabic",
};

// EN názvy skupín odvetví (subs zostávajú v pôvodnom jazyku ako kontext)
const INDUSTRY_EN = {
  automotive:"Automotive", creative:"Creative & Arts", ecommerce:"E-commerce",
  education:"Education", finance:"Finance & Investments", gastro:"Food & Dining",
  health:"Health & Medical", manufacturing:"Manufacturing & Industry",
  nonprofit:"Non-profit", pets:"Pets & Animals", public:"Public Sector",
  realty:"Real Estate & Construction", services:"Professional Services (B2B/B2C)",
  sportoutdoor:"Sport & Outdoor", tech:"Technology & SaaS",
  travel:"Travel & Hospitality", wellness:"Wellness & Beauty",
};

// Typy podkladov (assets) — EN popis pre prompt
const ASSET_TYPE_EN = {
  photos:"Photos / gallery images",
  logo:"Logo files",
  brand:"Brand manual / visual identity",
  texts:"Copy / text documents",
  video:"Video files",
  archive:"File archive (ZIP with mixed assets)",
  other:"Other assets",
};

// ── Text helpers — čistenie a normalizácia klientskych vstupov ──
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

// Prvé písmeno veľké + ukončovacia interpunkcia (na súvislé vety)
const sentence = (s) => {
  const t = clean(s);
  if (!t) return "";
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(cap) ? cap : cap + ".";
};

// Viacriadkový klientsky text — len orezanie, zachová odseky
const block = (s) => (s || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

const isHex = (v) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v || "");
const isUrl = (v) => /^(https?:\/\/|www\.)/i.test(clean(v));
const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v));

export function generateProPrompt(b, cat) {
  const { SECTIONS, WEB_TYPES, INDUSTRIES, HOSTING_OPTIONS, CMS_OPTIONS, INTEGRATION_OPTIONS, ADDRESS_TYPES } = cat;

  const typeLabel = WEB_TYPES.find(t => t.id === b.webType)?.label || b.webType;
  const industry  = INDUSTRIES.find(i => i.id === b.industry);
  const industryEn = INDUSTRY_EN[b.industry] || industry?.label || "";
  const subcat    = industry?.subs?.find(s => s.id === b.industrySubcat);

  // Jazyk obsahu webu: prvý zvolený jazyk briefu, inak jazyk UI
  const contentLangs = (b.techLanguages || []).map(l => LANG_EN[l] || l);
  const uiLangName = { sk:"Slovak", en:"English", cs:"Czech", de:"German" }[b.lang || "sk"];
  const primaryLang = contentLangs[0] || uiLangName;

  // Odvetvové extra výbery (napr. oblasti práva) — EN varianty
  const extras = getIndustryExtras(b.industry, b.industrySubcat);
  const chosenExtras = (extras ? (b.industryExtras || [])
    .map(id => extras.options.find(o => o.id === id))
    .filter(Boolean)
    .map(o => o.en || o.label) : []);

  // ── SYNTETIZOVANÝ BUSINESS CONTEXT (súvislá próza z polí) ──
  const bizName = clean(b.companyName) || clean(b.projectName);
  const ctxParts = [];
  if (bizName) {
    let intro = `${bizName} is a business in the ${industryEn || "—"} sector`;
    if (subcat) intro += ` (${subcat.label}${subcat.desc ? ` — ${subcat.desc}` : ""})`;
    const city = (b.addresses || []).map(a => clean(a.city)).find(Boolean);
    if (city) intro += `, based in ${city}`;
    ctxParts.push(intro + ".");
  } else if (industryEn) {
    ctxParts.push(`The client operates in the ${industryEn} sector${subcat ? ` (${subcat.label})` : ""}.`);
  }
  if (chosenExtras.length) ctxParts.push(`Core offering to feature prominently: ${chosenExtras.join("; ")}.`);
  if (clean(b.goal))       ctxParts.push(`The primary goal of the website is: ${sentence(b.goal)}`);
  if (clean(b.audience))   ctxParts.push(`Target audience: ${sentence(b.audience)}`);
  if (clean(b.tone))       ctxParts.push(`Desired brand tone and feel: ${sentence(b.tone)}`);
  if (!clean(b.goal))      ctxParts.push("The primary goal is to generate enquiries and build trust.");
  const bizContext = ctxParts.join(" ");

  // ── Firemné identity riadky — len vyplnené ──
  const identityLines = [];
  if (clean(b.companyName)) {
    const regs = [
      clean(b.ico)   && `Reg. no (IČO): ${clean(b.ico)}`,
      clean(b.dic)   && `Tax ID (DIČ): ${clean(b.dic)}`,
      clean(b.icdph) && `VAT (IČ DPH): ${clean(b.icdph)}`,
    ].filter(Boolean).join(" · ");
    identityLines.push(`- **Legal name:** ${clean(b.companyName)}${regs ? ` · ${regs}` : ""}`);
  }
  const contactBits = [
    clean(b.phone) && `Phone: ${clean(b.phone)}`,
    looksLikeEmail(b.email) && `Email: ${clean(b.email)}`,
    clean(b.web) && `Current website: ${clean(b.web)}`,
  ].filter(Boolean).join(" · ");
  if (contactBits) identityLines.push(`- **Contact:** ${contactBits}`);
  (b.addresses || []).forEach(a => {
    const full = [a.street, a.zip, a.city, a.country].map(clean).filter(Boolean).join(", ");
    if (!full) return;
    const t = ADDRESS_TYPES.find(at => at.id === a.type)?.label || a.type;
    identityLines.push(`- **${t}:** ${full}`);
  });

  // ── Sekcie — spec s poznámkami klienta označenými na prepis ──
  const sectionSpecs = (b.sections || []).map((id, i) => {
    const s = SECTIONS.find(x => x.id === id);
    if (!s) return null;
    const note = block((b.sectionNotes || {})[id]);
    return `${i + 1}. **${s.label}** (\`#${id}\`) — ${s.desc}${note ? `\n   - Client input for this section (informal, rewrite professionally): "${note}"` : ""}`;
  }).filter(Boolean).join("\n");

  // ── Podklady (linky na súbory) ──
  const assetLines = (b.assets || [])
    .filter(a => clean(a.url) || clean(a.note))
    .map(a => {
      const t = ASSET_TYPE_EN[a.type] || "Assets";
      const url = clean(a.url);
      const note = clean(a.note);
      return `- **${t}:**${url ? ` ${url}` : ""}${note ? ` — ${sentence(note)}` : ""}`;
    });

  // ── Integrácie / CMS / hosting / domény — len ak zvolené ──
  const integrations = (b.techIntegrations || [])
    .map(id => INTEGRATION_OPTIONS.find(x => x.id === id)?.label || id);
  const ctaLabels = (b.heroCtas || [])
    .filter(id => id === "contactus" || (b.sections || []).includes(id))
    .map(id => id === "contactus"
      ? "Contact us (direct contact CTA — scroll to contact section or open contact page)"
      : (SECTIONS.find(s => s.id === id)?.label || id));
  const domains = (b.domains || []).map(clean).filter(Boolean);

  // ── Brand tokeny — len validné hex hodnoty, inak fallback ──
  const br = b.brand || {};
  const tok = (v, fb) => (isHex(v) ? v : fb);

  // ═════════ SKLADANIE PROMPTU — sekcie sa číslujú dynamicky ═════════
  let n = 0;
  const H = (title) => `\n## ${++n} · ${title}\n`;
  const parts = [];

  parts.push(`# Website Build Specification — ${clean(b.projectName) || bizName || "New project"}

You are a senior front-end engineer and art-director-level web designer. Build a complete, production-ready website exactly to this specification.

Ground rules:
- Do not ask follow-up questions. Where a detail is missing, make the strongest professional choice consistent with the business context below.
- Any text marked as "client input" is raw, informal wording from the client. NEVER copy it verbatim into the website. Extract the intent and rewrite it as polished, professional, conversion-oriented copy in the website's language.
- Ignore nothing in this spec; everything listed was explicitly requested by the client.`);

  // 1 · Overview
  parts.push(H("Project overview"));
  const ov = [];
  ov.push(`- **Website type:** ${typeLabel}`);
  ov.push(`- **Structure:** ${b.pageStructure === "onepage"
    ? "One-page (anchor navigation between sections)"
    : `Multi-page${clean(b.subpages) ? ` — planned subpages: ${clean(b.subpages)}` : ""}`}`);
  if (industryEn) ov.push(`- **Industry:** ${industryEn}${subcat ? ` → ${subcat.label}` : ""}`);
  if (clean(b.industryNote)) ov.push(`- **Industry specifics (client input, rewrite professionally):** "${clean(b.industryNote)}"`);
  ov.push(`\n**Business context:** ${bizContext}`);
  parts.push(ov.join("\n"));

  // 2 · Identity — len ak niečo je
  if (identityLines.length) {
    parts.push(H("Business identity (use in footer, contact section & structured data)"));
    parts.push(identityLines.join("\n"));
  }

  // 2b · Právne dokumenty — súhlas so spracovaním údajov + cookies policy vo footri
  parts.push(H("Legal pages (GDPR consent & Cookies policy)"));
  parts.push(`- Instead of a generic GDPR page, create a **"Súhlas so spracovaním osobných údajov / Podmienky ochrany súkromia"** page (consent-style privacy policy). The full Slovak text is prepared by the agency (WebQuote → Nástroje → "Súhlas — os. údaje") and will be supplied — create the page at \`/gdpr\` (or \`/ochrana-osobnych-udajov\`) and render the supplied markdown/text with proper headings.
- Create a **"Pravidlá používania súborov cookies (Cookies policy)"** page at \`/cookies\` — text likewise supplied (WebQuote → Nástroje → "Cookies policy").
- Both documents are pre-filled with the company identity above (name, registered office, IČO, contact e-mail) — keep those details in sync with the footer and contact section.
- **Footer must contain links to both pages**: "Ochrana osobných údajov" → /gdpr and "Cookies" → /cookies, plus a "Nastavenia cookies" link/button that re-opens the cookie-consent banner.`);

  // 3 · Popis od klienta — transformačná inštrukcia
  const desc = block(b.brief);
  const extraReq = block(b.extra);
  if (desc || extraReq) {
    parts.push(H("About the business — client's own description"));
    const dparts = [];
    if (desc) dparts.push(`The client described their business in their own words below. Treat this as the single most important source of intent. Rewrite and professionalise it — extract services, differentiators and selling points, and turn them into structured, benefit-driven website copy. Do not reproduce grammar mistakes, filler or informal phrasing.\n\n> ${desc.replace(/\n/g, "\n> ")}`);
    if (extraReq) dparts.push(`**Additional client requirements (apply them, professionally interpreted):**\n\n> ${extraReq.replace(/\n/g, "\n> ")}`);
    parts.push(dparts.join("\n\n"));
  }

  // 4 · Podklady
  if (assetLines.length) {
    parts.push(H("Client assets (linked files)"));
    parts.push(`The client provided the following materials via file-transfer links. Use them as the real content of the website (photos, logo, copy source material). Where an asset is an archive (ZIP), assume it contains the described materials.\n${assetLines.join("\n")}\n- Where linked assets cannot be embedded directly, use clearly named placeholders (e.g. \`assets/gallery-01.jpg\`) matching the described materials, so they can be swapped in 1:1 after download.`);
  }

  // 5 · Design system
  parts.push(H("Design system"));
  parts.push(`Use CSS custom properties with EXACTLY these tokens:
\`\`\`css
--bg: ${tok(br.bg, "#0F0F0F")};        /* page background */
--surface: ${tok(br.surface, "#161616")};   /* cards, panels */
--border: ${tok(br.border, "#242424")};
--text: ${tok(br.text, "#F0F0F0")};
--muted: ${tok(br.muted, "#666666")};
--primary: ${tok(br.primary, "#6366F1")};   /* CTAs, links, highlights */
--accent: ${tok(br.accent, "#EC4899")};
--font-display: '${clean(br.fontDisplay) || "Inter"}', sans-serif;  /* headings */
--font-body: '${clean(br.fontBody) || "Inter"}', sans-serif;        /* body copy */
\`\`\`
- **Color scheme:** ${{ light:"Light", dark:"Dark", system:"Follow system preference" }[b.colorTheme] || "Dark"}${b.themeToggle === "yes" ? " — provide a dark/light toggle persisted to localStorage" : " (fixed, no theme toggle)"}
- Load fonts from Google Fonts with \`display=swap\`; include fallback stacks.
- Spacing on a 4px base scale; consistent border-radius across components.
- Z-index scale: sticky 200 / modal 300 / toast 400.`);

  // 6 · Navigácia — len ak je nav sekcia
  if ((b.sections || []).includes("nav")) {
    parts.push(H("Navigation"));
    parts.push(`- Behaviour: ${b.navBehavior || "sticky"} · Background: ${b.navBackground || "solid"} · Layout: ${b.navLayout === "floating" ? "floating (nav sits BELOW the hero section; after scrolling past it, it docks/anchors to the top of the viewport)" : b.navLayout || "top"} · Logo position: ${b.navLogo || "left"}${b.navAlwaysHamburger ? " · Hamburger menu at ALL breakpoints" : ""}${b.navSocials ? " · Social icons in the nav bar" : ""}
- Smooth-scroll to sections with correct scroll-margin for the sticky header; highlight the active section link.`);
  }

  // 7 · Hero — len ak je hero sekcia
  if ((b.sections || []).includes("hero")) {
    parts.push(H("Hero"));
    const hero = [];
    hero.push(`- **Style:** ${HERO_STYLES[b.heroStyle] || HERO_STYLES.minimal}`);
    if (b.heroMedia && b.heroMedia !== "none") {
      hero.push(`- **Media:** ${HERO_MEDIA[b.heroMedia]}${isUrl(b.heroMediaUrl) ? ` — reference: ${clean(b.heroMediaUrl)}` : ""}`);
      if (b.heroMediaUpload && b.heroMediaUpload.name) {
        hero.push(`- **Reference image:** client uploaded "${b.heroMediaUpload.name}" — use it as the hero visual reference (delivered separately).`);
      }
      if (b.heroMedia === "carousel" && b.heroSlider) {
        const SLIDER_TYPES = {
          fade:"Fade / cross-dissolve transition between slides",
          slide:"Classic horizontal slide transition",
          coverflow:"3D coverflow effect (Apple-style)",
          kenburns:"Ken Burns — slow zoom & pan on each image",
          cube:"3D rotating cube transition",
          split:"Split transition — slide splits into halves",
          circle:"Circular reveal transition",
          cards:"Stacked cards transition",
        };
        hero.push(`- **Slider type:** ${SLIDER_TYPES[b.heroSlider] || b.heroSlider} — implement the hero carousel with exactly this transition style, autoplay ~4s, dot navigation, pause on manual interaction.`);
      }
    } else {
      hero.push(`- **Media:** ${HERO_MEDIA.none}`);
    }
    hero.push(clean(b.heroSeo)
      ? `- **H1 (SEO headline) — client's keyword phrase, polish the wording but keep the keywords:** "${clean(b.heroSeo)}"`
      : `- **H1 (SEO headline):** write a compelling, keyword-rich H1 in ${primaryLang} for this exact business.`);
    hero.push(ctaLabels.length
      ? `- **CTA buttons scroll to:** ${ctaLabels.join(", ")} (first = primary CTA)`
      : `- **CTA:** one primary CTA matching the site goal.`);
    parts.push(hero.join("\n"));
  }

  // 8 · Štruktúra sekcií
  parts.push(H(`Page structure — ${(b.sections || []).length} sections, in this exact order`));
  parts.push(sectionSpecs || "- Use a sensible default structure for this website type.");

  // 9 · Content rules
  parts.push(H("Content rules"));
  parts.push(`- **Write ALL website copy in ${primaryLang}.**${contentLangs.length > 1 ? ` Prepare the information architecture for these additional languages: ${contentLangs.slice(1).join(", ")} (include a language switcher).` : ""}
- Write realistic, specific, conversion-oriented copy for this exact business — NO Lorem Ipsum, no placeholder text, no "TODO".
- Derive concrete service/product names from the business context and focus areas above.
- Use plausible numbers, testimonials and FAQ answers consistent with the business (clearly plausible, no fabricated claims about real people).
- Images: ${assetLines.length ? "prefer the client's linked assets; otherwise" : "use"} https://picsum.photos or CSS-generated visuals as placeholders with descriptive alt text.`);

  // 10 · Technické požiadavky
  parts.push(H("Technical requirements"));
  const tech = [];
  tech.push(`- **Deliverable:** single-file React component (JSX), default export, inline styles or a single embedded <style> block using the CSS custom properties above. No Tailwind, no external UI libraries.`);
  tech.push(`- Mobile-first, fully responsive; primary breakpoint 768px (plus 1024px where needed). Test at 360px width.`);
  tech.push(`- Accessibility: semantic landmarks, skip-link, :focus-visible styles, aria-labels on icon buttons, WCAG AA contrast, prefers-reduced-motion support, 44px minimum touch targets.`);
  tech.push(`- Performance: lazy-load below-the-fold images, no layout shift (explicit aspect ratios), system font fallback while loading.`);
  tech.push(`- SEO: one H1 only, logical heading hierarchy, descriptive title + meta description in ${primaryLang}, Open Graph tags, JSON-LD (schema.org) for the business type.`);
  if (integrations.length) tech.push(`- **Integrations to wire up (stub with clear comments where API keys are needed):** ${integrations.join(", ")}.`);
  if (b.techCms && b.techCms !== "none") {
    const cmsLabel = CMS_OPTIONS.find(c => c.id === b.techCms)?.label || b.techCms;
    tech.push(`- **CMS:** content will later be managed via ${cmsLabel} — keep ALL copy in a single CONTENT object at the top of the file so it is easy to externalise.`);
  }
  if (b.techHosting) {
    const hostLabel = HOSTING_OPTIONS.find(h => h.id === b.techHosting)?.label || b.techHosting;
    tech.push(`- **Hosting target:** ${hostLabel}${clean(b.techHostingNote) ? ` (${clean(b.techHostingNote)})` : ""}.`);
  }
  if (domains.length) tech.push(`- **Domain:** ${domains.join(", ")} (${b.domainStatus === "have" ? "client owns it" : "to be registered"}).`);
  if (block(b.techNote)) tech.push(`- **Additional technical notes (client input, interpret professionally):** "${block(b.techNote)}"`);
  parts.push(tech.join("\n"));

  // 11 · Quality bar + output
  parts.push(H("Quality bar & output format"));
  parts.push(`- Every section fully implemented and visually polished — consistent vertical rhythm, aligned grids, hover/focus states on all interactive elements.
- Subtle scroll-reveal animations (respecting reduced motion), smooth micro-interactions on buttons and cards.
- The result must look like a bespoke agency build, not a template.
- Return ONE complete React JSX file. All sections implemented with final copy in ${primaryLang}. No TODO comments, no unfinished parts, no explanations outside the code.`);

  return parts.join("\n");
}
