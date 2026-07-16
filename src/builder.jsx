import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { getIndustryExtras, INDUSTRY_SECTION_PRESETS } from "./industryData.js";
import { LANGS, tr, localizeSections, localizeAccordion, localizeWebTypes, localizeIndustries, extraLabel } from "./i18n.js";
import { generateProPrompt } from "./promptGen.js";
import MiniWebPreview from "./WebPreview.jsx";

// ─── SUPABASE CONFIG ──────────────────────────────────────
// Credentials z Supabase → Settings → API (cez .env)
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Je Supabase nakonfigurovaný? (bez neho appka beží len lokálne)
export const hasSupabase =
  !!SUPABASE_URL && !!SUPABASE_ANON && !SUPABASE_URL.includes("YOUR_PROJECT");

const supabase = hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;

// Unikátne ID tejto záložky prehliadača — ochrana proti echo-slučke
// pri obojsmernom realtime sync (admin ↔ klient).
const TAB_ID = Math.random().toString(36).slice(2, 10);

// ─── SUPABASE REALTIME (broadcast cez oficiálne SDK) ──────
function createRealtimeChannel(sessionId, onMessage) {
  if (!supabase) return { broadcast: () => {}, destroy: () => {} };

  const channel = supabase.channel(`brief-${sessionId}`, {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "brief_update" }, (msg) => {
    if (msg?.payload?.from === TAB_ID) return; // vlastná správa — ignoruj
    if (msg?.payload?.data) onMessage(msg.payload.data);
  });

  channel.subscribe();

  return {
    broadcast: (data) => {
      channel.send({
        type: "broadcast",
        event: "brief_update",
        payload: { from: TAB_ID, data },
      });
    },
    destroy: () => { supabase.removeChannel(channel); },
  };
}

// ─── SUPABASE DATABÁZA (perzistencia sessions) ─────────────
// Tabuľka: public.wq_sessions — pozri supabase-setup.sql
const SESSIONS_TABLE = "wq_sessions";

// Načíta uložený brief session; null ak neexistuje / DB nedostupná.
export async function dbLoadSession(sessionId) {
  if (!supabase || !sessionId) return null;
  try {
    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .select("brief")
      .eq("id", sessionId)
      .maybeSingle();
    if (error) { console.warn("[WebQuote] dbLoadSession:", error.message); return null; }
    return data?.brief ?? null;
  } catch (e) { console.warn("[WebQuote] dbLoadSession:", e); return null; }
}

// Uloží (upsert) brief session. Vráti true pri úspechu.
export async function dbSaveSession(sessionId, brief) {
  if (!supabase || !sessionId) return false;
  try {
    const { error } = await supabase.from(SESSIONS_TABLE).upsert({
      id: sessionId,
      name: brief?.projectName || null,
      brief,
      updated_at: new Date().toISOString(),
    });
    if (error) { console.warn("[WebQuote] dbSaveSession:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[WebQuote] dbSaveSession:", e); return false; }
}

// Zoznam všetkých sessions (pre admin prehľad projektov).
export async function dbListSessions() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false });
    if (error) { console.warn("[WebQuote] dbListSessions:", error.message); return null; }
    return (data || []).map(r => ({
      id: r.id,
      name: r.name || "Bez názvu",
      updatedAt: r.updated_at ? Date.parse(r.updated_at) : 0,
    }));
  } catch (e) { console.warn("[WebQuote] dbListSessions:", e); return null; }
}

// Zmaže session z databázy.
export async function dbDeleteSession(sessionId) {
  if (!supabase || !sessionId) return false;
  try {
    const { error } = await supabase.from(SESSIONS_TABLE).delete().eq("id", sessionId);
    if (error) { console.warn("[WebQuote] dbDeleteSession:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[WebQuote] dbDeleteSession:", e); return false; }
}

// Premenuje session ID (slug v URL). Vráti false pri kolízii/chybe.
export async function dbRenameSession(oldId, newId) {
  if (!supabase || !oldId || !newId) return false;
  if (oldId === newId) return true;
  try {
    // kolízia?
    const { data: existing } = await supabase
      .from(SESSIONS_TABLE).select("id").eq("id", newId).maybeSingle();
    if (existing) return false;
    const { error } = await supabase
      .from(SESSIONS_TABLE).update({ id: newId }).eq("id", oldId);
    if (error) { console.warn("[WebQuote] dbRenameSession:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[WebQuote] dbRenameSession:", e); return false; }
}


// ─── THEME ────────────────────────────────────────────────
// Fixná MediaVolt paleta — teplá tmavá (volt orange #ff6a00).
// UI appky sa už NEprefarbuje podľa vybratej farebnej témy briefu.
const MV_THEME = {
  bg:"#0a0604", panel:"#120b07", card:"#1a1009",
  border:"#2a1d12", text:"#f4ece6", muted:"#8f8378", subtle:"#2a1d12",
  inpBg:"#120b07", cardActive:"#22150c", codeBg:"#0a0604", codeText:"#ff9540", checkbox:"#ff6a00", desc:"#6f6459",
};
const THEMES = { dark: MV_THEME, light: MV_THEME };

// ─── DATA ─────────────────────────────────────────────────

const WEB_TYPES_BASE = [
  { id:"landing",   label:"Landing",   icon:"⚡", desc:"Jeden cieľ, jedna stránka" },
  { id:"corporate", label:"Firemný",   icon:"🏢", desc:"Viac sekcií, o nás, kontakt" },
  { id:"ecommerce", label:"E-shop",    icon:"🛒", desc:"Produkty, košík, checkout" },
  { id:"portfolio", label:"Portfolio", icon:"🎨", desc:"Showcase prác" },
];

// ── INDUSTRIES ─────────────────────────────────────────────
const INDUSTRIES_BASE = [
  {
    id:"automotive", label:"Automotive", icon:"🚗",
    subs:[
      { id:"cardealer",  label:"Autobazár / Predajca",  icon:"🚙", desc:"Predaj vozidiel, ponuka skladom, financovanie" },
      { id:"carservice", label:"Autoservis",            icon:"🔧", desc:"Servisné služby, objednanie termínu, cenník" },
      { id:"carwash",    label:"Autoumyváreň",          icon:"🚿", desc:"Umývanie a detailing vozidiel, balíky služieb" },
      { id:"carrental",  label:"Autopožičovňa",         icon:"🔑", desc:"Prenájom vozidiel, rezervačný systém, flotila" },
      { id:"tires",      label:"Pneuservis",            icon:"🛞", desc:"Predaj a výmena pneumatík, skladovanie" },
    ],
  },
  {
    id:"creative", label:"Creative & Umenie", icon:"🎨",
    subs:[
      { id:"photographer",label:"Fotograf",          icon:"📷", desc:"Portfolio, galériá, cenník, rezervácia" },
      { id:"dj",          label:"DJ / Hudobník",     icon:"🎧", desc:"DJ profil, sety, booking, rider" },
      { id:"band",        label:"Kapela / Umelec",   icon:"🎸", desc:"Kapela, discografia, turné, merch" },
      { id:"videographer",label:"Videograf",         icon:"🎬", desc:"Video produkcia, showreel, cenník" },
      { id:"designer",    label:"Grafický dizajnér", icon:"✏️", desc:"Dizajnérske portfólio, Behance štýl" },
      { id:"writer",      label:"Spisovateľ / Blog", icon:"✍️", desc:"Autorský blog, knihy, newsletter" },
      { id:"influencer",  label:"Influencer / Creator",icon:"⭐",desc:"Personal brand, spolupráce, kontakt" },
      { id:"event",       label:"Event / Festoval",  icon:"🎪", desc:"Eventová agentúra, kalendár, tickety" },
    ],
  },
  {
    id:"ecommerce", label:"E-commerce", icon:"🛒",
    subs:[
      { id:"eshop",      label:"E-shop",            icon:"🏪", desc:"Klasický e-shop s produktovými kategóriami" },
      { id:"fashion",    label:"Móda / Oblečenie",  icon:"👗", desc:"Clothing brand, lookbook, veľkostná tabuľka" },
      { id:"electronics",label:"Elektronika",       icon:"💻", desc:"Technika, porovnanie parametrov, servis" },
      { id:"food-shop",  label:"Potraviny online",  icon:"🥦", desc:"Online potraviny, farmárske produkty, predplatné" },
      { id:"handmade",   label:"Handmade / Eshop",  icon:"🪡", desc:"Ručne vyrábané produkty, Etsy štýl" },
      { id:"b2b-shop",   label:"B2B veľkoobchod",   icon:"📦", desc:"Veľkoobchod, cenník pre firmy, prihlasovacie konto" },
      { id:"dropshipping",label:"Dropshipping",     icon:"✈️", desc:"Dropshipping store, winning products, ads" },
      { id:"subscription",label:"Predplatné / Box", icon:"📬", desc:"Mesačná krabica, tiers, správa predplatného" },
    ],
  },
  {
    id:"education", label:"Education / Vzdelávanie", icon:"🎓",
    subs:[
      { id:"school",     label:"Škola / Jazyky",    icon:"📚", desc:"Jazyková škola, kurzy, rozvrh, prihláška" },
      { id:"coaching",   label:"Koučing / Mentoring",icon:"🧭", desc:"Biznis koučing, osobný rozvoj, 1:1 sessie" },
      { id:"online-edu", label:"Online kurzy",       icon:"💻", desc:"Video kurzy, LMS platforma, certifikáty" },
      { id:"kids",       label:"Deti / Krúžky",     icon:"🧒", desc:"Detské krúžky, deti aktivity, prihláška" },
      { id:"workshop",   label:"Workshopy / Eventy", icon:"🎪", desc:"Jednorazové workshopy, ticket predaj" },
      { id:"driving",    label:"Autoškola",          icon:"🚗", desc:"Autoškola, kurzy, termíny, ceny" },
    ],
  },
  {
    id:"finance", label:"Finance & Investície", icon:"💳",
    subs:[
      { id:"bank",       label:"Banka / Fintech",   icon:"🏦", desc:"Bankové produkty, online onboarding, app" },
      { id:"investing",  label:"Investičná platforma", icon:"📈", desc:"Investovanie, portfólio, edukácia" },
      { id:"broker",     label:"Finančný maklér",   icon:"🤝", desc:"Sprostredkovanie úverov, hypoték, poradenstvo" },
      { id:"crypto",     label:"Crypto / Web3",     icon:"🪙", desc:"Krypto projekt, wallet, exchange landing" },
      { id:"accounting2",label:"Účtovná firma",     icon:"📊", desc:"Účtovníctvo, mzdy, dane (pozri aj Služby)" },
    ],
  },
  {
    id:"gastro", label:"Gastro", icon:"🍽",
    subs:[
      { id:"restaurant", label:"Reštaurácia",  icon:"🍴", desc:"Plnohodnotná reštaurácia s menu, rezerváciou, atmosférou" },
      { id:"cafe",       label:"Kaviareň",      icon:"☕", desc:"Kavičiari, specialty coffee, brunch miesta" },
      { id:"bar",        label:"Bar / Pub",     icon:"🍺", desc:"Nápojový bar, craft beer, koktail bar" },
      { id:"club",       label:"Nightclub",     icon:"🎵", desc:"Hudobný klub, DJ lineup, ticket predaj" },
      { id:"foodtruck",  label:"Food truck",    icon:"🚚", desc:"Mobilná prevádzka, lokácie, menu" },
      { id:"bakery",     label:"Pekáreň / Cukráreň", icon:"🥐", desc:"Pekárenské produkty, objednávky, torty" },
      { id:"fastfood",   label:"Fast food",     icon:"🍔", desc:"Rýchle občerstvenie, online objednávky, donáška" },
      { id:"catering",   label:"Catering",      icon:"🥗", desc:"Cateringové služby pre eventy a firmy" },
    ],
  },
  {
    id:"health", label:"Health & Zdravie", icon:"🏥",
    subs:[
      { id:"clinic",     label:"Klinika / Ambulancia",icon:"🩺", desc:"Zdravotná klinika, objednávanie, lekári" },
      { id:"dental",     label:"Zubná ambulancia",   icon:"🦷", desc:"Zubár, procedúry, cenník, objednanie" },
      { id:"pharmacy",   label:"Lekáreň",            icon:"💊", desc:"Online lekáreň, lieky, poradenstvo" },
      { id:"physio",     label:"Fyzioterapia",        icon:"🦴", desc:"Fyzioterapeutická prax, rezervácia, ceny" },
      { id:"optician",   label:"Optika",             icon:"👓", desc:"Okuliare, vyšetrenie, online objednávka" },
      { id:"nutrition",  label:"Výživa / Dietológ",  icon:"🥑", desc:"Výživový poradca, jedálny lístok, online konzultácia" },
    ],
  },
  {
    id:"manufacturing", label:"Manufacturing & Industry", icon:"🏭",
    subs:[
      { id:"factory",    label:"Výrobný podnik",    icon:"🏭", desc:"Priemyselná výroba, produktové katalógy, B2B dopyt" },
      { id:"wholesale",  label:"Veľkoobchod",       icon:"📦", desc:"Distribúcia, cenníky pre partnerov, objednávky" },
      { id:"engineering",label:"Strojárstvo / Engineering", icon:"⚙️", desc:"Technické riešenia, referencie, dopytový formulár" },
      { id:"packaging",  label:"Obaly / Tlač",      icon:"📐", desc:"Výroba obalov, tlačové služby, kalkulácia" },
    ],
  },
  {
    id:"nonprofit", label:"Non-profit & Iné", icon:"🤝",
    subs:[
      { id:"ngo",        label:"Občianske združenie",icon:"🌱", desc:"OZ, misia, projekty, donácia" },
      { id:"church",     label:"Cirkev / Komunita",  icon:"⛪", desc:"Cirkevná komunita, bohoslužby, skupiny" },
      { id:"sport",      label:"Športový klub",      icon:"⚽", desc:"Klub, výsledky, tréningy, členstvo" },
      { id:"politics",   label:"Politická strana",   icon:"🗳", desc:"Strana, kandidáti, program, kontakt" },
      { id:"charity",    label:"Charitatívna org.",  icon:"❤️", desc:"Fundraising, projekty, transparentnosť" },
      { id:"personal",   label:"Osobná stránka / CV",icon:"👤", desc:"Personal site, CV, portfolio, kontakt" },
    ],
  },
  {
    id:"pets", label:"Pets & Zvieratá", icon:"🐾",
    subs:[
      { id:"vet",        label:"Veterinárna klinika", icon:"🐶", desc:"Veterinárna ambulancia, objednanie, núdzové linky" },
      { id:"petshop",    label:"Pet shop",            icon:"🦴", desc:"Predaj krmiva a doplnkov, online objednávky" },
      { id:"grooming",   label:"Grooming salón",      icon:"✂️", desc:"Kozmetické úpravy zvierat, rezervácia termínu" },
      { id:"breeder",    label:"Chovná stanica",      icon:"🐕", desc:"Chov, šteniatka/mačiatka na predaj, rodokmene" },
      { id:"petboarding",label:"Penzión pre zvieratá", icon:"🏡", desc:"Hotel/útulok pre domáce zvieratá, ceny pobytu" },
    ],
  },
  {
    id:"public", label:"Public Sector & Verejná správa", icon:"🏛",
    subs:[
      { id:"municipality",label:"Obec / Mesto",     icon:"🏛", desc:"Webová stránka obce, úradné oznamy, formuláre" },
      { id:"government", label:"Štátna inštitúcia", icon:"📜", desc:"Verejná organizácia, tlačivá, kontaktné info" },
      { id:"library",    label:"Knižnica / Kultúra", icon:"📖", desc:"Knižničný katalóg, podujatia, výpožičky" },
      { id:"museum",      label:"Múzeum / Galéria", icon:"🖼", desc:"Výstavy, vstupné, vzdelávacie programy" },
    ],
  },
  {
    id:"realty", label:"Realitky & Stavebníctvo", icon:"🏠",
    subs:[
      { id:"realtor",    label:"Realitná kancelária",icon:"🏡", desc:"Predaj a prenájom, mapa nehnuteľností, kontakt" },
      { id:"developer",  label:"Developer",          icon:"🏗", desc:"Nové projekty, vizualizácie, kontakt na predaj" },
      { id:"architect",  label:"Architekt / Dizajn", icon:"📐", desc:"Architektonická kancelária, portfolio projektov" },
      { id:"construction",label:"Stavebná firma",    icon:"🔨", desc:"Rekonštrukcie, novostavby, referencie" },
      { id:"interior",   label:"Interiér",           icon:"🛋", desc:"Interiérový dizajn, štúdio, portfolio" },
      { id:"rental",     label:"Prenájom",           icon:"🔑", desc:"Short/long term prenájom, apartmány, rezervácia" },
    ],
  },
  {
    id:"services", label:"Služby B2B/B2C", icon:"💼",
    subs:[
      { id:"law",        label:"Právne služby",     icon:"⚖️", desc:"Advokátska kancelária, oblasti práva, konzultácia" },
      { id:"accounting", label:"Účtovníctvo / Dane",icon:"📊", desc:"Účtovná firma, mzdové služby, daňové poradenstvo" },
      { id:"agency",     label:"Marketingová agentúra", icon:"📢", desc:"Digitálny marketing, kampane, správa sociálnych sietí" },
      { id:"consulting", label:"Poradenstvo",       icon:"🎯", desc:"Biznis konzultant, stratégia, analýzy" },
      { id:"cleaning",   label:"Upratovacie služby",icon:"🧹", desc:"Domácnosť, firmy, pravidelný servis" },
      { id:"transport",  label:"Doprava / Logistika",icon:"🚛", desc:"Prepravná spoločnosť, kuriér, sťahovanie" },
      { id:"security",   label:"Bezpečnostné služby",icon:"🔒", desc:"Ochrana osôb a majetku, kamerové systémy" },
      { id:"insurance",  label:"Poisťovníctvo",     icon:"🛡", desc:"Poisťovací agent, produkty, kalkulačka" },
    ],
  },
  {
    id:"sportoutdoor", label:"Sport & Outdoor", icon:"🏃",
    subs:[
      { id:"sportsclub", label:"Športový klub / Tím", icon:"🏆", desc:"Klubová stránka, zápasy, členstvo, fanúšikovia" },
      { id:"outdoor",     label:"Outdoor / Adrenalín", icon:"🧗", desc:"Lezenie, turistika, adrenalínové aktivity, rezervácia" },
      { id:"sportshop",   label:"Športové potreby",   icon:"⚽", desc:"Predaj výstroje, e-shop alebo kamenná predajňa" },
      { id:"golfski",      label:"Golf / Lyžiarske stredisko", icon:"⛷", desc:"Rezervácie, ceny skipasov/green fee, mapy" },
    ],
  },
  {
    id:"tech", label:"Technológie & SaaS", icon:"💻",
    subs:[
      { id:"saas",       label:"SaaS produkt",       icon:"⚙️", desc:"Software produkt, features, pricing, signup" },
      { id:"app",        label:"Mobilná aplikácia",  icon:"📱", desc:"App landing page, screenshots, app store" },
      { id:"agency-dev", label:"Web/Dev agentúra",   icon:"🖥", desc:"Webová agentúra, portfolio, proces, kontakt" },
      { id:"startup",    label:"Startup",             icon:"🚀", desc:"Startup landing, investor deck vibe, waitlist" },
      { id:"ai",         label:"AI / Automatizácia", icon:"🤖", desc:"AI produkt, demo, use cases, integrácie" },
      { id:"hosting",    label:"Hosting / Cloud",    icon:"☁️", desc:"Hosting služby, plány, uptime, podpora" },
    ],
  },
  {
    id:"travel", label:"Travel & Hospitality", icon:"✈️",
    subs:[
      { id:"hotel",      label:"Hotel / Penzión",    icon:"🏨", desc:"Ubytovanie, rezervačný systém, izby, ceny" },
      { id:"travelagency",label:"Cestovná kancelária", icon:"🧳", desc:"Zájazdy, ponuky, katalóg destinácií" },
      { id:"tourguide",   label:"Sprievodca / Tour", icon:"🗺", desc:"Prehliadky, výlety, rezervácia termínov" },
      { id:"airbnb",      label:"Apartmány / Airbnb", icon:"🏠", desc:"Krátkodobý prenájom, kalendár dostupnosti" },
      { id:"camping",      label:"Kemping / Glamping", icon:"⛺", desc:"Stanovanie, chatky, rezervácia miest" },
    ],
  },
  {
    id:"wellness", label:"Wellness & Beauty", icon:"💆",
    subs:[
      { id:"spa",        label:"Spa / Wellness",   icon:"🌿", desc:"Relaxačné centrum, hydroterapia, procedúry" },
      { id:"massage",    label:"Masáže",            icon:"🤲", desc:"Masážne štúdio, druhy masáží, rezervácia" },
      { id:"salon",      label:"Kadernícky salón",  icon:"✂️", desc:"Kaderníctvo, farbenie, styling, rezervácie" },
      { id:"beauty",     label:"Beauty salón",      icon:"💅", desc:"Nechtové štúdio, make-up, kozmetika" },
      { id:"fitness",    label:"Fitness / Gym",     icon:"💪", desc:"Fitnes centrum, členstvo, tréningové plány" },
      { id:"yoga",       label:"Yoga / Pilates",    icon:"🧘", desc:"Štúdio, rozvrh hodín, online lekcie" },
      { id:"therapy",    label:"Terapia / Koučing", icon:"🧠", desc:"Psychoterapia, koučing, poradenstvo" },
      { id:"tattoo",     label:"Tattoo / Piercing", icon:"🎨", desc:"Tattoo štúdio, portfolio, rezervácia" },
    ],
  },
];

// ── SECTIONS ────────────────────────────────────────────────
const SECTIONS_BASE = [
  // CORE
  { id:"nav",          label:"Navigácia",          icon:"☰",  cat:"core",    desc:"Hlavné menu s logom, hamburger pre mobil, sticky efekt pri scrolle. Základ každej stránky.", note:"" },
  { id:"hero",         label:"Hero",               icon:"🖼", cat:"core",    desc:"Prvá vec ktorú návštevník vidí — veľký nadpis, podnadpis, primárny CTA button a vizuál alebo video.", note:"" },
  { id:"footer",       label:"Footer",             icon:"▬",  cat:"core",    desc:"Spodná časť stránky s linkami, kontaktnými údajmi, sociálnymi sieťami a copyrightom.", note:"" },
  // CONTENT
  { id:"about",        label:"O nás",              icon:"👤", cat:"content", desc:"Príbeh firmy, misia, hodnoty. Humanizuje brand — ľudia nakupujú od ľudí.", note:"" },
  { id:"services",     label:"Služby",             icon:"🔧", cat:"content", desc:"Prehľad ponúkaných služieb v kartách alebo liste s popisom, ikonou a linkou na detail.", note:"" },
  { id:"features",     label:"Features / Výhody",  icon:"✦",  cat:"content", desc:"Grid 3–6 výhod alebo vlastností produktu/služby. Odpovie na otázku 'prečo práve my?'.", note:"" },
  { id:"products",     label:"Produkty",           icon:"📦", cat:"content", desc:"Filtrovateľný grid produktov s fotkou, cenou, variantmi a tlačidlom do košíka.", note:"" },
  { id:"menu",         label:"Jedálny lístok",     icon:"🍽", cat:"content", desc:"Gastro menu s kategóriami (jedlá, nápoje), popisom, alergenmi a cenami.", note:"" },
  { id:"gallery",      label:"Galéria / Portfolio",icon:"🖼", cat:"content", desc:"Masonry alebo grid galéria s lightboxom — fotky priestoru, produktov alebo prác.", note:"" },
  { id:"work",         label:"Case studies",       icon:"💼", cat:"content", desc:"Detailné prípadové štúdie projektov s výsledkami, procesom a vizuálmi.", note:"" },
  { id:"team",         label:"Tím",                icon:"👥", cat:"content", desc:"Fotky a bio členov tímu — meno, pozícia, krátky popis, sociálne siete.", note:"" },
  { id:"process",      label:"Ako to funguje",     icon:"⟶",  cat:"content", desc:"Kroky spolupráce alebo procesu — číslovaný timeline ktorý znižuje bariéru vstupu.", note:"" },
  { id:"pricing",      label:"Cenník",             icon:"💰", cat:"content", desc:"Porovnávacia tabuľka plánov/balíčkov s highlighted odporúčaným variantom.", note:"" },
  { id:"faq",          label:"FAQ",                icon:"❓", cat:"content", desc:"Accordion s najčastejšími otázkami — znižuje počet zbytočných kontaktov a buduje dôveru.", note:"" },
  { id:"blog",         label:"Blog / Novinky",     icon:"📝", cat:"content", desc:"Grid článkov s náhľadovým obrázkom, dátumom, kategóriou a výňatkom.", note:"" },
  { id:"events",       label:"Eventy / Program",   icon:"📅", cat:"content", desc:"Kalendár alebo zoznam nadchádzajúcich eventov s dátumom, miestom a linkou na lístky.", note:"" },
  { id:"map",          label:"Mapa / Pobočky",     icon:"🗺", cat:"content", desc:"Interaktívna mapa s vyznačenými pobočkami, otváracími hodinami a smermi.", note:"" },
  { id:"openinghours", label:"Otváracie hodiny",   icon:"🕐", cat:"content", desc:"Prehľadná tabuľka otváracích hodín podľa dní vrátane sviatkov.", note:"" },
  { id:"awards",       label:"Ocenenia / Certif.", icon:"🏆", cat:"content", desc:"Sekcia s oceneniami, certifikátmi a mediálnymi zmienkami — buduje autoritu.", note:"" },
  { id:"partners",     label:"Partneri",           icon:"🤝", cat:"content", desc:"Logá alebo karty partnerských firiem a organizácií.", note:"" },
  // SOCIAL
  { id:"testimonials", label:"Referencie",         icon:"💬", cat:"social",  desc:"Carousel alebo grid citátov spokojných klientov s menom, fotkou a hviezdičkami.", note:"" },
  { id:"reviews",      label:"Google / Recenzie",  icon:"⭐", cat:"social",  desc:"Embed Google recenzií alebo Trustpilot widgetu s priemerným hodnotením.", note:"" },
  { id:"logos",        label:"Klienti — logá",     icon:"🏢", cat:"social",  desc:"Scrolling strip s logami firiem pre ktoré si pracoval — okamžitá dôveryhodnosť.", note:"" },
  { id:"stats",        label:"Čísla / Stats",      icon:"📊", cat:"social",  desc:"Veľké animované čísla — roky skúseností, počet klientov, realizovaných projektov.", note:"" },
  { id:"press",        label:"Médiá / Press",      icon:"📰", cat:"social",  desc:"Logá médií kde sa firma objavila + krátky citát alebo odkaz na článok.", note:"" },
  { id:"ugc",          label:"UGC / Instagram",    icon:"📸", cat:"social",  desc:"Grid zákazníckych fotiek z Instagramu alebo TikToku — live social proof.", note:"" },
  // CONVERT
  { id:"cta",          label:"CTA sekcia",         icon:"🎯", cat:"convert", desc:"Full-width banner s jasnou záverečnou výzvou k akcii — pred footerom.", note:"" },
  { id:"contact",      label:"Kontakt",            icon:"📍", cat:"convert", desc:"Kontaktný formulár, mapa, adresa, telefón, email a sociálne siete.", note:"" },
  { id:"booking",      label:"Rezervácia / Booking",icon:"📆", cat:"convert", desc:"Inline booking widget alebo calendly integrácia pre rezerváciu termínu.", note:"" },
  { id:"newsletter",   label:"Newsletter",         icon:"📧", cat:"convert", desc:"Email capture s hodnotovou ponukou (zľava, ebook, novinky) — buduje databázu.", note:"" },
  { id:"leadform",     label:"Lead form",          icon:"📋", cat:"convert", desc:"Rozšírený dopytový formulár s poliami špecifickými pre danú službu.", note:"" },
  { id:"calculator",   label:"Kalkulačka / Cen.",  icon:"🧮", cat:"convert", desc:"Interaktívna kalkulačka ceny alebo ROI — najvyššia konverzná sekcia.", note:"" },
  { id:"quiz",         label:"Quiz / Konfigurátor",icon:"🔀", cat:"convert", desc:"Interaktívny quiz ktorý odporučí produkt alebo balíček podľa odpovedí.", note:"" },
  { id:"popup",        label:"Popup / Modal",      icon:"💡", cat:"convert", desc:"Exit-intent alebo časovaný popup s ponukou, newsletterom alebo oznámením.", note:"" },
  // EXTRA
  { id:"cookies",      label:"Cookie Banner",      icon:"🍪", cat:"extra",   desc:"GDPR-compliant cookie banner s možnosťou prijatia/odmietnutia kategórií.", note:"" },
  { id:"scrolltop",    label:"Scroll to Top",      icon:"↑",  cat:"extra",   desc:"Plávajúce tlačidlo návrat hore ktoré sa objaví po scrolle o 300px.", note:"" },
  { id:"404",          label:"404 stránka",        icon:"✕",  cat:"extra",   desc:"Custom chybová stránka s odkazom domov — zachráni stratené návštevy.", note:"" },
  { id:"maintenance",  label:"Maintenance page",   icon:"🔧", cat:"extra",   desc:"Stránka údržby s odpočítavaním alebo kontaktom počas výpadku.", note:"" },
  { id:"darkmode",     label:"Dark / Light mode",  icon:"🌙", cat:"extra",   desc:"Toggle prepínanie svetlého a tmavého režimu s uložením do localStorage.", note:"" },
  { id:"loader",       label:"Page loader",        icon:"⟳",  cat:"extra",   desc:"Animovaný loading screen ktorý sa zobrazí pri načítaní — brand moment.", note:"" },
  { id:"search",       label:"Vyhľadávanie",       icon:"🔍", cat:"extra",   desc:"Vyhľadávací overlay alebo inline search s real-time výsledkami.", note:"" },
  { id:"language",     label:"Jazykový prepínač",  icon:"🌐", cat:"extra",   desc:"Prepínač jazykov (SK/EN/DE) v navegácii — potrebné pre medzinárodné weby.", note:"" },
  { id:"chatbot",      label:"Chat / Chatbot",     icon:"💬", cat:"extra",   desc:"Live chat widget (Intercom, Crisp) alebo AI chatbot pre zákaznícku podporu.", note:"" },
  { id:"gdpr",         label:"GDPR / Ochrana",     icon:"🔐", cat:"extra",   desc:"Stránka ochrany osobných údajov a VOP — povinné pre EU weby.", note:"" },
  { id:"sitemap",      label:"Sitemap stránka",    icon:"🗂", cat:"extra",   desc:"HTML sitemap pre navigáciu a SEO — prehľad všetkých stránok webu.", note:"" },
];

// Navigácia — nezávislé vlastnosti (single-select groups + toggles)
const NAV_BEHAVIOR = {
  key:"navBehavior", label:"Správanie pri scrolle", type:"single", default:"sticky",
  options:[
    { id:"sticky", label:"Sticky (ukotvené)", desc:"Nav zostáva vždy viditeľná hore pri scrolle" },
    { id:"hidden", label:"Hidden (skrývajúce sa)", desc:"Menu sa skryje pri scrolle dole, zobrazí po nabehnutí myšou do hornej časti" },
    { id:"static", label:"Statické", desc:"Nav je len na vrchu, pri scrolle zmizne s obsahom" },
  ],
};
const NAV_BACKGROUND = {
  key:"navBackground", label:"Pozadie navigácie", type:"single", default:"solid",
  options:[
    { id:"solid", label:"Solid (nepriehľadné)", desc:"Plné farebné pozadie" },
    { id:"transparent", label:"Transparent (priehľadné)", desc:"Priehľadná na vrchu, pri scrolle získa pozadie" },
  ],
};
const NAV_LAYOUT = {
  key:"navLayout", label:"Umiestnenie menu", type:"single", default:"top",
  options:[
    { id:"top", label:"Up menu (horné)", desc:"Klasická horná lišta" },
    { id:"left", label:"Left side menu", desc:"Bočný panel vľavo" },
    { id:"right", label:"Right side menu", desc:"Bočný panel vpravo" },
  ],
};
const NAV_LOGO = {
  key:"navLogo", label:"Pozícia loga", type:"single", default:"left",
  options:[
    { id:"left",   label:"Vľavo",   desc:"Logo vľavo, linky vpravo" },
    { id:"center", label:"V strede", desc:"Logo v strede, linky po stranách" },
    { id:"right",  label:"Vpravo",   desc:"Logo vpravo" },
  ],
};
const NAV_TOGGLES = [
  { key:"navAlwaysHamburger", label:"Vždy hamburger", desc:"Hamburger menu aj na desktope, nie len na mobile" },
  { key:"navSocials",         label:"Sociálne siete v navigácii", desc:"Ikony sociálnych sietí priamo v navigačnej lište" },
];
const NAV_GROUPS = [NAV_BEHAVIOR, NAV_BACKGROUND, NAV_LAYOUT, NAV_LOGO];

// ── HERO config ────────────────────────────────────────────
const HERO_STYLES = [
  { id:"minimal", label:"Minimalistický", icon:"⬜", desc:"Čistý, veľa priestoru, jeden silný nadpis a CTA" },
  { id:"3d",      label:"Advanced 3D",     icon:"🧊", desc:"3D objekty, parallax, interaktívne prvky (Three.js / Spline)" },
  { id:"modern",  label:"Moderný",         icon:"✨", desc:"Gradienty, jemné animácie, súčasný dizajn" },
  { id:"info",    label:"Informačný",      icon:"📄", desc:"Hutný hero s viacerými info blokmi, vhodný pre B2B/služby" },
  { id:"sales",   label:"Predajný",        icon:"🎯", desc:"Silný value proposition, social proof, urgentné CTA" },
];
// ── SLIDERY pre hero carousel (src/sliders — z priečinka SLIDERS) ──
// HTML sa importuje ako text a vkladá cez iframe srcDoc — žiadna HTTP požiadavka,
// takže X-Frame-Options: DENY v hlavičkách hostingu náhľady neblokuje.
import sliderFadeHtml      from "./sliders/slider-1-fade.html?raw";
import sliderSlideHtml     from "./sliders/slider-2-slide.html?raw";
import sliderCoverflowHtml from "./sliders/slider-3-coverflow.html?raw";
import sliderKenburnsHtml  from "./sliders/slider-4-kenburns.html?raw";
import sliderCubeHtml      from "./sliders/slider-5-cube.html?raw";
import sliderSplitHtml     from "./sliders/slider-6-split.html?raw";
import sliderCircleHtml    from "./sliders/slider-7-circle.html?raw";
import sliderCardsHtml     from "./sliders/slider-8-cards.html?raw";

const SLIDER_OPTIONS = [
  { id:"fade",      label:"Fade / Cross-dissolve", html:sliderFadeHtml,      desc:"Jemné prelínanie slidov" },
  { id:"slide",     label:"Slide",                 html:sliderSlideHtml,     desc:"Klasický horizontálny posun" },
  { id:"coverflow", label:"Coverflow",             html:sliderCoverflowHtml, desc:"3D coverflow efekt (Apple štýl)" },
  { id:"kenburns",  label:"Ken Burns",             html:sliderKenburnsHtml,  desc:"Pomalý zoom a posun obrazu" },
  { id:"cube",      label:"Cube",                  html:sliderCubeHtml,      desc:"3D rotácia kocky" },
  { id:"split",     label:"Split",                 html:sliderSplitHtml,     desc:"Rozdelený prechod na polovice" },
  { id:"circle",    label:"Circle reveal",         html:sliderCircleHtml,    desc:"Kruhové odhalenie slidu" },
  { id:"cards",     label:"Cards / Stack",         html:sliderCardsHtml,     desc:"Karty ukladané na seba" },
];

const HERO_MEDIA = [
  { id:"none",    label:"Bez média",     icon:"—",  desc:"Len text a pozadie / gradient" },
  { id:"image",   label:"Obrázok",       icon:"🖼", desc:"Statický vizuál / fotka na pozadí alebo vedľa textu" },
  { id:"video",   label:"Video",         icon:"🎬", desc:"Video na pozadí alebo v rámčeku" },
  { id:"3dscene", label:"3D scéna",      icon:"🧊", desc:"Interaktívna 3D scéna (Spline / Three.js)" },
  { id:"carousel", label:"Carousel",     icon:"🎠", desc:"Otáčajúce sa slidy — viac obrázkov/správ za sebou" },
  { id:"custom",  label:"Custom vizuál", icon:"🎨", desc:"Vlastný vizuál podľa referencie — vlož link nižšie" },
];

const CATS = [
  { id:"core",    label:"Štruktúra webu / projektu" },
  { id:"content", label:"Obsah" },
  { id:"social",  label:"Social proof" },
  { id:"convert", label:"Konverzia" },
  { id:"extra",   label:"Extra" },
];

const THEME_PRESETS = [
  {
    id:"midnight", label:"Midnight Indigo",
    dark:  { bg:"#0F0F0F", surface:"#161616", border:"#242424", text:"#F0F0F0", muted:"#666", primary:"#6366F1", accent:"#EC4899", fontDisplay:"Syne", fontBody:"Inter" },
    light: { bg:"#FAFAFB", surface:"#F1F1F4", border:"#E2E2E8", text:"#1A1A2E", muted:"#888", primary:"#6366F1", accent:"#EC4899", fontDisplay:"Syne", fontBody:"Inter" },
  },
  {
    id:"forest", label:"Forest Sage",
    dark:  { bg:"#0C110E", surface:"#141B16", border:"#1F2A22", text:"#E8EFE9", muted:"#5a6b5f", primary:"#6BAA7E", accent:"#C4A882", fontDisplay:"Cormorant Garamond", fontBody:"DM Sans" },
    light: { bg:"#F7F4EF", surface:"#EEEAE3", border:"#DDD8CF", text:"#2C2C2C", muted:"#888", primary:"#8BA888", accent:"#C4A882", fontDisplay:"Cormorant Garamond", fontBody:"DM Sans" },
  },
  {
    id:"ember", label:"Ember Gold",
    dark:  { bg:"#080808", surface:"#141110", border:"#241e1a", text:"#F5F1EC", muted:"#6b5f55", primary:"#D4A017", accent:"#FF4500", fontDisplay:"Syne", fontBody:"Inter" },
    light: { bg:"#FDF9F2", surface:"#F6EFE2", border:"#EADFC9", text:"#2A2218", muted:"#9a8a70", primary:"#C4900F", accent:"#E63E00", fontDisplay:"Syne", fontBody:"Inter" },
  },
  {
    id:"obsidian", label:"Obsidian Cobalt",
    dark:  { bg:"#050508", surface:"#0D0D14", border:"#1a1a28", text:"#E8E8E8", muted:"#4a4a6a", primary:"#C0A060", accent:"#4040FF", fontDisplay:"Clash Display", fontBody:"Space Grotesk" },
    light: { bg:"#F4F4F8", surface:"#E9E9F0", border:"#D4D4E2", text:"#16161F", muted:"#7a7a90", primary:"#9A7F3E", accent:"#3535D8", fontDisplay:"Clash Display", fontBody:"Space Grotesk" },
  },
  {
    id:"rose", label:"Rose Quartz",
    dark:  { bg:"#100A0D", surface:"#1A1216", border:"#2A1E24", text:"#F3E9EE", muted:"#7a5f6b", primary:"#E8638F", accent:"#A78BFA", fontDisplay:"Playfair Display", fontBody:"Inter" },
    light: { bg:"#FDF6F8", surface:"#F8EBF0", border:"#EFD8E1", text:"#2A1A22", muted:"#a07a88", primary:"#D14B78", accent:"#8B6FE0", fontDisplay:"Playfair Display", fontBody:"Inter" },
  },
  {
    id:"ocean", label:"Ocean Teal",
    dark:  { bg:"#06100F", surface:"#0E1A19", border:"#1A2A28", text:"#E4F0EE", muted:"#4f6b67", primary:"#2DD4BF", accent:"#38BDF8", fontDisplay:"Sora", fontBody:"Inter" },
    light: { bg:"#F2FAF9", surface:"#E4F2F0", border:"#CCE5E2", text:"#0F2A27", muted:"#5f8a85", primary:"#14B8A6", accent:"#0EA5E9", fontDisplay:"Sora", fontBody:"Inter" },
  },
  {
    id:"slate", label:"Slate Mono",
    dark:  { bg:"#0E0E10", surface:"#17171A", border:"#26262B", text:"#ECECEE", muted:"#6a6a72", primary:"#A1A1AA", accent:"#FAFAFA", fontDisplay:"Space Grotesk", fontBody:"Inter" },
    light: { bg:"#FBFBFC", surface:"#F0F0F2", border:"#DEDEE2", text:"#18181B", muted:"#8a8a92", primary:"#52525B", accent:"#18181B", fontDisplay:"Space Grotesk", fontBody:"Inter" },
  },
  {
    id:"sunset", label:"Sunset Coral",
    dark:  { bg:"#120A08", surface:"#1C100C", border:"#2C1C16", text:"#F5E9E4", muted:"#7a5f55", primary:"#FB7185", accent:"#FBBF24", fontDisplay:"Poppins", fontBody:"Inter" },
    light: { bg:"#FFF7F4", surface:"#FCEBE4", border:"#F5D7CB", text:"#2A1812", muted:"#a08070", primary:"#F43F5E", accent:"#F59E0B", fontDisplay:"Poppins", fontBody:"Inter" },
  },
  {
    id:"violet", label:"Violet Neon",
    dark:  { bg:"#0A0612", surface:"#130C1F", border:"#22163A", text:"#EDE6F5", muted:"#6a5a85", primary:"#A855F7", accent:"#22D3EE", fontDisplay:"Space Grotesk", fontBody:"Inter" },
    light: { bg:"#F9F5FE", surface:"#F0E8FA", border:"#DECCF0", text:"#1E1230", muted:"#8a70a8", primary:"#9333EA", accent:"#0891B2", fontDisplay:"Space Grotesk", fontBody:"Inter" },
  },
  {
    id:"crimson", label:"Crimson Noir",
    dark:  { bg:"#0E0708", surface:"#1A0E10", border:"#2C1A1D", text:"#F2E6E8", muted:"#7a565c", primary:"#DC2626", accent:"#F59E0B", fontDisplay:"Oswald", fontBody:"Inter" },
    light: { bg:"#FDF6F6", surface:"#F8E9EA", border:"#EDD2D5", text:"#2A1416", muted:"#a07579", primary:"#C81E1E", accent:"#D97706", fontDisplay:"Oswald", fontBody:"Inter" },
  },
  {
    id:"mint", label:"Mint Fresh",
    dark:  { bg:"#07110D", surface:"#0E1B15", border:"#1A2B22", text:"#E6F2EC", muted:"#557066", primary:"#34D399", accent:"#60A5FA", fontDisplay:"Quicksand", fontBody:"Inter" },
    light: { bg:"#F2FBF7", surface:"#E2F5EC", border:"#CAE8D9", text:"#0F2A20", muted:"#5f8a78", primary:"#10B981", accent:"#3B82F6", fontDisplay:"Quicksand", fontBody:"Inter" },
  },
  {
    id:"sand", label:"Desert Sand",
    dark:  { bg:"#100D08", surface:"#1B160E", border:"#2C2418", text:"#F2ECE0", muted:"#7a6e55", primary:"#D6A55C", accent:"#A3744A", fontDisplay:"Fraunces", fontBody:"DM Sans" },
    light: { bg:"#FBF6EC", surface:"#F4EBD8", border:"#E6D6BA", text:"#2A2113", muted:"#9a8a68", primary:"#B8843A", accent:"#8C5E36", fontDisplay:"Fraunces", fontBody:"DM Sans" },
  },
  {
    id:"steel", label:"Steel Blue",
    dark:  { bg:"#080B10", surface:"#10141B", border:"#1E2530", text:"#E6ECF2", muted:"#56636e", primary:"#3B82F6", accent:"#94A3B8", fontDisplay:"Sora", fontBody:"Inter" },
    light: { bg:"#F4F7FB", surface:"#E7EDF4", border:"#D2DCE8", text:"#10171F", muted:"#647585", primary:"#2563EB", accent:"#64748B", fontDisplay:"Sora", fontBody:"Inter" },
  },
  {
    id:"plum", label:"Plum Wine",
    dark:  { bg:"#0E080D", surface:"#190F18", border:"#2A1A28", text:"#F0E6EF", muted:"#735a70", primary:"#9D4EDD", accent:"#E0AAFF", fontDisplay:"Cormorant Garamond", fontBody:"Inter" },
    light: { bg:"#FAF5FB", surface:"#F2E8F3", border:"#E2CEE5", text:"#26162A", muted:"#8a708a", primary:"#7B2CBF", accent:"#9D4EDD", fontDisplay:"Cormorant Garamond", fontBody:"Inter" },
  },
  {
    id:"lime", label:"Acid Lime",
    dark:  { bg:"#0A0E06", surface:"#131A0C", border:"#222C14", text:"#EEF2E4", muted:"#667055", primary:"#A3E635", accent:"#FACC15", fontDisplay:"Space Grotesk", fontBody:"Inter" },
    light: { bg:"#F8FBF0", surface:"#EEF5DD", border:"#DAE8C0", text:"#1A2410", muted:"#7a8a5f", primary:"#84CC16", accent:"#EAB308", fontDisplay:"Space Grotesk", fontBody:"Inter" },
  },
  {
    id:"mocha", label:"Mocha Cream",
    dark:  { bg:"#0F0B08", surface:"#1A130E", border:"#2A2018", text:"#F0E9E1", muted:"#776a5c", primary:"#B08968", accent:"#DDB892", fontDisplay:"Playfair Display", fontBody:"DM Sans" },
    light: { bg:"#FAF6F0", surface:"#F2E9DD", border:"#E4D5C2", text:"#2A2017", muted:"#9a8870", primary:"#9C6644", accent:"#B08968", fontDisplay:"Playfair Display", fontBody:"DM Sans" },
  },
  {
    id:"arctic", label:"Arctic Ice",
    dark:  { bg:"#070C0E", surface:"#0E161A", border:"#1A262C", text:"#E4EEF2", muted:"#516670", primary:"#67E8F9", accent:"#A5F3FC", fontDisplay:"Sora", fontBody:"Inter" },
    light: { bg:"#F2FAFC", surface:"#E2F2F6", border:"#C8E4EC", text:"#0F2429", muted:"#5f8590", primary:"#0891B2", accent:"#06B6D4", fontDisplay:"Sora", fontBody:"Inter" },
  },
  {
    id:"magma", label:"Magma Orange",
    dark:  { bg:"#100805", surface:"#1C0F09", border:"#2E1B12", text:"#F5EAE2", muted:"#7a6155", primary:"#F97316", accent:"#EF4444", fontDisplay:"Oswald", fontBody:"Inter" },
    light: { bg:"#FFF7F1", surface:"#FCEBDF", border:"#F5D7C2", text:"#2A170E", muted:"#a08270", primary:"#EA580C", accent:"#DC2626", fontDisplay:"Oswald", fontBody:"Inter" },
  },
  {
    id:"emerald", label:"Emerald Lux",
    dark:  { bg:"#050E0A", surface:"#0C1812", border:"#16291F", text:"#E4F2EA", muted:"#4f6b5c", primary:"#059669", accent:"#D4AF37", fontDisplay:"Fraunces", fontBody:"DM Sans" },
    light: { bg:"#F2FAF6", surface:"#E2F2EA", border:"#C8E5D5", text:"#0C2419", muted:"#5f8a72", primary:"#047857", accent:"#B8902F", fontDisplay:"Fraunces", fontBody:"DM Sans" },
  },
  {
    id:"carbon", label:"Carbon Mono",
    dark:  { bg:"#0A0A0A", surface:"#141414", border:"#222222", text:"#EDEDED", muted:"#5c5c5c", primary:"#FFFFFF", accent:"#737373", fontDisplay:"Archivo", fontBody:"Inter" },
    light: { bg:"#FFFFFF", surface:"#F4F4F4", border:"#E0E0E0", text:"#0A0A0A", muted:"#8c8c8c", primary:"#0A0A0A", accent:"#525252", fontDisplay:"Archivo", fontBody:"Inter" },
  },
  {
    id:"bubblegum", label:"Bubblegum Pop",
    dark:  { bg:"#100815", surface:"#1B0F22", border:"#2C1A38", text:"#F3E9F5", muted:"#7a5f85", primary:"#F472B6", accent:"#38BDF8", fontDisplay:"Poppins", fontBody:"Inter" },
    light: { bg:"#FEF5FA", surface:"#FBE8F3", border:"#F5D2E5", text:"#2A1626", muted:"#a070a0", primary:"#EC4899", accent:"#0EA5E9", fontDisplay:"Poppins", fontBody:"Inter" },
  },
  {
    id:"gold", label:"Royal Gold",
    dark:  { bg:"#0C0A06", surface:"#16120A", border:"#272014", text:"#F5EFE0", muted:"#7a6e50", primary:"#D4AF37", accent:"#E8E8E8", fontDisplay:"Cormorant Garamond", fontBody:"Inter" },
    light: { bg:"#FBF8F0", surface:"#F4EDDB", border:"#E7DABA", text:"#262013", muted:"#9a8a60", primary:"#B8902F", accent:"#3A3A3A", fontDisplay:"Cormorant Garamond", fontBody:"Inter" },
  },
];

// Build flat PRESETS map: "Midnight Indigo Dark" / "Midnight Indigo Light"
const PRESETS = (() => {
  const out = {};
  THEME_PRESETS.forEach(t => {
    out[`${t.label} Dark`]  = t.dark;
    out[`${t.label} Light`] = t.light;
  });
  return out;
})();

// ── FONT options (Google Fonts) ────────────────────────────
const FONT_OPTIONS = [
  // Sans-serif
  { name:"Inter",              cat:"Sans" },
  { name:"Roboto",             cat:"Sans" },
  { name:"Poppins",            cat:"Sans" },
  { name:"Montserrat",         cat:"Sans" },
  { name:"DM Sans",            cat:"Sans" },
  { name:"Work Sans",          cat:"Sans" },
  { name:"Sora",               cat:"Sans" },
  { name:"Space Grotesk",      cat:"Sans" },
  { name:"Manrope",            cat:"Sans" },
  { name:"Outfit",             cat:"Sans" },
  { name:"Plus Jakarta Sans",  cat:"Sans" },
  { name:"Lexend",             cat:"Sans" },
  { name:"Quicksand",          cat:"Sans" },
  { name:"Syne",               cat:"Display" },
  { name:"Archivo",            cat:"Display" },
  { name:"Oswald",             cat:"Display" },
  { name:"Bebas Neue",         cat:"Display" },
  { name:"Anton",              cat:"Display" },
  { name:"Clash Display",      cat:"Display" },
  // Serif
  { name:"Playfair Display",   cat:"Serif" },
  { name:"Cormorant Garamond", cat:"Serif" },
  { name:"Fraunces",           cat:"Serif" },
  { name:"Lora",               cat:"Serif" },
  { name:"Merriweather",       cat:"Serif" },
  { name:"DM Serif Display",   cat:"Serif" },
  { name:"Libre Baskerville",  cat:"Serif" },
  { name:"EB Garamond",        cat:"Serif" },
  // Mono
  { name:"JetBrains Mono",     cat:"Mono" },
  { name:"Space Mono",         cat:"Mono" },
  { name:"IBM Plex Mono",      cat:"Mono" },
  { name:"Fira Code",          cat:"Mono" },
];

// ── SLOVENSKÉ MESTÁ + PSČ ──────────────────────────────────
// Zdroj: Slovenská pošta / GeoNames, ~120 najdôležitejších miest a obcí
const SK_CITIES = [
  {city:"Bánovce nad Bebravou",zip:"957 01"},{city:"Banská Bystrica",zip:"974 01"},
  {city:"Banská Štiavnica",zip:"969 01"},{city:"Bardejov",zip:"085 01"},
  {city:"Bernolákovo",zip:"900 27"},{city:"Bojnice",zip:"972 01"},
  {city:"Brezno",zip:"977 01"},{city:"Bytča",zip:"014 01"},
  {city:"Čadca",zip:"022 01"},{city:"Detva",zip:"962 12"},
  {city:"Dolný Kubín",zip:"026 01"},{city:"Dubnica nad Váhom",zip:"018 41"},
  {city:"Dunajská Lužná",zip:"900 42"},{city:"Dunajská Streda",zip:"929 01"},
  {city:"Fiľakovo",zip:"986 01"},{city:"Galanta",zip:"924 01"},
  {city:"Gbely",zip:"908 45"},{city:"Gelnica",zip:"056 01"},
  {city:"Handlová",zip:"972 51"},{city:"Hlohovec",zip:"920 01"},
  {city:"Humenné",zip:"066 01"},{city:"Ilava",zip:"019 01"},
  {city:"Jelšava",zip:"049 16"},{city:"Kežmarok",zip:"060 01"},
  {city:"Komárno",zip:"945 01"},{city:"Košice",zip:"040 01"},
  {city:"Kremnica",zip:"967 01"},{city:"Krupina",zip:"963 01"},
  {city:"Kysucké Nové Mesto",zip:"024 01"},{city:"Leopoldov",zip:"920 41"},
  {city:"Levice",zip:"934 01"},{city:"Levoča",zip:"054 01"},
  {city:"Liptovský Hrádok",zip:"033 01"},{city:"Liptovský Mikuláš",zip:"031 01"},
  {city:"Lučenec",zip:"984 01"},{city:"Malacky",zip:"901 01"},
  {city:"Martin",zip:"036 01"},{city:"Michalovce",zip:"071 01"},
  {city:"Modra",zip:"900 01"},{city:"Myjava",zip:"907 01"},
  {city:"Námestovo",zip:"029 01"},{city:"Nitra",zip:"949 01"},
  {city:"Nové Mesto nad Váhom",zip:"915 01"},{city:"Nové Zámky",zip:"940 01"},
  {city:"Partizánske",zip:"958 01"},{city:"Pezinok",zip:"902 01"},
  {city:"Piešťany",zip:"921 01"},{city:"Poprad",zip:"058 01"},
  {city:"Považská Bystrica",zip:"017 01"},{city:"Prešov",zip:"080 01"},
  {city:"Prievidza",zip:"971 01"},{city:"Púchov",zip:"020 01"},
  {city:"Revúca",zip:"050 01"},{city:"Rimavská Sobota",zip:"979 01"},
  {city:"Rožňava",zip:"048 01"},{city:"Ružomberok",zip:"034 01"},
  {city:"Sabinov",zip:"083 01"},{city:"Senec",zip:"903 01"},
  {city:"Senica",zip:"905 01"},{city:"Skalica",zip:"909 01"},
  {city:"Snina",zip:"069 01"},{city:"Sobrance",zip:"073 01"},
  {city:"Spišská Nová Ves",zip:"052 01"},{city:"Spišská Stará Ves",zip:"065 01"},
  {city:"Spišské Podhradie",zip:"053 04"},{city:"Staré Mesto",zip:"811 01"},
  {city:"Stará Ľubovňa",zip:"064 01"},{city:"Stará Turá",zip:"916 01"},
  {city:"Stropkov",zip:"091 01"},{city:"Stupava",zip:"900 31"},
  {city:"Svit",zip:"059 21"},{city:"Šahy",zip:"936 01"},
  {city:"Šaľa",zip:"927 01"},{city:"Šurany",zip:"942 01"},
  {city:"Tisovec",zip:"980 61"},{city:"Topoľčany",zip:"955 01"},
  {city:"Trebišov",zip:"075 01"},{city:"Trenčín",zip:"911 01"},
  {city:"Trnava",zip:"917 01"},{city:"Turčianske Teplice",zip:"039 01"},
  {city:"Tvrdošín",zip:"027 44"},{city:"Veľké Kapušany",zip:"079 01"},
  {city:"Veľký Krtíš",zip:"990 01"},{city:"Vranov nad Topľou",zip:"093 01"},
  {city:"Vráble",zip:"952 01"},{city:"Zlaté Moravce",zip:"953 01"},
  {city:"Zvolen",zip:"960 01"},{city:"Žiar nad Hronom",zip:"965 01"},
  {city:"Žilina",zip:"010 01"},
  // Bratislava - mestské časti
  {city:"Bratislava - Staré Mesto",zip:"811 01"},
  {city:"Bratislava - Ružinov",zip:"821 01"},
  {city:"Bratislava - Nové Mesto",zip:"831 01"},
  {city:"Bratislava - Petržalka",zip:"851 01"},
  {city:"Bratislava - Karlova Ves",zip:"841 04"},
  {city:"Bratislava - Dúbravka",zip:"841 02"},
  {city:"Bratislava - Rača",zip:"831 06"},
  {city:"Bratislava - Vajnory",zip:"831 07"},
  {city:"Bratislava - Devín",zip:"841 10"},
  {city:"Bratislava - Lamač",zip:"841 03"},
  {city:"Bratislava - Záhorská Bystrica",zip:"841 06"},
  {city:"Bratislava - Čunovo",zip:"851 10"},
  {city:"Bratislava - Jarovce",zip:"851 07"},
  {city:"Bratislava - Rusovce",zip:"851 08"},
  {city:"Bratislava - Podunajské Biskupice",zip:"825 06"},
  {city:"Bratislava - Vrakuňa",zip:"821 07"},
  {city:"Bratislava",zip:"811 01"},
  // Košice - mestské časti
  {city:"Košice - Staré Mesto",zip:"040 01"},
  {city:"Košice - Západ",zip:"040 11"},
  {city:"Košice - Sídlisko Ťahanovce",zip:"040 13"},
  {city:"Košice",zip:"040 01"},
  // Ďalšie väčšie obce
  {city:"Bytčica",zip:"013 32"},{city:"Chorvátsky Grob",zip:"900 25"},
  {city:"Ivanka pri Dunaji",zip:"900 28"},{city:"Lozorno",zip:"900 55"},
  {city:"Malinovo",zip:"900 45"},{city:"Most pri Bratislave",zip:"900 46"},
  {city:"Rovinka",zip:"900 41"},{city:"Svätý Jur",zip:"900 21"},
  {city:"Vinosady",zip:"902 01"},{city:"Zohor",zip:"900 51"},
].sort((a,b)=>a.city.localeCompare(b.city,"sk"));

// ── LOGO placements (odporúčané veľkosti) ──────────────────
// ── TECHNICKÉ POŽIADAVKY ────────────────────────────────────
const HOSTING_OPTIONS = [
  { id:"volt",     label:"WebQuote Hosting", desc:"Hosting spravovaný cez MediaVolt" },
  { id:"existing", label:"Existujúci hosting", desc:"Klient má vlastný hosting — len nasadiť" },
];
const CMS_OPTIONS = [
  { id:"none",      label:"Bez CMS",          desc:"Statický web, obsah sa mení priamo v kóde" },
  { id:"voltadmin", label:"WebQuote Admin",   desc:"MediaVolt administračný systém pre správu obsahu webu" },
  { id:"servicemanager", label:"Service Manager", desc:"Interný systém pre komplexnú správu prevádzok" },
  { id:"custom",    label:"Custom Admin",     desc:"Vlastný administračný systém na mieru" },
];
const FAVORITE_LANGUAGES = ["Slovenčina","Čeština","Angličtina","Nemčina"];
// Všetky jazyky (vrátane obľúbených — duplicitne) zoradené abecedne pre rollbar
const LANGUAGE_OPTIONS = [
  "Angličtina","Bengálčina","Čeština","Francúzština","Hindčina","Japončina","Maďarčina",
  "Mandarínska čínština","Nemčina","Poľština","Portugalčina","Rumunčina","Ruština",
  "Slovenčina","Španielčina","Štandardná arabčina","Ukrajinčina","Urdčina",
].sort((a,b)=>a.localeCompare(b,"sk"));
// Personalizovaný placeholder pre poznámku k odvetviu
const INDUSTRY_NOTE_HINTS = {
  automotive:    "napr. predaj a servis vozidiel, autorizovaný zástupca značky, 12 servisných boxov...",
  creative:      "napr. štýl fotografie/hudby, doterajšie referencie, typ klientely...",
  ecommerce:     "napr. počet produktov v ponuke, dodacie podmienky, prepojenie na sklad...",
  education:     "napr. cieľová veková skupina, formát výučby (online/osobne), kapacita kurzu...",
  finance:       "napr. licencované služby, regulačné požiadavky, cieľová klientela...",
  gastro:        "napr. špecializujeme sa na fine dining, 40 miest, terasa...",
  health:        "napr. zazmluvnené poisťovne, ordinačné hodiny, špecializácia...",
  manufacturing: "napr. minimálne množstvo objednávky, certifikácie, B2B klientela...",
  nonprofit:     "napr. hlavná misia, cieľová skupina podpory, transparentnosť financovania...",
  pets:          "napr. druhy zvierat, núdzová linka, kapacita penziónu...",
  public:        "napr. úradné hodiny, počet obyvateľov/zamestnancov, prepojenie na portál...",
  realty:        "napr. zameranie (predaj/prenájom/výstavba), lokalita, cenová kategória...",
  services:      "napr. oblasť špecializácie, veľkosť tímu, typický klient...",
  sportoutdoor:  "napr. typ aktivít, kapacita skupín, sezónnosť...",
  tech:          "napr. cieľová skupina používateľov, model spoplatnenia, fáza projektu...",
  travel:        "napr. typ ubytovania/zájazdov, sezónnosť, kapacita...",
  wellness:      "napr. ponúkané procedúry, kapacita prevádzky, cieľová klientela...",
};

const INTEGRATION_OPTIONS = [
  { id:"analytics",  label:"Webová analytika" },
  { id:"pixel",      label:"Sledovací pixel pre reklamu" },
  { id:"chat",       label:"Live chat" },
  { id:"newsletter", label:"E-mailing / Newsletter" },
  { id:"payment",    label:"Platobná brána" },
  { id:"booking",    label:"Rezervačný systém" },
  { id:"crm",        label:"CRM" },
  { id:"erp",        label:"ERP / účtovný systém" },
  { id:"social",     label:"Prepojenie na sociálne siete" },
  { id:"maps",       label:"Mapa" },
  { id:"sms",        label:"SMS notifikácie" },
  { id:"other",      label:"Iné (upresni v poznámke)" },
];

// ── ADMIN POZNÁMKY — na doplnenie funkcionalít ─────────────
const ADMIN_NOTES_TODO = [
  "Subdodávka registrácie domén a hostingu — dohodnúť spoluprácu s dodávateľom (napr. Websupport, WebGlobe) na zabezpečenie domén a hostingu pre klientov ako balík služby. Websupport REST API (rest.websupport.sk) je orientované na správu vlastných služieb (DNS, objednávky, fakturácia) — nemá dedikovaný endpoint na overenie dostupnosti ľubovoľnej domény, treba doriešiť cez ich obchodné oddelenie alebo partnerský program.",
  "Live overenie dostupnosti domén v appke (namiesto link-outu na SK-NIC) — vyžaduje server-side proxy (napr. Vercel serverless function) + platený API kľúč (napr. WhoisXML API, ~100 lookupov zdarma jednorazovo pri registrácii, ďalšie cez balíky one-time/monthly/yearly — presné ceny treba overiť po registrácii účtu).",
  "Zvážiť napojenie na RDAP (nástupca WHOIS pre gTLD/ccTLD) — niektoré RDAP servery povoľujú CORS a dali by sa volať priamo z frontendu bez backendu. Treba overiť, či SK-NIC RDAP endpoint CORS podporuje.",
  "Možnosť automatického návrhu hostingu v briefe podľa typu projektu (napr. e-shop → odporuč Pro tier kvôli commercial use politike na Verceli).",
];

const FREE_HOSTING_COMPARISON = [
  {
    name:"Vercel (Hobby)", commercial:false,
    bandwidth:"100 GB / mesiac", requests:"1 M function invocations, 1 M edge requests",
    build:"6 000 min / mesiac, 1 súbežný build", note:"Zákaz komerčného použitia na free tier — akýkoľvek príjem (platby, reklamy) = treba Pro ($20/sedadlo/mes.). Najlepšia voľba pre Next.js, ale s touto podmienkou treba klienta vopred upozorniť.",
  },
  {
    name:"Netlify (Free)", commercial:true,
    bandwidth:"100 GB / mesiac (~$55 za ďalších 100 GB)", requests:"125 000 function invocations / mesiac",
    build:"300 min / mesiac", note:"Komerčné použitie povolené na free tier. Presunuté na kreditový systém (300 kreditov/mesiac) — náročnejšie predvídať náklady ako pri flat-rate platformách.",
  },
  {
    name:"Cloudflare Pages (Free)", commercial:true,
    bandwidth:"Neobmedzená (žiadny hard cap)", requests:"100 000 Workers requests / deň",
    build:"500 buildov / mesiac, 1 súbežný build", note:"Najštedrejší free tier — neobmedzená šírka pásma aj pri komerčnom použití. Vhodné pre statické weby a JAMstack. Workers/D1 sú spoplatnené samostatne pri vyššom objeme.",
  },
  {
    name:"GitHub Pages (Free)", commercial:false,
    bandwidth:"~100 GB / mesiac (soft limit)", requests:"—",
    build:"~10 buildov / hodinu", note:"Len statický obsah, žiadne serverless funkcie. Komerčné použitie je explicitne proti podmienkam služby. Vhodné len pre portfólio/dokumentáciu, nie pre klientske projekty s biznis účelom.",
  },
];

const LOGO_PLACEMENTS = [
  { id:"brandkit",  label:"Kompletná brand identity", ratio:"voľný", size:"akýkoľvek formát", hint:"existujúci logomanuál / brand kit (všetky verzie naraz)" },
  { id:"header",   label:"Hlavička / Navigácia", ratio:"horizontálny", size:"~180×48 px", hint:"SVG alebo PNG s priehľadným pozadím" },
  { id:"hero",     label:"Hero / Veľký vizuál",  ratio:"voľný",        size:"min. 800 px šírka", hint:"vysoké rozlíšenie pre veľké plochy" },
  { id:"mobile",   label:"Mobilná verzia",       ratio:"štvorec / kompakt", size:"~96×96 px", hint:"zjednodušená značka pre malý priestor" },
  { id:"social",   label:"Social / OG image",    ratio:"1.91:1",       size:"1200×630 px", hint:"náhľad pri zdieľaní odkazu" },
  { id:"footer",   label:"Pätička",              ratio:"horizontálny", size:"~160×40 px", hint:"často svetlá / monochromatická verzia" },
  { id:"favicon",  label:"Favicon / Ikona",      ratio:"štvorec 1:1",  size:"512×512 px", hint:"značka bez textu, čitateľná v malom" },
];

// Google Fonts URL — všetky fonty naraz pre náhľady
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?" +
  FONT_OPTIONS.filter(f=>f.name!=="Clash Display")
    .map(f=>"family="+f.name.replace(/ /g,"+")+":wght@400;600;700")
    .join("&") + "&display=swap";

const TYPE_DEFAULTS = {
  landing:   ["nav","hero","features","logos","testimonials","cta","footer","cookies","scrolltop"],
  corporate: ["nav","hero","about","services","team","stats","contact","footer","cookies","scrolltop"],
  ecommerce: ["nav","hero","products","features","testimonials","newsletter","footer","cookies","scrolltop"],
  portfolio: ["nav","hero","work","about","process","contact","footer","scrolltop"],
};

const ADDRESS_TYPES = [
  { id:"headquarters", label:"Sídlo firmy",         icon:"🏛" },
  { id:"office",       label:"Kancelária",           icon:"🏢" },
  { id:"store",        label:"Prevádzka / predajňa", icon:"🏪" },
  { id:"warehouse",    label:"Sklad",                icon:"📦" },
  { id:"other",        label:"Iná adresa",           icon:"📍" },
];

function makeAddress(type) {
  return { id:Math.random().toString(36).slice(2,8), type:type||"office", street:"", city:"", zip:"", country:"Slovensko" };
}

// ── PODKLADY — linky na súbory od klienta ───────────────────
const ASSET_TYPES = [
  { id:"photos",  label:"Fotky / galéria",   icon:"📷" },
  { id:"logo",    label:"Logo",              icon:"⬡"  },
  { id:"brand",   label:"Brand manuál",      icon:"🎨" },
  { id:"texts",   label:"Texty / dokumenty", icon:"📄" },
  { id:"video",   label:"Video",             icon:"🎬" },
  { id:"archive", label:"ZIP so všetkým",    icon:"🗜" },
  { id:"other",   label:"Iné",               icon:"📎" },
];
const UPLOAD_SERVICES = [
  { name:"Úschovna.cz",  url:"https://www.uschovna.cz",  note:"zadarmo do 30 GB, bez registrácie" },
  { name:"WeTransfer",   url:"https://wetransfer.com",   note:"zadarmo do 2 GB, bez registrácie" },
  { name:"Google Drive", url:"https://drive.google.com", note:"zdieľanie cez odkaz (nastav „ktokoľvek s odkazom“)" },
];
function makeAsset(type) {
  return { id:Math.random().toString(36).slice(2,8), type:type||"photos", url:"", note:"" };
}

const MENU_ITEMS = [
  { id:"info",     label:"Základné info",  icon:"🏢" },
  { id:"brief",    label:"Brief",          icon:"📋" },
  { id:"sections", label:"Obsah",          icon:"☰"  },
  { id:"brand",    label:"Brand",          icon:"🎨" },
];

const DEFAULT_BRIEF = {
  projectName:"", webType:"landing", lang:"sk",
  industry:"", industrySubcat:"", industryNote:"", industryExtras:[],
  companyName:"", ico:"", dic:"", icdph:"",
  phone:"", email:"", web:"",
  addresses: [makeAddress("headquarters")],
  pageStructure:"onepage", subpages:"",
  colorTheme:"dark", themeToggle:"no",
  navBehavior:"sticky", navBackground:"solid", navLayout:"top", navLogo:"left",
  navAlwaysHamburger:false, navSocials:false,
  heroStyle:"minimal", heroMedia:"none", heroMediaUrl:"", heroSlider:"",
  heroSeo:"", heroCtas:[],
  sectionNotes:{},
  goal:"", audience:"", tone:"", brief:"", extra:"",
  assets:[],
  sections: TYPE_DEFAULTS.landing,
  logoChoice:"", logoKeepRedesign:"", logoUploads:{}, logoBrief:"", logoRefs:[],
  domainStatus:"", domains:[""],
  robotsAllowAll:true, robotsDisallow:"", robotsSitemap:true, robotsExtra:"",
  sitemapChangefreq:"weekly", sitemapPriorityHome:"1.0", sitemapExtra:"",
  adminMdNotes:"", prelaunchChecked:{},
  techHosting:"", techHostingNote:"", techCms:"", techLanguages:[], techIntegrations:[], techNote:"",
  brand: PRESETS["Midnight Indigo Dark"], preset:"Midnight Indigo Dark",
};

// ─── GENERATORS ───────────────────────────────────────────
// Prompt generátor je v src/promptGen.js (generateProPrompt) —
// profesionálna ready-to-go špecifikácia pre AI web buildery.

/* legacy generatePrompt — nahradený generateProPrompt
function generatePrompt(b) {
  return `# Web Development Brief — ${b.projectName || "Bez názvu"}

## Základné informácie
**Projekt / web:** ${b.projectName || "—"}
**Firma:** ${b.companyName || "—"}
${b.ico ? `**IČO:** ${b.ico}` : ""}${b.dic ? `  **DIČ:** ${b.dic}` : ""}${b.icdph ? `  **IČ DPH:** ${b.icdph}` : ""}
**Telefón:** ${b.phone || "—"}
**Email:** ${b.email || "—"}
**Web:** ${b.web || "—"}

## Adresy
${addrLines || "—"}

## Projekt
**Typ:** ${typeLabel}
**Štruktúra:** ${b.pageStructure==="onepage"?"One-page":"Viac stránok"}${b.subpages?` (${b.subpages})`:""}
**Farebná téma:** ${{light:"Svetlá",dark:"Tmavá",system:"Podľa systému"}[b.colorTheme]||"—"}
**Prepínač témy:** ${b.themeToggle==="yes"?"Áno — daj prepínač":"Nie — fixná téma"}
**Navigácia:** ${b.navBehavior||"sticky"} / ${b.navBackground||"solid"} / ${b.navLayout||"top"} / logo ${b.navLogo||"left"}${b.navAlwaysHamburger?" / vždy hamburger":""}${b.navSocials?" / socials v nav":""}
**Cieľ:** ${b.goal || "—"}
**Cieľová skupina:** ${b.audience || "—"}
**Tón:** ${b.tone || "—"}

## Popis
${b.brief || "—"}
${b.extra ? `\n## Dodatočné požiadavky\n${b.extra}` : ""}

## Technické požiadavky
**Doména:** ${b.domainStatus==="have"?"Klient MÁ doménu/y":b.domainStatus==="need"?"Klient POTREBUJE doménu/y":"—"}${(b.domains&&b.domains.filter(d=>d.trim()).length)?` — ${b.domains.filter(d=>d.trim()).join(", ")}`:""}
**Hosting:** ${HOSTING_OPTIONS.find(h=>h.id===b.techHosting)?.label||"—"}${b.techHostingNote?` (${b.techHostingNote})`:""}
**CMS:** ${CMS_OPTIONS.find(cm=>cm.id===b.techCms)?.label||"—"}
**Jazyky:** ${(b.techLanguages&&b.techLanguages.length)?b.techLanguages.join(", "):"—"}
**Integrácie:** ${(b.techIntegrations&&b.techIntegrations.length)?b.techIntegrations.map(id=>INTEGRATION_OPTIONS.find(i=>i.id===id)?.label||id).join(", "):"—"}
${b.techNote?`**Poznámka:** ${b.techNote}`:""}

## Logo
${b.logoChoice==="create"
  ? `Klient chce VYTVORIŤ nové logo.${b.logoBrief?`\nPredstava: ${b.logoBrief}`:""}${(b.logoRefs&&b.logoRefs.length)?`\nReferenčné návrhy: ${b.logoRefs.length} ks priložených`:""}`
  : b.logoChoice==="have"
    ? `Klient MÁ logo — ${b.logoKeepRedesign==="redesign"?"chce ho REDIZAJNOVAŤ":"chce ho PONECHAŤ bez zmien"}.${
        (b.logoUploads&&Object.keys(b.logoUploads).length)
          ? `\nNahraté verzie: ${Object.keys(b.logoUploads).map(id=>{const p=LOGO_PLACEMENTS.find(x=>x.id===id);return p?p.label:id;}).join(", ")}`
          : ""}`
    : "Logo nešpecifikované."}

## Brand tokeny
\`\`\`
Pozadie:      ${b.brand.bg}
Surface:      ${b.brand.surface}
Border:       ${b.brand.border}
Text:         ${b.brand.text}
Muted:        ${b.brand.muted}
Primárna:     ${b.brand.primary}
Accent:       ${b.brand.accent}
Display font: ${b.brand.fontDisplay}
Body font:    ${b.brand.fontBody}
\`\`\`

## Hero sekcia
${b.sections.includes("hero") ? `**Štýl:** ${({minimal:"Minimalistický",["3d"]:"Advanced 3D",modern:"Moderný",info:"Informačný",sales:"Predajný"})[b.heroStyle]||"—"}
**SEO nadpis:** ${b.heroSeo||"—"}
**CTA tlačidlá:** ${(b.heroCtas&&b.heroCtas.length)?b.heroCtas.map(id=>{const x=SECTIONS.find(s=>s.id===id);return x?x.label:id;}).join(", "):"—"}
**Vizuál:** ${({none:"Bez média",image:"Obrázok",video:"Video",["3dscene"]:"3D scéna",carousel:"Carousel",custom:"Custom vizuál"})[b.heroMedia]||"—"}${b.heroMediaUrl?` (${b.heroMediaUrl})`:""}` : "Hero sekcia nie je zapnutá."}

## Štruktúra (${b.sections.length} sekcií — v tomto poradí)
${sectionList}

## Technické požiadavky na kód
- React JSX, single file, default export
- Inline CSS s CSS custom properties, žiadny Tailwind
- Mobile-first, breakpoint 768px
- Accessibility: skip link, focus-visible, aria-label, reduced motion
- Spacing: 4px base škála
- Z-index: sticky 200 / modal 300 / toast 400
- Reálny obsah — žiadny Lorem Ipsum
- Tón: ${b.tone || "profesionálny, čistý"}

## Výstup
Kompletný React JSX súbor — všetky sekcie implementované s reálnym obsahom, bez TODO komentárov.`;
}
legacy end */

function generateCode(b) {
  const name = (b.projectName || "MyProject").replace(/[^a-zA-Z0-9]/g, "") || "MyProject";
  const typeLabel = WEB_TYPES_BASE.find(t => t.id === b.webType)?.label || b.webType;
  const blocks = b.sections.map(id => {
    const s = SECTIONS_BASE.find(s => s.id === id);
    return `\n  {/* ══ ${s?.label} — ${s?.desc} ══ */}\n  <section id="${id}" style={{padding:"var(--sp-96) 0"}}>\n    <div className="container">{/* TODO */}</div>\n  </section>`;
  }).join("\n");

  return `// ${name} — ${typeLabel} — ${new Date().toLocaleDateString("sk-SK")}
// Sekcie: ${b.sections.join(", ")}

import { useState, useEffect } from "react";

const T = {
  bg:"${b.brand.bg}", surface:"${b.brand.surface}", border:"${b.brand.border}",
  text:"${b.brand.text}", muted:"${b.brand.muted}",
  primary:"${b.brand.primary}", accent:"${b.brand.accent}",
  fd:"'${b.brand.fontDisplay}',sans-serif",
  fb:"'${b.brand.fontBody}',sans-serif",
};

const CSS = \`
  :root {
    --bg:\${T.bg}; --surface:\${T.surface}; --border:\${T.border};
    --text:\${T.text}; --muted:\${T.muted};
    --primary:\${T.primary}; --accent:\${T.accent};
    --fd:\${T.fd}; --fb:\${T.fb};
    --sp-4:4px;--sp-8:8px;--sp-12:12px;--sp-16:16px;
    --sp-24:24px;--sp-32:32px;--sp-48:48px;--sp-64:64px;--sp-96:96px;
    --z-sticky:200;--z-modal:300;--z-toast:400;
  }
  *,*::before,*::after{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--fb);}
  h1,h2,h3,h4,h5,h6,p,ul,ol{margin:0;}
  img,video{max-width:100%;display:block;}
  button,a{min-height:44px;}
  :focus-visible{outline:2px solid var(--primary);outline-offset:3px;}
  @media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;}}
  .container{max-width:1280px;margin-inline:auto;padding-inline:1.5rem;}
\`;

export default function ${name}() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS; document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  return (
    <main id="main">
${blocks}
    </main>
  );
}`;
}

// ─── ROBOTS.TXT GENERÁTOR ───────────────────────────────────
function generateRobots(b) {
  const domain = (b.domains && b.domains.find(d=>d.trim())) || "vasadomena.sk";
  const lines = [];
  lines.push(`User-agent: *`);
  if (b.robotsAllowAll) {
    lines.push(`Allow: /`);
  } else {
    lines.push(`Disallow: /`);
  }
  if (b.robotsDisallow && b.robotsDisallow.trim()) {
    b.robotsDisallow.split(",").map(s=>s.trim()).filter(Boolean).forEach(path=>{
      lines.push(`Disallow: ${path.startsWith("/")?path:"/"+path}`);
    });
  }
  if (b.robotsExtra && b.robotsExtra.trim()) {
    lines.push("");
    lines.push(b.robotsExtra.trim());
  }
  if (b.robotsSitemap) {
    lines.push("");
    lines.push(`Sitemap: https://${domain.replace(/^https?:\/\//,"")}/sitemap.xml`);
  }
  return lines.join("\n") + "\n";
}

// ─── SITEMAP.XML GENERÁTOR ──────────────────────────────────
function generateSitemap(b) {
  const domain = (b.domains && b.domains.find(d=>d.trim())) || "vasadomena.sk";
  const base = `https://${domain.replace(/^https?:\/\//,"")}`;
  const today = new Date().toISOString().slice(0,10);
  const freq = b.sitemapChangefreq || "weekly";

  let urls = [];
  if (b.pageStructure === "multipage" && b.subpages && b.subpages.trim()) {
    urls = b.subpages.split(",").map(s=>s.trim()).filter(Boolean);
  }

  const entries = [
    `  <url>\n    <loc>${base}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${b.sitemapPriorityHome||"1.0"}</priority>\n  </url>`,
    ...urls.map(p=>{
      const slug = p.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
        .replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
      return `  <url>\n    <loc>${base}/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>0.7</priority>\n  </url>`;
    }),
  ];

  let extraEntries = "";
  if (b.sitemapExtra && b.sitemapExtra.trim()) {
    extraEntries = "\n" + b.sitemapExtra.split(",").map(s=>s.trim()).filter(Boolean).map(p=>{
      const path = p.startsWith("/") ? p : "/"+p;
      return `  <url>\n    <loc>${base}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>0.5</priority>\n  </url>`;
    }).join("\n");
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}${extraEntries}\n</urlset>\n`;
}



// ─── INDUSTRY → SCHEMA.ORG TYPE MAPOVANIE ──────────────────
const SCHEMA_TYPE_MAP = {
  gastro:"Restaurant", wellness:"HealthAndBeautyBusiness", services:"ProfessionalService",
  ecommerce:"OnlineStore", realty:"RealEstateAgent", health:"MedicalBusiness",
  education:"EducationalOrganization", tech:"SoftwareApplication", creative:"Person",
  nonprofit:"NGO", automotive:"AutomotiveBusiness", finance:"FinancialService",
  manufacturing:"Organization", pets:"Store", public:"GovernmentOrganization",
  sportoutdoor:"SportsActivityLocation", travel:"TouristTrip",
};

// ─── META TAGS / OPEN GRAPH GENERÁTOR ──────────────────────
function generateMetaTags(b) {
  const domain = (b.domains && b.domains.find(d=>d.trim())) || "vasadomena.sk";
  const base = `https://${domain.replace(/^https?:\/\//,"")}`;
  const title = b.projectName || "Názov projektu";
  const desc = (b.heroSeo || b.brief || "Popis stránky pre vyhľadávače a sociálne siete.").slice(0,160);
  const lang = (b.techLanguages && b.techLanguages[0]) ? b.techLanguages[0] : "Slovenčina";
  const langCode = lang.toLowerCase().startsWith("angl") ? "en" : lang.toLowerCase().startsWith("nem") ? "de" : lang.toLowerCase().startsWith("česk") ? "cs" : "sk";
  const ogImage = (b.logoUploads && b.logoUploads.social) ? `${base}/og-image.jpg` : `${base}/og-image.jpg  <!-- nahraď reálnym obrázkom 1200×630 px -->`;

  return `<!-- Primárne meta tagy -->
<title>${title}</title>
<meta name="description" content="${desc}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<html lang="${langCode}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="${base}/" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:locale" content="${langCode}_${langCode.toUpperCase()}" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="${base}/" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:image" content="${ogImage}" />

<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

<!-- Canonical -->
<link rel="canonical" href="${base}/" />
`;
}

// ─── SCHEMA.ORG JSON-LD GENERÁTOR ───────────────────────────
function generateSchemaOrg(b) {
  const domain = (b.domains && b.domains.find(d=>d.trim())) || "vasadomena.sk";
  const base = `https://${domain.replace(/^https?:\/\//,"")}`;
  const type = SCHEMA_TYPE_MAP[b.industry] || "Organization";
  const addr = (b.addresses && b.addresses[0]) || {};
  const name = b.companyName || b.projectName || "Názov firmy";

  const obj = {
    "@context": "https://schema.org",
    "@type": type,
    "name": name,
    "url": base,
    ...(b.logoUploads && b.logoUploads.header ? { "logo": `${base}/logo.png` } : {}),
    ...(b.phone ? { "telephone": b.phone } : {}),
    ...(b.email ? { "email": b.email } : {}),
    ...((addr.street || addr.city) ? {
      "address": {
        "@type": "PostalAddress",
        ...(addr.street ? { "streetAddress": addr.street } : {}),
        ...(addr.city ? { "addressLocality": addr.city } : {}),
        ...(addr.zip ? { "postalCode": addr.zip } : {}),
        "addressCountry": addr.country || "SK",
      }
    } : {}),
    ...(b.ico ? { "vatID": b.icdph || b.ico } : {}),
  };

  return JSON.stringify(obj, null, 2);
}

// ─── .ENV.EXAMPLE GENERÁTOR ──────────────────────────────────
const INTEGRATION_ENV_VARS = {
  analytics:  ["NEXT_PUBLIC_GA_MEASUREMENT_ID="],
  pixel:      ["NEXT_PUBLIC_META_PIXEL_ID="],
  chat:       ["NEXT_PUBLIC_CHAT_WIDGET_ID="],
  newsletter: ["EMAIL_PROVIDER_API_KEY=", "EMAIL_PROVIDER_LIST_ID="],
  payment:    ["PAYMENT_GATEWAY_PUBLIC_KEY=", "PAYMENT_GATEWAY_SECRET_KEY="],
  booking:    ["BOOKING_API_KEY="],
  crm:        ["CRM_API_KEY=", "CRM_API_URL="],
  erp:        ["ERP_API_KEY=", "ERP_API_URL="],
  social:     ["NEXT_PUBLIC_FACEBOOK_URL=", "NEXT_PUBLIC_INSTAGRAM_URL="],
  maps:       ["NEXT_PUBLIC_MAPS_API_KEY="],
  sms:        ["SMS_PROVIDER_API_KEY="],
};
function generateEnvExample(b) {
  const lines = ["# .env.example", "# Skopíruj na .env a doplň reálne hodnoty — nikdy necommituj .env do gitu!", ""];

  lines.push("# Základné");
  lines.push(`NEXT_PUBLIC_SITE_URL=https://${(b.domains&&b.domains.find(d=>d.trim()))||"vasadomena.sk"}`);
  lines.push("");

  if (b.techCms && b.techCms !== "none") {
    lines.push("# CMS");
    if (b.techCms==="voltadmin") lines.push("VOLT_ADMIN_API_KEY=");
    if (b.techCms==="servicemanager") lines.push("SERVICE_MANAGER_API_KEY=");
    if (b.techCms==="custom") lines.push("ADMIN_API_KEY=");
    lines.push("");
  }

  const activeIntegrations = (b.techIntegrations||[]).filter(id=>INTEGRATION_ENV_VARS[id]);
  if (activeIntegrations.length) {
    lines.push("# Integrácie");
    activeIntegrations.forEach(id=>{
      const opt = INTEGRATION_OPTIONS.find(x=>x.id===id);
      lines.push(`# ${opt?opt.label:id}`);
      INTEGRATION_ENV_VARS[id].forEach(v=>lines.push(v));
    });
    lines.push("");
  }

  if (b.techHosting==="volt") {
    lines.push("# Volt Hosting");
    lines.push("VOLT_HOSTING_DEPLOY_TOKEN=");
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

// ─── README.MD PRE ODOVZDANIE PROJEKTU ──────────────────────
function generateReadme(b) {
  const domain = (b.domains && b.domains.find(d=>d.trim())) || "—";
  const today = new Date().toLocaleDateString("sk-SK");
  const sectionList = (b.sections||[]).map(id=>{
    const s = SECTIONS_BASE.find(x=>x.id===id);
    return s ? `- ${s.label}` : null;
  }).filter(Boolean).join("\n");

  return `# ${b.projectName || "Názov projektu"}

Odovzdávacia dokumentácia projektu. Vygenerované: ${today}

## Základné info
- **Firma:** ${b.companyName || "—"}
- **IČO:** ${b.ico || "—"}
- **Kontakt:** ${b.email || "—"} / ${b.phone || "—"}
- **Doména:** ${domain}
- **Odvetvie:** ${INDUSTRIES_BASE.find(i=>i.id===b.industry)?.label || "—"}

## Technické info
- **Hosting:** ${HOSTING_OPTIONS.find(h=>h.id===b.techHosting)?.label || "—"}${b.techHostingNote?` (${b.techHostingNote})`:""}
- **CMS:** ${CMS_OPTIONS.find(c=>c.id===b.techCms)?.label || "—"}
- **Jazyky:** ${(b.techLanguages||[]).join(", ") || "—"}
- **Štruktúra:** ${b.pageStructure==="onepage"?"One-page":"Viac stránok"}

## Brand
- **Preset:** ${b.preset || "—"}
- **Primárna farba:** ${b.brand?.primary || "—"}
- **Fonty:** ${b.brand?.fontDisplay || "—"} / ${b.brand?.fontBody || "—"}

## Sekcie webu (${(b.sections||[]).length})
${sectionList || "—"}

## Integrácie
${(b.techIntegrations||[]).length ? b.techIntegrations.map(id=>{
  const opt = INTEGRATION_OPTIONS.find(x=>x.id===id);
  return `- ${opt?opt.label:id}`;
}).join("\n") : "Žiadne"}

## Ďalšie kroky pred spustením
- [ ] Nahrať finálne logo vo všetkých formátoch
- [ ] Doplniť reálny obsah (nie placeholder text)
- [ ] Nastaviť .env premenné (pozri .env.example)
- [ ] Otestovať na mobile/tablet/desktop
- [ ] Skontrolovať SEO (meta tagy, sitemap, robots.txt)
- [ ] Pridať Google Analytics / sledovanie
- [ ] Otestovať rýchlosť načítania (PageSpeed Insights)
- [ ] Nastaviť SSL certifikát
- [ ] Presmerovať doménu na hosting

---
*Vygenerované cez [WebQuote](https://mediavolt.org) by MediaVolt*
`;
}

// ─── COOKIE CONSENT TEXT ─────────────────────────────────────
const COOKIE_CATEGORY_MAP = {
  analytics:  { name:"Analytické cookies", desc:"Pomáhajú nám pochopiť ako návštevníci používajú web (Google Analytics a podobne)." },
  pixel:      { name:"Marketingové cookies", desc:"Používajú sa na zobrazovanie relevantnej reklamy na sociálnych sieťach." },
  chat:       { name:"Funkčné cookies — chat", desc:"Umožňujú fungovanie live chatu a zapamätanie konverzácie." },
  newsletter: { name:"Marketingové cookies — email", desc:"Sledujú efektivitu emailových kampaní." },
  social:     { name:"Cookies sociálnych sietí", desc:"Umožňujú zdieľanie obsahu a prepojenie s vašimi profilmi na sociálnych sieťach." },
  maps:       { name:"Cookies mapových služieb", desc:"Umožňujú zobrazenie interaktívnej mapy (napr. Google Maps)." },
};
function generateCookieConsent(b) {
  const companyName = b.companyName || b.projectName || "naša spoločnosť";
  const activeCategories = (b.techIntegrations||[])
    .map(id=>COOKIE_CATEGORY_MAP[id])
    .filter(Boolean);

  let txt = `# Súhlas s používaním cookies

Táto webová stránka (${companyName}) používa cookies na zabezpečenie základnej funkčnosti webu a na zlepšenie vášho zážitku z prehliadania.

## Nevyhnutné cookies
Tieto cookies sú potrebné pre základnú funkčnosť webu a nemožno ich vypnúť. Nezbierajú žiadne osobné údaje.
`;

  if (activeCategories.length) {
    activeCategories.forEach(cat=>{
      txt += `\n## ${cat.name}\n${cat.desc}\n`;
    });
  } else {
    txt += `\n## Voliteľné cookies\nV tejto chvíli web nepoužíva žiadne ďalšie kategórie cookies nad rámec nevyhnutných.\n`;
  }

  txt += `
## Vaše možnosti
Kliknutím na "Prijať všetky" súhlasíte s použitím všetkých cookies. Kliknutím na "Odmietnuť" budú aktívne len nevyhnutné cookies. Svoje nastavenia môžete kedykoľvek zmeniť v pätičke webu.

*Toto je základná šablóna textu — pred nasadením odporúčame nechať skontrolovať právnikom alebo špecialistom na GDPR, najmä pri spracovaní citlivých údajov alebo cezhraničnom prenose dát.*
`;
  return txt;
}

// ─── FAVICON CHECKLIST ───────────────────────────────────────
const FAVICON_CHECKLIST = [
  { size:"16×16 px",   file:"favicon-16x16.png", note:"Klasická veľkosť pre staršie prehliadače" },
  { size:"32×32 px",   file:"favicon-32x32.png", note:"Štandardná veľkosť favicon v karte prehliadača" },
  { size:"48×48 px",   file:"favicon-48x48.png", note:"Windows ikony, niektoré staršie systémy" },
  { size:"180×180 px", file:"apple-touch-icon.png", note:"iOS — pridanie na plochu" },
  { size:"192×192 px", file:"android-chrome-192x192.png", note:"Android — domovská obrazovka" },
  { size:"512×512 px", file:"android-chrome-512x512.png", note:"Android — splash screen, PWA" },
  { size:"32×32 px (.ico)", file:"favicon.ico", note:"Univerzálny formát, fallback pre staré prehliadače" },
  { size:"akýkoľvek",  file:"site.webmanifest", note:"PWA manifest — názov appky, farby, ikony" },
];

// ─── PRE-LAUNCH CHECKLIST ────────────────────────────────────
const PRELAUNCH_CHECKLIST_ITEMS = [
  { id:"favicon",   label:"Favicon nahraný vo všetkých veľkostiach", cat:"Vizuál" },
  { id:"logo",      label:"Finálne logo nahraté (nie placeholder)", cat:"Vizuál" },
  { id:"content",   label:"Všetok obsah je reálny (žiadny Lorem Ipsum)", cat:"Obsah" },
  { id:"images",    label:"Obrázky optimalizované (komprimované, správny formát)", cat:"Obsah" },
  { id:"links",     label:"Všetky odkazy funkčné, žiadne 404", cat:"Obsah" },
  { id:"forms",     label:"Formuláre odosielajú a validujú správne", cat:"Funkčnosť" },
  { id:"mobile",     label:"Otestované na mobile / tablet / desktop", cat:"Funkčnosť" },
  { id:"browsers",   label:"Otestované v hlavných prehliadačoch (Chrome, Safari, Firefox)", cat:"Funkčnosť" },
  { id:"speed",      label:"Rýchlosť načítania otestovaná (PageSpeed Insights)", cat:"Výkon" },
  { id:"ssl",        label:"SSL certifikát aktívny (https)", cat:"Bezpečnosť" },
  { id:"analytics",  label:"Analytika / sledovanie zapojené", cat:"SEO" },
  { id:"meta",       label:"Meta tagy a Open Graph nastavené", cat:"SEO" },
  { id:"sitemap",    label:"Sitemap.xml a robots.txt nahraté", cat:"SEO" },
  { id:"cookies",    label:"Cookie banner funkčný a textovo správny", cat:"Právne" },
  { id:"gdpr",       label:"Ochrana osobných údajov / VOP zverejnené", cat:"Právne" },
  { id:"domain",     label:"Doména presmerovaná na hosting", cat:"Nasadenie" },
  { id:"backup",     label:"Záloha pred spustením vytvorená", cat:"Nasadenie" },
  { id:"redirect",   label:"Presmerovania zo starého webu nastavené (ak existuje)", cat:"Nasadenie" },
];

// ─── HUMANS.TXT GENERÁTOR ────────────────────────────────────
function generateHumansTxt(b) {
  const today = new Date().toLocaleDateString("sk-SK");
  return `/* TEAM */
Agentúra: MediaVolt
Web: https://mediavolt.org
Lokalita: Bratislava, Slovensko

/* PROJEKT */
Názov: ${b.projectName || "—"}
Klient: ${b.companyName || "—"}
Vytvorené: ${today}
Technológie: ${b.techCms && b.techCms!=="none" ? CMS_OPTIONS.find(c=>c.id===b.techCms)?.label : "Statický web"}

/* ĎAKUJEME */
Štandard humans.txt: https://humanstxt.org/
`;
}

function generateSessionId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getRole() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("admin") === "1") return "admin";
  return "client";
}

function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session") || generateSessionId();
}

// ─── CLIENT VIEW ──────────────────────────────────────────

// ─── UNIFIED BUILDER VIEW (client + admin) ────────────────

// Poradie: najprv DÁTA (údaje, texty, obsah, podklady), potom DIZAJN,
// nakoniec technické detaily.
const ACCORDION_BASE = [
  {
    id:"info", label:"Základné údaje", icon:"🏢",
    subs:[
      { id:"info-project",  label:"Projekt" },
      { id:"info-industry", label:"Odvetvie" },
      { id:"info-company",  label:"Firemné údaje" },
      { id:"info-address",  label:"Adresy" },
    ],
  },
  {
    id:"brief", label:"Zadanie a texty", icon:"📋",
    subs:[
      { id:"brief-type",      label:"Typ webu" },
      { id:"brief-structure", label:"Štruktúra stránky" },
      { id:"brief-goal",      label:"Cieľ a publikum" },
      { id:"brief-desc",      label:"Popis projektu" },
    ],
  },
  {
    id:"content", label:"Obsah webu", icon:"☰",
    subs:[
      { id:"content-core",    label:"Základ" },
      { id:"content-content", label:"Obsah" },
      { id:"content-social",  label:"Social proof" },
      { id:"content-convert", label:"Konverzia" },
      { id:"content-extra",   label:"Extra" },
    ],
  },
  {
    id:"assets", label:"Podklady a súbory", icon:"📎",
    subs:[
      { id:"assets-files", label:"Linky na podklady" },
    ],
  },
  {
    id:"brand", label:"Dizajn", icon:"🎨",
    subs:[
      { id:"brand-logo",   label:"Logo" },
      { id:"brand-preset", label:"Presety" },
      { id:"brand-colors", label:"Farby" },
      { id:"brand-fonts",  label:"Typografia" },
      { id:"brief-nav",    label:"Navigácia & Téma" },
    ],
  },
  {
    id:"tech", label:"Technické detaily", icon:"⚙️",
    subs:[
      { id:"info-details", label:"Doména, hosting, CMS" },
    ],
  },
];

// ── Poradie blokov v strede (flex order) — dáta najprv, dizajn potom ──
const BLOCK_ORDER = {
  "info-project":1, "info-industry":2, "info-company":3, "info-address":4,
  "brief-type":5, "brief-structure":6, "brief-goal":7, "brief-desc":8,
  "content-core":9, "content-content":10, "content-social":11, "content-convert":12, "content-extra":13,
  "assets-files":14,
  "brand-logo":15, "brand-preset":16, "brand-colors":17, "brand-fonts":18, "brief-nav":19,
  "info-details":20,
  "wiz-summary":21,
};
const CAT_BLOCK_ORDER = { core:9, content:10, social:11, convert:12, extra:13 };

// ── WIZARD — sprievodca pre jednoduchý režim ────────────────
// Každý krok = zoznam blokov, ktoré sú v ňom viditeľné.
const WIZARD_STEPS = [
  { id:"data",    icon:"🏢", blocks:["info-project","info-industry","info-company","info-address"] },
  { id:"texts",   icon:"📝", blocks:["brief-type","brief-goal","brief-desc"] },
  { id:"content", icon:"☰",  blocks:["content-core","content-content","content-social","content-convert","content-extra"] },
  { id:"assets",  icon:"📎", blocks:["assets-files"] },
  { id:"design",  icon:"🎨", blocks:["brand-logo","brand-preset"] },
  { id:"summary", icon:"✅", blocks:["wiz-summary"] },
];
const ALL_BLOCK_IDS = Object.keys(BLOCK_ORDER);

const WF_SECTIONS = {
  nav:{h:28,label:"Nav"}, hero:{h:90,label:"Hero"}, features:{h:70,label:"Features"},
  about:{h:60,label:"O nás"}, services:{h:70,label:"Služby"}, products:{h:80,label:"Produkty"},
  work:{h:75,label:"Práce"}, team:{h:65,label:"Tím"}, process:{h:55,label:"Proces"},
  pricing:{h:70,label:"Cenník"}, faq:{h:50,label:"FAQ"}, testimonials:{h:60,label:"Referencie"},
  logos:{h:35,label:"Logá"}, stats:{h:45,label:"Stats"}, cta:{h:55,label:"CTA"},
  contact:{h:65,label:"Kontakt"}, newsletter:{h:45,label:"Newsletter"}, cookies:{h:24,label:"Cookies"},
  scrolltop:{h:20,label:"↑ Top"}, "404":{h:60,label:"404"}, darkmode:{h:20,label:"Dark"},
  loader:{h:20,label:"Loader"}, search:{h:20,label:"Search"}, footer:{h:40,label:"Footer"},
};
const NEUTRAL_SECS = ["nav","footer","logos","stats","cookies","scrolltop","darkmode","loader","search"];

export function BuilderView({ sessionId, brief, update, theme, setTheme, isAdmin }) {
  // ── i18n: lokalizované dátové zdroje podľa jazyka briefu ──
  const lang = brief.lang || "sk";
  const SECTIONS   = useMemo(() => localizeSections(SECTIONS_BASE, lang), [lang]);
  const ACCORDION  = useMemo(() => localizeAccordion(ACCORDION_BASE, lang), [lang]);
  const INDUSTRIES = useMemo(() => localizeIndustries(INDUSTRIES_BASE, lang), [lang]);
  const WEB_TYPES  = useMemo(() => localizeWebTypes(WEB_TYPES_BASE, lang), [lang]);
  const T = (k) => tr(lang, k);

  // ── jednoduchý / expert režim (lokálna voľba používateľa) ──
  const [uiMode, setUiModeRaw] = useState(() => {
    try { return localStorage.getItem("wq_ui_mode") || (isAdmin ? "expert" : "simple"); }
    catch { return isAdmin ? "expert" : "simple"; }
  });
  const setUiMode = (m) => {
    setUiModeRaw(m);
    if (m === "simple") setWizStep(0);
    try { localStorage.setItem("wq_ui_mode", m); } catch {}
  };
  const simple = uiMode === "simple";

  // ── Wizard (jednoduchý režim) — krokový sprievodca ──
  const [wizStep, setWizStep] = useState(0);
  const wizVisible = new Set(WIZARD_STEPS[Math.min(wizStep, WIZARD_STEPS.length-1)].blocks);
  const centerRef = useRef(null);
  const gotoWizStep = (i) => {
    setWizStep(Math.max(0, Math.min(WIZARD_STEPS.length-1, i)));
    if (centerRef.current) centerRef.current.scrollTop = 0;
  };

  const [activeSub, setActiveSub] = useState("info-project");
  const [openAcc, setOpenAcc]     = useState({ info:true, brief:false, content:false, assets:false, brand:false, tech:false });
  const [rightMode, setRightMode] = useState("wireframe"); // wireframe | prompt | code
  const [copied, setCopied]       = useState(false);
  const [expandedSec, setExpSec]  = useState(null); // id of section with open detail panel
  const [presetOpen, setPresetOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [fontsOpen, setFontsOpen]   = useState(false);
  const [industryOpen, setIndustryOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [infoPopup, setInfoPopup] = useState(null);
  const [citySearch, setCitySearch] = useState({}); // {[addrId]: {query, open}}
  const [industrySearch, setIndustrySearch] = useState("");
  const [dragId, setDragId]       = useState(null); // section being dragged
  const [dragOver, setDragOver]   = useState(null); // section currently hovered over
  const [leftOpen, setLeftOpen]   = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightSize, setRightSize] = useState("normal"); // normal | wide | full | overlay
  const [isMobile, setIsMobile]   = useState(typeof window!=="undefined" && window.innerWidth<860);
  const [mobilePane, setMobilePane] = useState("form"); // mobile: nav | form | preview

  useEffect(()=>{
    const onResize=()=>{
      const m = window.innerWidth<860;
      setIsMobile(m);
      if(m){ setLeftOpen(false); setRightOpen(false); setRightSize("normal"); }
      else { setLeftOpen(true); setRightOpen(true); }
    };
    window.addEventListener("resize", onResize);
    return ()=>window.removeEventListener("resize", onResize);
  },[]);

  // Načítaj Google Fonts pre náhľady
  useEffect(()=>{
    if(typeof document==="undefined") return;
    if(document.getElementById("gf-preview")) return;
    const link=document.createElement("link");
    link.id="gf-preview"; link.rel="stylesheet"; link.href=GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  },[]);

  const [fontPicker, setFontPicker] = useState(null); // "fontDisplay" | "fontBody" | null

  // Fixný MediaVolt accent — nezávisí od vybratej farebnej témy briefu
  const c  = { ...MV_THEME, pri: "#ff6a00" };
  const br = brief.brand;

  const selectType    = (id)    => update({ webType:id, sections:TYPE_DEFAULTS[id] });
  const toggleSec     = (id)    => update({ sections: brief.sections.includes(id) ? brief.sections.filter(s=>s!==id) : [...brief.sections,id] });
  const applyPreset   = (name)  => update({ preset:name, brand:PRESETS[name] });
  const updateBrand   = (k,v)   => update({ preset:"Custom", brand:{ ...br, [k]:v } });
  const addAddress    = ()      => update({ addresses:[...brief.addresses, makeAddress("office")] });
  const removeAddress = (id)    => update({ addresses:brief.addresses.filter(a=>a.id!==id) });
  const updateAddress = (id,k,v)=> update({ addresses:brief.addresses.map(a=>a.id===id?{...a,[k]:v}:a) });
  const addAsset      = (type)  => update({ assets:[...(brief.assets||[]), makeAsset(type)] });
  const removeAsset   = (id)    => update({ assets:(brief.assets||[]).filter(a=>a.id!==id) });
  const updateAsset   = (id,k,v)=> update({ assets:(brief.assets||[]).map(a=>a.id===id?{...a,[k]:v}:a) });

  const handleLogoUpload = (placementId, file) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update({ logoUploads: { ...(brief.logoUploads||{}), [placementId]: { name:file.name, data:reader.result } } });
    };
    reader.readAsDataURL(file);
  };
  const removeLogoUpload = (placementId) => {
    const next = { ...(brief.logoUploads||{}) };
    delete next[placementId];
    update({ logoUploads: next });
  };
  const togglePrelaunchItem = (id) => {
    const next = { ...(brief.prelaunchChecked||{}) };
    next[id] = !next[id];
    update({ prelaunchChecked: next });
  };
  const addLogoRefs = (files) => {
    if(!files || !files.length) return;
    const arr = Array.from(files);
    let loaded = [];
    let done = 0;
    arr.forEach(file=>{
      const reader = new FileReader();
      reader.onload = () => {
        loaded.push({ id:Date.now()+"-"+Math.random().toString(36).slice(2,7), name:file.name, data:reader.result });
        done++;
        if(done===arr.length){
          update({ logoRefs: [...(brief.logoRefs||[]), ...loaded] });
        }
      };
      reader.readAsDataURL(file);
    });
  };
  const removeLogoRef = (id) => update({ logoRefs: (brief.logoRefs||[]).filter(r=>r.id!==id) });

  // ── Pointer-based drag&drop pre sekcie ──
  const dragRef = useRef({ id:null, cat:null });
  const sectionsRef = useRef(brief.sections);
  sectionsRef.current = brief.sections;
  const startDrag = (e, secId, catId) => {
    e.preventDefault();
    dragRef.current = { id:secId, cat:catId };
    setDragId(secId);

    const onMove = (ev) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const card = el && el.closest ? el.closest("[data-secid]") : null;
      if (card && card.getAttribute("data-cat")===catId) {
        const overId = card.getAttribute("data-secid");
        setDragOver(prev => prev!==overId ? overId : prev);
      } else {
        setDragOver(null);
      }
    };
    const onUp = (ev) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const card = el && el.closest ? el.closest("[data-secid]") : null;
      const fromId = dragRef.current.id;
      if (card && card.getAttribute("data-cat")===catId) {
        const toId = card.getAttribute("data-secid");
        if (fromId && toId && fromId!==toId) {
          const arr=[...sectionsRef.current];
          const fi=arr.indexOf(fromId);
          if(fi>=0){
            arr.splice(fi,1);
            const ti=arr.indexOf(toId);
            arr.splice(ti<0?arr.length:ti,0,fromId);
            update({ sections:arr });
          }
        }
      }
      dragRef.current = { id:null, cat:null };
      setDragId(null);
      setDragOver(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const selectSub = (accId, subId) => {
    setOpenAcc(p => ({ ...p, [accId]:true }));
    setActiveSub(subId);
  };
  const toggleAcc = (accId) => setOpenAcc(p => ({ ...p, [accId]:!p[accId] }));

  const prompt = useMemo(()=>generateProPrompt(brief, {
    SECTIONS: SECTIONS_BASE, WEB_TYPES: WEB_TYPES_BASE, INDUSTRIES: INDUSTRIES_BASE,
    HOSTING_OPTIONS, CMS_OPTIONS, INTEGRATION_OPTIONS, ADDRESS_TYPES, LOGO_PLACEMENTS,
  }),[JSON.stringify(brief)]);

  // ── Inteligentné fulltextové vyhľadávanie odvetví ──
  const normalize = (s) => (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const industrySearchResults = useMemo(()=>{
    const q = normalize(industrySearch.trim());
    if(!q) return null; // null = bez filtra, zobrazí sa plný zoznam
    const terms = q.split(/\s+/).filter(Boolean);
    const matches = (text) => { const n=normalize(text); return terms.every(t=>n.includes(t)); };
    const results = [];
    INDUSTRIES.forEach(ind=>{
      const groupMatch = matches(ind.label);
      const matchedSubs = ind.subs.filter(s=>matches(s.label) || matches(s.desc));
      if(groupMatch || matchedSubs.length>0){
        results.push({ ...ind, matchedSubs: groupMatch ? ind.subs : matchedSubs, groupMatch });
      }
    });
    return results;
  }, [industrySearch]);
  const code   = useMemo(()=>generateCode(brief),  [JSON.stringify(brief)]);
  const robotsTxt = useMemo(()=>generateRobots(brief), [JSON.stringify(brief)]);
  const sitemapXml = useMemo(()=>generateSitemap(brief), [JSON.stringify(brief)]);
  const metaTags = useMemo(()=>generateMetaTags(brief), [JSON.stringify(brief)]);
  const schemaOrg = useMemo(()=>generateSchemaOrg(brief), [JSON.stringify(brief)]);
  const envExample = useMemo(()=>generateEnvExample(brief), [JSON.stringify(brief)]);
  const readmeMd = useMemo(()=>generateReadme(brief), [JSON.stringify(brief)]);
  const cookieConsent = useMemo(()=>generateCookieConsent(brief), [JSON.stringify(brief)]);
  const humansTxt = useMemo(()=>generateHumansTxt(brief), [JSON.stringify(brief)]);
  const [toolsTab, setToolsTab] = useState("robots"); // robots|sitemap|meta|schema|env|readme|cookies|favicon|prelaunch|md
  const TOOLS_TEXT_MAP = {
    robots:robotsTxt, sitemap:sitemapXml, meta:metaTags, schema:schemaOrg,
    env:envExample, readme:readmeMd, cookies:cookieConsent, md:brief.adminMdNotes||"",
  };
  const copyOut = () => {
    const txt = rightMode==="prompt" ? prompt
      : rightMode==="code" ? code
      : rightMode==="tools" ? (TOOLS_TEXT_MAP[toolsTab] || "")
      : code;
    navigator.clipboard.writeText(txt);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const filled = [brief.projectName,brief.goal,brief.audience,brief.tone,brief.brief].filter(Boolean).length;
  const progress = Math.round((filled/5)*100);
  const orderedSecs = brief.sections.map(id=>SECTIONS.find(s=>s.id===id)).filter(Boolean);

  const S = {
    root:   { height: isAdmin ? "calc(100vh - var(--wq-admin-h, 148px))" : "100vh", background:c.bg, color:c.text, fontFamily:"'Space Grotesk',system-ui,sans-serif", fontSize:13, transition:"background .2s,color .2s", display:"flex", flexDirection:"column" },
    header: { background:c.panel, borderBottom:`1px solid ${c.border}`, padding:"0.7rem 1.25rem", display:"flex", alignItems:"center", gap:"0.75rem", flexShrink:0 },
    logo:   { fontWeight:800, fontSize:"0.9rem", letterSpacing:"-0.02em", color:c.text, fontFamily:"'Syne','Space Grotesk',sans-serif" },
    adminBadge:{ background:`${c.pri}20`, color:c.pri, fontSize:"0.62rem", fontWeight:700, padding:"0.2rem 0.55rem", borderRadius:20, letterSpacing:"0.06em" },
    hRight: { display:"flex", alignItems:"center", gap:"0.625rem", marginLeft:"auto" },
    live:   { display:"flex", alignItems:"center", gap:"0.35rem", fontSize:"0.68rem", color:"#22c55e" },
    liveDot:{ width:6, height:6, borderRadius:"50%", background:"#22c55e", animation:"pulse 2s infinite" },
    badge:  { fontSize:"0.65rem", color:c.muted, background:c.card, border:`1px solid ${c.border}`, borderRadius:20, padding:"0.2rem 0.55rem" },

    body:   { flex:1, display:"grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : rightSize==="full"
                  ? "0px 0px 1fr"
                  : rightSize==="wide"
                    ? "0px 1fr 9fr"
                    : `${simple?"0px":(leftOpen?"210px":"56px")} 1fr ${rightOpen?"250px":"40px"}`,
              overflow:"hidden", minHeight:0,
              transition:"grid-template-columns .25s cubic-bezier(0.4,0,0.2,1)" },
    panelToggle:(side)=>({ position:"absolute", top:"50%", [side]:0,
              transform:"translateY(-50%)", zIndex:50,
              background:c.card, border:`1px solid ${c.border}`,
              borderRadius: side==="left"?"0 6px 6px 0":"6px 0 0 6px",
              color:c.muted, cursor:"pointer", padding:"0.5rem 0.25rem",
              fontSize:"0.7rem", lineHeight:1, minHeight:"unset" }),
    iconBtn:{ background:"transparent", border:`1px solid ${c.border}`,
              borderRadius:6, padding:"0.3rem 0.5rem", cursor:"pointer",
              color:c.muted, fontSize:"0.8rem", lineHeight:1, minHeight:"unset" },
    mobileTabs:{ display:"flex", gap:"0.25rem", padding:"0.5rem 0.75rem",
              background:c.panel, borderBottom:`1px solid ${c.border}`, flexShrink:0 },
    mobileTab:(a)=>({ flex:1, padding:"0.45rem", borderRadius:6,
              border:`1px solid ${a?c.pri:c.border}`,
              background:a?`${c.pri}20`:"transparent",
              color:a?c.pri:c.muted, cursor:"pointer",
              fontSize:"0.72rem", fontWeight:a?700:400, minHeight:"unset" }),

    // LEFT accordion
    left:   { borderRight:`1px solid ${c.border}`, display:"flex", flexDirection:"column", background:c.panel, overflow:"hidden", gridColumn:"1", minWidth:0 },
    leftScroll:{ flex:1, overflowY:"auto" },
    rail:   { display:"flex", flexDirection:"column", alignItems:"center", padding:"0.5rem 0", gap:"0.4rem", flex:1, overflowY:"auto" },
    railBtn:(a)=>({ width:40, height:40, borderRadius:9, border:a?`2px solid ${c.pri}`:`1px solid ${c.border}`,
                    background:a?`${c.pri}22`:"transparent", cursor:"pointer", flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem",
                    color:c.text, transition:"all .12s" }),
    railToggle:{ borderTop:`1px solid ${c.border}`, padding:"0.5rem", display:"flex", justifyContent:"center", flexShrink:0 },
    railToggleBtn:{ width:36, height:34, borderRadius:9, border:`1.5px solid ${c.pri}`, background:"transparent",
                    cursor:"pointer", color:c.pri, fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" },
    leftCollapseBtn:{ background:"transparent", border:`1px solid ${c.border}`, borderRadius:6,
                    padding:"0.25rem 0.5rem", cursor:"pointer", color:c.muted, fontSize:"0.75rem",
                    margin:"0.5rem", flexShrink:0, minHeight:"unset" },
    rightRail:{ borderLeft:`1px solid ${c.border}`, background:c.panel, display:"flex",
                flexDirection:"column", alignItems:"center", paddingTop:"0.625rem", gridColumn:"3", minWidth:0 },
    rightRailBtn:{ width:30, height:34, borderRadius:7, border:`1.5px solid ${c.pri}`, background:"transparent",
                cursor:"pointer", color:c.pri, fontSize:"0.85rem", display:"flex",
                alignItems:"center", justifyContent:"center" },
    rightRailLabel:{ writingMode:"vertical-rl", textOrientation:"mixed", marginTop:"0.75rem",
                fontSize:"0.62rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", userSelect:"none" },
    accHdr: (open)=>({ display:"flex", alignItems:"center", gap:"0.55rem", padding:"0.7rem 0.875rem",
                       cursor:"pointer", border:"none", background:"transparent",
                       color:c.text, fontSize:"0.8rem", fontWeight:600, width:"100%", textAlign:"left",
                       borderBottom:`1px solid ${c.border}` }),
    accIcon:{ fontSize:"0.95rem", width:18, textAlign:"center", flexShrink:0 },
    accChevron:(open)=>({ marginLeft:"auto", fontSize:"0.6rem", color:open?c.pri:c.muted, transform:open?"rotate(90deg)":"none", transition:"transform .15s,color .15s" }),
    subItem:(a)=>({ display:"flex", alignItems:"center", gap:"0.5rem", padding:"0.5rem 0.875rem 0.5rem 2.25rem",
                    cursor:"pointer", border:"none", background:a?c.card:"transparent",
                    color:a?c.pri:c.muted, fontSize:"0.74rem", fontWeight:a?600:400,
                    borderLeft:`2px solid ${a?c.pri:"transparent"}`, width:"100%", textAlign:"left", transition:"all .1s" }),
    subDot: (a)=>({ width:5, height:5, borderRadius:"50%", background:a?c.pri:c.muted, flexShrink:0 }),
    navBottom:{ marginTop:"auto", padding:"0.875rem", borderTop:`1px solid ${c.border}` },
    navProgress:{ fontSize:"0.62rem", color:c.muted, marginBottom:"0.4rem" },
    progressBar:{ height:3, background:c.border, borderRadius:2, overflow:"hidden" },
    progressFill:(pct)=>({ height:"100%", width:`${pct}%`, background:c.pri, borderRadius:2, transition:"width .3s" }),

    // CENTER — flex column s order: dáta najprv, dizajn potom
    center: { overflowY:"auto", padding:"1.5rem", gridColumn:"2", minWidth:0, display:"flex", flexDirection:"column" },
    secTitle:{ fontSize:"0.6rem", fontWeight:700, color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.875rem", display:"flex", alignItems:"center", gap:"0.5rem" },
    divider:{ flex:1, height:1, background:c.border },
    block:  { marginBottom:"1.75rem", scrollMarginTop:"1rem" },
    fRow:   { marginBottom:"0.875rem" },
    lbl:    { fontSize:"0.65rem", fontWeight:600, color:c.muted, letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:"0.3rem" },
    inp:    { width:"100%", background:c.inpBg, border:`1px solid ${c.border}`, borderRadius:7, padding:"0.575rem 0.8rem", color:c.text, fontSize:"0.825rem", outline:"none", boxSizing:"border-box" },
    ta:     { width:"100%", background:c.inpBg, border:`1px solid ${c.border}`, borderRadius:7, padding:"0.575rem 0.8rem", color:c.text, fontSize:"0.825rem", outline:"none", boxSizing:"border-box", resize:"vertical", minHeight:88, fontFamily:"inherit", lineHeight:1.6 },
    g2:     { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" },
    g3:     { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.625rem" },
    typeGrid:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.5rem" },
    typeBtn:(a)=>({ padding:"0.75rem 0.25rem", borderRadius:8, border:`2px solid ${a?c.pri:c.border}`, background:a?`${c.pri}14`:c.inpBg, color:a?c.pri:c.muted, cursor:"pointer", fontSize:"0.72rem", fontWeight:a?700:400, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }),
    typeIcon:{ fontSize:"1.1rem" },
    secGrid:{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"0.35rem" },
    secCard:(a)=>({ padding:"0.5rem 0.625rem", borderRadius:7, border:`1.5px solid ${a?c.pri:c.border}`, background:a?c.cardActive:c.inpBg, cursor:"pointer", display:"flex", alignItems:"flex-start", gap:"0.4rem" }),
    secIcon:{ fontSize:"0.8rem", flexShrink:0, paddingTop:1 },
    secLbl: (a)=>({ fontSize:"0.72rem", fontWeight:a?600:400, color:a?c.text:c.muted, lineHeight:1.3 }),
    secDesc:{ fontSize:"0.6rem", color:c.muted, lineHeight:1.25, marginTop:1 },
    presetRow:{ display:"flex", flexWrap:"wrap", gap:"0.35rem" },
    presetBtn:(a)=>({ padding:"0.275rem 0.7rem", borderRadius:20, border:`1px solid ${a?c.pri:c.border}`, background:a?c.pri:"transparent", color:a?"#fff":c.muted, cursor:"pointer", fontSize:"0.7rem", fontWeight:500 }),
    colorGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.625rem" },
    colorItem:{ display:"flex", alignItems:"center", gap:"0.375rem" },
    swatch:(col)=>({ width:24, height:24, borderRadius:5, background:col, border:`1px solid ${c.border}`, flexShrink:0 }),
    cpick:  { width:24, height:24, padding:0, border:"none", background:"none", cursor:"pointer", borderRadius:3 },
    cinp:   { flex:1, background:c.inpBg, border:`1px solid ${c.border}`, borderRadius:5, padding:"0.275rem 0.45rem", color:c.text, fontSize:"0.72rem", outline:"none" },
    fontInp:{ width:"100%", background:c.inpBg, border:`1px solid ${c.border}`, borderRadius:6, padding:"0.35rem 0.5rem", color:c.text, fontSize:"0.75rem", outline:"none", boxSizing:"border-box" },
    addrCard:{ background:c.card, border:`1px solid ${c.border}`, borderRadius:9, padding:"0.875rem", marginBottom:"0.625rem" },
    addrTypes:{ display:"flex", flexWrap:"wrap", gap:"0.3rem", marginBottom:"0.75rem" },
    addrTypeBtn:(a)=>({ padding:"0.225rem 0.55rem", borderRadius:20, border:`1px solid ${a?c.pri:c.border}`, background:a?`${c.pri}18`:"transparent", color:a?c.pri:c.muted, cursor:"pointer", fontSize:"0.68rem", fontWeight:a?600:400, display:"flex", alignItems:"center", gap:"0.2rem", minHeight:"unset" }),
    addBtn: { background:"transparent", border:`1px solid ${c.border}`, borderRadius:6, padding:"0.2rem 0.625rem", cursor:"pointer", fontSize:"0.7rem", color:c.pri, display:"flex", alignItems:"center", gap:"0.25rem", minHeight:"unset" },
    removeBtn:{ marginLeft:"auto", background:"transparent", border:`1px solid ${c.border}`, borderRadius:5, padding:"0.175rem 0.45rem", cursor:"pointer", fontSize:"0.65rem", color:c.muted, minHeight:"unset" },

    // RIGHT
    right:  { borderLeft:rightSize==="full"?"none":`1px solid ${c.border}`, display:"flex", flexDirection:"column", background:c.panel, overflow:"hidden", gridColumn:"3", minWidth:0 },
    rModeRow:{ display:"flex", gap:"0.25rem", padding:"0.625rem 0.75rem", borderBottom:`1px solid ${c.border}`, flexShrink:0, overflowX:"auto", scrollbarWidth:"thin" },
    rModeBtn:(a)=>({ flex:"0 0 auto", whiteSpace:"nowrap", padding:"0.35rem 0.65rem", borderRadius:6, border:`1px solid ${a?c.pri:c.border}`, background:a?`${c.pri}20`:"transparent", color:a?c.pri:c.muted, cursor:"pointer", fontSize:"0.68rem", fontWeight:a?700:400 }),
    rBody:  { flex:1, overflowY:"auto", padding:"0.875rem" },
    wfTitle:{ fontSize:"0.58rem", fontWeight:700, color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.625rem" },
    wfWin:  { background:c.card, border:`1px solid ${c.border}`, borderRadius:10, overflow:"hidden" },
    wfBar:  { background:br.bg||"#111", padding:"0.4rem 0.625rem", display:"flex", alignItems:"center", gap:"0.25rem" },
    wfDot:  (col)=>({ width:6, height:6, borderRadius:"50%", background:col }),
    wfBody: { background:br.bg||"#111", padding:"0.375rem" },
    wfSec:  (col,h)=>({ height:h, background:col+"22", border:`1px solid ${col}45`, borderRadius:4, marginBottom:3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.55rem", color:col, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase" }),
    wfEmpty:{ textAlign:"center", padding:"2rem 1rem", color:c.muted, fontSize:"0.75rem", lineHeight:1.6 },
    codeBox:{ background:c.codeBg, border:`1px solid ${c.border}`, borderRadius:8, padding:"0.75rem", fontFamily:rightMode==="code"?"'JetBrains Mono',monospace":"inherit", fontSize:rightMode==="code"?"0.62rem":"0.7rem", color:rightMode==="code"?c.codeText:c.text, whiteSpace:"pre-wrap", lineHeight:1.6, wordBreak:"break-word" },
    copyBtn:{ width:"100%", background:c.pri, color:"#fff", border:"none", borderRadius:7, padding:"0.5rem", cursor:"pointer", fontWeight:700, fontSize:"0.75rem", marginBottom:"0.625rem" },
  };

  const ATITLE = (txt, id) => (
    <div id={id} style={{...S.secTitle}}>{txt}<div style={S.divider}/></div>
  );

  // Blok s poradím podľa BLOCK_ORDER (flex order v strednom paneli)
  const BLK = (id) => ({ ...S.block, order: BLOCK_ORDER[id] ?? 50 });

  // Poradie veľkostí náhľadu — kroky Rozšíriť/Zúžiť idú po tomto rebríčku
  const RIGHT_SIZES = ["normal","overlay","wide","full"];
  const rightSizeIdx = RIGHT_SIZES.indexOf(rightSize);
  const RightControlRow = () => (
    !isMobile && (
      <div style={{...S.rModeRow, justifyContent:"flex-end", gap:"0.35rem"}}>
        {/* Zúžiť o krok — viditeľné vždy keď nie je najužší stav */}
        {rightSizeIdx > 0 && (
          <button
            style={{...S.rModeBtn(false),flex:"unset",padding:"0.35rem 0.55rem",display:"flex",alignItems:"center",gap:"0.3rem"}}
            onClick={()=>setRightSize(RIGHT_SIZES[rightSizeIdx-1])}
            title={`Zúžiť náhľad o krok (${RIGHT_SIZES[rightSizeIdx-1]})`}>⤡ Zúžiť</button>
        )}
        {/* Rozšíriť o krok */}
        {rightSizeIdx < RIGHT_SIZES.length-1 && (
          <button
            style={{...S.rModeBtn(false),flex:"unset",padding:"0.35rem 0.55rem",display:"flex",alignItems:"center",gap:"0.3rem"}}
            onClick={()=>setRightSize(RIGHT_SIZES[rightSizeIdx+1])}
            title={`Rozšíriť náhľad o krok (${RIGHT_SIZES[rightSizeIdx+1]})`}>⤢ Rozšíriť</button>
        )}
        {/* Reset na úzky stĺpec — z hociktorého rozšíreného stavu */}
        {rightSize!=="normal" && (
          <button
            style={{...S.rModeBtn(false),flex:"unset",padding:"0.35rem 0.55rem"}}
            onClick={()=>setRightSize("normal")}
            title="Vrátiť na úzky náhľad v pravom stĺpci">✕</button>
        )}
        {rightSize==="normal" && (
          <button style={{...S.rModeBtn(false),flex:"unset",padding:"0.35rem 0.5rem"}} onClick={()=>setRightOpen(false)} title="Zbaliť náhľad">▶</button>
        )}
      </div>
    )
  );

  const RightModeRow = () => (
    <div style={S.rModeRow}>
      <button style={S.rModeBtn(rightMode==="wireframe")} onClick={()=>setRightMode("wireframe")}>Náhľad</button>
      <button style={S.rModeBtn(rightMode==="template")} onClick={()=>setRightMode("template")}>Šablóna</button>
      {isAdmin && <button style={S.rModeBtn(rightMode==="prompt")} onClick={()=>setRightMode("prompt")}>Prompt</button>}
      {isAdmin && <button style={S.rModeBtn(rightMode==="webview")} onClick={()=>setRightMode("webview")}>{T("webPreview")}</button>}
      {isAdmin && <button style={S.rModeBtn(rightMode==="code")} onClick={()=>setRightMode("code")}>Kód</button>}
      {isAdmin && <button style={S.rModeBtn(rightMode==="notes")} onClick={()=>setRightMode("notes")}>Poznámky</button>}
      {isAdmin && <button style={S.rModeBtn(rightMode==="tools")} onClick={()=>setRightMode("tools")}>Nástroje</button>}
    </div>
  );

  const RightBody = () => (
    <div style={S.rBody}>
      {rightMode==="wireframe" && (<>
        <div style={S.wfTitle}>Náhľad štruktúry</div>
        {orderedSecs.length===0 ? (
          <div style={S.wfEmpty}>Vyber sekcie<br/>v sekcii Obsah</div>
        ) : (
          <>
            <div style={S.wfWin}>
              <div style={S.wfBar}>
                <div style={S.wfDot("#ff5f57")}/><div style={S.wfDot("#ffbd2e")}/><div style={S.wfDot("#28c840")}/>
              </div>
              <div style={S.wfBody}>
                {orderedSecs.map(s=>{
                  const wf=WF_SECTIONS[s.id]||{h:40,label:s.label};
                  const col=NEUTRAL_SECS.includes(s.id)?"#64748b":(br.primary||"#6366f1");
                  return <div key={s.id} style={S.wfSec(col,wf.h)}>{wf.label}</div>;
                })}
              </div>
            </div>
            <div style={{marginTop:"0.875rem"}}>
              <div style={S.wfTitle}>Sekcie ({orderedSecs.length})</div>
              {orderedSecs.map((s,i)=>{
                const col=NEUTRAL_SECS.includes(s.id)?"#64748b":(br.primary||"#6366f1");
                return (
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:"0.375rem",marginBottom:"0.3rem",fontSize:"0.65rem",color:c.muted}}>
                    <div style={{width:8,height:8,borderRadius:2,background:col,flexShrink:0}}/>
                    <span style={{color:c.subtle,minWidth:14}}>{i+1}</span>
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div style={{marginTop:"1.25rem",borderTop:`1px solid ${c.border}`,paddingTop:"0.875rem"}}>
          <div style={S.wfTitle}>Brand preview</div>
          <div style={{borderRadius:7,overflow:"hidden",border:`1px solid ${c.border}`}}>
            <div style={{background:br.bg||"#111",padding:"0.75rem"}}>
              <div style={{fontFamily:`'${br.fontDisplay}',sans-serif`,fontSize:"0.875rem",fontWeight:700,color:br.text||"#fff",marginBottom:"0.25rem"}}>{brief.projectName||"Názov"}</div>
              <div style={{fontSize:"0.65rem",color:br.muted||"#888",marginBottom:"0.5rem",lineHeight:1.4}}>{brief.tone||"Tón a feeling…"}</div>
              <div style={{display:"flex",gap:"0.375rem"}}>
                <div style={{background:br.primary||"#6366f1",color:"#fff",padding:"0.2rem 0.625rem",borderRadius:4,fontSize:"0.62rem",fontWeight:600}}>CTA</div>
                <div style={{background:br.accent||"#ec4899",color:"#fff",padding:"0.2rem 0.625rem",borderRadius:4,fontSize:"0.62rem",fontWeight:600}}>Accent</div>
              </div>
            </div>
          </div>
        </div>
      </>)}
      {rightMode==="template" && (()=>{
        // Šablóna — základné údaje projektu + živý vizuál stránky (aktualizuje sa s každou zmenou briefu)
        const wt  = WEB_TYPES.find(w=>w.id===brief.webType);
        const ind = INDUSTRIES.find(i=>i.id===brief.industry);
        const sub = ind?.subs?.find(s=>s.id===brief.industrySubcat);
        const addr = (brief.addresses||[])[0];
        const Row = ({l,v}) => v ? (
          <div style={{display:"flex",gap:"0.5rem",fontSize:"0.68rem",marginBottom:"0.3rem"}}>
            <span style={{color:c.muted,minWidth:70,flexShrink:0}}>{l}</span>
            <span style={{color:c.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis"}}>{v}</span>
          </div>
        ) : null;
        return (
          <div>
            <div style={S.wfTitle}>Šablóna projektu — základné údaje</div>
            <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:10,padding:"0.75rem",marginBottom:"0.875rem"}}>
              <div style={{fontFamily:"'Syne','Space Grotesk',sans-serif",fontWeight:800,fontSize:"0.95rem",color:c.text,marginBottom:"0.5rem"}}>
                {brief.projectName||"Bez názvu"}
              </div>
              <Row l="Typ webu"  v={wt?`${wt.icon} ${wt.label}`:null}/>
              <Row l="Odvetvie"  v={ind?`${ind.icon} ${ind.label}${sub?` — ${sub.label}`:""}`:null}/>
              <Row l="Firma"     v={brief.companyName}/>
              <Row l="IČO"       v={brief.ico}/>
              <Row l="Telefón"   v={brief.phone}/>
              <Row l="Email"     v={brief.email}/>
              <Row l="Web"       v={brief.web}/>
              <Row l="Adresa"    v={addr&&(addr.street||addr.city)?[addr.street,addr.city].filter(Boolean).join(", "):null}/>
              <Row l="Cieľ"      v={brief.goal}/>
              <Row l="Sekcie"    v={String((brief.sections||[]).length)}/>
              <div style={{display:"flex",alignItems:"center",gap:"0.35rem",marginTop:"0.5rem"}}>
                {["bg","surface","primary","accent","text"].map(k=>(
                  <div key={k} title={`${k}: ${br[k]}`} style={{width:18,height:18,borderRadius:5,background:br[k],border:`1px solid ${c.border}`,flexShrink:0}}/>
                ))}
                <span style={{fontSize:"0.62rem",color:c.muted,marginLeft:"0.3rem"}}>{brief.preset||"Custom"}</span>
              </div>
              <div style={{fontSize:"0.62rem",color:c.muted,marginTop:"0.3rem"}}>
                {br.fontDisplay} / {br.fontBody}
              </div>
            </div>
            <div style={S.wfTitle}>Vizuál stránky</div>
            <MiniWebPreview brief={brief} sections={orderedSecs} note={T("previewNote")}/>
          </div>
        );
      })()}
      {rightMode==="prompt" && isAdmin && (<>
        <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať prompt"}</button>
        <div style={S.codeBox}>{prompt}</div>
      </>)}
      {rightMode==="webview" && isAdmin && (
        <MiniWebPreview brief={brief} sections={orderedSecs} note={T("previewNote")} />
      )}
      {rightMode==="code" && isAdmin && (<>
        <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať kód"}</button>
        <div style={S.codeBox}>{code}</div>
      </>)}
      {rightMode==="notes" && isAdmin && (
        <div>
          <div style={S.wfTitle}>Na doplnenie funkcionalít</div>
          {ADMIN_NOTES_TODO.map((note,i)=>(
            <div key={i} style={{
              fontSize:"0.68rem",color:c.text,lineHeight:1.55,
              padding:"0.625rem 0.7rem",marginBottom:"0.5rem",
              background:c.card,border:`1px solid ${c.border}`,borderRadius:7,
            }}>
              <span style={{color:c.pri,fontWeight:700,marginRight:"0.35rem"}}>{i+1}.</span>
              {note}
            </div>
          ))}

          <div style={{...S.wfTitle,marginTop:"1.25rem"}}>Free hosting — porovnanie</div>
          {FREE_HOSTING_COMPARISON.map(h=>(
            <div key={h.name} style={{
              border:`1px solid ${c.border}`,borderRadius:8,padding:"0.65rem 0.75rem",
              marginBottom:"0.5rem",background:c.bg,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.35rem"}}>
                <span style={{fontSize:"0.74rem",fontWeight:700,color:c.text}}>{h.name}</span>
                <span style={{
                  fontSize:"0.58rem",fontWeight:700,padding:"0.1rem 0.4rem",borderRadius:20,
                  color:h.commercial?"#22c55e":"#f59e0b",
                  background:h.commercial?"#22c55e20":"#f59e0b20",
                }}>
                  {h.commercial?"Komerčné OK":"Bez komerčného použitia"}
                </span>
              </div>
              <div style={{fontSize:"0.64rem",color:c.muted,lineHeight:1.5}}>
                <div><strong style={{color:c.desc}}>Bandwidth:</strong> {h.bandwidth}</div>
                <div><strong style={{color:c.desc}}>Requests:</strong> {h.requests}</div>
                <div><strong style={{color:c.desc}}>Build:</strong> {h.build}</div>
              </div>
              <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.45,marginTop:"0.4rem"}}>{h.note}</div>
            </div>
          ))}
          <div style={{fontSize:"0.6rem",color:c.muted,lineHeight:1.5,marginTop:"0.5rem"}}>
            Údaje overené k máju 2026 z verejných pricing/limits stránok jednotlivých platforiem. Pred použitím v ponuke pre klienta odporúčame prekontrolovať aktuálne podmienky priamo na stránkach poskytovateľov, podmienky sa môžu meniť.
          </div>
        </div>
      )}
      {rightMode==="tools" && isAdmin && (
        <div>
          {/* Pod-taby nástrojov */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem",marginBottom:"0.875rem"}}>
            {[
              {id:"robots",label:"robots.txt"},
              {id:"sitemap",label:"sitemap.xml"},
              {id:"meta",label:"Meta / OG tagy"},
              {id:"schema",label:"Schema.org"},
              {id:"env",label:".env.example"},
              {id:"readme",label:"README.md"},
              {id:"cookies",label:"Cookie consent"},
              {id:"favicon",label:"Favicon checklist"},
              {id:"prelaunch",label:"Pre-launch"},
              {id:"humans",label:"humans.txt"},
              {id:"md",label:"MD poznámky"},
            ].map(t=>(
              <button key={t.id} onClick={()=>setToolsTab(t.id)} style={{
                padding:"0.4rem 0.5rem",borderRadius:7,cursor:"pointer",minHeight:"unset",
                border:`1.5px solid ${toolsTab===t.id?c.pri:c.border}`,
                background:toolsTab===t.id?`${c.pri}18`:c.inpBg,
                color:toolsTab===t.id?c.pri:c.muted,fontSize:"0.66rem",
                fontWeight:toolsTab===t.id?700:400,
              }}>{t.label}</button>
            ))}
          </div>

          {/* ROBOTS.TXT */}
          {toolsTab==="robots" && (
            <>
              <div style={S.wfTitle}>Nastavenia robots.txt</div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.4rem",marginBottom:"0.75rem"}}>
                <button onClick={()=>update({robotsAllowAll:!brief.robotsAllowAll})} style={{
                  display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.45rem 0.6rem",
                  borderRadius:7,cursor:"pointer",minHeight:"unset",textAlign:"left",
                  border:`1.5px solid ${brief.robotsAllowAll?c.pri:c.border}`,
                  background:brief.robotsAllowAll?c.cardActive:c.inpBg,
                }}>
                  <div style={{width:14,height:14,borderRadius:3,flexShrink:0,border:`2px solid ${brief.robotsAllowAll?c.pri:c.border}`,background:brief.robotsAllowAll?c.pri:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.5rem",color:"#fff"}}>{brief.robotsAllowAll?"✓":""}</div>
                  <span style={{fontSize:"0.7rem",color:c.text}}>Povoliť indexáciu celého webu (Allow: /)</span>
                </button>
                <button onClick={()=>update({robotsSitemap:!brief.robotsSitemap})} style={{
                  display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.45rem 0.6rem",
                  borderRadius:7,cursor:"pointer",minHeight:"unset",textAlign:"left",
                  border:`1.5px solid ${brief.robotsSitemap?c.pri:c.border}`,
                  background:brief.robotsSitemap?c.cardActive:c.inpBg,
                }}>
                  <div style={{width:14,height:14,borderRadius:3,flexShrink:0,border:`2px solid ${brief.robotsSitemap?c.pri:c.border}`,background:brief.robotsSitemap?c.pri:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.5rem",color:"#fff"}}>{brief.robotsSitemap?"✓":""}</div>
                  <span style={{fontSize:"0.7rem",color:c.text}}>Pridať odkaz na sitemap.xml</span>
                </button>
              </div>
              <div style={{marginBottom:"0.75rem"}}>
                <label style={S.lbl}>Vylúčené cesty <span style={{fontWeight:400,textTransform:"none"}}>(oddeľ čiarkou)</span></label>
                <input style={S.inp} placeholder="napr. /admin, /api, /cart"
                  value={brief.robotsDisallow||""} onChange={e=>update({robotsDisallow:e.target.value})}/>
              </div>
              <div style={{marginBottom:"0.875rem"}}>
                <label style={S.lbl}>Vlastné riadky <span style={{fontWeight:400,textTransform:"none"}}>(voliteľné — vlož priamo do súboru)</span></label>
                <textarea style={{...S.ta,minHeight:50}} placeholder="napr. Crawl-delay: 10"
                  value={brief.robotsExtra||""} onChange={e=>update({robotsExtra:e.target.value})}/>
              </div>
              <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať robots.txt"}</button>
              <div style={S.codeBox}>{robotsTxt}</div>
            </>
          )}

          {/* SITEMAP.XML */}
          {toolsTab==="sitemap" && (
            <>
              <div style={S.wfTitle}>Nastavenia sitemap.xml</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.75rem"}}>
                <div>
                  <label style={S.lbl}>Frekvencia zmien</label>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
                    {["always","hourly","daily","weekly","monthly","yearly"].map(f=>(
                      <button key={f} onClick={()=>update({sitemapChangefreq:f})} style={{
                        padding:"0.3rem 0.5rem",borderRadius:6,cursor:"pointer",minHeight:"unset",textAlign:"left",
                        border:`1px solid ${brief.sitemapChangefreq===f?c.pri:c.border}`,
                        background:brief.sitemapChangefreq===f?c.cardActive:c.inpBg,
                        color:brief.sitemapChangefreq===f?c.pri:c.muted,fontSize:"0.66rem",
                      }}>{f}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={S.lbl}>Priorita domovskej strany</label>
                  <input style={S.inp} placeholder="1.0" value={brief.sitemapPriorityHome||"1.0"}
                    onChange={e=>update({sitemapPriorityHome:e.target.value})}/>
                  <div style={{fontSize:"0.6rem",color:c.desc,marginTop:"0.4rem",lineHeight:1.4}}>
                    Podstránky z poľa "Aké podstránky plánuješ?" (Brief → Štruktúra stránky) sa pridajú automaticky s prioritou 0.7.
                  </div>
                </div>
              </div>
              <div style={{marginBottom:"0.875rem"}}>
                <label style={S.lbl}>Ďalšie URL <span style={{fontWeight:400,textTransform:"none"}}>(oddeľ čiarkou, napr. /blog/clanok-1)</span></label>
                <input style={S.inp} placeholder="napr. /blog/prvy-clanok, /akcia/leto"
                  value={brief.sitemapExtra||""} onChange={e=>update({sitemapExtra:e.target.value})}/>
              </div>
              <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať sitemap.xml"}</button>
              <div style={S.codeBox}>{sitemapXml}</div>
            </>
          )}

          {/* META TAGS / OPEN GRAPH */}
          {toolsTab==="meta" && (
            <>
              <div style={S.wfTitle}>Meta tagy / Open Graph</div>
              <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.45,marginBottom:"0.75rem"}}>
                Generované z Názvu projektu, SEO nadpisu (Hero) a popisu. Pre OG obrázok nahraj logo pre umiestnenie "Social / OG image" v Brand identity.
              </div>
              <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať meta tagy"}</button>
              <div style={S.codeBox}>{metaTags}</div>
            </>
          )}

          {/* SCHEMA.ORG JSON-LD */}
          {toolsTab==="schema" && (
            <>
              <div style={S.wfTitle}>Schema.org structured data</div>
              <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.45,marginBottom:"0.75rem"}}>
                Typ <strong style={{color:c.pri}}>{SCHEMA_TYPE_MAP[brief.industry]||"Organization"}</strong> zvolený podľa odvetvia. Vlož do {"<script type=\"application/ld+json\">"} v {"<head>"}.
              </div>
              <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať JSON-LD"}</button>
              <div style={S.codeBox}>{schemaOrg}</div>
            </>
          )}

          {/* .ENV.EXAMPLE */}
          {toolsTab==="env" && (
            <>
              <div style={S.wfTitle}>.env.example</div>
              <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.45,marginBottom:"0.75rem"}}>
                Zoznam premenných prostredia podľa zvolených integrácií a hostingu — bez reálnych hodnôt, len ako šablóna pre vývojára.
              </div>
              <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať .env.example"}</button>
              <div style={S.codeBox}>{envExample}</div>
            </>
          )}

          {/* README.MD */}
          {toolsTab==="readme" && (
            <>
              <div style={S.wfTitle}>README.md — odovzdanie projektu</div>
              <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.45,marginBottom:"0.75rem"}}>
                Súhrnný dokument celého briefu — pre klienta alebo ďalšieho vývojára pri odovzdaní projektu.
              </div>
              <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať README.md"}</button>
              <div style={S.codeBox}>{readmeMd}</div>
            </>
          )}

          {/* COOKIE CONSENT */}
          {toolsTab==="cookies" && (
            <>
              <div style={S.wfTitle}>Cookie consent text</div>
              <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.45,marginBottom:"0.75rem"}}>
                Základná šablóna textu súhlasu, kategórie sa odvíjajú od zvolených integrácií. Pred nasadením odporúčame právnu kontrolu.
              </div>
              <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať text"}</button>
              <div style={S.codeBox}>{cookieConsent}</div>
            </>
          )}

          {/* FAVICON CHECKLIST */}
          {toolsTab==="favicon" && (
            <>
              <div style={S.wfTitle}>Favicon checklist</div>
              <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.45,marginBottom:"0.75rem"}}>
                Potrebné súbory a veľkosti pre kompletné pokrytie favicon naprieč zariadeniami.
              </div>
              {FAVICON_CHECKLIST.map((f,i)=>(
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:"0.6rem",
                  padding:"0.5rem 0.65rem",marginBottom:"0.4rem",
                  background:c.card,border:`1px solid ${c.border}`,borderRadius:7,
                }}>
                  <div style={{width:30,height:30,borderRadius:6,flexShrink:0,background:c.bg,border:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",color:c.pri,fontWeight:700}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.72rem",fontWeight:600,color:c.text}}>{f.file}</div>
                    <div style={{fontSize:"0.6rem",color:c.desc}}>{f.size} — {f.note}</div>
                  </div>
                </div>
              ))}
              <div style={{fontSize:"0.6rem",color:c.muted,lineHeight:1.5,marginTop:"0.5rem"}}>
                Tip: nahraj jeden zdrojový obrázok (min. 512×512 px, štvorec) do free generátora ako realfavicongenerator.net — vygeneruje všetky potrebné veľkosti naraz.
              </div>
            </>
          )}

          {/* PRE-LAUNCH CHECKLIST */}
          {toolsTab==="prelaunch" && (()=>{
            const checked = brief.prelaunchChecked || {};
            const doneCount = PRELAUNCH_CHECKLIST_ITEMS.filter(i=>checked[i.id]).length;
            const cats = [...new Set(PRELAUNCH_CHECKLIST_ITEMS.map(i=>i.cat))];
            return (
              <>
                <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.75rem"}}>
                  <div style={S.wfTitle}>Pre-launch checklist</div>
                  <span style={{
                    fontSize:"0.62rem",fontWeight:700,padding:"0.1rem 0.5rem",borderRadius:20,
                    color:c.pri,background:`${c.pri}20`,
                  }}>{doneCount}/{PRELAUNCH_CHECKLIST_ITEMS.length}</span>
                </div>
                {cats.map(cat=>(
                  <div key={cat} style={{marginBottom:"0.75rem"}}>
                    <div style={{fontSize:"0.6rem",fontWeight:700,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.35rem"}}>{cat}</div>
                    {PRELAUNCH_CHECKLIST_ITEMS.filter(i=>i.cat===cat).map(item=>{
                      const done = !!checked[item.id];
                      return (
                        <button key={item.id} onClick={()=>togglePrelaunchItem(item.id)} style={{
                          width:"100%",display:"flex",alignItems:"center",gap:"0.5rem",
                          padding:"0.4rem 0.55rem",marginBottom:"0.3rem",borderRadius:7,
                          cursor:"pointer",minHeight:"unset",textAlign:"left",
                          border:`1px solid ${done?c.pri:c.border}`,
                          background:done?c.cardActive:c.inpBg,
                        }}>
                          <div style={{
                            width:15,height:15,borderRadius:4,flexShrink:0,
                            border:`2px solid ${done?c.pri:c.border}`,background:done?c.pri:"transparent",
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.55rem",color:"#fff",
                          }}>{done?"✓":""}</div>
                          <span style={{fontSize:"0.7rem",color:done?c.muted:c.text,textDecoration:done?"line-through":"none"}}>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            );
          })()}

          {/* HUMANS.TXT */}
          {toolsTab==="humans" && (
            <>
              <div style={S.wfTitle}>humans.txt</div>
              <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.45,marginBottom:"0.75rem"}}>
                Krátky textový súbor predstavujúci ľudí za projektom — voliteľný, ale milý štandard.
              </div>
              <button style={S.copyBtn} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať humans.txt"}</button>
              <div style={S.codeBox}>{humansTxt}</div>
            </>
          )}

          {/* MD POZNÁMKY — voľné pole */}
          {toolsTab==="md" && (
            <>
              <div style={S.wfTitle}>Voľné MD poznámky</div>
              <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.45,marginBottom:"0.5rem"}}>
                Priestor na dopísanie ďalších funkcionalít, poznámok alebo zadania v Markdown formáte — nech sa nestratia v procese.
              </div>
              <textarea
                placeholder={"napr.\n## Ďalšie funkcionality\n- ...\n- ..."}
                value={brief.adminMdNotes||""}
                onChange={e=>update({adminMdNotes:e.target.value})}
                style={{
                  width:"100%",boxSizing:"border-box",background:c.bg,
                  border:`1px solid ${c.border}`,borderRadius:8,
                  padding:"0.625rem 0.75rem",color:c.text,fontSize:"0.74rem",
                  outline:"none",resize:"vertical",minHeight:220,
                  fontFamily:"'JetBrains Mono',monospace",lineHeight:1.6,
                }}
              />
              <button style={{...S.copyBtn,marginTop:"0.625rem"}} onClick={copyOut}>{copied?"✓ Skopírované":"Kopírovať MD text"}</button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={S.root}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      {/* Jednoduchý režim = wizard — viditeľné sú len bloky aktuálneho kroku */}
      {simple && <style>{ALL_BLOCK_IDS.filter(id=>!wizVisible.has(id)).map(id=>`#blk-${id}`).join(",")+"{display:none !important}"}</style>}
      {/* Zhrnutie (wizard) je viditeľné len v jednoduchom režime */}
      {!simple && <style>{`#blk-wiz-summary{display:none !important}`}</style>}

      {/* Header */}
      <div style={S.header}>
        <span style={S.logo}>{isAdmin ? "⚡ WebQuote Admin" : "⚡ "+(brief.projectName||"Nový projekt")}</span>
        {isAdmin && <span style={S.adminBadge}>ADMIN</span>}
        <div style={S.hRight}>
          {/* Jazyk UI (SK/EN/CS/DE) — synchronizuje sa cez brief */}
          <select value={lang} onChange={e=>update({lang:e.target.value})} title={T("language")}
            style={{
              background:c.inpBg, border:`1px solid ${c.border}`, color:c.text,
              borderRadius:7, padding:"0.25rem 0.35rem", fontSize:"0.68rem",
              cursor:"pointer", fontFamily:"inherit",
            }}>
            {LANGS.map(l=><option key={l.id} value={l.id}>{l.flag} {l.id.toUpperCase()}</option>)}
          </select>
          {/* Jednoduchý / expert režim */}
          <button onClick={()=>setUiMode(simple?"expert":"simple")}
            title={simple?T("expertMode"):T("simpleMode")}
            style={{
              background:simple?`${c.pri}18`:c.inpBg, border:`1px solid ${simple?c.pri:c.border}`,
              color:simple?c.pri:c.muted, borderRadius:7, padding:"0.25rem 0.55rem",
              fontSize:"0.65rem", fontWeight:700, cursor:"pointer", minHeight:"unset",
              whiteSpace:"nowrap",
            }}>
            {simple ? "✨ "+T("simpleMode") : "⚙️ "+T("expertMode")}
          </button>
          <div style={S.live}><div style={S.liveDot}/>Live</div>
          {!isMobile && <span style={S.badge}>#{sessionId}</span>}
        </div>
      </div>

      {/* Mobile tabs */}
      {isMobile && (
        <div style={S.mobileTabs}>
          {!simple && <button style={S.mobileTab(mobilePane==="nav")} onClick={()=>setMobilePane("nav")}>☰ Menu</button>}
          <button style={S.mobileTab(mobilePane==="form"||(simple&&mobilePane==="nav"))} onClick={()=>setMobilePane("form")}>📝 Formulár</button>
          <button style={S.mobileTab(mobilePane==="preview")} onClick={()=>setMobilePane("preview")}>👁 Náhľad</button>
        </div>
      )}

      <div style={S.body}>

        {/* LEFT — accordion (full) alebo rail (collapsed); vo wizarde skrytý */}
        {!simple && (rightSize==="normal" || rightSize==="overlay") && ((isMobile && mobilePane==="nav") || (!isMobile)) && (
        <div style={S.left}>
          {(leftOpen || (isMobile && mobilePane==="nav")) ? (
            <>
              <div style={S.leftScroll}>
                {ACCORDION.map(acc=>(
                  <div key={acc.id}>
                    <button style={S.accHdr(openAcc[acc.id])} onClick={()=>toggleAcc(acc.id)}>
                      <span style={S.accIcon}>{acc.icon}</span>
                      {acc.label}
                      <span style={S.accChevron(openAcc[acc.id])}>▶</span>
                    </button>
                    {openAcc[acc.id] && acc.subs.map(sub=>(
                      <button key={sub.id} style={S.subItem(activeSub===sub.id)}
                        onClick={()=>{
                          selectSub(acc.id, sub.id);
                          const el=document.getElementById("blk-"+sub.id);
                          if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
                          if(isMobile) setMobilePane("form");
                        }}>
                        <span style={S.subDot(activeSub===sub.id)}/>
                        {sub.label}
                      </button>
                    ))}
                  </div>
                ))}
                <div style={S.navBottom}>
                  <div style={S.navProgress}>Vyplnené {progress}%</div>
                  <div style={S.progressBar}><div style={S.progressFill(progress)}/></div>
                </div>
              </div>
              {!isMobile && (
                <div style={S.railToggle}>
                  <button style={S.railToggleBtn} onClick={()=>setLeftOpen(false)} title="Zbaliť">◀</button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* RAIL — ikony kategórií */}
              <div style={S.rail}>
                {ACCORDION.map(acc=>{
                  const isActive=openAcc[acc.id] || activeSub.startsWith(acc.id);
                  return (
                    <button key={acc.id} style={S.railBtn(isActive)} title={acc.label}
                      onClick={()=>{
                        setLeftOpen(true);
                        setOpenAcc(p=>({...p,[acc.id]:true}));
                        const first=acc.subs[0];
                        if(first){ setActiveSub(first.id); }
                      }}>
                      {acc.icon}
                    </button>
                  );
                })}
              </div>
              <div style={S.railToggle}>
                <button style={S.railToggleBtn} onClick={()=>setLeftOpen(true)} title="Rozbaliť">▶</button>
              </div>
            </>
          )}
        </div>
        )}

        {/* CENTER — full scrollable form */}
        {rightSize!=="full" && ((isMobile && (mobilePane==="form" || (simple && mobilePane==="nav"))) || !isMobile) && (
        <div ref={centerRef} style={S.center}>

          {/* ── WIZARD HLAVIČKA — kroky sprievodcu (jednoduchý režim) ── */}
          {simple && (
            <div style={{order:0, marginBottom:"1.25rem"}}>
              <div style={{display:"flex", gap:"0.3rem", flexWrap:"wrap", marginBottom:"0.75rem"}}>
                {WIZARD_STEPS.map((st,i)=>{
                  const active = i===wizStep;
                  const done = i<wizStep;
                  return (
                    <button key={st.id} onClick={()=>gotoWizStep(i)} style={{
                      flex:"1 1 auto", display:"flex", alignItems:"center", justifyContent:"center",
                      gap:"0.35rem", padding:"0.45rem 0.5rem", borderRadius:8,
                      border:`1.5px solid ${active?c.pri:done?`${c.pri}80`:c.border}`,
                      background:active?`${c.pri}18`:"transparent",
                      color:active?c.pri:done?c.text:c.muted,
                      cursor:"pointer", minHeight:"unset", whiteSpace:"nowrap",
                      fontSize:"0.68rem", fontWeight:active?700:500,
                    }}>
                      <span style={{
                        width:16, height:16, borderRadius:"50%", flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"0.58rem", fontWeight:700,
                        background:done?c.pri:active?`${c.pri}30`:"transparent",
                        border:done?"none":`1px solid ${active?c.pri:c.border}`,
                        color:done?"#fff":active?c.pri:c.muted,
                      }}>{done?"✓":i+1}</span>
                      {T("wizStep_"+st.id)}
                    </button>
                  );
                })}
              </div>
              <div style={{fontSize:"0.7rem", color:c.muted, lineHeight:1.5}}>
                {T("wizHint_"+WIZARD_STEPS[wizStep].id)}
              </div>
            </div>
          )}

          {/* ── WIZARD NAVIGÁCIA — Späť / Ďalej ── */}
          {simple && (
            <div style={{
              order:95, display:"flex", alignItems:"center", gap:"0.75rem",
              marginTop:"1.5rem", paddingTop:"1rem", borderTop:`1px solid ${c.border}`,
            }}>
              <button onClick={()=>gotoWizStep(wizStep-1)} disabled={wizStep===0} style={{
                background:"transparent", border:`1.5px solid ${wizStep===0?c.border:c.pri}`,
                borderRadius:8, padding:"0.55rem 1.1rem", cursor:wizStep===0?"default":"pointer",
                color:wizStep===0?c.muted:c.pri, fontSize:"0.78rem", fontWeight:700,
                opacity:wizStep===0?0.5:1, minHeight:"unset",
              }}>← {T("wizBack")}</button>
              <span style={{flex:1, textAlign:"center", fontSize:"0.68rem", color:c.muted}}>
                {T("wizStepOf").replace("{a}", wizStep+1).replace("{b}", WIZARD_STEPS.length)}
              </span>
              {wizStep<WIZARD_STEPS.length-1 ? (
                <button onClick={()=>gotoWizStep(wizStep+1)} style={{
                  background:c.pri, border:"none", borderRadius:8,
                  padding:"0.55rem 1.35rem", cursor:"pointer",
                  color:"#fff", fontSize:"0.78rem", fontWeight:700, minHeight:"unset",
                }}>{T("wizNext")} →</button>
              ) : (
                <button onClick={()=>gotoWizStep(0)} style={{
                  background:"transparent", border:`1.5px solid ${c.pri}`, borderRadius:8,
                  padding:"0.55rem 1.35rem", cursor:"pointer",
                  color:c.pri, fontSize:"0.78rem", fontWeight:700, minHeight:"unset",
                }}>↺ {T("wizRestart")}</button>
              )}
            </div>
          )}

          {/* ── ODVETVIE ── */}
          <div id="blk-info-industry" style={BLK("info-industry")}>
            <div style={S.secTitle}>Odvetvie a typ projektu<div style={S.divider}/></div>
            {/* Rozbaľovacia hlavička */}
            <button onClick={()=>{ setIndustryOpen(o=>!o); setIndustrySearch(""); }} style={{
              width:"100%", display:"flex", alignItems:"center", gap:"0.625rem",
              padding:"0.6rem 0.75rem", borderRadius:9, cursor:"pointer",
              border:`1.5px solid ${industryOpen?c.pri:c.border}`,
              background:industryOpen?`${c.pri}10`:c.inpBg, textAlign:"left", marginBottom:"0.75rem",
            }}>
              <span style={{fontSize:"1.05rem",flexShrink:0}}>
                {brief.industry ? (INDUSTRIES.find(i=>i.id===brief.industry)?.icon||"🏢") : "🏢"}
              </span>
              <span style={{flex:1,fontSize:"0.78rem",fontWeight:600,color:c.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {brief.industry ? (INDUSTRIES.find(i=>i.id===brief.industry)?.label||"Vyber odvetvie") : "Vyber odvetvie"}
              </span>
              <span style={{display:"flex",alignItems:"center",gap:"0.35rem",border:`1.5px solid ${c.pri}`,borderRadius:7,padding:"0.3rem 0.55rem",flexShrink:0}}>
                <span style={{fontSize:"0.68rem",fontWeight:700,color:c.pri}}>{industryOpen?"Zbaliť":"Rozbaliť"}</span>
                <span style={{fontSize:"0.75rem",color:c.pri,fontWeight:700,transform:industryOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
              </span>
            </button>

            {/* Rozbalený zoznam odvetví */}
            {industryOpen && (
              <div style={{marginBottom:"0.75rem"}}>
                {/* Fulltextové vyhľadávanie */}
                <div style={{position:"relative",marginBottom:"0.5rem"}}>
                  <input
                    autoFocus
                    value={industrySearch}
                    onChange={e=>setIndustrySearch(e.target.value)}
                    placeholder={'🔍 Hľadaj odvetvie alebo typ prevádzky… napr. "kaviareň", "autoservis", "lekáreň"'}
                    style={{
                      width:"100%",boxSizing:"border-box",
                      background:c.inpBg,border:`1.5px solid ${c.pri}`,borderRadius:8,
                      padding:"0.55rem 2rem 0.55rem 0.75rem",color:c.text,fontSize:"0.76rem",outline:"none",
                    }}
                  />
                  {industrySearch && (
                    <button onClick={()=>setIndustrySearch("")} style={{
                      position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                      background:"transparent",border:"none",color:c.muted,cursor:"pointer",
                      fontSize:"0.85rem",minHeight:"unset",padding:0,lineHeight:1,
                    }}>✕</button>
                  )}
                </div>

                <div style={{
                  maxHeight:340,overflowY:"auto",
                  border:`1px solid ${c.border}`,borderRadius:8,background:c.panel,
                }}>
                  {industrySearchResults===null ? (
                    // Bez vyhľadávania — plný abecedný zoznam
                    INDUSTRIES.map(ind=>{
                      const sel=brief.industry===ind.id;
                      return (
                        <button key={ind.id}
                          onClick={()=>{ update({industry:ind.id, industrySubcat:"", industryExtras:[]}); setIndustryOpen(false); setIndustrySearch(""); }}
                          style={{
                            width:"100%",display:"flex",alignItems:"center",gap:"0.625rem",
                            padding:"0.55rem 0.75rem",cursor:"pointer",textAlign:"left",
                            border:"none",borderLeft:`2px solid ${sel?c.pri:"transparent"}`,
                            background:sel?c.cardActive:"transparent",
                          }}>
                          <span style={{fontSize:"1rem",flexShrink:0,width:24}}>{ind.icon}</span>
                          <span style={{flex:1,fontSize:"0.78rem",color:sel?c.pri:c.text,fontWeight:sel?600:400}}>{ind.label}</span>
                          {sel && <span style={{color:c.pri,fontSize:"0.7rem"}}>✓</span>}
                        </button>
                      );
                    })
                  ) : industrySearchResults.length===0 ? (
                    <div style={{padding:"1rem",textAlign:"center",fontSize:"0.72rem",color:c.muted}}>
                      Nič nenájdené pre „{industrySearch}"
                    </div>
                  ) : (
                    // S vyhľadávaním — skupiny + zvýraznené podkategórie ktoré sa zhodujú
                    industrySearchResults.map(ind=>{
                      const sel=brief.industry===ind.id;
                      return (
                        <div key={ind.id}>
                          <button
                            onClick={()=>{ update({industry:ind.id, industrySubcat:"", industryExtras:[]}); setIndustryOpen(false); setIndustrySearch(""); }}
                            style={{
                              width:"100%",display:"flex",alignItems:"center",gap:"0.625rem",
                              padding:"0.5rem 0.75rem",cursor:"pointer",textAlign:"left",
                              border:"none",borderLeft:`2px solid ${sel?c.pri:"transparent"}`,
                              background:sel?c.cardActive:c.card,
                            }}>
                            <span style={{fontSize:"1rem",flexShrink:0,width:24}}>{ind.icon}</span>
                            <span style={{flex:1,fontSize:"0.76rem",color:sel?c.pri:c.text,fontWeight:600}}>{ind.label}</span>
                            {sel && <span style={{color:c.pri,fontSize:"0.7rem"}}>✓</span>}
                          </button>
                          {!ind.groupMatch && ind.matchedSubs.map(sub=>(
                            <button key={sub.id}
                              onClick={()=>{ update({industry:ind.id, industrySubcat:sub.id, industryExtras:[]}); setIndustryOpen(false); setIndustrySearch(""); }}
                              style={{
                                width:"100%",display:"flex",alignItems:"center",gap:"0.5rem",
                                padding:"0.4rem 0.75rem 0.4rem 2.25rem",cursor:"pointer",textAlign:"left",
                                border:"none",background:"transparent",
                              }}>
                              <span style={{fontSize:"0.8rem",flexShrink:0}}>{sub.icon}</span>
                              <span style={{flex:1,fontSize:"0.7rem",color:c.muted}}>{sub.label}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Subcategory */}
            {brief.industry && (()=>{
              const ind = INDUSTRIES.find(i=>i.id===brief.industry);
              if(!ind) return null;
              return (
                <div style={{marginBottom:"1rem"}}>
                  <div style={{fontSize:"0.62rem",color:c.muted,marginBottom:"0.5rem",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Typ prevádzky / projektu</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0.375rem"}}>
                    {ind.subs.map(sub=>(
                      <button key={sub.id}
                        onClick={()=>update({industrySubcat:sub.id, industryExtras:[]})}
                        style={{
                          padding:"0.5rem 0.625rem", borderRadius:8, textAlign:"left",
                          border:`1.5px solid ${brief.industrySubcat===sub.id?c.pri:c.border}`,
                          background:brief.industrySubcat===sub.id?c.cardActive:c.inpBg,
                          color:brief.industrySubcat===sub.id?c.text:c.muted,
                          cursor:"pointer", minHeight:"unset",
                          display:"flex", flexDirection:"column", gap:2,
                        }}>
                        <span style={{fontSize:"0.8rem"}}>{sub.icon} <strong style={{fontSize:"0.75rem",fontWeight:600}}>{sub.label}</strong></span>
                        <span style={{fontSize:"0.62rem",color:brief.industrySubcat===sub.id?c.muted:"#555",lineHeight:1.3}}>{sub.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Industry note */}
            {brief.industry && (
              <div style={S.fRow}>
                <label style={S.lbl}>Upresnenie / poznámka k odvetviu <span style={{fontWeight:400,textTransform:"none"}}>(voliteľné)</span></label>
                <input style={S.inp} placeholder={INDUSTRY_NOTE_HINTS[brief.industry] || "napr. čo robí váš biznis jedinečným, kľúčové detaily prevádzky..."}
                  value={brief.industryNote||""} onChange={e=>update({industryNote:e.target.value})}/>
              </div>
            )}

            {/* ── Adaptívny výber podľa odvetvia (napr. oblasti práva) ── */}
            {brief.industry && (()=>{
              const ex = getIndustryExtras(brief.industry, brief.industrySubcat);
              const preset = INDUSTRY_SECTION_PRESETS[brief.industry];
              if (!ex && !preset) return null;
              const selected = brief.industryExtras || [];
              return (
                <>
                  {ex && (
                    <div style={{marginTop:"0.875rem"}}>
                      <label style={S.lbl}>{lang==="sk" ? ex.title : (ex.en || ex.title)}</label>
                      <div style={{fontSize:"0.62rem", color:c.muted, margin:"0.15rem 0 0.5rem"}}>{T("extrasHint")}</div>
                      <div style={{display:"flex", flexWrap:"wrap", gap:"0.4rem"}}>
                        {ex.options.map(o=>{
                          const on = selected.includes(o.id);
                          return (
                            <button key={o.id}
                              onClick={()=>update({industryExtras: on ? selected.filter(x=>x!==o.id) : [...selected, o.id]})}
                              style={{
                                padding:"0.35rem 0.7rem", borderRadius:20, cursor:"pointer", minHeight:"unset",
                                fontSize:"0.68rem", fontWeight:600, transition:"all .15s",
                                border:`1.5px solid ${on?c.pri:c.border}`,
                                background:on?`${c.pri}18`:c.inpBg,
                                color:on?c.pri:c.muted,
                              }}>
                              {on ? "✓ " : ""}{extraLabel(o, lang)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {preset && (
                    <div style={{marginTop:"0.75rem", display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap"}}>
                      <span style={{fontSize:"0.62rem", color:c.muted}}>{T("recommended")}:</span>
                      <button onClick={()=>update({sections:[...preset]})}
                        style={{
                          padding:"0.3rem 0.7rem", borderRadius:7, cursor:"pointer", minHeight:"unset",
                          fontSize:"0.65rem", fontWeight:700,
                          border:`1.5px solid ${c.pri}`, background:`${c.pri}14`, color:c.pri,
                        }}>
                        {JSON.stringify(brief.sections)===JSON.stringify(preset) ? T("applied") : `${T("useRecommended")} (${preset.length})`}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* ── PROJEKT ── */}
          <div id="blk-info-project" style={BLK("info-project")}>
            <div style={S.secTitle}>Projekt<div style={S.divider}/></div>
            <div style={S.fRow}>
              <label style={S.lbl}>Názov projektu / webu</label>
              <input style={S.inp} placeholder="napr. MediaVolt…"
                value={brief.projectName} onChange={e=>update({projectName:e.target.value})}/>
            </div>
          </div>

          {/* ── FIREMNÉ ÚDAJE ── */}
          <div id="blk-info-company" style={BLK("info-company")}>
            <div style={S.secTitle}>Firemné údaje<div style={S.divider}/></div>
            <div style={S.fRow}>
              <label style={S.lbl}>Obchodný názov firmy</label>
              <input style={S.inp} placeholder="napr. MediaVolt s.r.o."
                value={brief.companyName} onChange={e=>update({companyName:e.target.value})}/>
            </div>
            <div style={S.g3}>
              <div><label style={S.lbl}>IČO</label><input style={S.inp} placeholder="12345678" value={brief.ico} onChange={e=>update({ico:e.target.value})}/></div>
              <div><label style={S.lbl}>DIČ</label><input style={S.inp} placeholder="2023456789" value={brief.dic} onChange={e=>update({dic:e.target.value})}/></div>
              <div><label style={S.lbl}>IČ DPH</label><input style={S.inp} placeholder="SK2023456789" value={brief.icdph} onChange={e=>update({icdph:e.target.value})}/></div>
            </div>
            <div style={S.g2}>
              <div style={S.fRow}><label style={S.lbl}>Telefón</label><input style={S.inp} placeholder="+421 900 000 000" value={brief.phone} onChange={e=>update({phone:e.target.value})}/></div>
              <div style={S.fRow}><label style={S.lbl}>Email</label><input style={S.inp} type="email" placeholder="info@firma.sk" value={brief.email} onChange={e=>update({email:e.target.value})}/></div>
            </div>
            <div style={S.fRow}><label style={S.lbl}>Web (existujúci)</label><input style={S.inp} placeholder="https://www.firma.sk" value={brief.web} onChange={e=>update({web:e.target.value})}/></div>
          </div>

          {/* ── ADRESY ── */}
          <div id="blk-info-address" style={BLK("info-address")}>
            <div style={S.secTitle}>Adresy<div style={S.divider}/><button style={S.addBtn} onClick={addAddress}>+ Pridať</button></div>
            {brief.addresses.map(addr=>(
              <div key={addr.id} style={S.addrCard}>
                <div style={S.addrTypes}>
                  {ADDRESS_TYPES.map(at=>(
                    <button key={at.id} style={S.addrTypeBtn(addr.type===at.id)} onClick={()=>updateAddress(addr.id,"type",at.id)}>
                      {at.icon} {at.label}
                    </button>
                  ))}
                  {brief.addresses.length>1 && <button style={S.removeBtn} onClick={()=>removeAddress(addr.id)}>✕</button>}
                </div>
                <div style={S.fRow}><label style={S.lbl}>Ulica a číslo</label><input style={S.inp} placeholder="Doplňte ulicu" value={addr.street} onChange={e=>updateAddress(addr.id,"street",e.target.value)}/></div>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"0.5rem"}}>
                  {/* Mesto — inteligentné doplňanie */}
                  <div style={{position:"relative"}}>
                    <label style={S.lbl}>Mesto</label>
                    <input style={S.inp}
                      placeholder="Zadajte mesto…"
                      value={citySearch[addr.id]?.query!==undefined ? citySearch[addr.id].query : addr.city}
                      onChange={e=>{
                        const q=e.target.value;
                        setCitySearch(prev=>({...prev,[addr.id]:{query:q,open:true}}));
                        updateAddress(addr.id,"city",q);
                      }}
                      onFocus={()=>setCitySearch(prev=>({...prev,[addr.id]:{...prev[addr.id],open:true}}))}
                      onBlur={()=>setTimeout(()=>setCitySearch(prev=>({...prev,[addr.id]:{...prev[addr.id],open:false}})),150)}
                    />
                    {(()=>{
                      const cs=citySearch[addr.id];
                      if(!cs?.open || !cs?.query?.trim() || cs.query.length<2) return null;
                      const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
                      const q=norm(cs.query);
                      const hits=SK_CITIES.filter(x=>norm(x.city).includes(q)).slice(0,8);
                      if(!hits.length) return null;
                      return (
                        <div style={{
                          position:"absolute",top:"100%",left:0,right:0,zIndex:50,
                          background:c.panel,border:`1.5px solid ${c.pri}`,borderRadius:8,
                          boxShadow:"0 4px 16px rgba(0,0,0,0.3)",maxHeight:200,overflowY:"auto",
                        }}>
                          {hits.map(h=>(
                            <button key={h.city+h.zip} onMouseDown={()=>{
                              updateAddress(addr.id,"city",h.city);
                              updateAddress(addr.id,"zip",h.zip);
                              setCitySearch(prev=>({...prev,[addr.id]:{query:h.city,open:false}}));
                            }} style={{
                              width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
                              padding:"0.45rem 0.625rem",border:"none",background:"transparent",
                              cursor:"pointer",textAlign:"left",borderBottom:`1px solid ${c.border}`,
                            }}>
                              <span style={{fontSize:"0.75rem",color:c.text,fontWeight:500}}>{h.city}</span>
                              <span style={{fontSize:"0.66rem",color:c.pri,fontWeight:600,flexShrink:0,marginLeft:"0.5rem"}}>{h.zip}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div><label style={S.lbl}>PSČ</label><input style={S.inp} placeholder="831 04" value={addr.zip} onChange={e=>updateAddress(addr.id,"zip",e.target.value)}/></div>
                  <div><label style={S.lbl}>Krajina</label><input style={S.inp} placeholder="Slovensko" value={addr.country} onChange={e=>updateAddress(addr.id,"country",e.target.value)}/></div>
                </div>
              </div>
            ))}
          </div>

          {/* ── DETAILY PROJEKTU — technické požiadavky ── */}
          <div id="blk-info-details" style={BLK("info-details")}>
            <div style={S.secTitle}>Detaily projektu<div style={S.divider}/></div>
            <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.5rem"}}>Technické požiadavky</div>

            {/* Domény */}
            <div style={{marginBottom:"0.875rem"}}>
              <label style={S.lbl}>Doména</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"0.6rem"}}>
                {[
                  { id:"have",   label:"Mám doménu/y",        icon:"✅" },
                  { id:"need",   label:"Potrebujem doménu/y", icon:"🆕" },
                ].map(opt=>{
                  const sel=brief.domainStatus===opt.id;
                  return (
                    <button key={opt.id} onClick={()=>update({domainStatus:opt.id})} style={{
                      padding:"0.5rem 0.625rem",borderRadius:8,cursor:"pointer",minHeight:"unset",
                      border:`1.5px solid ${sel?c.pri:c.border}`,
                      background:sel?c.cardActive:c.inpBg,
                      display:"flex",alignItems:"center",gap:"0.4rem",
                    }}>
                      <span style={{fontSize:"0.9rem"}}>{opt.icon}</span>
                      <span style={{fontSize:"0.74rem",fontWeight:sel?600:400,color:sel?c.pri:c.text}}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {brief.domainStatus && (
                <>
                  {(brief.domains&&brief.domains.length?brief.domains:[""]).map((dom,i)=>(
                    <div key={i} style={{display:"flex",gap:"0.4rem",marginBottom:"0.4rem"}}>
                      <input
                        style={{...S.inp,flex:1}}
                        placeholder={brief.domainStatus==="have" ? "napr. mediavolt.sk" : "napr. mediavolt.sk (názov ktorý chceš overiť)"}
                        value={dom}
                        onChange={e=>{
                          const arr=[...(brief.domains&&brief.domains.length?brief.domains:[""])];
                          arr[i]=e.target.value;
                          update({domains:arr});
                        }}
                      />
                      {brief.domainStatus==="need" && dom.trim() && (
                        <a
                          href={`https://whois.sk-nic.sk/whois?text=${encodeURIComponent(dom.trim())}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            display:"flex",alignItems:"center",gap:"0.3rem",flexShrink:0,
                            border:`1.5px solid ${c.pri}`,borderRadius:7,padding:"0 0.65rem",
                            color:c.pri,fontSize:"0.7rem",fontWeight:700,textDecoration:"none",
                          }}>
                          🔍 Overiť na SK-NIC
                        </a>
                      )}
                      {(brief.domains&&brief.domains.length>1) && (
                        <button onClick={()=>{
                          const arr=[...brief.domains]; arr.splice(i,1);
                          update({domains:arr.length?arr:[""]});
                        }} style={{
                          flexShrink:0,background:"transparent",border:`1px solid ${c.border}`,
                          borderRadius:7,padding:"0 0.55rem",color:c.muted,cursor:"pointer",fontSize:"0.75rem",minHeight:"unset",
                        }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={()=>update({domains:[...(brief.domains&&brief.domains.length?brief.domains:[""]),""]})}
                    style={{
                      background:"transparent",border:`1.5px dashed ${c.pri}`,borderRadius:7,
                      padding:"0.35rem 0.7rem",color:c.pri,fontSize:"0.7rem",fontWeight:600,
                      cursor:"pointer",minHeight:"unset",
                    }}>
                    + Pridať ďalšiu doménu
                  </button>
                  {brief.domainStatus==="need" && (
                    <div style={{fontSize:"0.6rem",color:c.desc,lineHeight:1.4,marginTop:"0.5rem"}}>
                      Overenie dostupnosti otvorí WHOIS databázu SK-NIC v novom okne — funguje pre .sk domény.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Hosting */}
            <div style={{marginBottom:"0.875rem"}}>
              <label style={S.lbl}>Hosting</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom: brief.techHosting==="existing"?"0.5rem":0}}>
                {HOSTING_OPTIONS.map(opt=>{
                  const sel=brief.techHosting===opt.id;
                  return (
                    <button key={opt.id} onClick={()=>update({techHosting:opt.id})} style={{
                      padding:"0.5rem 0.625rem",borderRadius:8,textAlign:"left",cursor:"pointer",minHeight:"unset",
                      border:`1.5px solid ${sel?c.pri:c.border}`,
                      background:sel?c.cardActive:c.inpBg,
                    }}>
                      <div style={{fontSize:"0.74rem",fontWeight:sel?600:400,color:sel?c.pri:c.text}}>{opt.label}</div>
                      <div style={{fontSize:"0.6rem",color:c.desc,lineHeight:1.3}}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
              {brief.techHosting==="existing" && (
                <input style={S.inp}
                  placeholder="napr. WebSupport, Websupport.sk, vlastný VPS, IP adresa…"
                  value={brief.techHostingNote||""}
                  onChange={e=>update({techHostingNote:e.target.value})}/>
              )}
            </div>

            {/* CMS */}
            <div style={{marginBottom:"0.875rem"}}>
              <label style={S.lbl}>CMS / Systém na správu obsahu</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
                {CMS_OPTIONS.map(opt=>{
                  const sel=brief.techCms===opt.id;
                  return (
                    <button key={opt.id} onClick={()=>update({techCms:opt.id})} style={{
                      padding:"0.5rem 0.625rem",borderRadius:8,textAlign:"left",cursor:"pointer",minHeight:"unset",
                      border:`1.5px solid ${sel?c.pri:c.border}`,
                      background:sel?c.cardActive:c.inpBg,
                    }}>
                      <div style={{fontSize:"0.74rem",fontWeight:sel?600:400,color:sel?c.pri:c.text}}>{opt.label}</div>
                      <div style={{fontSize:"0.6rem",color:c.desc,lineHeight:1.3}}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jazyky */}
            <div style={{marginBottom:"0.875rem"}}>
              <label style={S.lbl}>Jazykové verzie webu</label>

              {/* Obľúbené — vždy viditeľné */}
              <div style={{fontSize:"0.6rem",color:c.muted,marginBottom:"0.3rem",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Obľúbené</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.35rem",marginBottom:"0.6rem"}}>
                {FAVORITE_LANGUAGES.map(lang=>{
                  const sel=(brief.techLanguages||[]).includes(lang);
                  return (
                    <button key={lang}
                      onClick={()=>update({techLanguages: sel ? brief.techLanguages.filter(x=>x!==lang) : [...(brief.techLanguages||[]),lang]})}
                      style={{
                        padding:"0.3rem 0.7rem",borderRadius:20,cursor:"pointer",minHeight:"unset",
                        border:`1px solid ${sel?c.pri:c.border}`,
                        background:sel?`${c.pri}18`:"transparent",
                        color:sel?c.pri:c.muted,fontSize:"0.7rem",fontWeight:sel?600:400,
                      }}>
                      {sel?"✓ ":""}{lang}
                    </button>
                  );
                })}
              </div>

              {/* Rollbar — všetky jazyky abecedne */}
              <button onClick={()=>setLangOpen(o=>!o)} style={{
                width:"100%", display:"flex", alignItems:"center", gap:"0.625rem",
                padding:"0.55rem 0.7rem", borderRadius:8, cursor:"pointer",
                border:`1.5px solid ${langOpen?c.pri:c.border}`,
                background:langOpen?`${c.pri}10`:c.inpBg, textAlign:"left",
              }}>
                <span style={{flex:1,fontSize:"0.74rem",fontWeight:600,color:c.text}}>
                  Všetky jazyky (A–Z){(brief.techLanguages&&brief.techLanguages.length) ? ` — vybraté: ${brief.techLanguages.length}` : ""}
                </span>
                <span style={{display:"flex",alignItems:"center",gap:"0.3rem",border:`1.5px solid ${c.pri}`,borderRadius:6,padding:"0.25rem 0.5rem",flexShrink:0}}>
                  <span style={{fontSize:"0.64rem",fontWeight:700,color:c.pri}}>{langOpen?"Zbaliť":"Rozbaliť"}</span>
                  <span style={{fontSize:"0.7rem",color:c.pri,fontWeight:700,transform:langOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
                </span>
              </button>

              {langOpen && (
                <div style={{
                  marginTop:"0.4rem",maxHeight:240,overflowY:"auto",
                  border:`1px solid ${c.border}`,borderRadius:8,background:c.panel,padding:"0.5rem",
                  display:"flex",flexWrap:"wrap",gap:"0.35rem",
                }}>
                  {LANGUAGE_OPTIONS.map((lang,i)=>{
                    const sel=(brief.techLanguages||[]).includes(lang);
                    return (
                      <button key={lang+"-"+i}
                        onClick={()=>update({techLanguages: sel ? brief.techLanguages.filter(x=>x!==lang) : [...(brief.techLanguages||[]),lang]})}
                        style={{
                          padding:"0.3rem 0.7rem",borderRadius:20,cursor:"pointer",minHeight:"unset",
                          border:`1px solid ${sel?c.pri:c.border}`,
                          background:sel?`${c.pri}18`:"transparent",
                          color:sel?c.pri:c.muted,fontSize:"0.7rem",fontWeight:sel?600:400,
                        }}>
                        {sel?"✓ ":""}{lang}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Integrácie */}
            <div style={{marginBottom:"0.5rem"}}>
              <label style={S.lbl}>Integrácie a nástroje</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem"}}>
                {INTEGRATION_OPTIONS.map(opt=>{
                  const sel=(brief.techIntegrations||[]).includes(opt.id);
                  return (
                    <button key={opt.id}
                      onClick={()=>update({techIntegrations: sel ? brief.techIntegrations.filter(x=>x!==opt.id) : [...(brief.techIntegrations||[]),opt.id]})}
                      style={{
                        display:"flex",alignItems:"center",gap:"0.45rem",
                        padding:"0.4rem 0.55rem",borderRadius:7,cursor:"pointer",minHeight:"unset",textAlign:"left",
                        border:`1.5px solid ${sel?c.pri:c.border}`,
                        background:sel?c.cardActive:c.inpBg,
                      }}>
                      <div style={{
                        width:14,height:14,borderRadius:3,flexShrink:0,
                        border:`2px solid ${sel?c.pri:c.border}`,background:sel?c.pri:"transparent",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.5rem",color:"#fff",
                      }}>{sel?"✓":""}</div>
                      <span style={{fontSize:"0.7rem",color:sel?c.pri:c.text,fontWeight:sel?600:400}}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Poznámka */}
            <div style={S.fRow}>
              <label style={S.lbl}>Ďalšie technické poznámky <span style={{fontWeight:400,textTransform:"none"}}>(voliteľné)</span></label>
              <textarea style={{...S.ta,minHeight:56}} placeholder="napr. potreba napojenia na existujúci sklad, špecifická infrastruktúra…"
                value={brief.techNote||""} onChange={e=>update({techNote:e.target.value})}/>
            </div>
          </div>

          {/* ── BRAND LOGO ── */}
          <div id="blk-brand-logo" style={BLK("brand-logo")}>
            <div style={S.secTitle}>Logo firmy<div style={S.divider}/></div>

            {/* Mám logo / chcem vytvoriť */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.875rem"}}>
              {[
                { id:"have",   label:"Mám logo",        icon:"✅", desc:"Nahrajem existujúce logo" },
                { id:"create", label:"Chcem vytvoriť",  icon:"✨", desc:"Potrebujem návrh nového loga" },
              ].map(opt=>(
                <button key={opt.id} onClick={()=>update({logoChoice:opt.id})} style={{
                  padding:"0.75rem",borderRadius:9,textAlign:"left",cursor:"pointer",minHeight:"unset",
                  border:`2px solid ${brief.logoChoice===opt.id?c.pri:c.border}`,
                  background:brief.logoChoice===opt.id?`${c.pri}12`:c.inpBg,
                  display:"flex",flexDirection:"column",gap:"0.3rem",
                }}>
                  <div style={{fontSize:"1.1rem"}}>{opt.icon}</div>
                  <div style={{fontSize:"0.8rem",fontWeight:700,color:brief.logoChoice===opt.id?c.pri:c.text}}>{opt.label}</div>
                  <div style={{fontSize:"0.66rem",color:c.desc,lineHeight:1.4}}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Ak chcem vytvoriť */}
            {brief.logoChoice==="create" && (
              <div style={{padding:"0.75rem",background:c.card,border:`1px solid ${c.border}`,borderRadius:8,marginBottom:"0.875rem"}}>
                <div style={{fontSize:"0.72rem",color:c.text,marginBottom:"0.4rem",fontWeight:600}}>✨ Návrh nového loga</div>
                <div style={{fontSize:"0.66rem",color:c.desc,lineHeight:1.5,marginBottom:"0.5rem"}}>
                  Opíš predstavu — štýl (minimalistické, ilustratívne, lettermark…), nálada, farby, čomu sa vyhnúť.
                </div>
                <textarea
                  placeholder="napr. moderné minimalistické logo, lettermark z iniciálok, zlatá + čierna, vyhnúť sa kruhom…"
                  value={brief.logoBrief||""}
                  onChange={e=>update({logoBrief:e.target.value})}
                  style={{width:"100%",boxSizing:"border-box",background:c.bg,border:`1px solid ${c.border}`,borderRadius:6,padding:"0.5rem 0.625rem",color:c.text,fontSize:"0.75rem",outline:"none",resize:"vertical",minHeight:56,fontFamily:"inherit",lineHeight:1.5}}
                />

                {/* Referenčné návrhy */}
                <div style={{marginTop:"0.75rem"}}>
                  <div style={{fontSize:"0.7rem",fontWeight:600,color:c.text,marginBottom:"0.3rem"}}>Pridajte referenčné návrhy log ktoré sa Vám páčia</div>
                  <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.4,marginBottom:"0.5rem"}}>
                    Nahrajte obrázky log alebo štýlov ktoré sa Vám páčia — pomôžu nasmerovať návrh.
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
                    {(brief.logoRefs||[]).map(ref=>(
                      <div key={ref.id} style={{position:"relative",width:72,height:72,borderRadius:7,overflow:"hidden",border:`1px solid ${c.border}`,background:c.bg}}>
                        <img src={ref.data} alt={ref.name} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
                        <button onClick={()=>removeLogoRef(ref.id)} style={{
                          position:"absolute",top:2,right:2,width:18,height:18,borderRadius:"50%",
                          border:"none",background:"rgba(0,0,0,0.6)",color:"#fff",cursor:"pointer",
                          fontSize:"0.65rem",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",padding:0,minHeight:"unset",
                        }}>✕</button>
                      </div>
                    ))}
                    {/* Add tile */}
                    <label style={{
                      width:72,height:72,borderRadius:7,cursor:"pointer",flexShrink:0,
                      border:`1.5px dashed ${c.pri}`,background:`${c.pri}08`,
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
                      color:c.pri,fontSize:"0.6rem",fontWeight:600,textAlign:"center",
                    }}>
                      <span style={{fontSize:"1.1rem",lineHeight:1}}>+</span>
                      <span>Pridať</span>
                      <input type="file" accept="image/*" multiple style={{display:"none"}}
                        onChange={e=>{ addLogoRefs(e.target.files); e.target.value=""; }}/>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Ak mám logo — ponechať / redizajnovať */}
            {brief.logoChoice==="have" && (
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.875rem"}}>
                  {[
                    { id:"keep",     label:"Ponechať rovnaké", icon:"🔒", desc:"Logo ostáva bez zmien" },
                    { id:"redesign", label:"Redizajnovať",     icon:"🔁", desc:"Chcem osviežiť / prepracovať" },
                  ].map(opt=>(
                    <button key={opt.id} onClick={()=>update({logoKeepRedesign:opt.id})} style={{
                      padding:"0.6rem 0.7rem",borderRadius:8,textAlign:"left",cursor:"pointer",minHeight:"unset",
                      border:`1.5px solid ${brief.logoKeepRedesign===opt.id?c.pri:c.border}`,
                      background:brief.logoKeepRedesign===opt.id?c.cardActive:c.inpBg,
                      display:"flex",flexDirection:"column",gap:"0.25rem",
                    }}>
                      <div style={{fontSize:"0.74rem",fontWeight:600,color:brief.logoKeepRedesign===opt.id?c.pri:c.text}}>{opt.icon} {opt.label}</div>
                      <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.3}}>{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Upload pre umiestnenia */}
                {brief.logoKeepRedesign && (
                  <>
                    <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.5rem"}}>
                      Logo pre rôzne umiestnenia
                    </div>
                    {LOGO_PLACEMENTS.map(p=>{
                      const up=(brief.logoUploads||{})[p.id];
                      return (
                        <div key={p.id} style={{
                          border:`1px solid ${up?c.pri:c.border}`,borderRadius:8,padding:"0.625rem 0.75rem",
                          marginBottom:"0.5rem",background:up?`${c.pri}08`:c.inpBg,
                          display:"flex",alignItems:"center",gap:"0.75rem",
                        }}>
                          {/* náhľad alebo placeholder */}
                          <div style={{width:48,height:48,borderRadius:6,flexShrink:0,border:`1px solid ${c.border}`,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                            {up ? <img src={up.data} alt={p.label} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/> : <span style={{fontSize:"1rem",opacity:0.4}}>🖼</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:"0.74rem",fontWeight:600,color:c.text}}>{p.label}</div>
                            <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.3}}>
                              {p.ratio} · {p.size}
                            </div>
                            <div style={{fontSize:"0.58rem",color:c.muted,lineHeight:1.3,marginTop:1}}>{p.hint}</div>
                          </div>
                          <div style={{flexShrink:0,display:"flex",flexDirection:"column",gap:"0.25rem"}}>
                            <label style={{
                              fontSize:"0.66rem",fontWeight:600,color:c.pri,cursor:"pointer",
                              border:`1.5px solid ${c.pri}`,borderRadius:6,padding:"0.3rem 0.55rem",textAlign:"center",
                            }}>
                              {up?"Zmeniť":"Nahrať"}
                              <input type="file" accept="image/*" style={{display:"none"}}
                                onChange={e=>handleLogoUpload(p.id, e.target.files&&e.target.files[0])}/>
                            </label>
                            {up && <button onClick={()=>removeLogoUpload(p.id)} style={{fontSize:"0.62rem",color:c.muted,background:"transparent",border:`1px solid ${c.border}`,borderRadius:6,padding:"0.2rem 0.45rem",cursor:"pointer",minHeight:"unset"}}>Odstrániť</button>}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>

          {/* ── BRAND PRESET ── */}
          <div id="blk-brand-preset" style={BLK("brand-preset")}>
            <div style={S.secTitle}>Brand — presety<div style={S.divider}/></div>
            {/* Rozbaľovacia hlavička */}
            <button onClick={()=>setPresetOpen(o=>!o)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:"0.625rem",
              padding:"0.6rem 0.75rem", borderRadius:9, cursor:"pointer",
              border:`1.5px solid ${presetOpen?c.pri:c.border}`,
              background:presetOpen?`${c.pri}10`:c.inpBg, textAlign:"left",
            }}>
              {/* aktuálne swatche */}
              <div style={{display:"flex",gap:3,flexShrink:0}}>
                {["bg","primary","accent","text"].map(k=>(
                  <div key={k} style={{width:16,height:16,borderRadius:4,background:br[k]||"#000",border:`1px solid ${c.border}`}}/>
                ))}
              </div>
              <span style={{flex:1,fontSize:"0.78rem",fontWeight:600,color:c.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {brief.preset||"Vyber preset"}
              </span>
              <span style={{display:"flex",alignItems:"center",gap:"0.35rem",border:`1.5px solid ${c.pri}`,borderRadius:7,padding:"0.3rem 0.55rem",flexShrink:0}}>
                <span style={{fontSize:"0.68rem",fontWeight:700,color:c.pri}}>{presetOpen?"Zbaliť":"Rozbaliť"}</span>
                <span style={{fontSize:"0.75rem",color:c.pri,fontWeight:700,transform:presetOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
              </span>
            </button>

            {/* Rozbalený zoznam */}
            {presetOpen && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginTop:"0.5rem"}}>
              {THEME_PRESETS.map(t=>{
                const darkName=`${t.label} Dark`, lightName=`${t.label} Light`;
                const activeVariant = brief.preset===darkName ? "dark" : brief.preset===lightName ? "light" : null;
                return (
                  <div key={t.id} style={{
                    border:`1.5px solid ${activeVariant?c.pri:c.border}`,
                    borderRadius:9, padding:"0.6rem 0.7rem", background:activeVariant?`${c.pri}10`:c.bg,
                  }}>
                    <div style={{fontSize:"0.74rem",fontWeight:600,color:c.text,marginBottom:"0.5rem"}}>{t.label}</div>
                    <div style={{display:"flex",gap:3,marginBottom:"0.5rem"}}>
                      {["bg","surface","primary","accent","text"].map(k=>(
                        <div key={k} style={{width:16,height:16,borderRadius:4,background:(activeVariant==="light"?t.light:t.dark)[k],border:`1px solid ${c.border}`}}/>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>applyPreset(darkName)} style={{
                        flex:1,padding:"0.3rem",borderRadius:6,cursor:"pointer",minHeight:"unset",
                        border:`1px solid ${activeVariant==="dark"?c.pri:c.border}`,
                        background:activeVariant==="dark"?c.pri:"transparent",
                        color:activeVariant==="dark"?"#fff":c.muted,
                        fontSize:"0.66rem",fontWeight:activeVariant==="dark"?700:400,
                      }}>🌙 Dark</button>
                      <button onClick={()=>applyPreset(lightName)} style={{
                        flex:1,padding:"0.3rem",borderRadius:6,cursor:"pointer",minHeight:"unset",
                        border:`1px solid ${activeVariant==="light"?c.pri:c.border}`,
                        background:activeVariant==="light"?c.pri:"transparent",
                        color:activeVariant==="light"?"#fff":c.muted,
                        fontSize:"0.66rem",fontWeight:activeVariant==="light"?700:400,
                      }}>☀️ Light</button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          <div id="blk-brand-colors" style={BLK("brand-colors")}>
            <div style={S.secTitle}>Farby<div style={S.divider}/></div>
            {/* Rozbaľovacia hlavička */}
            <button onClick={()=>setColorsOpen(o=>!o)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:"0.625rem",
              padding:"0.6rem 0.75rem", borderRadius:9, cursor:"pointer",
              border:`1.5px solid ${colorsOpen?c.pri:c.border}`,
              background:colorsOpen?`${c.pri}10`:c.inpBg, textAlign:"left",
            }}>
              <div style={{display:"flex",gap:3,flexShrink:0}}>
                {["bg","surface","border","text","muted","primary","accent"].map(k=>(
                  <div key={k} style={{width:16,height:16,borderRadius:4,background:br[k]||"#000",border:`1px solid ${c.border}`}}/>
                ))}
              </div>
              <span style={{flex:1,fontSize:"0.78rem",fontWeight:600,color:c.text}}>Farebné tokeny</span>
              <span style={{display:"flex",alignItems:"center",gap:"0.35rem",border:`1.5px solid ${c.pri}`,borderRadius:7,padding:"0.3rem 0.55rem",flexShrink:0}}>
                <span style={{fontSize:"0.68rem",fontWeight:700,color:c.pri}}>{colorsOpen?"Zbaliť":"Rozbaliť"}</span>
                <span style={{fontSize:"0.75rem",color:c.pri,fontWeight:700,transform:colorsOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
              </span>
            </button>
            {colorsOpen && (
            <div style={{...S.colorGrid,marginTop:"0.5rem"}}>
              {[{k:"bg",l:"Pozadie"},{k:"surface",l:"Surface"},{k:"border",l:"Border"},{k:"text",l:"Text"},{k:"muted",l:"Muted"},{k:"primary",l:"Primárna"},{k:"accent",l:"Accent"}].map(({k,l})=>(
                <div key={k}>
                  <div style={{fontSize:"0.62rem",color:c.muted,marginBottom:"0.25rem"}}>{l}</div>
                  <div style={S.colorItem}>
                    <div style={S.swatch(br[k]||"#000")}/>
                    <input type="color" value={br[k]||"#000000"} onChange={e=>updateBrand(k,e.target.value)} style={S.cpick}/>
                    <input value={br[k]||""} style={S.cinp} onChange={e=>updateBrand(k,e.target.value)}/>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          <div id="blk-brand-fonts" style={BLK("brand-fonts")}>
            <div style={S.secTitle}>Typografia<div style={S.divider}/></div>
            {/* Rozbaľovacia hlavička */}
            <button onClick={()=>setFontsOpen(o=>!o)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:"0.625rem",
              padding:"0.6rem 0.75rem", borderRadius:9, cursor:"pointer",
              border:`1.5px solid ${fontsOpen?c.pri:c.border}`,
              background:fontsOpen?`${c.pri}10`:c.inpBg, textAlign:"left", marginBottom:fontsOpen?"0.5rem":0,
            }}>
              <span style={{fontFamily:`'${br.fontDisplay||"Inter"}',sans-serif`,fontSize:"1.15rem",fontWeight:700,color:c.text,flexShrink:0,lineHeight:1}}>Ag</span>
              <span style={{flex:1,fontSize:"0.78rem",fontWeight:600,color:c.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {(br.fontDisplay||"Inter")} / {(br.fontBody||"Inter")}
              </span>
              <span style={{display:"flex",alignItems:"center",gap:"0.35rem",border:`1.5px solid ${c.pri}`,borderRadius:7,padding:"0.3rem 0.55rem",flexShrink:0}}>
                <span style={{fontSize:"0.68rem",fontWeight:700,color:c.pri}}>{fontsOpen?"Zbaliť":"Rozbaliť"}</span>
                <span style={{fontSize:"0.75rem",color:c.pri,fontWeight:700,transform:fontsOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
              </span>
            </button>
            {fontsOpen && [
              { key:"fontDisplay", label:"Display font", sample:"Aa", note:"nadpisy" },
              { key:"fontBody",    label:"Body font",    sample:"Aa", note:"text" },
            ].map(({key,label,note})=>{
              const cur=br[key]||"Inter";
              const isOpen=fontPicker===key;
              return (
                <div key={key} style={{marginBottom:"0.875rem",position:"relative"}}>
                  <label style={S.lbl}>{label} <span style={{fontWeight:400,textTransform:"none"}}>({note})</span></label>
                  {/* roller hlavička */}
                  <button onClick={()=>setFontPicker(isOpen?null:key)} style={{
                    width:"100%",display:"flex",alignItems:"center",gap:"0.625rem",
                    padding:"0.55rem 0.75rem",borderRadius:8,cursor:"pointer",
                    border:`1.5px solid ${isOpen?c.pri:c.border}`,
                    background:isOpen?`${c.pri}10`:c.inpBg,textAlign:"left",
                  }}>
                    <span style={{fontFamily:`'${cur}',sans-serif`,fontSize:"1.15rem",fontWeight:700,color:c.text,flexShrink:0,lineHeight:1}}>Ag</span>
                    <span style={{flex:1,fontFamily:`'${cur}',sans-serif`,fontSize:"0.85rem",color:c.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cur}</span>
                    <span style={{fontSize:"0.75rem",color:c.pri,fontWeight:700,transform:isOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
                  </button>
                  {/* roller zoznam */}
                  {isOpen && (
                    <div style={{
                      marginTop:"0.35rem",maxHeight:280,overflowY:"auto",
                      border:`1px solid ${c.border}`,borderRadius:8,background:c.panel,
                    }}>
                      {["Sans","Display","Serif","Mono"].map(group=>(
                        <div key={group}>
                          <div style={{position:"sticky",top:0,background:c.card,padding:"0.3rem 0.75rem",fontSize:"0.58rem",fontWeight:700,color:c.muted,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${c.border}`}}>{group}</div>
                          {FONT_OPTIONS.filter(f=>f.cat===group).map(f=>{
                            const sel=cur===f.name;
                            return (
                              <button key={f.name} onClick={()=>{ updateBrand(key,f.name); setFontPicker(null); }} style={{
                                width:"100%",display:"flex",alignItems:"center",gap:"0.625rem",
                                padding:"0.5rem 0.75rem",cursor:"pointer",textAlign:"left",
                                border:"none",borderLeft:`2px solid ${sel?c.pri:"transparent"}`,
                                background:sel?c.cardActive:"transparent",
                              }}>
                                <span style={{fontFamily:`'${f.name}',${f.cat==="Serif"?"serif":f.cat==="Mono"?"monospace":"sans-serif"}`,fontSize:"1.1rem",fontWeight:700,color:sel?c.pri:c.text,flexShrink:0,lineHeight:1,width:32}}>Ag</span>
                                <span style={{flex:1,fontFamily:`'${f.name}',sans-serif`,fontSize:"0.8rem",color:sel?c.pri:c.text,fontWeight:sel?600:400}}>{f.name}</span>
                                {sel && <span style={{color:c.pri,fontSize:"0.7rem"}}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* živý náhľad */}
                  <div style={{marginTop:"0.4rem",padding:"0.5rem 0.625rem",background:c.bg,border:`1px solid ${c.border}`,borderRadius:7}}>
                    <div style={{fontFamily:`'${cur}',sans-serif`,fontSize:key==="fontDisplay"?"1.05rem":"0.8rem",fontWeight:key==="fontDisplay"?700:400,color:c.text,lineHeight:1.3}}>
                      {key==="fontDisplay"?"Veľký nadpis stránky":"Bežný text odstavca pre čitateľnosť obsahu."}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── BRIEF ── */}
          <div id="blk-brief-type" style={BLK("brief-type")}>
            <div style={S.secTitle}>Typ webu<div style={S.divider}/></div>
            <div style={S.typeGrid}>
              {WEB_TYPES.map(tt=>(
                <button key={tt.id} style={S.typeBtn(brief.webType===tt.id)} onClick={()=>selectType(tt.id)}>
                  <span style={S.typeIcon}>{tt.icon}</span><span>{tt.label}</span>
                  <span style={{fontSize:"0.62rem",color:brief.webType===tt.id?c.pri:c.muted,fontWeight:400}}>{tt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── ŠTRUKTÚRA STRÁNKY ── */}
          <div id="blk-brief-structure" style={BLK("brief-structure")}>
            <div style={S.secTitle}>Štruktúra stránky<div style={S.divider}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.875rem"}}>
              {[
                { id:"onepage", label:"One-page", icon:"📄",
                  desc:"Celý web je na jednej stránke — sekcie sa scrollujú. Ideálne pre landing pages, portfoliá, simple prezentácie. Rýchle, jednoduché, žiadna navigácia na podstránky." },
                { id:"multipage", label:"Viac stránok", icon:"📑",
                  desc:"Web má viac podstránok (O nás, Služby, Blog, Kontakt...). Ideálne pre firmy s komplexnou ponukou, e-shopy alebo blogy. Lepšie pre SEO a rozsiahlejší obsah." },
              ].map(opt=>{
                const isInfoOpen = infoPopup===opt.id;
                const sel = brief.pageStructure===opt.id;
                return (
                  <div key={opt.id} style={{position:"relative"}}>
                    <button
                      onClick={()=>update({pageStructure:opt.id})}
                      style={{
                        width:"100%", padding:"0.75rem", borderRadius:9,
                        border:`2px solid ${sel?c.pri:c.border}`,
                        background:sel?`${c.pri}12`:c.inpBg,
                        cursor:"pointer", minHeight:"unset",
                        display:"flex", alignItems:"center", gap:"0.625rem",
                      }}>
                      <span style={{fontSize:"1.25rem",flexShrink:0}}>{opt.icon}</span>
                      <span style={{flex:1,fontSize:"0.82rem",fontWeight:700,color:sel?c.pri:c.text,textAlign:"left"}}>{opt.label}</span>
                      <span
                        onMouseEnter={()=>setInfoPopup(opt.id)}
                        onMouseLeave={()=>setInfoPopup(null)}
                        title="Viac informácií"
                        style={{
                          width:20,height:20,borderRadius:"50%",flexShrink:0,
                          border:`1.5px solid ${c.pri}`,
                          background:isInfoOpen?c.pri:"transparent",
                          color:isInfoOpen?"#fff":c.pri,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:"0.68rem",fontWeight:700,fontStyle:"italic",
                          cursor:"default",
                        }}>i</span>
                    </button>
                    {isInfoOpen && (
                      <div style={{
                        position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:20,
                        background:c.panel, border:`1.5px solid ${c.pri}`, borderRadius:8,
                        padding:"0.625rem 0.75rem", fontSize:"0.68rem", color:c.text,
                        lineHeight:1.5, boxShadow:"0 4px 16px rgba(0,0,0,0.35)",
                      }}>
                        {opt.desc}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {brief.pageStructure==="multipage" && (
              <div style={S.fRow}>
                <label style={S.lbl}>Aké podstránky plánuješ?</label>
                <input style={S.inp} placeholder="napr. Domov, O nás, Služby, Cenník, Blog, Kontakt"
                  value={brief.subpages||""} onChange={e=>update({subpages:e.target.value})}/>
              </div>
            )}
          </div>

          {/* ── NAVIGÁCIA & TÉMA ── */}
          <div id="blk-brief-nav" style={BLK("brief-nav")}>
            <div style={S.secTitle}>Navigácia & Téma<div style={S.divider}/></div>

            {/* Farebná téma */}
            <div style={S.fRow}>
              <label style={S.lbl}>Farebná téma webu</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem"}}>
                {[
                  { id:"light",  label:"Svetlá",    icon:"☀️",
                    desc:"Biele/svetlé pozadie. Štandardná voľba pre väčšinu firiem, e-shopov a profesionálnych webov." },
                  { id:"dark",   label:"Tmavá",     icon:"🌙",
                    desc:"Tmavé pozadie. Ideálne pre kreatívne projekty, nočné podniky (club, bar), gaming, tech." },
                  { id:"system", label:"Podľa systému", icon:"💻",
                    desc:"Web sa automaticky prispôsobí nastaveniu zariadenia návštevníka (light/dark mode v systéme)." },
                ].map(opt=>{
                  const isInfoOpen = infoPopup==="theme-"+opt.id;
                  const sel = brief.colorTheme===opt.id;
                  return (
                    <div key={opt.id} style={{position:"relative"}}>
                      <button
                        onClick={()=>update({colorTheme:opt.id})}
                        style={{
                          width:"100%", padding:"0.6rem 0.5rem", borderRadius:8,
                          border:`2px solid ${sel?c.pri:c.border}`,
                          background:sel?`${c.pri}12`:c.inpBg,
                          cursor:"pointer", minHeight:"unset",
                          display:"flex", alignItems:"center", gap:"0.4rem",
                        }}>
                        <span style={{fontSize:"1rem",flexShrink:0}}>{opt.icon}</span>
                        <span style={{flex:1,fontSize:"0.72rem",fontWeight:sel?700:500,color:sel?c.pri:c.text,textAlign:"left"}}>{opt.label}</span>
                        <span
                          onMouseEnter={()=>setInfoPopup("theme-"+opt.id)}
                          onMouseLeave={()=>setInfoPopup(null)}
                          title="Viac informácií"
                          style={{
                            width:18,height:18,borderRadius:"50%",flexShrink:0,
                            border:`1.5px solid ${c.pri}`,
                            background:isInfoOpen?c.pri:"transparent",
                            color:isInfoOpen?"#fff":c.pri,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:"0.62rem",fontWeight:700,fontStyle:"italic",
                            cursor:"default",
                          }}>i</span>
                      </button>
                      {isInfoOpen && (
                        <div style={{
                          position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:20,
                          background:c.panel, border:`1.5px solid ${c.pri}`, borderRadius:8,
                          padding:"0.625rem 0.75rem", fontSize:"0.66rem", color:c.text,
                          lineHeight:1.5, boxShadow:"0 4px 16px rgba(0,0,0,0.35)",
                        }}>
                          {opt.desc}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prepínač témy */}
            <div style={S.fRow}>
              <label style={S.lbl}>Prepínač témy pre návštevníka</label>
              <div style={{display:"flex",gap:"0.5rem"}}>
                {[
                  { id:"yes",  label:"Áno — daj prepínač", icon:"🔄",
                    desc:"Čo je responzívne prepínanie témy? Je to tlačidlo (☀️/🌙) v navigácii ktoré návštevníkovi umožní prepnúť web medzi svetlým a tmavým režimom podľa vlastnej preferencie. Výber sa uloží do prehliadača — pri ďalšej návšteve sa pamätá. Vhodné keď chceš osloviť širšie publikum bez toho aby si sa musel rozhodnúť len pre jednu tému." },
                  { id:"no",   label:"Nie — fixná téma",   icon:"🔒",
                    desc:"Web má vždy rovnakú tému bez možnosti prepnutia. Jednoduchšie, konzistentné, vhodné keď má brand jasne danú jednu farebnú identitu." },
                ].map(opt=>{
                  const isInfoOpen = infoPopup==="toggle-"+opt.id;
                  const sel = brief.themeToggle===opt.id;
                  return (
                    <div key={opt.id} style={{position:"relative",flex:1}}>
                      <button
                        onClick={()=>update({themeToggle:opt.id})}
                        style={{
                          width:"100%", padding:"0.625rem", borderRadius:8,
                          border:`2px solid ${sel?c.pri:c.border}`,
                          background:sel?`${c.pri}12`:c.inpBg,
                          cursor:"pointer", minHeight:"unset",
                          display:"flex", alignItems:"center", gap:"0.4rem",
                        }}>
                        <span style={{fontSize:"1rem",flexShrink:0}}>{opt.icon}</span>
                        <span style={{flex:1,fontSize:"0.72rem",fontWeight:sel?700:500,color:sel?c.pri:c.text,textAlign:"left"}}>{opt.label}</span>
                        <span
                          onMouseEnter={()=>setInfoPopup("toggle-"+opt.id)}
                          onMouseLeave={()=>setInfoPopup(null)}
                          title="Viac informácií"
                          style={{
                            width:18,height:18,borderRadius:"50%",flexShrink:0,
                            border:`1.5px solid ${c.pri}`,
                            background:isInfoOpen?c.pri:"transparent",
                            color:isInfoOpen?"#fff":c.pri,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:"0.62rem",fontWeight:700,fontStyle:"italic",
                            cursor:"default",
                          }}>i</span>
                      </button>
                      {isInfoOpen && (
                        <div style={{
                          position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:20,
                          background:c.panel, border:`1.5px solid ${c.pri}`, borderRadius:8,
                          padding:"0.625rem 0.75rem", fontSize:"0.66rem", color:c.text,
                          lineHeight:1.5, boxShadow:"0 4px 16px rgba(0,0,0,0.35)",
                        }}>
                          {opt.desc}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div id="blk-brief-goal" style={BLK("brief-goal")}>
            <div style={S.secTitle}>Cieľ a publikum<div style={S.divider}/></div>
            <div style={S.g2}>
              <div style={S.fRow}><label style={S.lbl}>Cieľ stránky</label><input style={S.inp} placeholder="napr. získať nových klientov…" value={brief.goal} onChange={e=>update({goal:e.target.value})}/></div>
              <div style={S.fRow}><label style={S.lbl}>Cieľová skupina</label><input style={S.inp} placeholder="napr. ženy 25–45, Bratislava…" value={brief.audience} onChange={e=>update({audience:e.target.value})}/></div>
            </div>
            <div style={S.fRow}><label style={S.lbl}>Tón a feeling</label><input style={S.inp} placeholder="napr. prémiový, minimalistický, hravý, street…" value={brief.tone} onChange={e=>update({tone:e.target.value})}/></div>
          </div>

          <div id="blk-brief-desc" style={BLK("brief-desc")}>
            <div style={S.secTitle}>Popis projektu<div style={S.divider}/></div>
            <div style={S.fRow}><label style={S.lbl}>Popis</label><textarea style={S.ta} placeholder="Opíš čo robíš, čo ťa odlišuje, aké problémy riešiš…" value={brief.brief} onChange={e=>update({brief:e.target.value})}/></div>
            <div style={S.fRow}><label style={S.lbl}>Špeciálne požiadavky <span style={{fontWeight:400,textTransform:"none"}}>(voliteľné)</span></label><textarea style={{...S.ta,minHeight:56}} placeholder="Integrácie, špeciálne funkcie…" value={brief.extra} onChange={e=>update({extra:e.target.value})}/></div>
          </div>

          {/* ── PODKLADY A SÚBORY — linky od klienta ── */}
          <div id="blk-assets-files" style={BLK("assets-files")}>
            <div style={S.secTitle}>Podklady a súbory<div style={S.divider}/></div>

            {/* Návod pre klienta */}
            <div style={{
              background:c.card, border:`1px solid ${c.border}`, borderRadius:9,
              padding:"0.75rem 0.875rem", marginBottom:"0.875rem",
            }}>
              <div style={{fontSize:"0.74rem", fontWeight:700, color:c.text, marginBottom:"0.3rem"}}>
                📎 Ako nám poslať fotky, logo a texty?
              </div>
              <div style={{fontSize:"0.66rem", color:c.muted, lineHeight:1.55, marginBottom:"0.5rem"}}>
                Súbory (aj celý ZIP so všetkými podkladmi) nahrajte na niektorú z bezplatných služieb
                nižšie a sem vložte odkaz. Čím viac podkladov, tým presnejší bude výsledný web.
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:"0.35rem"}}>
                {UPLOAD_SERVICES.map(svc=>(
                  <a key={svc.name} href={svc.url} target="_blank" rel="noopener noreferrer" style={{
                    display:"flex", alignItems:"center", gap:"0.3rem",
                    border:`1px solid ${c.pri}`, borderRadius:20, padding:"0.25rem 0.65rem",
                    color:c.pri, fontSize:"0.66rem", fontWeight:600, textDecoration:"none",
                  }} title={svc.note}>
                    ↗ {svc.name}
                    <span style={{color:c.muted, fontWeight:400}}>· {svc.note}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Zoznam odkazov */}
            {(brief.assets||[]).map(asset=>(
              <div key={asset.id} style={S.addrCard}>
                <div style={S.addrTypes}>
                  {ASSET_TYPES.map(at=>(
                    <button key={at.id} style={S.addrTypeBtn(asset.type===at.id)} onClick={()=>updateAsset(asset.id,"type",at.id)}>
                      {at.icon} {at.label}
                    </button>
                  ))}
                  <button style={S.removeBtn} onClick={()=>removeAsset(asset.id)}>✕</button>
                </div>
                <div style={S.fRow}>
                  <label style={S.lbl}>Odkaz na súbor / priečinok</label>
                  <input style={S.inp} placeholder="napr. https://www.uschovna.cz/zasilka/… alebo https://drive.google.com/…"
                    value={asset.url||""} onChange={e=>updateAsset(asset.id,"url",e.target.value)}/>
                </div>
                <div>
                  <label style={S.lbl}>Poznámka <span style={{fontWeight:400,textTransform:"none"}}>(čo odkaz obsahuje)</span></label>
                  <input style={S.inp} placeholder="napr. 30 fotiek interiéru + logo v krivkách"
                    value={asset.note||""} onChange={e=>updateAsset(asset.id,"note",e.target.value)}/>
                </div>
              </div>
            ))}

            <button onClick={()=>addAsset("photos")} style={{
              background:"transparent", border:`1.5px dashed ${c.pri}`, borderRadius:7,
              padding:"0.45rem 0.8rem", color:c.pri, fontSize:"0.72rem", fontWeight:600,
              cursor:"pointer", minHeight:"unset",
            }}>
              + Pridať odkaz na podklady
            </button>
          </div>

          {/* ── WIZARD — ZHRNUTIE (len jednoduchý režim) ── */}
          <div id="blk-wiz-summary" style={BLK("wiz-summary")}>
            <div style={S.secTitle}>{T("wizSummaryTitle")}<div style={S.divider}/></div>
            {(()=>{
              const summaryItems = [
                { label:T("wizSumProject"),  ok: !!(brief.projectName||"").trim(),                         step:0 },
                { label:T("wizSumIndustry"), ok: !!brief.industry,                                          step:0 },
                { label:T("wizSumContact"),  ok: !!((brief.email||"").trim()||(brief.phone||"").trim()),    step:0 },
                { label:T("wizSumDesc"),     ok: !!(brief.brief||"").trim(),                                step:1 },
                { label:T("wizSumSections"), ok: (brief.sections||[]).length>0, extra:`(${(brief.sections||[]).length})`, step:2 },
                { label:T("wizSumAssets"),   ok: (brief.assets||[]).some(a=>(a.url||"").trim()), extra:(brief.assets||[]).filter(a=>(a.url||"").trim()).length?`(${(brief.assets||[]).filter(a=>(a.url||"").trim()).length})`:"", step:3 },
                { label:T("wizSumDesign"),   ok: !!brief.preset,                                            step:4 },
              ];
              const missing = summaryItems.filter(x=>!x.ok).length;
              return (
                <>
                  {summaryItems.map((item,i)=>(
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:"0.6rem",
                      padding:"0.55rem 0.7rem", marginBottom:"0.35rem",
                      background:c.card, border:`1px solid ${item.ok?c.pri:c.border}`, borderRadius:8,
                    }}>
                      <span style={{
                        width:20, height:20, borderRadius:"50%", flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"0.68rem", fontWeight:700,
                        background:item.ok?`${c.pri}22`:"transparent",
                        border:`1.5px solid ${item.ok?c.pri:c.border}`,
                        color:item.ok?c.pri:c.muted,
                      }}>{item.ok?"✓":"·"}</span>
                      <span style={{flex:1, fontSize:"0.76rem", color:item.ok?c.text:c.muted}}>
                        {item.label} {item.extra||""}
                      </span>
                      {!item.ok && (
                        <button onClick={()=>gotoWizStep(item.step)} style={{
                          background:"transparent", border:`1px solid ${c.pri}`, borderRadius:6,
                          padding:"0.2rem 0.6rem", color:c.pri, fontSize:"0.66rem", fontWeight:600,
                          cursor:"pointer", minHeight:"unset",
                        }}>{T("wizFill")}</button>
                      )}
                    </div>
                  ))}
                  <div style={{
                    marginTop:"0.75rem", padding:"0.75rem 0.875rem", borderRadius:9,
                    background:missing?`${c.pri}10`:"#22c55e18",
                    border:`1px solid ${missing?c.pri:"#22c55e"}`,
                    fontSize:"0.72rem", lineHeight:1.55, color:c.text,
                  }}>
                    {missing
                      ? `${T("wizSumMissing")} (${missing})`
                      : T("wizSumDone")}
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── OBSAH — riadky s rozbaľovacím detailom ── */}
          {CATS.map(cat=>{
            const allCatSecs=SECTIONS.filter(s=>s.cat===cat.id);
            // aktívne sekcie v poradí podľa brief.sections, potom neaktívne v pôvodnom poradí
            const activeOrdered=brief.sections
              .map(id=>allCatSecs.find(s=>s.id===id))
              .filter(Boolean);
            const inactive=allCatSecs.filter(s=>!brief.sections.includes(s.id));
            const catSecs=[...activeOrdered, ...inactive];
            const n=activeOrdered.length;

            const moveSection=(id,dir)=>{
              // presúva len v rámci aktívnych sekcií tej istej kategórie
              const arr=[...brief.sections];
              const catActiveIds=activeOrdered.map(x=>x.id);
              const ci=catActiveIds.indexOf(id);
              if(ci<0) return;
              const target=catActiveIds[ci+dir];
              if(!target) return;
              const i=arr.indexOf(id), j=arr.indexOf(target);
              [arr[i],arr[j]]=[arr[j],arr[i]];
              update({sections:arr});
            };
            const setNote=(id,val)=>{
              update({ sectionNotes:{ ...(brief.sectionNotes||{}), [id]:val } });
            };

            return (
              <div key={cat.id} id={"blk-content-"+cat.id} style={{...S.block, order:CAT_BLOCK_ORDER[cat.id]||10}}>
                <div style={S.secTitle}>
                  {cat.label}
                  <span style={{background:`${c.pri}20`,color:c.pri,padding:"0.1rem 0.45rem",borderRadius:20,fontSize:"0.62rem",fontWeight:700}}>{n}/{allCatSecs.length}</span>
                  <div style={S.divider}/>
                </div>
                {cat.id!=="core" && n>=2 && (
                  <div style={{fontSize:"0.62rem",color:c.muted,marginBottom:"0.5rem",display:"flex",alignItems:"center",gap:"0.35rem"}}>
                    <span>⠿</span> Potiahni alebo použi šípky ▲▼ na zmenu poradia sekcií
                  </div>
                )}
                {catSecs.map((s,idx)=>{
                  const active=brief.sections.includes(s.id);
                  const open=expandedSec===s.id;
                  const note=(brief.sectionNotes||{})[s.id]||"";
                  const draggable = active && cat.id!=="core";
                  const isDragging = dragId===s.id;
                  const isDragOver = dragOver===s.id && dragId!==s.id;
                  return (
                    <div key={s.id}
                      data-secid={s.id}
                      data-cat={cat.id}
                      style={{
                        borderRadius:8, marginBottom:"0.3rem",
                        border:`1px solid ${isDragOver?c.pri:active?c.pri:c.border}`,
                        background:active?c.cardActive:c.inpBg,
                        overflow:"hidden",
                        opacity:isDragging?0.5:1,
                        boxShadow:isDragOver?`inset 0 3px 0 ${c.pri}`:"none",
                    }}>
                      {/* Hlavný riadok */}
                      <div style={{display:"flex",alignItems:"center",gap:"0.55rem",padding:"0.5rem 0.625rem"}}>
                        {/* Checkbox */}
                        <div onClick={()=>toggleSec(s.id)} style={{
                          width:18, height:18, borderRadius:4, flexShrink:0,
                          border:`2px solid ${active?c.pri:c.checkbox}`,
                          background:active?c.pri:"transparent",
                          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"0.7rem", color:"#fff", fontWeight:700,
                        }}>{active?"✓":""}</div>

                        {/* Icon + label */}
                        <span style={{fontSize:"0.9rem",flexShrink:0}}>{s.icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"0.78rem",fontWeight:active?600:400,color:active?c.text:c.muted}}>
                            {s.label}
                            {note && <span style={{marginLeft:"0.4rem",fontSize:"0.6rem",color:c.pri}}>● poznámka</span>}
                          </div>
                          <div style={{fontSize:"0.62rem",color:c.desc,lineHeight:1.35,marginTop:1}}>{s.desc}</div>
                        </div>

                        {/* Up / Down — len aktívne, nie core */}
                        {draggable && (() => {
                          const catActiveIds=activeOrdered.map(x=>x.id);
                          const ci=catActiveIds.indexOf(s.id);
                          const canUp=ci>0;
                          const canDown=ci>=0 && ci<catActiveIds.length-1;
                          return (
                            <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                              <button onClick={()=>canUp&&moveSection(s.id,-1)} title="Hore" disabled={!canUp} style={{
                                background:c.bg,border:`1px solid ${c.border}`,
                                borderRadius:4,padding:"0.1rem 0.4rem",
                                cursor:canUp?"pointer":"default",
                                fontSize:"0.62rem",color:canUp?c.text:c.subtle,lineHeight:1,minHeight:"unset",
                                opacity:canUp?1:0.4,
                              }}>▲</button>
                              <button onClick={()=>canDown&&moveSection(s.id,1)} title="Dole" disabled={!canDown} style={{
                                background:c.bg,border:`1px solid ${c.border}`,
                                borderRadius:4,padding:"0.1rem 0.4rem",
                                cursor:canDown?"pointer":"default",
                                fontSize:"0.62rem",color:canDown?c.text:c.subtle,lineHeight:1,minHeight:"unset",
                                opacity:canDown?1:0.4,
                              }}>▼</button>
                            </div>
                          );
                        })()}

                        {/* Drag handle — len aktívne, nie core */}
                        {draggable && (
                          <div
                            onPointerDown={(e)=>startDrag(e, s.id, cat.id)}
                            title="Podrž a potiahni pre presun"
                            style={{
                              cursor:isDragging?"grabbing":"grab", flexShrink:0,
                              padding:"0.25rem 0.35rem", borderRadius:5,
                              border:`1px solid ${c.border}`, background:c.bg,
                              color:c.muted, fontSize:"0.7rem", lineHeight:1,
                              touchAction:"none", userSelect:"none",
                              display:"flex", alignItems:"center",
                            }}>⠿</div>
                        )}

                        {/* Šípka na rozbalenie detailu */}
                        <button onClick={()=>setExpSec(open?null:s.id)} style={{
                          background:c.bg,border:`1.5px solid ${c.pri}`,
                          borderRadius:7,padding:"0.35rem 0.6rem",cursor:"pointer",
                          fontSize:"0.7rem",color:c.pri,lineHeight:1,fontWeight:700,
                          minHeight:"unset",flexShrink:0,transition:"all .15s",
                          display:"flex",alignItems:"center",gap:"0.35rem",
                        }}>
                          <span>{open?"Zbaliť":"Rozbaliť"}</span>
                          <span style={{fontSize:"0.8rem",transform:open?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
                        </button>
                      </div>

                      {/* Rozbaľovací detail panel — cez celú šírku */}
                      {open && (
                        <div style={{
                          borderTop:`1px solid ${c.border}`,
                          padding:"0.75rem 0.625rem",
                          background:c.inpBg,
                        }}>
                          {/* Nastavenia navigácie — len pri nav */}
                          {s.id==="nav" && (
                            <div style={{marginBottom:"0.875rem"}}>
                              {NAV_GROUPS.map(grp=>(
                                <div key={grp.key} style={{marginBottom:"0.75rem"}}>
                                  <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.4rem"}}>{grp.label}</div>
                                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem"}}>
                                    {grp.options.map(opt=>{
                                      const sel=brief[grp.key]===opt.id;
                                      return (
                                        <button key={opt.id} onClick={()=>update({[grp.key]:opt.id})} style={{
                                          padding:"0.45rem 0.55rem",borderRadius:6,textAlign:"left",
                                          border:`1.5px solid ${sel?c.pri:c.border}`,
                                          background:sel?c.cardActive:c.bg,
                                          cursor:"pointer",minHeight:"unset",
                                        }}>
                                          <div style={{fontSize:"0.72rem",fontWeight:sel?600:400,color:sel?c.pri:c.text}}>{opt.label}</div>
                                          <div style={{fontSize:"0.6rem",color:c.muted,lineHeight:1.3}}>{opt.desc}</div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                              {/* Toggles — nezávislé prepínače */}
                              <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.4rem"}}>Doplnky</div>
                              <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
                                {NAV_TOGGLES.map(tg=>{
                                  const on=!!brief[tg.key];
                                  return (
                                    <button key={tg.key} onClick={()=>update({[tg.key]:!on})} style={{
                                      display:"flex",alignItems:"center",gap:"0.5rem",
                                      padding:"0.45rem 0.55rem",borderRadius:6,textAlign:"left",
                                      border:`1.5px solid ${on?c.pri:c.border}`,
                                      background:on?c.cardActive:c.bg,cursor:"pointer",minHeight:"unset",width:"100%",
                                    }}>
                                      <div style={{
                                        width:15,height:15,borderRadius:4,flexShrink:0,
                                        border:`2px solid ${on?c.pri:c.border}`,
                                        background:on?c.pri:"transparent",
                                        display:"flex",alignItems:"center",justifyContent:"center",
                                        fontSize:"0.55rem",color:"#fff",
                                      }}>{on&&"✓"}</div>
                                      <div>
                                        <div style={{fontSize:"0.72rem",fontWeight:on?600:400,color:on?c.pri:c.text}}>{tg.label}</div>
                                        <div style={{fontSize:"0.6rem",color:c.muted,lineHeight:1.3}}>{tg.desc}</div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Nastavenia HERO — len pri hero */}
                          {s.id==="hero" && (
                            <div style={{marginBottom:"0.875rem"}}>
                              {/* Štýl hero */}
                              <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.4rem"}}>Štýl hero</div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem",marginBottom:"0.75rem"}}>
                                {HERO_STYLES.map(hs=>{
                                  const sel=brief.heroStyle===hs.id;
                                  return (
                                    <button key={hs.id} onClick={()=>update({heroStyle:hs.id})} style={{
                                      padding:"0.45rem 0.55rem",borderRadius:6,textAlign:"left",
                                      border:`1.5px solid ${sel?c.pri:c.border}`,
                                      background:sel?c.cardActive:c.bg,cursor:"pointer",minHeight:"unset",
                                    }}>
                                      <div style={{fontSize:"0.72rem",fontWeight:sel?600:400,color:sel?c.pri:c.text}}>{hs.icon} {hs.label}</div>
                                      <div style={{fontSize:"0.6rem",color:c.desc,lineHeight:1.3}}>{hs.desc}</div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* SEO veta */}
                              <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.4rem"}}>SEO nadpis — kľúčové slová do súvislej vety</div>
                              <input
                                placeholder="napr. Prémiové wellness a masáže v Bratislave pre vašu regeneráciu"
                                value={brief.heroSeo||""}
                                onChange={e=>update({heroSeo:e.target.value})}
                                style={{
                                  width:"100%",boxSizing:"border-box",background:c.bg,
                                  border:`1px solid ${c.border}`,borderRadius:6,
                                  padding:"0.5rem 0.625rem",color:c.text,fontSize:"0.75rem",
                                  outline:"none",marginBottom:"0.75rem",
                                }}
                              />

                              {/* CTA buttony odkazujúce na sekcie */}
                              <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.4rem"}}>CTA tlačidlá — odkazy na sekcie</div>
                              <div style={{fontSize:"0.6rem",color:c.desc,marginBottom:"0.4rem",lineHeight:1.4}}>
                                Vyber sekcie na ktoré budú smerovať hero tlačidlá (scroll po kliknutí).
                              </div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:"0.3rem",marginBottom:"0.75rem"}}>
                                {brief.sections.filter(id=>id!=="hero"&&id!=="nav").map(id=>{
                                  const sec=SECTIONS.find(x=>x.id===id);
                                  if(!sec) return null;
                                  const on=(brief.heroCtas||[]).includes(id);
                                  return (
                                    <button key={id}
                                      onClick={()=>update({heroCtas: on ? brief.heroCtas.filter(x=>x!==id) : [...(brief.heroCtas||[]),id]})}
                                      style={{
                                        padding:"0.25rem 0.6rem",borderRadius:20,
                                        border:`1px solid ${on?c.pri:c.border}`,
                                        background:on?`${c.pri}18`:c.bg,
                                        color:on?c.pri:c.muted,cursor:"pointer",
                                        fontSize:"0.68rem",fontWeight:on?600:400,
                                        minHeight:"unset",display:"flex",alignItems:"center",gap:"0.25rem",
                                      }}>
                                      {on?"✓":""} {sec.icon} {sec.label}
                                    </button>
                                  );
                                })}
                                {brief.sections.filter(id=>id!=="hero"&&id!=="nav").length===0 && (
                                  <span style={{fontSize:"0.65rem",color:c.muted}}>Najprv zapni iné sekcie v zozname</span>
                                )}
                              </div>

                              {/* Médium / vizuál */}
                              <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.4rem"}}>Vizuál hero</div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem"}}>
                                {HERO_MEDIA.map(hm=>{
                                  const sel=brief.heroMedia===hm.id;
                                  return (
                                    <button key={hm.id} onClick={()=>update({heroMedia:hm.id})} style={{
                                      padding:"0.45rem 0.55rem",borderRadius:6,textAlign:"left",
                                      border:`1.5px solid ${sel?c.pri:c.border}`,
                                      background:sel?c.cardActive:c.bg,cursor:"pointer",minHeight:"unset",
                                    }}>
                                      <div style={{fontSize:"0.72rem",fontWeight:sel?600:400,color:sel?c.pri:c.text}}>{hm.icon} {hm.label}</div>
                                      <div style={{fontSize:"0.6rem",color:c.desc,lineHeight:1.3}}>{hm.desc}</div>
                                    </button>
                                  );
                                })}
                              </div>
                              {/* Vizuálny výber slidera — živé náhľady z public/sliders */}
                              {brief.heroMedia==="carousel" && (
                                <div style={{marginTop:"0.625rem"}}>
                                  <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.4rem"}}>
                                    Typ slidera — vyber vizuál
                                  </div>
                                  <div style={{display:"grid",gridTemplateColumns:"repeat(4, minmax(0, 1fr))",gap:"0.5rem"}}>
                                    {SLIDER_OPTIONS.map(sl=>{
                                      const sel = brief.heroSlider===sl.id;
                                      return (
                                        <button key={sl.id} onClick={()=>update({heroSlider: sel ? "" : sl.id})} style={{
                                          padding:0, borderRadius:8, overflow:"hidden", textAlign:"left",
                                          border:`2px solid ${sel?c.pri:c.border}`,
                                          background:sel?c.cardActive:c.bg, cursor:"pointer", minHeight:"unset",
                                          boxShadow: sel ? `0 0 0 3px ${c.pri}30` : "none",
                                        }}>
                                          <div style={{position:"relative", aspectRatio:"16/9", overflow:"hidden", background:"#0c0c0f"}}>
                                            <iframe
                                              srcDoc={sl.html}
                                              title={sl.label}
                                              loading="lazy"
                                              sandbox="allow-scripts"
                                              style={{
                                                width:"400%", height:"400%", border:"none",
                                                transform:"scale(0.25)", transformOrigin:"top left",
                                                pointerEvents:"none",
                                              }}
                                              tabIndex={-1}
                                            />
                                            {sel && (
                                              <div style={{position:"absolute",top:5,right:5,background:c.pri,color:"#fff",
                                                borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",
                                                justifyContent:"center",fontSize:"0.65rem",fontWeight:800}}>✓</div>
                                            )}
                                          </div>
                                          <div style={{padding:"0.3rem 0.45rem"}}>
                                            <div style={{fontSize:"0.64rem",fontWeight:sel?700:600,color:sel?c.pri:c.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sl.label}</div>
                                            <div style={{fontSize:"0.55rem",color:c.desc,lineHeight:1.3}}>{sl.desc}</div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div style={{fontSize:"0.6rem",color:c.desc,marginTop:"0.35rem",lineHeight:1.4}}>
                                    Náhľady sú živé animácie. Kliknutím vyberieš typ, opätovným kliknutím zrušíš výber.
                                  </div>
                                </div>
                              )}
                              {/* URL pre médium */}
                              {(brief.heroMedia==="image"||brief.heroMedia==="video"||brief.heroMedia==="3dscene"||brief.heroMedia==="custom"||brief.heroMedia==="carousel") && (
                                <input
                                  placeholder={brief.heroMedia==="video"?"Link na video (YouTube / Vimeo / .mp4)":brief.heroMedia==="3dscene"?"Link na Spline / 3D scénu":brief.heroMedia==="carousel"?"Linky na obrázky carouselu (oddeľ čiarkou)":"Link na obrázok / referenčný vizuál"}
                                  value={brief.heroMediaUrl||""}
                                  onChange={e=>update({heroMediaUrl:e.target.value})}
                                  style={{
                                    width:"100%",boxSizing:"border-box",background:c.bg,
                                    border:`1px solid ${c.border}`,borderRadius:6,
                                    padding:"0.5rem 0.625rem",color:c.text,fontSize:"0.75rem",
                                    outline:"none",marginTop:"0.5rem",
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {/* Poznámka — box cez celú šírku */}
                          <div style={{fontSize:"0.62rem",fontWeight:600,color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.4rem"}}>
                            Poznámka k sekcii
                          </div>
                          <textarea
                            placeholder={`Čo chceš v sekcii „${s.label}"? Konkrétny obsah, požiadavky, príklady…`}
                            value={note}
                            onChange={e=>setNote(s.id,e.target.value)}
                            style={{
                              width:"100%", boxSizing:"border-box",
                              background:c.bg, border:`1px solid ${c.border}`,
                              borderRadius:6, padding:"0.5rem 0.625rem",
                              color:c.text, fontSize:"0.75rem", outline:"none",
                              resize:"vertical", minHeight:64, fontFamily:"inherit", lineHeight:1.5,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

        </div>
        )}

        {/* RIGHT — mobil: len keď je preview tab */}
        {(isMobile && mobilePane==="preview") && (
        <div style={S.right}>
          <RightControlRow/>
          <RightModeRow/>
          <RightBody/>
        </div>
        )}

        {/* RIGHT — desktop: full, wide, rail (overlay sa renderuje samostatne nižšie) */}
        {!isMobile && rightSize!=="overlay" && (
          (rightOpen || rightSize!=="normal") ? (
            <div style={S.right}>
              <RightControlRow/>
              <RightModeRow/>
              <RightBody/>
            </div>
          ) : (
            <div style={S.rightRail}>
              <button style={S.rightRailBtn} onClick={()=>setRightOpen(true)} title="Rozbaliť náhľad">◀</button>
              <div style={S.rightRailLabel}>Náhľad</div>
            </div>
          )
        )}

        {/* RIGHT — overlay: zachová grid 3. stĺpec ako tenký rail, panel pláva nad obsahom */}
        {!isMobile && rightSize==="overlay" && (
          <div style={S.rightRail}>
            <div style={S.rightRailLabel}>Náhľad</div>
          </div>
        )}

      </div>

      {/* OVERLAY — pravý panel prekrývajúci ľavý aj stredný stĺpec */}
      {!isMobile && rightSize==="overlay" && (
        <>
          <div
            onClick={()=>setRightSize("normal")}
            style={{
              position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
              zIndex:90, cursor:"pointer",
            }}
          />
          <div style={{
            position:"fixed", top:"var(--wq-admin-h, 0px)", right:0, bottom:0,
            width:"82%", maxWidth:"calc(100vw - 64px)",
            background:c.panel, borderLeft:`1.5px solid ${c.pri}`,
            boxShadow:"-8px 0 32px rgba(0,0,0,0.4)",
            zIndex:91, display:"flex", flexDirection:"column",
          }}>
            <RightControlRow/>
            <RightModeRow/>
            <RightBody/>
          </div>
        </>
      )}
    </div>
  );
}


// ─── Named exports pre App.jsx ─────────────────────────────
export { getRole, getSessionId, DEFAULT_BRIEF, createRealtimeChannel };
