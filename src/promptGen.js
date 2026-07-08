// ═══════════════════════════════════════════════════════════════
//  WebQuote — profesionálny prompt generátor
//  Vytvára ready-to-go zadanie pre AI web buildery (Claude, v0,
//  Lovable, Bolt...) — technická špecifikácia v angličtine,
//  obsah webu v jazyku klienta.
// ═══════════════════════════════════════════════════════════════

import { getIndustryExtras } from "./industryData.js";
import { extraLabel } from "./i18n.js";

const HERO_STYLES = {
  minimal:"Minimalist — generous whitespace, oversized typography, single focal CTA",
  "3d":"Advanced 3D — WebGL/CSS 3D elements, depth, parallax",
  modern:"Modern — bold gradients, glassmorphism accents, motion on scroll",
  info:"Informational — headline + concise value props + supporting visual",
  sales:"Sales-driven — benefit-led headline, urgency, social proof near CTA",
};
const HERO_MEDIA = {
  none:"No media — typographic hero", image:"Hero image", video:"Background video",
  "3dscene":"Interactive 3D scene", carousel:"Image carousel", custom:"Custom visual",
};

// Mapovanie jazykov briefu (SK názvy) na anglické názvy pre prompt
const LANG_EN = {
  "Slovenčina":"Slovak","Čeština":"Czech","Angličtina":"English","Nemčina":"German",
  "Maďarčina":"Hungarian","Poľština":"Polish","Francúzština":"French","Španielčina":"Spanish",
  "Taliančina":"Italian","Ruština":"Russian","Ukrajinčina":"Ukrainian","Rumunčina":"Romanian",
  "Portugalčina":"Portuguese","Japončina":"Japanese","Mandarínska čínština":"Mandarin Chinese",
  "Hindčina":"Hindi","Bengálčina":"Bengali","Urdčina":"Urdu","Štandardná arabčina":"Arabic",
};

export function generateProPrompt(b, cat) {
  const { SECTIONS, WEB_TYPES, INDUSTRIES, HOSTING_OPTIONS, CMS_OPTIONS, INTEGRATION_OPTIONS, ADDRESS_TYPES } = cat;

  const typeLabel = WEB_TYPES.find(t => t.id === b.webType)?.label || b.webType;
  const industry  = INDUSTRIES.find(i => i.id === b.industry);
  const subcat    = industry?.subs?.find(s => s.id === b.industrySubcat);

  // Jazyk obsahu webu: prvý zvolený jazyk briefu, inak jazyk UI
  const contentLangs = (b.techLanguages || []).map(l => LANG_EN[l] || l);
  const uiLangName = { sk:"Slovak", en:"English", cs:"Czech", de:"German" }[b.lang || "sk"];
  const primaryLang = contentLangs[0] || uiLangName;

  // Odvetvové extra výbery (napr. oblasti práva)
  const extras = getIndustryExtras(b.industry, b.industrySubcat);
  const chosenExtras = extras && (b.industryExtras || [])
    .map(id => extras.options.find(o => o.id === id))
    .filter(Boolean)
    .map(o => o.en || o.label);

  const addrLines = (b.addresses || [])
    .map(a => {
      const t = ADDRESS_TYPES.find(at => at.id === a.type)?.label || a.type;
      const full = [a.street, a.zip, a.city, a.country].filter(Boolean).join(", ");
      return full ? `- ${t}: ${full}` : null;
    })
    .filter(Boolean);

  const sectionSpecs = (b.sections || []).map((id, i) => {
    const s = SECTIONS.find(x => x.id === id);
    if (!s) return null;
    const note = (b.sectionNotes || {})[id];
    return `${i + 1}. **${s.label}** (\`#${id}\`) — ${s.desc}${note ? `\n   - Client note: ${note}` : ""}`;
  }).filter(Boolean).join("\n");

  const integrations = (b.techIntegrations || [])
    .map(id => INTEGRATION_OPTIONS.find(x => x.id === id)?.label || id);

  const ctaLabels = (b.heroCtas || [])
    .map(id => SECTIONS.find(s => s.id === id)?.label || id);

  return `# Website Build Specification — ${b.projectName || "Untitled project"}

You are a senior front-end engineer and art-director-level web designer. Build a complete, production-ready website exactly to this specification. Do not ask follow-up questions — where a detail is missing, make the strongest professional choice consistent with the brand and industry below.

## 1 · Project overview
- **Project:** ${b.projectName || "—"}
- **Website type:** ${typeLabel}
- **Structure:** ${b.pageStructure === "onepage" ? "One-page (anchor navigation)" : `Multi-page${b.subpages ? ` — subpages: ${b.subpages}` : ""}`}
- **Industry:** ${industry ? industry.label : "—"}${subcat ? ` → ${subcat.label} (${subcat.desc})` : ""}${b.industryNote ? `\n- **Industry specifics:** ${b.industryNote}` : ""}${chosenExtras && chosenExtras.length ? `\n- **Offered services / focus areas (feature these prominently):** ${chosenExtras.join("; ")}` : ""}
- **Primary goal:** ${b.goal || "Generate enquiries/conversions"}
- **Target audience:** ${b.audience || "—"}
- **Brand tone:** ${b.tone || "professional, clean, trustworthy"}

## 2 · Business identity (use in footer, contact & structured data)
- **Company:** ${b.companyName || "—"}${b.ico ? ` · Reg. no (IČO): ${b.ico}` : ""}${b.dic ? ` · Tax ID (DIČ): ${b.dic}` : ""}${b.icdph ? ` · VAT: ${b.icdph}` : ""}
- **Phone:** ${b.phone || "—"} · **Email:** ${b.email || "—"}${b.web ? ` · **Current site:** ${b.web}` : ""}
${addrLines.length ? addrLines.join("\n") : "- Address: —"}

## 3 · Project description (client's own words)
${b.brief || "—"}${b.extra ? `\n\n**Additional requirements:** ${b.extra}` : ""}

## 4 · Design system
Use CSS custom properties with EXACTLY these tokens:
\`\`\`css
--bg: ${b.brand.bg};        /* page background */
--surface: ${b.brand.surface};   /* cards, panels */
--border: ${b.brand.border};
--text: ${b.brand.text};
--muted: ${b.brand.muted};
--primary: ${b.brand.primary};   /* CTAs, links, highlights */
--accent: ${b.brand.accent};
--font-display: '${b.brand.fontDisplay}', sans-serif;  /* headings */
--font-body: '${b.brand.fontBody}', sans-serif;        /* body copy */
\`\`\`
- **Color scheme:** ${{ light:"Light", dark:"Dark", system:"Follow system preference" }[b.colorTheme] || "Dark"}${b.themeToggle === "yes" ? " + provide a dark/light toggle persisted to localStorage" : " (fixed, no toggle)"}
- Load fonts from Google Fonts with \`display=swap\`; include fallback stacks.
- Spacing on a 4px base scale; border-radius consistent across components.
- Z-index scale: sticky 200 / modal 300 / toast 400.

## 5 · Navigation
- Behaviour: ${b.navBehavior || "sticky"} · Background: ${b.navBackground || "solid"} · Layout: ${b.navLayout || "top"} · Logo: ${b.navLogo || "left"}${b.navAlwaysHamburger ? " · Always hamburger (all breakpoints)" : ""}${b.navSocials ? " · Social icons in nav" : ""}
- Smooth-scroll to sections with correct scroll-margin for the sticky header; highlight the active section link.

## 6 · Hero
${b.sections?.includes("hero") ? `- **Style:** ${HERO_STYLES[b.heroStyle] || b.heroStyle || "Minimalist"}
- **Media:** ${HERO_MEDIA[b.heroMedia] || "None"}${b.heroMediaUrl ? ` (${b.heroMediaUrl})` : ""}
- **H1 (SEO headline):** ${b.heroSeo || `Write a compelling, keyword-rich H1 for a ${industry?.label || ""} ${typeLabel.toLowerCase()} in ${primaryLang}`}
- **CTA buttons:** ${ctaLabels.length ? ctaLabels.join(", ") : "One primary CTA matching the site goal"}` : "- Hero section is not enabled."}

## 7 · Page structure — ${b.sections?.length || 0} sections, in this exact order
${sectionSpecs || "—"}

## 8 · Content rules
- **Write ALL website copy in ${primaryLang}.**${contentLangs.length > 1 ? ` Prepare the information architecture for these additional languages: ${contentLangs.slice(1).join(", ")} (include a language switcher).` : ""}
- Write realistic, specific, conversion-oriented copy for this exact business — NO Lorem Ipsum, no placeholder text, no "TODO".
- Derive concrete service/product names from the industry and focus areas listed above.
- Use real-sounding numbers, testimonials and FAQ answers consistent with the business (clearly plausible, not fabricated claims about real people).
- Images: use https://picsum.photos or CSS-generated visuals as placeholders with descriptive alt text.

## 9 · Technical requirements
- **Deliverable:** single-file React component (JSX), default export, inline styles or a single embedded <style> block with the CSS custom properties above. No Tailwind, no external UI libraries.
- Mobile-first, fully responsive; primary breakpoint 768px (plus 1024px where needed). Test at 360px width.
- Accessibility: semantic landmarks, skip-link, :focus-visible styles, aria-labels on icon buttons, WCAG AA contrast, prefers-reduced-motion support, 44px minimum touch targets.
- Performance: lazy-load below-the-fold images, no layout shift (explicit aspect ratios), system font fallback while loading.
- SEO: one H1 only, logical heading hierarchy, descriptive title + meta description in ${primaryLang}, Open Graph tags, JSON-LD (schema.org) for the business type.${integrations.length ? `\n- **Integrations to wire up (stub with clear comments where keys are needed):** ${integrations.join(", ")}` : ""}${b.techCms && b.techCms !== "none" ? `\n- **CMS:** content will later be managed via ${CMS_OPTIONS.find(c => c.id === b.techCms)?.label || b.techCms} — keep copy in a single CONTENT object at the top of the file so it is easy to externalise.` : ""}${b.techHosting ? `\n- **Hosting target:** ${HOSTING_OPTIONS.find(h => h.id === b.techHosting)?.label || b.techHosting}${b.techHostingNote ? ` (${b.techHostingNote})` : ""}` : ""}${b.domains && b.domains.filter(d => d.trim()).length ? `\n- **Domain:** ${b.domains.filter(d => d.trim()).join(", ")} (${b.domainStatus === "have" ? "client owns it" : "to be registered"})` : ""}

## 10 · Quality bar
- Every section fully implemented and visually polished — consistent vertical rhythm, aligned grids, hover/focus states on all interactive elements.
- Subtle scroll-reveal animations (respecting reduced motion), smooth micro-interactions on buttons and cards.
- The result must look like a bespoke agency build, not a template.

## 11 · Output format
Return ONE complete React JSX file. All sections implemented with final copy in ${primaryLang}. No TODO comments, no unfinished parts, no explanations outside the code.`;
}
