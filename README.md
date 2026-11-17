# Grest Oppeano

Web app del centro estivo parrocchiale di Oppeano: iscrizioni dei bambini, gite e sondaggi, programma settimanale, eventi, annunci, notifiche e registro presenze.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Firebase (Auth + Firestore) · Recharts.
L'app è una SPA statica pubblicata su **GitHub Pages**: non serve alcun backend.

## Ruoli

| Ruolo | Cosa può fare |
| --- | --- |
| **Genitore** | Iscrive i figli, modifica/ritira le iscrizioni, risponde alle gite, legge notifiche |
| **Animatore** | Registra le presenze giornaliere, consulta elenco bambini e note sanitarie |
| **Amministratore** | Tutto: conferma iscrizioni e quote, gite e pagamenti, programma, eventi, annunci, notifiche, utenti, pagine legali, statistiche, export CSV |

Il primo amministratore è l'email indicata in `BOOTSTRAP_ADMIN_EMAILS` (`src/constants.ts`) e in `isAdmin()` di `firestore.rules`; gli altri si promuovono da **Amministrazione → Utenti**.

## Sviluppo

```bash
npm install
cp .env.example .env.local   # inserisci la configurazione Firebase
npm run dev                  # http://localhost:3000/grest_oppeano/
```

### Con gli emulatori Firebase (nessun progetto reale necessario)

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-grest
VITE_USE_EMULATORS=true VITE_FIREBASE_API_KEY=demo VITE_FIREBASE_PROJECT_ID=demo-grest npm run dev
```

Le regole in `firestore.rules` vengono caricate automaticamente dall'emulatore (vedi `firebase.json`).

## Deploy

- **App:** il workflow `.github/workflows/jekyll-gh-pages.yml` compila e pubblica su GitHub Pages a ogni push su `main`. Le variabili `VITE_FIREBASE_*` vanno impostate come *secrets* del repository.
- **Regole Firestore:** vanno pubblicate a parte, dopo ogni modifica:

```bash
npx firebase-tools deploy --only firestore:rules --project <id-progetto>
```

- In Firebase Console → Authentication abilita i provider **Email/password** e **Google**, e aggiungi il dominio GitHub Pages tra i domini autorizzati.

## Struttura

```
src/
  App.tsx              shell: header, navigazione, routing (#/…), modali globali
  firebase.ts          inizializzazione Firebase, emulatori, creazione account da admin
  hooks/               sessione, dati realtime, routing hash
  lib/                 azioni Firestore, utilità (date, CSV, errori)
  components/          UI condivisa, toast/conferme, form iscrizione, modali account
  views/               Home, Iscrizioni, Profilo, Notifiche, Legale
  views/staff/         presenze e elenco bambini (animatori + admin)
  views/admin/         pannello di amministrazione
```
