# ⚡ WebQuote — by MediaVolt

Interaktívny web-brief builder: admin vytvorí projekt, klient dostane link a spolu v reálnom čase skladajú zadanie webu. Všetky sessions sa ukladajú do Supabase databázy.

## Ako to funguje

Admin na `/admin` vidí zoznam projektov (z databázy) a vytvára nové. Každý projekt má vlastný link `/?session=nazov-projektu`, ktorý pošle klientovi. Zmeny sa okamžite synchronizujú medzi adminom a klientom (Supabase Realtime broadcast) a automaticky sa ukladajú do databázy (debounce 800 ms) — po zatvorení a opätovnom otvorení linku je všetko tam, kde ste skončili.

## Setup

1. **Supabase projekt** — vytvor na [supabase.com](https://supabase.com) (free tier stačí).

2. **Databáza** — otvor SQL Editor v Supabase a spusti obsah súboru `supabase-setup.sql`. Vytvorí tabuľku `wq_sessions` s RLS politikami.

3. **Environment premenné** — skopíruj `.env` (alebo doplň na hostingu):

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_ADMIN_PASSWORD=silne-heslo
   ```

   Hodnoty nájdeš v Supabase → Settings → API. Admin heslo si zvoľ vlastné — bez neho je `/admin` v produkcii otvorený.

4. **Spustenie**

   ```
   npm install
   npm run dev        # vývoj na http://localhost:3000
   npm run build      # produkčný build do dist/
   ```

## Nasadenie

Projekt je pripravený pre Vercel (`vercel.json`) aj Cloudflare Pages (`_headers`, `_redirects`). Nezabudni nastaviť tri `VITE_*` premenné v nastaveniach hostingu a redeploynúť.

## Poznámky k bezpečnosti

Anon kľúč Supabase je verejný (beží v prehliadači) — prístup k projektu chráni neuhádnuteľné session ID v linku a admin rozhranie heslo. Nejde o systém pre citlivé dáta; je to zdieľaný brief. Ak potrebuješ tvrdšiu ochranu, pridaj Supabase Auth a sprísni RLS politiky v `supabase-setup.sql`.

---
*Powered by [MediaVolt](https://mediavolt.org)*
