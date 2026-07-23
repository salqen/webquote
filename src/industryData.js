// ═══════════════════════════════════════════════════════════════
//  WebQuote — odvetvové dáta
//  Adaptívne výbery podľa odvetvia + odporúčané štruktúry sekcií
// ═══════════════════════════════════════════════════════════════

// ── PRÁVNE OBLASTI (zdroj: lexante.sk → Služby) ──────────────
export const LEGAL_AREAS = [
  { id:"corporate",   label:"Obchodné právo a právo obchodných spoločností", en:"Commercial & corporate law" },
  { id:"disputes",    label:"Riešenie sporov",                               en:"Dispute resolution" },
  { id:"ip",          label:"Právo duševného vlastníctva",                   en:"Intellectual property law" },
  { id:"realestate",  label:"Nehnuteľnosti a development",                   en:"Real estate & development" },
  { id:"banking",     label:"Bankové a finančné právo",                      en:"Banking & finance law" },
  { id:"it",          label:"Právo informačných technológií",                en:"IT & technology law" },
  { id:"media",       label:"Mediálne právo, ochrana osobnosti a dobrej povesti", en:"Media law & personality rights" },
  { id:"privacy",     label:"Ochrana súkromia a osobných údajov (GDPR)",     en:"Privacy & data protection (GDPR)" },
  { id:"civil",       label:"Občianske právo",                               en:"Civil law" },
  { id:"labor",       label:"Pracovné právo",                                en:"Labour law" },
  { id:"admin",       label:"Správne právo",                                 en:"Administrative law" },
  { id:"criminal",    label:"Trestné právo",                                 en:"Criminal law" },
];

// ── ADAPTÍVNE VÝBERY PODĽA ODVETVIA ──────────────────────────
// Po zvolení odvetvia sa zobrazí ďalší multi-výber, ktorý spresní
// brief aj generovaný prompt. Kľúč = industry id, voliteľne subcat.
const EXTRAS = {
  automotive: { title:"Ponúkané služby", en:"Services offered", options:[
    { id:"sale",       label:"Predaj vozidiel",          en:"Vehicle sales" },
    { id:"service",    label:"Servis a opravy",          en:"Service & repairs" },
    { id:"tires",      label:"Pneuservis",               en:"Tire service" },
    { id:"aircon",     label:"Klimatizácie",             en:"A/C service" },
    { id:"geometry",   label:"Geometria náprav",         en:"Wheel alignment" },
    { id:"stk",        label:"STK / EK zabezpečenie",    en:"Vehicle inspection arrangement" },
    { id:"towing",     label:"Odťahová služba",          en:"Towing service" },
    { id:"financing",  label:"Financovanie / leasing",   en:"Financing / leasing" },
    { id:"buyout",     label:"Výkup vozidiel",           en:"Vehicle buyout" },
    { id:"rental",     label:"Požičovňa vozidiel",       en:"Car rental" },
  ]},
  creative: { title:"Zameranie tvorby", en:"Creative focus", options:[
    { id:"weddings",   label:"Svadby",                   en:"Weddings" },
    { id:"portraits",  label:"Portréty",                 en:"Portraits" },
    { id:"product",    label:"Produktová tvorba",        en:"Product work" },
    { id:"events",     label:"Eventy / reportáže",       en:"Events / coverage" },
    { id:"commercial", label:"Komerčná tvorba pre firmy",en:"Commercial work" },
    { id:"video",      label:"Video produkcia",          en:"Video production" },
    { id:"drone",      label:"Drone zábery",             en:"Drone footage" },
    { id:"studio",     label:"Vlastné štúdio",           en:"Own studio" },
    { id:"workshops",  label:"Workshopy / kurzy",        en:"Workshops / courses" },
    { id:"prints",     label:"Predaj printov / diel",    en:"Prints / art sales" },
  ]},
  ecommerce: { title:"Model predaja", en:"Sales model", options:[
    { id:"physical",   label:"Fyzické produkty",         en:"Physical products" },
    { id:"digital",    label:"Digitálne produkty",       en:"Digital products" },
    { id:"subscription",label:"Predplatné",              en:"Subscriptions" },
    { id:"custom",     label:"Personalizácia produktov", en:"Product personalisation" },
    { id:"b2b",        label:"B2B veľkoobchod",          en:"B2B wholesale" },
    { id:"clickcollect",label:"Osobný odber (click & collect)", en:"Click & collect" },
    { id:"intl",       label:"Medzinárodná doprava",     en:"International shipping" },
    { id:"loyalty",    label:"Vernostný program",        en:"Loyalty programme" },
    { id:"vouchers",   label:"Darčekové poukazy",        en:"Gift vouchers" },
  ]},
  education: { title:"Formát vzdelávania", en:"Education format", options:[
    { id:"group",      label:"Skupinové kurzy",          en:"Group courses" },
    { id:"individual", label:"Individuálne hodiny",      en:"1-on-1 lessons" },
    { id:"online",     label:"Online kurzy",             en:"Online courses" },
    { id:"corporate",  label:"Firemné školenia",         en:"Corporate training" },
    { id:"certs",      label:"Certifikácie",             en:"Certifications" },
    { id:"kids",       label:"Kurzy pre deti",           en:"Kids' courses" },
    { id:"camps",      label:"Tábory / sústredenia",     en:"Camps" },
    { id:"tutoring",   label:"Doučovanie",               en:"Tutoring" },
    { id:"elearning",  label:"E-learning platforma",     en:"E-learning platform" },
  ]},
  finance: { title:"Finančné služby", en:"Financial services", options:[
    { id:"loans",      label:"Úvery a hypotéky",         en:"Loans & mortgages" },
    { id:"investments",label:"Investície",               en:"Investments" },
    { id:"insurance",  label:"Poistenie",                en:"Insurance" },
    { id:"pension",    label:"Dôchodkové sporenie",      en:"Pension savings" },
    { id:"accounting", label:"Účtovníctvo",              en:"Accounting" },
    { id:"tax",        label:"Daňové poradenstvo",       en:"Tax advisory" },
    { id:"crypto",     label:"Krypto / digitálne aktíva",en:"Crypto / digital assets" },
    { id:"corporate",  label:"Firemné financie",         en:"Corporate finance" },
    { id:"planning",   label:"Osobný finančný plán",     en:"Personal financial planning" },
  ]},
  gastro: { title:"Ponuka a služby", en:"Offering & services", options:[
    { id:"dailymenu",  label:"Denné menu",               en:"Daily menu" },
    { id:"alacarte",   label:"À la carte",               en:"À la carte" },
    { id:"brunch",     label:"Raňajky / brunch",         en:"Breakfast / brunch" },
    { id:"delivery",   label:"Rozvoz",                   en:"Delivery" },
    { id:"takeaway",   label:"Take-away",                en:"Take-away" },
    { id:"catering",   label:"Catering",                 en:"Catering" },
    { id:"privateevents",label:"Súkromné akcie",         en:"Private events" },
    { id:"tastings",   label:"Degustácie",               en:"Tastings" },
    { id:"vegan",      label:"Vegetariánske / vegánske", en:"Vegetarian / vegan" },
    { id:"glutenfree", label:"Bezlepkové možnosti",      en:"Gluten-free options" },
    { id:"terrace",    label:"Terasa",                   en:"Terrace" },
    { id:"kids",       label:"Detský kútik",             en:"Kids' corner" },
  ]},
  health: { title:"Poskytovaná starostlivosť", en:"Care provided", options:[
    { id:"prevention", label:"Preventívne prehliadky",   en:"Preventive check-ups" },
    { id:"specialist", label:"Špecializované vyšetrenia",en:"Specialist examinations" },
    { id:"diagnostics",label:"Diagnostika / ultrazvuk",  en:"Diagnostics / ultrasound" },
    { id:"vaccination",label:"Očkovanie",                en:"Vaccination" },
    { id:"telemedicine",label:"Telemedicína / online konzultácie", en:"Telemedicine" },
    { id:"homecare",   label:"Domáca starostlivosť",     en:"Home care" },
    { id:"lab",        label:"Laboratórne testy",        en:"Laboratory tests" },
    { id:"aesthetics", label:"Estetická medicína",       en:"Aesthetic medicine" },
    { id:"rehab",      label:"Rehabilitácia",            en:"Rehabilitation" },
    { id:"insurances", label:"Zazmluvnené poisťovne",    en:"Contracted insurers" },
  ]},
  manufacturing: { title:"Výrobné kapacity a služby", en:"Production capabilities", options:[
    { id:"custom",     label:"Zákazková výroba",         en:"Custom manufacturing" },
    { id:"serial",     label:"Sériová výroba",           en:"Serial production" },
    { id:"prototyping",label:"Prototypovanie",           en:"Prototyping" },
    { id:"cnc",        label:"CNC obrábanie",            en:"CNC machining" },
    { id:"welding",    label:"Zváranie",                 en:"Welding" },
    { id:"finishing",  label:"Povrchové úpravy",         en:"Surface finishing" },
    { id:"assembly",   label:"Montáž",                   en:"Assembly" },
    { id:"logistics",  label:"Logistika / doprava",      en:"Logistics" },
    { id:"iso",        label:"Certifikácie (ISO...)",    en:"Certifications (ISO...)" },
    { id:"rnd",        label:"Vývoj a konštrukcia",      en:"R&D / engineering" },
  ]},
  nonprofit: { title:"Aktivity organizácie", en:"Organisation activities", options:[
    { id:"volunteering",label:"Dobrovoľníctvo",          en:"Volunteering" },
    { id:"donations",  label:"Darcovstvo / fundraising", en:"Donations / fundraising" },
    { id:"membership", label:"Členstvo",                 en:"Membership" },
    { id:"collections",label:"Verejné zbierky",          en:"Public collections" },
    { id:"grants",     label:"Granty a projekty",        en:"Grants & projects" },
    { id:"community",  label:"Komunitné akcie",          en:"Community events" },
    { id:"education",  label:"Vzdelávacie programy",     en:"Educational programmes" },
    { id:"advocacy",   label:"Advokácia / osveta",       en:"Advocacy / awareness" },
    { id:"transparency",label:"Transparentné financovanie", en:"Financial transparency" },
  ]},
  pets: { title:"Služby pre zvieratá", en:"Pet services", options:[
    { id:"vetcare",    label:"Veterinárna starostlivosť",en:"Veterinary care" },
    { id:"vaccination",label:"Očkovanie a čipovanie",    en:"Vaccination & microchipping" },
    { id:"surgery",    label:"Chirurgia",                en:"Surgery" },
    { id:"grooming",   label:"Grooming / úprava srsti",  en:"Grooming" },
    { id:"boarding",   label:"Hotel / penzión",          en:"Boarding" },
    { id:"training",   label:"Výcvik",                   en:"Training" },
    { id:"food",       label:"Predaj krmív a potrieb",   en:"Food & supplies" },
    { id:"breeding",   label:"Chov",                     en:"Breeding" },
    { id:"emergency",  label:"Pohotovosť",               en:"Emergency service" },
  ]},
  public: { title:"Funkcie pre občanov", en:"Citizen services", options:[
    { id:"board",      label:"Úradná tabuľa",            en:"Official notice board" },
    { id:"eforms",     label:"Elektronické formuláre",   en:"Electronic forms" },
    { id:"minutes",    label:"Zápisnice a uznesenia",    en:"Minutes & resolutions" },
    { id:"procurement",label:"Verejné obstarávanie",     en:"Public procurement" },
    { id:"culture",    label:"Kultúrne podujatia",       en:"Cultural events" },
    { id:"reporting",  label:"Hlásenie porúch / podnetov", en:"Issue reporting" },
    { id:"waste",      label:"Odpadový kalendár",        en:"Waste calendar" },
    { id:"budget",     label:"Participatívny rozpočet",  en:"Participatory budget" },
  ]},
  realty: { title:"Rozsah služieb", en:"Scope of services", options:[
    { id:"sale",       label:"Predaj nehnuteľností",     en:"Property sales" },
    { id:"rental",     label:"Prenájom",                 en:"Rentals" },
    { id:"management", label:"Správa nehnuteľností",     en:"Property management" },
    { id:"construction",label:"Výstavba na kľúč",        en:"Turnkey construction" },
    { id:"renovation", label:"Rekonštrukcie",            en:"Renovations" },
    { id:"interior",   label:"Interiérový dizajn",       en:"Interior design" },
    { id:"appraisal",  label:"Znalecké posudky",         en:"Appraisals" },
    { id:"mortgage",   label:"Hypotekárne poradenstvo",  en:"Mortgage advisory" },
    { id:"tours3d",    label:"3D obhliadky",             en:"3D tours" },
    { id:"staging",    label:"Home staging",             en:"Home staging" },
  ]},
  services: { title:"Rozsah služieb", en:"Scope of services", options:[
    { id:"consulting", label:"Konzultácie",              en:"Consulting" },
    { id:"audit",      label:"Audit / analýza",          en:"Audit / analysis" },
    { id:"implementation",label:"Implementácia riešení", en:"Implementation" },
    { id:"outsourcing",label:"Outsourcing",              en:"Outsourcing" },
    { id:"training",   label:"Školenia",                 en:"Training" },
    { id:"support",    label:"Podpora / servis",         en:"Support / maintenance" },
    { id:"contracts",  label:"Zmluvná spolupráca",       en:"Contract-based cooperation" },
  ]},
  sportoutdoor: { title:"Ponuka klubu / centra", en:"Club / centre offering", options:[
    { id:"membership", label:"Členstvá",                 en:"Memberships" },
    { id:"training",   label:"Tréningy",                 en:"Training sessions" },
    { id:"kids",       label:"Kurzy pre deti",           en:"Kids' courses" },
    { id:"rental",     label:"Prenájom výstroja",        en:"Equipment rental" },
    { id:"trips",      label:"Organizované výlety",      en:"Guided trips" },
    { id:"races",      label:"Závody / turnaje",         en:"Races / tournaments" },
    { id:"camps",      label:"Sústredenia",              en:"Training camps" },
    { id:"schedule",   label:"Online rozvrh",            en:"Online schedule" },
  ]},
  tech: { title:"Vlastnosti produktu / služby", en:"Product / service traits", options:[
    { id:"trial",      label:"Free trial",               en:"Free trial" },
    { id:"demo",       label:"Demo na vyžiadanie",       en:"Bookable demo" },
    { id:"api",        label:"API / integrácie",         en:"API / integrations" },
    { id:"onprem",     label:"On-premise nasadenie",     en:"On-premise deployment" },
    { id:"whitelabel", label:"White-label",              en:"White-label" },
    { id:"sla",        label:"Podpora so SLA",           en:"SLA-backed support" },
    { id:"migration",  label:"Migrácia dát",             en:"Data migration" },
    { id:"security",   label:"Security / compliance",    en:"Security / compliance" },
    { id:"docs",       label:"Dokumentácia / dev portál",en:"Docs / dev portal" },
  ]},
  travel: { title:"Ponuka služieb", en:"Services offered", options:[
    { id:"accommodation",label:"Ubytovanie",             en:"Accommodation" },
    { id:"custom",     label:"Zájazdy na mieru",         en:"Tailor-made trips" },
    { id:"group",      label:"Skupinové zájazdy",        en:"Group tours" },
    { id:"flights",    label:"Letenky",                  en:"Flights" },
    { id:"insurance",  label:"Cestovné poistenie",       en:"Travel insurance" },
    { id:"transfers",  label:"Transfery",                en:"Transfers" },
    { id:"guides",     label:"Sprievodcovské služby",    en:"Guided tours" },
    { id:"corporate",  label:"Firemné akcie / teambuilding", en:"Corporate events" },
    { id:"lastminute", label:"Last minute ponuky",       en:"Last minute deals" },
  ]},
  wellness: { title:"Procedúry a služby", en:"Treatments & services", options:[
    { id:"massage",    label:"Masáže",                   en:"Massages" },
    { id:"spa",        label:"Sauna / spa rituály",      en:"Sauna / spa rituals" },
    { id:"cosmetics",  label:"Kozmetika",                en:"Cosmetics" },
    { id:"hair",       label:"Kaderníctvo",              en:"Hairdressing" },
    { id:"passes",     label:"Permanentky",              en:"Passes" },
    { id:"vouchers",   label:"Darčekové poukazy",        en:"Gift vouchers" },
    { id:"couples",    label:"Párové procedúry",         en:"Couple treatments" },
    { id:"booking",    label:"Online rezervácie",        en:"Online booking" },
    { id:"products",   label:"Produkty na predaj",       en:"Retail products" },
  ]},
};

// Špecifické výbery pre podkategórie (prepíšu default odvetvia)
const EXTRAS_BY_SUBCAT = {
  law: { title:"Oblasti práva", en:"Practice areas", options: LEGAL_AREAS },
  accounting: { title:"Účtovné a daňové služby", en:"Accounting & tax services", options:[
    { id:"single",     label:"Jednoduché účtovníctvo",   en:"Single-entry bookkeeping" },
    { id:"double",     label:"Podvojné účtovníctvo",     en:"Double-entry bookkeeping" },
    { id:"payroll",    label:"Mzdy a personalistika",    en:"Payroll & HR" },
    { id:"taxreturns", label:"Daňové priznania",         en:"Tax returns" },
    { id:"vat",        label:"DPH agenda",               en:"VAT agenda" },
    { id:"reporting",  label:"Reporting / výkazy",       en:"Reporting" },
    { id:"audit",      label:"Audit",                    en:"Audit" },
    { id:"incorporation",label:"Zakladanie firiem",      en:"Company incorporation" },
  ]},
};

// Vráti adaptívny výber pre kombináciu odvetvie + podkategória.
export function getIndustryExtras(industry, subcat) {
  if (subcat && EXTRAS_BY_SUBCAT[subcat]) return EXTRAS_BY_SUBCAT[subcat];
  return EXTRAS[industry] || null;
}

// ── ODPORÚČANÁ ŠTRUKTÚRA SEKCIÍ PODĽA ODVETVIA ───────────────
export const INDUSTRY_SECTION_PRESETS = {
  automotive:    ["nav","hero","services","features","gallery","testimonials","faq","contact","map","openinghours","cta","footer","cookies","scrolltop"],
  creative:      ["nav","hero","work","gallery","about","process","testimonials","pricing","contact","footer","scrolltop"],
  ecommerce:     ["nav","hero","products","features","testimonials","faq","newsletter","cta","footer","cookies","scrolltop","search"],
  education:     ["nav","hero","services","process","team","pricing","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  finance:       ["nav","hero","services","stats","process","team","testimonials","faq","calculator","leadform","contact","footer","cookies","scrolltop"],
  gastro:        ["nav","hero","menu","about","gallery","reviews","map","openinghours","booking","contact","footer","cookies","scrolltop"],
  health:        ["nav","hero","services","team","pricing","faq","booking","contact","map","openinghours","footer","cookies","scrolltop"],
  manufacturing: ["nav","hero","about","services","products","stats","partners","awards","leadform","contact","map","footer","cookies","scrolltop"],
  nonprofit:     ["nav","hero","about","events","stats","team","partners","cta","newsletter","contact","footer","cookies","scrolltop"],
  pets:          ["nav","hero","services","team","pricing","gallery","reviews","booking","contact","map","openinghours","footer","cookies","scrolltop"],
  public:        ["nav","hero","about","events","blog","faq","map","openinghours","contact","footer","cookies","scrolltop","search"],
  realty:        ["nav","hero","products","about","team","stats","testimonials","process","leadform","contact","map","footer","cookies","scrolltop"],
  services:      ["nav","hero","services","about","team","stats","testimonials","faq","leadform","contact","map","footer","cookies","scrolltop"],
  sportoutdoor:  ["nav","hero","about","services","events","gallery","pricing","team","faq","contact","map","footer","cookies","scrolltop"],
  tech:          ["nav","hero","features","process","pricing","testimonials","logos","faq","cta","newsletter","footer","cookies","scrolltop","darkmode"],
  travel:        ["nav","hero","services","gallery","testimonials","faq","booking","map","newsletter","contact","footer","cookies","scrolltop"],
  wellness:      ["nav","hero","services","pricing","gallery","team","testimonials","booking","contact","openinghours","footer","cookies","scrolltop"],
};

// ── ODPORÚČANÉ SEKCIE PRE JEDNOTLIVÉ PODKATEGÓRIE ────────────
// Presnejšie ako kategórie — odvodené z reálnych webov daného typu biznisu.
// Kľúč = id podkategórie. Ak podkategória chýba, použije sa preset kategórie.
// Doplňuje sa priebežne (task per kategória). Sekcie 404+gdpr sa dopĺňajú automaticky.
export const INDUSTRY_SUBCAT_SECTION_PRESETS = {
  // — AGRO & POTRAVINÁRSTVO —
  farm:       ["nav","hero","about","products","gallery","process","reviews","map","openinghours","contact","footer","cookies","scrolltop"],
  winery:     ["nav","hero","about","products","booking","gallery","events","reviews","map","openinghours","newsletter","contact","footer","cookies","scrolltop"],
  brewery:    ["nav","hero","about","products","process","booking","gallery","events","map","openinghours","contact","footer","cookies","scrolltop"],
  beekeeping: ["nav","hero","about","products","process","gallery","reviews","faq","map","contact","footer","cookies","scrolltop"],
  farmshop:   ["nav","hero","products","about","process","reviews","faq","map","openinghours","newsletter","contact","footer","cookies","scrolltop","search"],

  // — AUTOMOTIVE —
  cardealer:  ["nav","hero","products","features","calculator","gallery","reviews","faq","leadform","contact","map","openinghours","footer","cookies","scrolltop","search"],
  carservice: ["nav","hero","services","features","pricing","booking","reviews","team","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  carwash:    ["nav","hero","services","pricing","gallery","reviews","booking","faq","map","openinghours","contact","footer","cookies","scrolltop"],
  carrental:  ["nav","hero","products","features","pricing","booking","faq","reviews","contact","map","openinghours","footer","cookies","scrolltop","search"],
  tires:      ["nav","hero","services","products","pricing","booking","faq","reviews","map","openinghours","contact","footer","cookies","scrolltop"],
  moto:       ["nav","hero","products","services","gallery","reviews","booking","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  towing:     ["nav","hero","services","features","pricing","stats","reviews","faq","cta","contact","map","footer","cookies","scrolltop"],

  // — CREATIVE & UMENIE —
  photographer: ["nav","hero","gallery","work","about","pricing","testimonials","faq","booking","contact","footer","cookies","scrolltop"],
  dj:           ["nav","hero","about","work","gallery","events","press","testimonials","booking","contact","newsletter","footer","cookies","scrolltop"],
  band:         ["nav","hero","about","work","events","gallery","press","products","newsletter","contact","footer","cookies","scrolltop"],
  videographer: ["nav","hero","work","gallery","services","pricing","process","testimonials","faq","contact","footer","cookies","scrolltop"],
  designer:     ["nav","hero","work","gallery","about","services","process","testimonials","contact","footer","cookies","scrolltop"],
  writer:       ["nav","hero","about","blog","work","newsletter","testimonials","contact","footer","cookies","scrolltop"],
  influencer:   ["nav","hero","about","ugc","stats","press","partners","newsletter","contact","footer","cookies","scrolltop"],
  event:        ["nav","hero","about","events","gallery","services","testimonials","partners","leadform","contact","footer","cookies","scrolltop"],
  fashiondesign:["nav","hero","about","gallery","work","products","process","press","contact","footer","cookies","scrolltop"],

  // — DETI & RODINA —
  kindergarten: ["nav","hero","about","services","process","team","gallery","pricing","faq","leadform","contact","map","openinghours","footer","cookies","scrolltop"],
  playcenter:   ["nav","hero","about","services","pricing","gallery","booking","reviews","faq","map","openinghours","contact","footer","cookies","scrolltop"],
  nanny:        ["nav","hero","about","services","team","process","pricing","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  camps:        ["nav","hero","about","events","gallery","pricing","faq","team","leadform","contact","newsletter","footer","cookies","scrolltop"],

  // — E-COMMERCE —
  eshop:        ["nav","hero","products","features","reviews","faq","newsletter","cta","contact","footer","cookies","scrolltop","search"],
  fashion:      ["nav","hero","products","gallery","ugc","reviews","newsletter","faq","footer","cookies","scrolltop","search"],
  electronics:  ["nav","hero","products","features","reviews","faq","services","newsletter","footer","cookies","scrolltop","search"],
  "food-shop":  ["nav","hero","products","features","process","reviews","faq","newsletter","contact","footer","cookies","scrolltop","search"],
  handmade:     ["nav","hero","about","products","gallery","reviews","ugc","newsletter","contact","footer","cookies","scrolltop","search"],
  "b2b-shop":   ["nav","hero","products","features","about","pricing","partners","leadform","faq","contact","footer","cookies","scrolltop","search"],
  dropshipping: ["nav","hero","products","features","reviews","ugc","faq","cta","newsletter","footer","cookies","scrolltop","search"],
  subscription: ["nav","hero","features","pricing","process","testimonials","faq","cta","newsletter","footer","cookies","scrolltop"],
  jewelry:      ["nav","hero","products","gallery","about","reviews","faq","newsletter","contact","footer","cookies","scrolltop","search"],
  books:        ["nav","hero","products","blog","reviews","newsletter","faq","events","contact","footer","cookies","scrolltop","search"],

  // — EDUCATION / VZDELÁVANIE —
  school:       ["nav","hero","services","process","team","pricing","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  coaching:     ["nav","hero","about","services","process","testimonials","pricing","booking","faq","contact","footer","cookies","scrolltop"],
  "online-edu": ["nav","hero","features","services","pricing","process","testimonials","faq","cta","newsletter","footer","cookies","scrolltop","darkmode"],
  kids:         ["nav","hero","about","services","gallery","team","pricing","faq","leadform","contact","map","openinghours","footer","cookies","scrolltop"],
  workshop:     ["nav","hero","about","events","services","pricing","testimonials","faq","leadform","contact","newsletter","footer","cookies","scrolltop"],
  driving:      ["nav","hero","services","pricing","process","team","faq","testimonials","leadform","contact","map","footer","cookies","scrolltop"],
  university:   ["nav","hero","about","services","stats","blog","events","faq","leadform","contact","map","footer","cookies","scrolltop","search","language"],
  tutoring:     ["nav","hero","about","services","pricing","process","testimonials","faq","booking","contact","footer","cookies","scrolltop"],
  artschool:    ["nav","hero","about","services","team","gallery","events","pricing","faq","leadform","contact","openinghours","footer","cookies","scrolltop"],

  // — FINANCE & INVESTÍCIE —
  bank:        ["nav","hero","features","services","stats","calculator","testimonials","faq","cta","contact","footer","cookies","scrolltop","darkmode"],
  investing:   ["nav","hero","features","stats","process","pricing","calculator","testimonials","faq","cta","footer","cookies","scrolltop","darkmode"],
  broker:      ["nav","hero","services","about","process","calculator","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  crypto:      ["nav","hero","features","stats","process","faq","partners","cta","newsletter","footer","cookies","scrolltop","darkmode"],
  accounting2: ["nav","hero","services","about","pricing","team","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],

  // — GASTRO —
  restaurant: ["nav","hero","menu","about","gallery","reviews","booking","events","map","openinghours","contact","footer","cookies","scrolltop"],
  cafe:       ["nav","hero","menu","about","gallery","reviews","events","map","openinghours","contact","footer","cookies","scrolltop"],
  bar:        ["nav","hero","menu","about","gallery","events","reviews","map","openinghours","contact","footer","cookies","scrolltop"],
  club:       ["nav","hero","events","gallery","ugc","booking","map","openinghours","contact","footer","cookies","scrolltop"],
  foodtruck:  ["nav","hero","menu","about","events","gallery","map","ugc","contact","footer","cookies","scrolltop"],
  bakery:     ["nav","hero","menu","products","gallery","about","reviews","booking","map","openinghours","contact","footer","cookies","scrolltop"],
  fastfood:   ["nav","hero","menu","cta","reviews","faq","map","openinghours","contact","footer","cookies","scrolltop"],
  catering:   ["nav","hero","services","menu","gallery","pricing","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  winebar:    ["nav","hero","menu","products","about","gallery","events","booking","map","openinghours","contact","footer","cookies","scrolltop"],

  // — HEALTH & ZDRAVIE —
  clinic:     ["nav","hero","services","team","booking","pricing","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  dental:     ["nav","hero","services","team","gallery","pricing","booking","reviews","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  pharmacy:   ["nav","hero","products","services","faq","map","openinghours","contact","footer","cookies","scrolltop","search"],
  physio:     ["nav","hero","services","team","pricing","booking","testimonials","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  optician:   ["nav","hero","products","services","booking","reviews","faq","map","openinghours","contact","footer","cookies","scrolltop"],
  nutrition:  ["nav","hero","about","services","pricing","process","testimonials","booking","faq","contact","footer","cookies","scrolltop"],
  aesthetics: ["nav","hero","services","gallery","team","pricing","booking","testimonials","faq","contact","map","footer","cookies","scrolltop"],
  lab:        ["nav","hero","services","pricing","process","faq","booking","contact","map","openinghours","footer","cookies","scrolltop"],
  careservice:["nav","hero","about","services","team","pricing","testimonials","gallery","faq","leadform","contact","map","footer","cookies","scrolltop"],

  // — HR & KARIÉRA —
  recruitment: ["nav","hero","services","about","process","testimonials","logos","leadform","contact","footer","cookies","scrolltop","search"],
  jobportal:   ["nav","hero","search","features","services","stats","faq","leadform","contact","footer","cookies","scrolltop"],
  coworking:   ["nav","hero","about","features","gallery","pricing","booking","testimonials","faq","map","contact","footer","cookies","scrolltop"],
  careercoach: ["nav","hero","about","services","process","pricing","testimonials","booking","faq","contact","footer","cookies","scrolltop"],

  // — MANUFACTURING & INDUSTRY —
  factory:    ["nav","hero","about","services","products","stats","awards","partners","leadform","contact","map","footer","cookies","scrolltop"],
  wholesale:  ["nav","hero","products","about","pricing","partners","leadform","faq","contact","footer","cookies","scrolltop","search"],
  engineering:["nav","hero","about","services","work","process","awards","stats","leadform","contact","footer","cookies","scrolltop"],
  packaging:  ["nav","hero","services","products","gallery","process","calculator","leadform","faq","contact","footer","cookies","scrolltop"],
  metal:      ["nav","hero","services","work","about","process","awards","leadform","contact","footer","cookies","scrolltop"],
  printing3d: ["nav","hero","services","gallery","process","pricing","calculator","faq","leadform","contact","footer","cookies","scrolltop"],

  // — MÉDIÁ & ZÁBAVA —
  magazine:   ["nav","hero","blog","press","newsletter","ugc","contact","footer","cookies","scrolltop","search","darkmode"],
  podcast:    ["nav","hero","about","work","blog","newsletter","testimonials","partners","contact","footer","cookies","scrolltop"],
  radiotv:    ["nav","hero","about","events","team","blog","gallery","contact","footer","cookies","scrolltop","search"],
  gaming:     ["nav","hero","about","team","events","stats","gallery","ugc","partners","newsletter","contact","footer","cookies","scrolltop","darkmode"],
  cinema:     ["nav","hero","events","booking","gallery","about","faq","map","openinghours","contact","footer","cookies","scrolltop"],

  // — NON-PROFIT & INÉ —
  ngo:      ["nav","hero","about","services","stats","events","team","partners","cta","newsletter","contact","footer","cookies","scrolltop"],
  church:   ["nav","hero","about","events","services","team","blog","gallery","contact","map","openinghours","footer","cookies","scrolltop"],
  sport:    ["nav","hero","about","team","events","stats","gallery","partners","newsletter","contact","footer","cookies","scrolltop"],
  politics: ["nav","hero","about","team","services","events","blog","cta","newsletter","contact","footer","cookies","scrolltop"],
  charity:  ["nav","hero","about","stats","services","testimonials","partners","cta","newsletter","contact","footer","cookies","scrolltop"],
  personal: ["nav","hero","about","work","services","stats","testimonials","blog","contact","footer","cookies","scrolltop"],

  // — PETS & ZVIERATÁ —
  vet:         ["nav","hero","services","team","booking","pricing","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  petshop:     ["nav","hero","products","services","reviews","faq","map","openinghours","contact","footer","cookies","scrolltop","search"],
  grooming:    ["nav","hero","services","pricing","gallery","booking","reviews","faq","map","openinghours","contact","footer","cookies","scrolltop"],
  breeder:     ["nav","hero","about","gallery","products","team","testimonials","faq","contact","footer","cookies","scrolltop"],
  petboarding: ["nav","hero","services","pricing","gallery","booking","reviews","faq","map","openinghours","contact","footer","cookies","scrolltop"],
  dogtraining: ["nav","hero","about","services","pricing","process","testimonials","gallery","faq","booking","contact","footer","cookies","scrolltop"],

  // — PUBLIC SECTOR & VEREJNÁ SPRÁVA —
  municipality: ["nav","hero","about","services","blog","events","faq","contact","map","openinghours","footer","cookies","scrolltop","search","language"],
  government:   ["nav","hero","about","services","blog","faq","contact","map","footer","cookies","scrolltop","search","language"],
  library:      ["nav","hero","about","services","events","blog","faq","contact","map","openinghours","footer","cookies","scrolltop","search"],
  museum:       ["nav","hero","about","events","gallery","pricing","booking","map","openinghours","faq","contact","footer","cookies","scrolltop"],

  // — REMESLÁ & DOMÁCE SLUŽBY —
  electrician: ["nav","hero","services","about","work","reviews","awards","faq","cta","leadform","contact","map","footer","cookies","scrolltop"],
  plumber:     ["nav","hero","services","about","work","reviews","awards","faq","cta","leadform","contact","map","footer","cookies","scrolltop"],
  carpenter:   ["nav","hero","services","gallery","about","process","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  painter:     ["nav","hero","services","gallery","reviews","pricing","faq","leadform","contact","map","footer","cookies","scrolltop"],
  gardener:    ["nav","hero","services","gallery","process","reviews","faq","leadform","contact","map","footer","cookies","scrolltop"],
  hvac:        ["nav","hero","services","about","work","reviews","awards","calculator","faq","leadform","contact","footer","cookies","scrolltop"],
  locksmith:   ["nav","hero","services","pricing","reviews","faq","cta","contact","map","footer","cookies","scrolltop"],
  chimney:     ["nav","hero","services","about","process","reviews","pricing","faq","leadform","contact","map","footer","cookies","scrolltop"],

  // — REALITKY & STAVEBNÍCTVO —
  realtor:      ["nav","hero","products","search","about","team","testimonials","process","leadform","contact","map","footer","cookies","scrolltop"],
  developer:    ["nav","hero","about","products","gallery","features","stats","process","leadform","contact","map","footer","cookies","scrolltop"],
  architect:    ["nav","hero","work","gallery","about","services","process","team","awards","contact","footer","cookies","scrolltop"],
  construction: ["nav","hero","services","work","about","stats","process","awards","testimonials","leadform","contact","footer","cookies","scrolltop"],
  interior:     ["nav","hero","work","gallery","about","services","process","testimonials","contact","footer","cookies","scrolltop"],
  rental:       ["nav","hero","products","search","features","pricing","booking","faq","map","contact","footer","cookies","scrolltop"],
  facility:     ["nav","hero","services","about","stats","process","testimonials","partners","leadform","contact","footer","cookies","scrolltop"],
  surveyor:     ["nav","hero","services","about","process","pricing","faq","work","leadform","contact","map","footer","cookies","scrolltop"],

  // — SLUŽBY B2B/B2C —
  law:        ["nav","hero","services","about","team","testimonials","faq","leadform","contact","map","footer","cookies","scrolltop"],
  accounting: ["nav","hero","services","about","pricing","team","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  agency:     ["nav","hero","services","work","about","process","testimonials","logos","team","cta","contact","footer","cookies","scrolltop"],
  consulting: ["nav","hero","services","about","process","stats","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  cleaning:   ["nav","hero","services","pricing","process","reviews","calculator","faq","leadform","contact","map","footer","cookies","scrolltop"],
  transport:  ["nav","hero","services","about","stats","features","calculator","partners","leadform","contact","map","footer","cookies","scrolltop"],
  security:   ["nav","hero","services","about","stats","features","awards","testimonials","leadform","contact","footer","cookies","scrolltop"],
  insurance:  ["nav","hero","services","about","calculator","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  energy:     ["nav","hero","services","about","calculator","process","stats","reviews","faq","leadform","contact","footer","cookies","scrolltop"],
  funeral:    ["nav","hero","services","about","pricing","process","faq","cta","contact","map","footer","cookies","scrolltop"],

  // — SPORT & OUTDOOR —
  sportsclub:  ["nav","hero","about","team","events","stats","gallery","partners","newsletter","contact","footer","cookies","scrolltop"],
  outdoor:     ["nav","hero","services","gallery","pricing","booking","reviews","faq","map","contact","footer","cookies","scrolltop"],
  sportshop:   ["nav","hero","products","features","reviews","faq","newsletter","contact","map","footer","cookies","scrolltop","search"],
  golfski:     ["nav","hero","services","pricing","booking","gallery","map","openinghours","faq","contact","footer","cookies","scrolltop"],
  trainer:     ["nav","hero","about","services","pricing","testimonials","gallery","booking","faq","contact","footer","cookies","scrolltop"],
  dance:       ["nav","hero","about","services","team","events","gallery","pricing","testimonials","booking","contact","openinghours","footer","cookies","scrolltop"],
  martialarts: ["nav","hero","about","services","team","events","pricing","gallery","testimonials","booking","faq","contact","footer","cookies","scrolltop"],

  // — SVADBY & EVENTY —
  weddingagency: ["nav","hero","about","services","gallery","pricing","testimonials","partners","faq","leadform","contact","footer","cookies","scrolltop"],
  eventservices: ["nav","hero","services","gallery","work","pricing","partners","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  florist:       ["nav","hero","products","gallery","services","reviews","faq","contact","map","openinghours","footer","cookies","scrolltop","search"],
  partyrental:   ["nav","hero","products","gallery","pricing","faq","leadform","contact","map","footer","cookies","scrolltop","search"],

  // — TECHNOLÓGIE & SAAS —
  saas:        ["nav","hero","features","process","pricing","testimonials","logos","faq","cta","newsletter","footer","cookies","scrolltop","darkmode"],
  app:         ["nav","hero","features","gallery","stats","testimonials","faq","cta","footer","cookies","scrolltop","darkmode"],
  "agency-dev":["nav","hero","services","work","process","testimonials","logos","team","cta","contact","footer","cookies","scrolltop","darkmode"],
  startup:     ["nav","hero","features","process","stats","testimonials","cta","newsletter","footer","cookies","scrolltop","darkmode"],
  ai:          ["nav","hero","features","process","stats","pricing","testimonials","faq","cta","newsletter","footer","cookies","scrolltop","darkmode"],
  hosting:     ["nav","hero","features","pricing","stats","testimonials","faq","cta","contact","footer","cookies","scrolltop","darkmode"],
  itservice:   ["nav","hero","services","about","pricing","process","testimonials","faq","leadform","contact","footer","cookies","scrolltop"],
  cybersec:    ["nav","hero","services","features","process","stats","awards","testimonials","faq","leadform","contact","footer","cookies","scrolltop","darkmode"],
  isp:         ["nav","hero","features","pricing","services","faq","testimonials","cta","contact","map","footer","cookies","scrolltop"],

  // — TRAVEL & HOSPITALITY —
  hotel:        ["nav","hero","about","gallery","services","pricing","booking","reviews","faq","map","contact","footer","cookies","scrolltop"],
  travelagency: ["nav","hero","services","products","gallery","testimonials","faq","booking","newsletter","contact","footer","cookies","scrolltop","search"],
  tourguide:    ["nav","hero","about","services","gallery","pricing","testimonials","booking","faq","contact","map","footer","cookies","scrolltop"],
  airbnb:       ["nav","hero","gallery","features","pricing","booking","reviews","map","faq","contact","footer","cookies","scrolltop"],
  camping:      ["nav","hero","gallery","services","pricing","booking","map","reviews","faq","contact","openinghours","footer","cookies","scrolltop"],
  infocenter:   ["nav","hero","about","gallery","services","events","pricing","map","openinghours","faq","contact","footer","cookies","scrolltop"],

  // — WELLNESS & BEAUTY —
  spa:      ["nav","hero","services","pricing","gallery","booking","testimonials","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  massage:  ["nav","hero","services","pricing","booking","about","testimonials","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  salon:    ["nav","hero","services","pricing","gallery","team","booking","reviews","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  beauty:   ["nav","hero","services","pricing","gallery","team","booking","reviews","faq","contact","map","openinghours","footer","cookies","scrolltop"],
  fitness:  ["nav","hero","services","pricing","team","gallery","events","testimonials","booking","faq","contact","openinghours","footer","cookies","scrolltop"],
  yoga:     ["nav","hero","about","services","events","pricing","team","testimonials","booking","contact","openinghours","footer","cookies","scrolltop"],
  therapy:  ["nav","hero","about","services","pricing","process","testimonials","booking","faq","contact","footer","cookies","scrolltop"],
  tattoo:   ["nav","hero","gallery","team","services","pricing","booking","reviews","faq","contact","openinghours","footer","cookies","scrolltop"],
};

// Vráti odporúčané sekcie: najprv podľa podkategórie, inak podľa kategórie.
export function getRecommendedSections(industry, subcat) {
  return INDUSTRY_SUBCAT_SECTION_PRESETS[subcat] || INDUSTRY_SECTION_PRESETS[industry] || null;
}
