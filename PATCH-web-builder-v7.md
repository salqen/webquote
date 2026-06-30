# Zmeny v web-builder-v7.jsx pre WebQuote

Urob tieto **find & replace** v súbore `web-builder-v7.jsx`
pred tým, ako ho skopíruješ do `src/App.jsx`.

---

## 1 — Supabase env vars (riadky 5–6)

**NÁJDI:**
```js
const SUPABASE_URL  = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON = "YOUR_ANON_KEY";
```

**NAHRAĎ:**
```js
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
```

---

## 2 — Header logo text (riadok ~2118)

**NÁJDI:**
```jsx
{isAdmin ? "⬡ MediaVolt Admin" : "📋 "+(brief.projectName||"Nový projekt")}
```

**NAHRAĎ:**
```jsx
{isAdmin ? "⚡ WebQuote Admin" : "⚡ "+(brief.projectName||"Nový projekt")}
```

---

## 3 — README generátor (riadok ~1211)

**NÁJDI:**
```
*Vygenerované cez MediaVolt Web Builder*
```

**NAHRAĎ:**
```
*Vygenerované cez [WebQuote](https://mediavolt.org) by MediaVolt*
```

---

## 4 — humans.txt generátor (riadky ~1293–1305)

**NÁJDI:**
```
Agentúra: MediaVolt AI
Web: https://mediavolt.sk
```

**NAHRAĎ:**
```
Agentúra: MediaVolt
Web: https://mediavolt.org
```

---

## 5 — Hosting options labels (riadky ~666–669)

**NÁJDI:**
```js
{ id:"volt", label:"Volt Hosting", desc:"Hosting spravovaný cez MediaVolt" },
```

**NAHRAĎ:**
```js
{ id:"volt", label:"WebQuote Hosting", desc:"Hosting spravovaný cez MediaVolt" },
```

---

## 6 — CMS options (riadok ~673)

**NÁJDI:**
```js
{ id:"voltadmin", label:"Volt Admin", desc:"MediaVolt administračný systém pre správu obsahu webu" },
```

**NAHRAĎ:**
```js
{ id:"voltadmin", label:"WebQuote Admin", desc:"MediaVolt administračný systém pre správu obsahu webu" },
```

---

## 7 — Posledný blok — zmaž celý export default App()

Zmaž od tohto riadku až po koniec súboru:

```
// ─── ROOT ─────────────────────────────────────────────────
// Sandbox mode: shared state, toggle medzi Client/Admin view

export default function App() {
  ...
}
```

Tento blok je nahradený obsahom `src/App.jsx`.

---

## Výsledná štruktúra

Po patchovaní bude `src/App.jsx` obsahovať:
1. Celý pôvodný kód z `web-builder-v7.jsx` (bez posledného App bloku)
2. Nový produkčný `App` komponent z tohto súboru

```
src/App.jsx = [web-builder-v7.jsx bez posledných ~50 riadkov]
            + [obsah src/App.jsx]
```
