// ═══════════════════════════════════════════════════════════════
//  WebQuote — i18n
//  Jazyky UI: SK (zdroj), EN, CS, DE. Lokalizuje dátové zdroje
//  (sekcie, accordion, odvetvia, typy webu) + chrome UI reťazce.
// ═══════════════════════════════════════════════════════════════

export const LANGS = [
  { id:"sk", label:"Slovenčina", flag:"🇸🇰" },
  { id:"en", label:"English",    flag:"🇬🇧" },
  { id:"cs", label:"Čeština",    flag:"🇨🇿" },
  { id:"de", label:"Deutsch",    flag:"🇩🇪" },
];

// ── SEKCIE — label + desc ────────────────────────────────────
const SEC = {
  nav:          { en:["Navigation","Main menu with logo, mobile hamburger, sticky on scroll."], cs:["Navigace","Hlavní menu s logem, hamburger pro mobil, sticky efekt."], de:["Navigation","Hauptmenü mit Logo, Hamburger für Mobil, Sticky-Effekt."] },
  hero:         { en:["Hero","The first thing visitors see — big headline, subtitle, primary CTA and visual."], cs:["Hero","První věc, kterou návštěvník vidí — velký titulek, podtitulek, CTA a vizuál."], de:["Hero","Das Erste, was Besucher sehen — große Headline, Untertitel, CTA und Visual."] },
  footer:       { en:["Footer","Bottom of the page with links, contacts, social media and copyright."], cs:["Patička","Spodní část stránky s odkazy, kontakty a copyrightem."], de:["Footer","Unterer Bereich mit Links, Kontakten, Social Media und Copyright."] },
  about:        { en:["About us","Company story, mission and values. People buy from people."], cs:["O nás","Příběh firmy, mise a hodnoty. Lidé nakupují od lidí."], de:["Über uns","Firmengeschichte, Mission und Werte."] },
  services:     { en:["Services","Overview of services in cards or a list with descriptions and links."], cs:["Služby","Přehled služeb v kartách nebo seznamu s popisem."], de:["Leistungen","Übersicht der Leistungen in Karten oder Liste."] },
  features:     { en:["Features / Benefits","Grid of 3–6 benefits. Answers 'why us?'."], cs:["Features / Výhody","Grid 3–6 výhod. Odpovídá na otázku 'proč právě my?'."], de:["Features / Vorteile","Raster mit 3–6 Vorteilen. Beantwortet 'Warum wir?'."] },
  products:     { en:["Products","Filterable product grid with photo, price, variants and cart button."], cs:["Produkty","Filtrovatelný grid produktů s fotkou, cenou a košíkem."], de:["Produkte","Filterbares Produktraster mit Foto, Preis und Warenkorb."] },
  menu:         { en:["Menu (food)","Food & drinks menu with categories, allergens and prices."], cs:["Jídelní lístek","Menu s kategoriemi, alergeny a cenami."], de:["Speisekarte","Speisen & Getränke mit Kategorien, Allergenen und Preisen."] },
  gallery:      { en:["Gallery / Portfolio","Masonry or grid gallery with lightbox."], cs:["Galerie / Portfolio","Masonry nebo grid galerie s lightboxem."], de:["Galerie / Portfolio","Masonry- oder Grid-Galerie mit Lightbox."] },
  work:         { en:["Case studies","Detailed project case studies with results and process."], cs:["Case studies","Detailní případové studie projektů s výsledky."], de:["Case Studies","Detaillierte Fallstudien mit Ergebnissen."] },
  team:         { en:["Team","Team member photos and bios — name, role, socials."], cs:["Tým","Fotky a bio členů týmu — jméno, pozice, sítě."], de:["Team","Fotos und Kurzprofile des Teams."] },
  process:      { en:["How it works","Steps of the process — numbered timeline that lowers the entry barrier."], cs:["Jak to funguje","Kroky spolupráce — číslovaná timeline."], de:["So funktioniert's","Prozessschritte als nummerierte Timeline."] },
  pricing:      { en:["Pricing","Comparison table of plans/packages with a highlighted option."], cs:["Ceník","Srovnávací tabulka plánů/balíčků."], de:["Preise","Vergleichstabelle der Pakete mit Empfehlung."] },
  faq:          { en:["FAQ","Accordion with common questions — builds trust, reduces support."], cs:["FAQ","Accordion s nejčastějšími dotazy — buduje důvěru."], de:["FAQ","Häufige Fragen als Akkordeon — schafft Vertrauen."] },
  blog:         { en:["Blog / News","Article grid with image, date, category and excerpt."], cs:["Blog / Novinky","Grid článků s obrázkem, datem a výňatkem."], de:["Blog / News","Artikelraster mit Bild, Datum und Auszug."] },
  events:       { en:["Events / Programme","Calendar or list of upcoming events with tickets."], cs:["Eventy / Program","Kalendář nebo seznam akcí se vstupenkami."], de:["Events / Programm","Kalender oder Liste kommender Veranstaltungen."] },
  map:          { en:["Map / Locations","Interactive map with locations, hours and directions."], cs:["Mapa / Pobočky","Interaktivní mapa s pobočkami a hodinami."], de:["Karte / Standorte","Interaktive Karte mit Standorten und Zeiten."] },
  openinghours: { en:["Opening hours","Clear table of opening hours incl. holidays."], cs:["Otevírací doba","Přehledná tabulka otevírací doby vč. svátků."], de:["Öffnungszeiten","Übersichtliche Tabelle inkl. Feiertage."] },
  awards:       { en:["Awards / Certificates","Awards, certificates and media mentions — builds authority."], cs:["Ocenění / Certifikáty","Ocenění a certifikáty — buduje autoritu."], de:["Auszeichnungen","Preise, Zertifikate und Presse — schafft Autorität."] },
  partners:     { en:["Partners","Logos or cards of partner companies."], cs:["Partneři","Loga nebo karty partnerských firem."], de:["Partner","Logos oder Karten von Partnerfirmen."] },
  testimonials: { en:["Testimonials","Carousel or grid of client quotes with names and stars."], cs:["Reference","Carousel nebo grid citací spokojených klientů."], de:["Referenzen","Karussell oder Raster mit Kundenstimmen."] },
  reviews:      { en:["Google / Reviews","Embedded Google or Trustpilot reviews with rating."], cs:["Google / Recenze","Embed Google recenzí nebo Trustpilotu."], de:["Google / Bewertungen","Eingebettete Google- oder Trustpilot-Bewertungen."] },
  logos:        { en:["Client logos","Scrolling strip with client logos — instant credibility."], cs:["Klienti — loga","Scrolling pás s logy klientů."], de:["Kundenlogos","Laufband mit Kundenlogos — sofortige Glaubwürdigkeit."] },
  stats:        { en:["Numbers / Stats","Big animated numbers — years, clients, projects."], cs:["Čísla / Statistiky","Velká animovaná čísla — roky, klienti, projekty."], de:["Zahlen / Statistiken","Große animierte Zahlen — Jahre, Kunden, Projekte."] },
  press:        { en:["Press / Media","Media logos where the company appeared + quotes."], cs:["Média / Press","Loga médií + krátká citace nebo odkaz."], de:["Presse / Medien","Medienlogos + kurzes Zitat oder Link."] },
  ugc:          { en:["UGC / Instagram","Customer photo grid from Instagram/TikTok — live social proof."], cs:["UGC / Instagram","Grid zákaznických fotek z IG/TikToku."], de:["UGC / Instagram","Kundenfotos von Instagram/TikTok — Social Proof."] },
  cta:          { en:["CTA section","Full-width banner with a clear final call to action."], cs:["CTA sekce","Full-width banner se závěrečnou výzvou k akci."], de:["CTA-Bereich","Banner mit klarem Call-to-Action."] },
  contact:      { en:["Contact","Contact form, map, address, phone, email, socials."], cs:["Kontakt","Kontaktní formulář, mapa, adresa, telefon, e-mail."], de:["Kontakt","Kontaktformular, Karte, Adresse, Telefon, E-Mail."] },
  booking:      { en:["Booking","Inline booking widget or Calendly integration."], cs:["Rezervace","Inline booking widget nebo Calendly."], de:["Buchung","Buchungswidget oder Calendly-Integration."] },
  newsletter:   { en:["Newsletter","Email capture with a value offer (discount, ebook, news)."], cs:["Newsletter","Sběr e-mailů s hodnotovou nabídkou."], de:["Newsletter","E-Mail-Erfassung mit Mehrwertangebot."] },
  leadform:     { en:["Lead form","Extended enquiry form with service-specific fields."], cs:["Poptávkový formulář","Rozšířený formulář se specifickými poli."], de:["Anfrageformular","Erweitertes Formular mit spezifischen Feldern."] },
  calculator:   { en:["Calculator","Interactive price or ROI calculator — top converting section."], cs:["Kalkulačka","Interaktivní kalkulačka ceny nebo ROI."], de:["Rechner","Interaktiver Preis- oder ROI-Rechner."] },
  quiz:         { en:["Quiz / Configurator","Interactive quiz recommending a product/package."], cs:["Quiz / Konfigurátor","Interaktivní quiz doporučující produkt."], de:["Quiz / Konfigurator","Interaktives Quiz mit Produktempfehlung."] },
  popup:        { en:["Popup / Modal","Exit-intent or timed popup with an offer or notice."], cs:["Popup / Modal","Exit-intent nebo časovaný popup."], de:["Popup / Modal","Exit-Intent- oder zeitgesteuertes Popup."] },
  cookies:      { en:["Cookie banner","GDPR-compliant cookie banner with category consent."], cs:["Cookie lišta","GDPR cookie lišta s kategoriemi souhlasu."], de:["Cookie-Banner","DSGVO-konformer Cookie-Banner."] },
  scrolltop:    { en:["Scroll to top","Floating back-to-top button appearing after scroll."], cs:["Scroll nahoru","Plovoucí tlačítko návratu nahoru."], de:["Nach oben","Schwebender Zurück-nach-oben-Button."] },
  "404":        { en:["404 page","Custom error page with a link home."], cs:["404 stránka","Vlastní chybová stránka s odkazem domů."], de:["404-Seite","Individuelle Fehlerseite mit Link zur Startseite."] },
  maintenance:  { en:["Maintenance page","Maintenance page with countdown or contact."], cs:["Stránka údržby","Stránka údržby s odpočtem nebo kontaktem."], de:["Wartungsseite","Wartungsseite mit Countdown oder Kontakt."] },
  darkmode:     { en:["Dark / Light mode","Theme toggle saved to localStorage."], cs:["Dark / Light mode","Přepínač témat s uložením do localStorage."], de:["Dark / Light Mode","Theme-Umschalter mit Speicherung."] },
  loader:       { en:["Page loader","Animated loading screen — a brand moment."], cs:["Page loader","Animovaná loading obrazovka."], de:["Page Loader","Animierter Ladebildschirm."] },
  search:       { en:["Search","Search overlay or inline search with live results."], cs:["Vyhledávání","Vyhledávací overlay s výsledky v reálném čase."], de:["Suche","Such-Overlay mit Echtzeit-Ergebnissen."] },
  language:     { en:["Language switcher","Language switcher in the navigation — for international sites."], cs:["Přepínač jazyků","Přepínač jazyků v navigaci."], de:["Sprachumschalter","Sprachumschalter in der Navigation."] },
};

// ── ACCORDION — hlavné menu ──────────────────────────────────
const ACC = {
  info:    { en:"Basic data",       cs:"Základní údaje",  de:"Grunddaten" },
  brand:   { en:"Design",           cs:"Design",          de:"Design" },
  brief:   { en:"Brief & copy",     cs:"Zadání a texty",  de:"Briefing & Texte" },
  content: { en:"Site content",     cs:"Obsah webu",      de:"Website-Inhalt" },
  assets:  { en:"Assets & files",   cs:"Podklady a soubory", de:"Materialien & Dateien" },
  tech:    { en:"Technical details",cs:"Technické detaily",  de:"Technische Details" },
};
const ACC_SUB = {
  "info-industry":  { en:"Industry",          cs:"Odvětví",          de:"Branche" },
  "info-project":   { en:"Project",           cs:"Projekt",          de:"Projekt" },
  "info-company":   { en:"Company details",   cs:"Firemní údaje",    de:"Firmendaten" },
  "info-address":   { en:"Addresses",         cs:"Adresy",           de:"Adressen" },
  "info-details":   { en:"Project details",   cs:"Detaily projektu", de:"Projektdetails" },
  "info-hours":     { en:"Opening hours",      cs:"Otevírací doba",   de:"Öffnungszeiten" },
  "info-socials":   { en:"Social media",       cs:"Sociální sítě",    de:"Social Media" },
  "content-integrations": { en:"Integrations & tools", cs:"Integrace a nástroje", de:"Integrationen & Tools" },
  "assets-files":   { en:"Links to assets",   cs:"Odkazy na podklady", de:"Links zu Materialien" },
  "brand-logo":     { en:"Logo",              cs:"Logo",             de:"Logo" },
  "brand-preset":   { en:"Presets",           cs:"Presety",          de:"Presets" },
  "brand-colors":   { en:"Colors",            cs:"Barvy",            de:"Farben" },
  "brand-fonts":    { en:"Typography",        cs:"Typografie",       de:"Typografie" },
  "brief-type":     { en:"Website type",      cs:"Typ webu",         de:"Website-Typ" },
  "brief-structure":{ en:"Page structure",    cs:"Struktura stránky",de:"Seitenstruktur" },
  "brief-nav":      { en:"Theme",             cs:"Téma",             de:"Theme" },
  "brief-goal":     { en:"Goal & audience",   cs:"Cíl a publikum",   de:"Ziel & Zielgruppe" },
  "brief-desc":     { en:"Project description",cs:"Popis projektu",  de:"Projektbeschreibung" },
  "content-core":   { en:"Core",              cs:"Základ",           de:"Basis" },
  "content-content":{ en:"Content",           cs:"Obsah",            de:"Inhalt" },
  "content-social": { en:"Social proof",      cs:"Social proof",     de:"Social Proof" },
  "content-convert":{ en:"Conversion",        cs:"Konverze",         de:"Konversion" },
  "content-extra":  { en:"Extra",             cs:"Extra",            de:"Extra" },
};

// ── TYPY WEBU ────────────────────────────────────────────────
const WT = {
  landing:   { en:["Landing","One goal, one page"],        cs:["Landing","Jeden cíl, jedna stránka"],      de:["Landing","Ein Ziel, eine Seite"] },
  corporate: { en:["Corporate","Multiple sections, about, contact"], cs:["Firemní","Více sekcí, o nás, kontakt"], de:["Firmenweb","Mehrere Bereiche, Über uns, Kontakt"] },
  ecommerce: { en:["E-shop","Products, cart, checkout"],   cs:["E-shop","Produkty, košík, checkout"],      de:["E-Shop","Produkte, Warenkorb, Checkout"] },
  portfolio: { en:["Portfolio","Showcase of work"],        cs:["Portfolio","Ukázka prací"],                de:["Portfolio","Arbeitsproben"] },
};

// ── ODVETVIA — skupinové labely (subs EN cez industryData.en) ─
const IND = {
  agro:          { en:"Agriculture & Food",     cs:"Zemědělství & Potraviny", de:"Landwirtschaft & Lebensmittel" },
  automotive:    { en:"Automotive",             cs:"Automotive",            de:"Automotive" },
  crafts:        { en:"Trades & Home Services", cs:"Řemesla & Domácí služby", de:"Handwerk & Hausservice" },
  media:         { en:"Media & Entertainment",  cs:"Média & Zábava",        de:"Medien & Unterhaltung" },
  creative:      { en:"Creative & Arts",        cs:"Kreativa & Umění",      de:"Kreativ & Kunst" },
  ecommerce:     { en:"E-commerce",             cs:"E-commerce",            de:"E-Commerce" },
  education:     { en:"Education",              cs:"Vzdělávání",            de:"Bildung" },
  finance:       { en:"Finance & Investments",  cs:"Finance & Investice",   de:"Finanzen & Investment" },
  gastro:        { en:"Food & Dining",          cs:"Gastro",                de:"Gastronomie" },
  health:        { en:"Health & Medical",       cs:"Zdraví",                de:"Gesundheit" },
  manufacturing: { en:"Manufacturing & Industry", cs:"Výroba & Průmysl",    de:"Produktion & Industrie" },
  nonprofit:     { en:"Non-profit & Other",     cs:"Neziskovky & Jiné",     de:"Non-Profit & Sonstiges" },
  pets:          { en:"Pets & Animals",         cs:"Zvířata",               de:"Haustiere & Tiere" },
  public:        { en:"Public Sector",          cs:"Veřejná správa",        de:"Öffentlicher Sektor" },
  realty:        { en:"Real Estate & Construction", cs:"Reality & Stavebnictví", de:"Immobilien & Bau" },
  services:      { en:"Services B2B/B2C",       cs:"Služby B2B/B2C",        de:"Dienstleistungen B2B/B2C" },
  sportoutdoor:  { en:"Sport & Outdoor",        cs:"Sport & Outdoor",       de:"Sport & Outdoor" },
  tech:          { en:"Technology & SaaS",      cs:"Technologie & SaaS",    de:"Technologie & SaaS" },
  travel:        { en:"Travel & Hospitality",   cs:"Cestování & Hotely",    de:"Reisen & Hotellerie" },
  wellness:      { en:"Wellness & Beauty",      cs:"Wellness & Beauty",     de:"Wellness & Beauty" },
};

// ── CHROME UI reťazce ────────────────────────────────────────
const UI = {
  simpleMode:   { sk:"Jednoduchý",  en:"Simple",     cs:"Jednoduchý",  de:"Einfach" },
  expertMode:   { sk:"Expert",      en:"Expert",     cs:"Expert",      de:"Experte" },
  webPreview:   { sk:"Web",         en:"Web",        cs:"Web",         de:"Web" },
  recommended:  { sk:"Odporúčaná štruktúra pre toto odvetvie", en:"Recommended structure for this industry", cs:"Doporučená struktura pro tento obor", de:"Empfohlene Struktur für diese Branche" },
  useRecommended:{ sk:"Použiť odporúčané sekcie", en:"Use recommended sections", cs:"Použít doporučené sekce", de:"Empfohlene Bereiche übernehmen" },
  applied:      { sk:"✓ Použité",   en:"✓ Applied",  cs:"✓ Použito",   de:"✓ Übernommen" },
  extrasHint:   { sk:"Vyber všetko, čo platí — spresní to zadanie aj výsledný web.", en:"Select everything that applies — it sharpens the brief and the final website.", cs:"Vyber vše, co platí — zpřesní to zadání i výsledný web.", de:"Alles Zutreffende auswählen — präzisiert das Briefing und die Website." },
  previewNote:  { sk:"Zjednodušený náhľad — reálny web bude plnohodnotný.", en:"Simplified preview — the real website will be fully featured.", cs:"Zjednodušený náhled — skutečný web bude plnohodnotný.", de:"Vereinfachte Vorschau — die echte Website wird vollwertig." },
  language:     { sk:"Jazyk",       en:"Language",   cs:"Jazyk",       de:"Sprache" },

  // ── Wizard (jednoduchý režim) ──
  wizStep_data:    { sk:"Údaje",     en:"Your details", cs:"Údaje",      de:"Ihre Daten" },
  wizStep_texts:   { sk:"Texty",     en:"Copy",         cs:"Texty",      de:"Texte" },
  wizStep_content: { sk:"Obsah",     en:"Content",      cs:"Obsah",      de:"Inhalt" },
  wizStep_assets:  { sk:"Podklady",  en:"Files",        cs:"Podklady",   de:"Dateien" },
  wizStep_design:  { sk:"Dizajn",    en:"Design",       cs:"Design",     de:"Design" },
  wizStep_summary: { sk:"Zhrnutie",  en:"Summary",      cs:"Shrnutí",    de:"Zusammenfassung" },
  wizHint_data:    { sk:"Začnime základmi — názov projektu, odvetvie a kontaktné údaje. Všetko sa automaticky ukladá.",
                     en:"Let's start with the basics — project name, industry and contact details. Everything saves automatically.",
                     cs:"Začněme základy — název projektu, obor a kontaktní údaje. Vše se automaticky ukládá.",
                     de:"Beginnen wir mit den Grundlagen — Projektname, Branche und Kontaktdaten. Alles wird automatisch gespeichert." },
  wizHint_texts:   { sk:"Napíšte vlastnými slovami, čo robíte a čo má web dosiahnuť. Nemusí to byť dokonalé — texty pre web z toho pripravíme my.",
                     en:"Describe in your own words what you do and what the website should achieve. It doesn't have to be perfect — we'll craft the final copy.",
                     cs:"Popište vlastními slovy, co děláte a čeho má web dosáhnout. Nemusí to být dokonalé — finální texty připravíme my.",
                     de:"Beschreiben Sie in eigenen Worten, was Sie tun und was die Website erreichen soll. Es muss nicht perfekt sein — die finalen Texte erstellen wir." },
  wizHint_content: { sk:"Vyberte, aké časti má web obsahovať. Zaškrtnuté sekcie môžete rozbaliť a dopísať k nim poznámku.",
                     en:"Choose which parts the website should contain. Expand any selected section to add a note.",
                     cs:"Vyberte, jaké části má web obsahovat. Zaškrtnuté sekce můžete rozbalit a připsat poznámku.",
                     de:"Wählen Sie, welche Teile die Website enthalten soll. Ausgewählte Bereiche können Sie aufklappen und kommentieren." },
  wizHint_assets:  { sk:"Pošlite nám fotky, logo a texty — nahrajte ich na bezplatnú službu (napr. Úschovňa) a vložte sem odkaz. Pokojne aj jeden ZIP so všetkým.",
                     en:"Send us photos, logo and copy — upload them to a free service (e.g. WeTransfer) and paste the link here. A single ZIP with everything works too.",
                     cs:"Pošlete nám fotky, logo a texty — nahrajte je na bezplatnou službu (např. Úschovna) a vložte sem odkaz. Klidně i jeden ZIP se vším.",
                     de:"Senden Sie uns Fotos, Logo und Texte — laden Sie sie bei einem kostenlosen Dienst (z. B. WeTransfer) hoch und fügen Sie den Link ein. Gern auch ein ZIP mit allem." },
  wizHint_design:  { sk:"Vyberte štýl, ktorý vám najviac sadne. Netreba riešiť detaily — farby a písma doladíme podľa vášho loga a odvetvia.",
                     en:"Pick the style you like best. No need to fuss over details — we'll fine-tune colors and fonts to match your logo and industry.",
                     cs:"Vyberte styl, který vám nejvíc sedí. Detaily neřešte — barvy a písma doladíme podle vašeho loga a oboru.",
                     de:"Wählen Sie den Stil, der Ihnen am besten gefällt. Details klären wir — Farben und Schriften stimmen wir auf Ihr Logo ab." },
  wizHint_summary: { sk:"Skontrolujte, či nič nechýba. Ak je všetko zelené, máte hotovo — údaje máme uložené.",
                     en:"Check that nothing is missing. If everything is green, you're done — we have your data saved.",
                     cs:"Zkontrolujte, zda nic nechybí. Pokud je vše zelené, máte hotovo — údaje máme uložené.",
                     de:"Prüfen Sie, ob nichts fehlt. Wenn alles grün ist, sind Sie fertig — Ihre Daten sind gespeichert." },
  wizBack:      { sk:"Späť",    en:"Back",    cs:"Zpět",    de:"Zurück" },
  wizNext:      { sk:"Ďalej",   en:"Next",    cs:"Dále",    de:"Weiter" },
  wizRestart:   { sk:"Prejsť od začiatku", en:"Review from start", cs:"Projít od začátku", de:"Von vorn durchgehen" },
  wizStepOf:    { sk:"Krok {a} z {b}", en:"Step {a} of {b}", cs:"Krok {a} z {b}", de:"Schritt {a} von {b}" },
  wizSummaryTitle:{ sk:"Zhrnutie zadania", en:"Brief summary", cs:"Shrnutí zadání", de:"Zusammenfassung" },
  wizSumProject:  { sk:"Názov projektu",  en:"Project name",   cs:"Název projektu",  de:"Projektname" },
  wizSumIndustry: { sk:"Odvetvie",        en:"Industry",       cs:"Odvětví",         de:"Branche" },
  wizSumContact:  { sk:"Kontakt (e-mail alebo telefón)", en:"Contact (email or phone)", cs:"Kontakt (e-mail nebo telefon)", de:"Kontakt (E-Mail oder Telefon)" },
  wizSumDesc:     { sk:"Popis projektu",  en:"Project description", cs:"Popis projektu", de:"Projektbeschreibung" },
  wizSumSections: { sk:"Sekcie webu",     en:"Website sections",    cs:"Sekce webu",     de:"Website-Bereiche" },
  wizSumAssets:   { sk:"Podklady (fotky, logo…)", en:"Assets (photos, logo…)", cs:"Podklady (fotky, logo…)", de:"Materialien (Fotos, Logo…)" },
  wizSumDesign:   { sk:"Dizajn / štýl",   en:"Design / style",      cs:"Design / styl",  de:"Design / Stil" },
  wizFill:        { sk:"Doplniť",         en:"Fill in",             cs:"Doplnit",        de:"Ergänzen" },
  wizSumMissing:  { sk:"Ešte pár vecí chýba — doplňte ich tlačidlom „Doplniť“. Nič sa nestratí, všetko sa priebežne ukladá.",
                    en:"A few things are still missing — use the \"Fill in\" buttons. Nothing gets lost, everything saves as you go.",
                    cs:"Ještě pár věcí chybí — doplňte je tlačítkem „Doplnit“. Nic se neztratí, vše se průběžně ukládá.",
                    de:"Es fehlen noch ein paar Dinge — nutzen Sie „Ergänzen“. Nichts geht verloren, alles wird laufend gespeichert." },
  wizSumDone:     { sk:"🎉 Hotovo! Všetky podklady máme. Zadanie je uložené a môžeme sa pustiť do tvorby webu.",
                    en:"🎉 Done! We have everything. The brief is saved and we can start building your website.",
                    cs:"🎉 Hotovo! Máme vše. Zadání je uloženo a můžeme se pustit do tvorby webu.",
                    de:"🎉 Fertig! Wir haben alles. Das Briefing ist gespeichert und wir können mit der Website starten." },
};

export function tr(lang, key) {
  const e = UI[key];
  if (!e) return key;
  return e[lang] || e.sk || key;
}

// ── LOKALIZAČNÉ FUNKCIE (SK = zdroj, vracia base bez zmien) ──
export function localizeSections(base, lang) {
  if (lang === "sk") return base;
  return base.map(s => {
    const t = SEC[s.id]?.[lang] || SEC[s.id]?.en;
    return t ? { ...s, label: t[0], desc: t[1] } : s;
  });
}

export function localizeAccordion(base, lang) {
  if (lang === "sk") return base;
  return base.map(a => ({
    ...a,
    label: ACC[a.id]?.[lang] || a.label,
    subs: a.subs.map(s => ({ ...s, label: ACC_SUB[s.id]?.[lang] || s.label })),
  }));
}

export function localizeWebTypes(base, lang) {
  if (lang === "sk") return base;
  return base.map(t => {
    const tt = WT[t.id]?.[lang] || WT[t.id]?.en;
    return tt ? { ...t, label: tt[0], desc: tt[1] } : t;
  });
}

export function localizeIndustries(base, lang) {
  if (lang === "sk") return base;
  return base.map(g => ({ ...g, label: IND[g.id]?.[lang] || IND[g.id]?.en || g.label }));
}

// Label extra možnosti podľa jazyka (EN pre všetky ne-SK jazyky,
// kým nepribudnú plné CS/DE preklady dát).
export function extraLabel(opt, lang) {
  return lang === "sk" ? opt.label : (opt.en || opt.label);
}
