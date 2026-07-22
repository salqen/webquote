// ═══════════════════════════════════════════════════════════════
//  WebQuote — Generátor právnych dokumentov
//  Súhlas so spracovaním osobných údajov (namiesto klasického GDPR)
//  + Pravidlá používania súborov cookies.
//  Štruktúra po vzore interez.sk (Privacy Policy / Cookies Policy),
//  automaticky doplnená o firemné údaje z hlavičky briefu
//  a prispôsobená typu webu a vybraným integráciám.
// ═══════════════════════════════════════════════════════════════

const today = () => new Date().toLocaleDateString("sk-SK");

// Firemné údaje z briefu — s [DOPLNIŤ] placeholdrami keď chýbajú
function companyInfo(b) {
  const addr = (b.addresses || []).find(a => a.street || a.city) || {};
  const sidlo = [addr.street, [addr.zip, addr.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return {
    name:   b.companyName || "[DOPLNIŤ — obchodné meno]",
    sidlo:  sidlo || "[DOPLNIŤ — sídlo]",
    ico:    b.ico || "[DOPLNIŤ — IČO]",
    dic:    b.dic || "",
    icdph:  b.icdph || "",
    email:  b.email || "[DOPLNIŤ — kontaktný e-mail]",
    phone:  b.phone || "",
    domain: ((b.domains || []).find(d => d && d.trim()) || "[DOPLNIŤ — doména]").replace(/^https?:\/\//, ""),
    web:    b.projectName || "náš web",
  };
}

// Účely spracovania podľa typu webu
function purposesByType(webType) {
  switch (webType) {
    case "ecommerce": return [
      "vybavenie a doručenie Vašej objednávky, vrátane spracovania platby a komunikácie o stave objednávky (právny základ: plnenie zmluvy)",
      "vedenie užívateľského konta, ak si ho vytvoríte (právny základ: plnenie zmluvy)",
      "vybavovanie reklamácií a uplatnenie práv zo záruky (právny základ: plnenie zákonnej povinnosti)",
      "vedenie účtovníctva a plnenie daňových povinností (právny základ: plnenie zákonnej povinnosti)",
      "zasielanie noviniek a ponúk — newsletter, ak sa naň prihlásite (právny základ: súhlas)",
    ];
    case "corporate": return [
      "odpovedanie na Vaše otázky, dopyty a žiadosti zaslané cez kontaktný formulár alebo e-mail (právny základ: oprávnený záujem)",
      "príprava cenovej ponuky alebo návrhu spolupráce na základe Vášho dopytu (právny základ: predzmluvné vzťahy)",
      "zasielanie noviniek — newsletter, ak sa naň prihlásite (právny základ: súhlas)",
    ];
    case "portfolio": return [
      "odpovedanie na Vaše správy a dopyty zaslané cez kontaktný formulár alebo e-mail (právny základ: oprávnený záujem)",
      "príprava ponuky na základe Vášho dopytu (právny základ: predzmluvné vzťahy)",
    ];
    default: return [ // landing
      "odpovedanie na Vaše otázky a dopyty zaslané cez formulár alebo e-mail (právny základ: oprávnený záujem)",
      "zasielanie noviniek a informácií o našich produktoch a službách — newsletter, ak nám na to dáte súhlas (právny základ: súhlas)",
    ];
  }
}

// Údaje získavané podľa typu webu
function dataByType(webType) {
  const base = "meno a priezvisko, e-mailová adresa, telefónne číslo a údaje, ktoré nám sami poskytnete v správe";
  switch (webType) {
    case "ecommerce": return base + ", fakturačná a dodacia adresa, údaje o objednávkach a platbách";
    case "corporate": return base + ", názov firmy a údaje uvedené v dopyte";
    default: return base;
  }
}

// ─── SÚHLAS SO SPRACOVANÍM OSOBNÝCH ÚDAJOV ──────────────────────
export function generatePrivacyPolicy(b) {
  const f = companyInfo(b);
  const purposes = purposesByType(b.webType);
  const ints = b.techIntegrations || [];
  const marketing = ints.includes("newsletter") || ints.includes("pixel");

  return `# Súhlas so spracovaním osobných údajov a podmienky ochrany súkromia

Platné od ${today()}

**Záleží nám na ochrane Vášho súkromia. Preto si, prosím, pozorne prečítajte tieto podmienky ochrany súkromia (ďalej len „Podmienky").**

Tieto Podmienky popisujú, ako získavame, používame, uchovávame a prípadne zverejňujeme Vaše osobné údaje pri prevádzke webovej stránky ${f.domain} (ďalej len „Portál").

Prevádzkovateľom Portálu a Vašich osobných údajov je:

**${f.name}**, so sídlom ${f.sidlo}, IČO: ${f.ico}${f.dic ? `, DIČ: ${f.dic}` : ""}${f.icdph ? `, IČ DPH: ${f.icdph}` : ""} (ďalej len „my" alebo „Prevádzkovateľ").

V prípade akýchkoľvek otázok týkajúcich sa ochrany súkromia nás kontaktujte na ${f.email}${f.phone ? ` alebo telefonicky na ${f.phone}` : ""}.

Vaše osobné údaje spracúvame v súlade s Nariadením Európskeho parlamentu a Rady (EÚ) 2016/679 (GDPR) a zákonom č. 18/2018 Z. z. o ochrane osobných údajov.

## 1 · Aké osobné údaje o Vás získavame

**Údaje, ktoré nám sami poskytnete** — pri vyplnení formulára na Portáli, pri kontakte e-mailom alebo telefonicky${b.webType === "ecommerce" ? ", pri vytvorení objednávky alebo užívateľského konta" : ""}. Ide najmä o: ${dataByType(b.webType)}.

Osobné údaje nám poskytujete dobrovoľne. Zodpovedáte za ich správnosť, úplnosť a pravdivosť.

**Údaje z Vášho používania Portálu** — technické údaje ako IP adresa, typ prehliadača a zariadenia, čas prístupu a navštívené stránky. Tieto údaje získavame prostredníctvom súborov cookies a podobných technológií — podrobnosti nájdete v našich [Pravidlách používania súborov cookies](/cookies).

## 2 · Na aké účely Vaše údaje spracúvame

Vaše osobné údaje spracúvame na tieto účely:

${purposes.map((p, i) => `${i + 1}. ${p};`).join("\n")}

Súhlas so spracovaním osobných údajov na marketingové účely je dobrovoľný a môžete ho kedykoľvek odvolať — e-mailom na ${f.email}${marketing ? " alebo kliknutím na odhlasovací odkaz v každej marketingovej správe" : ""}.

## 3 · Ako dlho Vaše údaje uchovávame

Osobné údaje uchovávame len po dobu nevyhnutnú na splnenie účelu:

- dopyty a otázky — po dobu vybavenia, najviac 1 rok;
${b.webType === "ecommerce" ? "- objednávky a účtovné doklady — 10 rokov (zákonná povinnosť);\n- užívateľské konto — po dobu jeho existencie a 3 roky po zániku;\n" : ""}- údaje spracúvané na základe súhlasu — do odvolania súhlasu;
- údaje potrebné na obranu právnych nárokov — 3 roky od skončenia vzťahu.

## 4 · Komu Vaše údaje sprístupňujeme

Vaše osobné údaje sprístupňujeme tretím osobám len v nevyhnutnom rozsahu:

- ak nám to ukladá zákon (orgány verejnej moci, súdy);
- našim sprostredkovateľom, ktorí pre nás zabezpečujú prevádzku Portálu (hosting, IT služby${ints.includes("newsletter") ? ", e-mailingová platforma" : ""}${ints.includes("payment") ? ", platobná brána" : ""}${ints.includes("crm") ? ", CRM systém" : ""}${ints.includes("booking") ? ", rezervačný systém" : ""}) — vždy na základe zmluvy o spracúvaní osobných údajov;
- tretím stranám, ktorých súbory cookies sú umiestnené na Portáli — podrobnosti v [Pravidlách používania súborov cookies](/cookies).

Osobné údaje neprenášame mimo Európskeho hospodárskeho priestoru, ak to nie je nevyhnutné pre konkrétnu službu (v takom prípade len s primeranými zárukami, napr. štandardnými zmluvnými doložkami EÚ).

## 5 · Vaše práva

V súvislosti so spracovaním osobných údajov máte tieto práva:

- **právo na prístup** — požadovať potvrdenie, či a aké Vaše údaje spracúvame;
- **právo na opravu** — požadovať opravu nesprávnych alebo doplnenie neúplných údajov;
- **právo na vymazanie** — požadovať vymazanie údajov, ktoré už nie sú potrebné alebo sa spracúvali nezákonne;
- **právo na obmedzenie spracúvania**;
- **právo na prenosnosť údajov** — v štruktúrovanom, strojovo čitateľnom formáte;
- **právo namietať** — najmä proti spracúvaniu na účely priameho marketingu;
- **právo kedykoľvek odvolať súhlas** — bez vplyvu na zákonnosť spracúvania pred jeho odvolaním;
- **právo podať návrh na začatie konania** na Úrade na ochranu osobných údajov SR (dataprotection.gov.sk).

Svoje práva si môžete uplatniť e-mailom na ${f.email}.

## 6 · Bezpečnosť

Všetky osobné údaje chránime primeranými technickými a organizačnými opatreniami proti neoprávnenému prístupu a zneužitiu.

## 7 · Zmeny Podmienok

Tieto Podmienky môžeme meniť alebo upravovať. Aktuálne znenie vždy nájdete na Portáli.

---
*${f.name} · ${f.sidlo} · IČO: ${f.ico} · ${f.email}*
`;
}

// ─── PRAVIDLÁ POUŽÍVANIA SÚBOROV COOKIES ────────────────────────
export function generateCookiesPolicy(b) {
  const f = companyInfo(b);
  const ints = b.techIntegrations || [];

  // Tretie strany podľa vybraných integrácií
  const thirdParties = [];
  if (ints.includes("analytics")) thirdParties.push({ name: "Google Ireland Ltd. (Google Analytics)", purpose: "analytické cookies — meranie návštevnosti a používania Portálu", link: "https://policies.google.com/privacy" });
  if (ints.includes("pixel"))     thirdParties.push({ name: "Meta Platforms Ireland Ltd. (Meta Pixel)", purpose: "reklamné cookies — meranie a cielenie reklamy", link: "https://www.facebook.com/privacy/policy" });
  if (ints.includes("chat"))      thirdParties.push({ name: "[DOPLNIŤ — poskytovateľ live chatu]", purpose: "funkčné cookies — prevádzka chatovacieho okna", link: "" });
  if (ints.includes("maps"))      thirdParties.push({ name: "Google Ireland Ltd. (Mapy Google)", purpose: "funkčné cookies — zobrazenie interaktívnej mapy", link: "https://policies.google.com/privacy" });
  if (ints.includes("social"))    thirdParties.push({ name: "prevádzkovatelia sociálnych sietí (Facebook, Instagram, YouTube…)", purpose: "cookies sociálnych sietí — vložený obsah a zdieľanie", link: "" });
  if (ints.includes("payment"))   thirdParties.push({ name: "[DOPLNIŤ — poskytovateľ platobnej brány]", purpose: "nevyhnutné cookies — bezpečné spracovanie platby", link: "" });
  if (ints.includes("booking"))   thirdParties.push({ name: "[DOPLNIŤ — poskytovateľ rezervačného systému]", purpose: "funkčné cookies — prevádzka rezervačného formulára", link: "" });

  return `# Pravidlá používania súborov cookies (Cookies Policy)

Platné od ${today()}

Tieto pravidlá sa týkajú používania webovej stránky, ktorú prevádzkujeme na internetovej doméne ${f.domain} (ďalej len „Portál").

Poskytovateľom a prevádzkovateľom Portálu sme my — **${f.name}**, so sídlom ${f.sidlo}, IČO: ${f.ico}${f.dic ? `, DIČ: ${f.dic}` : ""}. Ak sa v týchto pravidlách používa pojem „my", „nás" a pod., má sa tým na mysli ${f.name}.

Okrem informácií uvedených v tomto dokumente pre Vás platia aj nastavenia cookies, ktoré si môžete upraviť v cookie lište pri návšteve Portálu.

## Čo sú súbory cookies

Cookies je malý dátový súbor, ktorý sa ukladá vo Vašom zariadení (napr. v mobile alebo počítači) pri používaní Portálu a na určitý čas uchováva informácie o Vašich zariadeniach, krokoch a nastaveniach. Súbor cookies umožní Portálu pri ďalšej návšteve rozpoznať Váš prehliadač alebo uložiť Vaše nastavenia. Je to bežná prax väčšiny webových stránok.

Používame dva druhy cookies:

- **session cookies** — vymažú sa po zavretí prehliadača;
- **persistent cookies** — zostávajú vo Vašom zariadení aj po zavretí prehliadača a použijú sa pri ďalšej návšteve Portálu.

## Na aké účely cookies používame

1. **Nevyhnutné (technické) cookies** — zabezpečujú základné fungovanie Portálu${b.webType === "ecommerce" ? ", košíka a objednávkového procesu" : ""} a jeho bezpečnosť. Tieto cookies nevyžadujú Váš súhlas.
2. **Funkčné cookies** — uchovávajú Vaše nastavenia a preferencie (napr. jazyk${(b.sections || []).includes("darkmode") ? ", zvolenú svetlú/tmavú tému" : ""}) pre vyšší komfort.
${ints.includes("analytics") ? "3. **Analytické cookies** — pomáhajú nám pochopiť, ako návštevníci Portál používajú (počet návštev, najčítanejšie stránky), aby sme ho mohli zlepšovať. Spracúvajú sa len s Vaším súhlasom.\n" : ""}${ints.includes("pixel") ? `${ints.includes("analytics") ? "4" : "3"}. **Reklamné cookies** — umožňujú zobrazovať relevantnejšiu reklamu a merať jej účinnosť. Spracúvajú sa len s Vaším súhlasom.\n` : ""}

## Ako môžete cookies kontrolovať

Súbory cookies môžete kontrolovať a/alebo zmazať podľa uváženia — podrobnosti na [allaboutcookies.org](https://www.allaboutcookies.org). Môžete vymazať všetky cookies uložené vo svojom zariadení a väčšinu prehliadačov môžete nastaviť tak, aby ukladanie cookies znemožnili alebo od Vás vždy žiadali súhlas.

Berte však na vedomie, že niektoré časti Portálu nemusia bez cookies pracovať správne alebo niektoré funkcie nemusia byť dostupné.

Svoj súhlas s používaním voliteľných cookies môžete kedykoľvek zmeniť alebo odvolať v nastaveniach cookie lišty na Portáli.

${thirdParties.length ? `## Tretie strany, ktorých cookies používame

Na Portáli umiestňujeme aj súbory cookies našich partnerov a tretích strán. Údaje z týchto cookies získavajú priamo ich prevádzkovatelia:

| Por. č. | Tretia strana | Účel | Podmienky ochrany súkromia |
|---------|---------------|------|-----------------------------|
${thirdParties.map((t, i) => `| ${i + 1}. | ${t.name} | ${t.purpose} | ${t.link || "—"} |`).join("\n")}

Súbory cookies tretích strán môžete zmazať alebo zakázať rovnako ako štandardné cookies.
` : ""}
## Súvisiace dokumenty

Informácie a údaje získané zo súborov cookies sa spravujú našimi [Podmienkami ochrany súkromia](/gdpr).

---
*${f.name} · ${f.sidlo} · IČO: ${f.ico} · ${f.email}*
`;
}
