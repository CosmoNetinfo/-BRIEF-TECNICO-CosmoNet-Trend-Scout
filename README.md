# 🔭 CosmoNet Trend Scout

CosmoNet Trend Scout è un'applicazione web sviluppata per la redazione di [CosmoNet.info](https://www.cosmonet.info). Automatizza la ricerca di notizie di tendenza, l'analisi delle keyword e la generazione di idee per articoli sfruttando l'Intelligenza Artificiale.

## ✨ Funzionalità Principali

*   **Ricerca Trend:** Recupera le notizie più recenti e rilevanti in base a vari settori (AI, Linux, Windows, Gaming, WordPress, ecc.) tramite web scraping / API.
*   **Analisi Keyword (Serper):** Trova parole chiave di tendenza e domande correlate ("People Also Ask") per ottimizzare il posizionamento SEO degli articoli.
*   **Ideazione con AI (Groq):** Genera automaticamente titoli accattivanti, keyword principali, difficulty e tipologia di articolo suggerito (News, Guida, Opinione).
*   **Piano Editoriale:** Salva le idee in un database e permette di gestirne la pubblicazione.
*   **Sincronizzazione WordPress:** Si collega direttamente alla REST API di WordPress per leggere in tempo reale gli articoli "Pubblicati" e "Programmati", mostrando i conteggi esatti e i link diretti ai post sul blog.
*   **Autenticazione Sicura:** Protetto da Firebase Authentication (accesso tramite Email e Password) per garantire che solo la redazione possa visualizzare i dati e le chiavi API.

## 🛠️ Stack Tecnologico

*   **Frontend:** React (Vite), Tailwind CSS, Lucide React (Icone)
*   **Backend & DB:** Firebase (Firestore per i dati, Authentication per il login)
*   **AI & Ricerca:** Groq API (LLM super veloce), Serper API (Dati di Google Search)
*   **Integrazioni:** WordPress REST API (con Application Password)
*   **Deploy:** GitHub Pages (via GitHub Actions)

## 🚀 Setup Locale

1. **Clona il repository:**
   ```bash
   git clone <URL_DEL_REPO>
   cd trend-scout
   ```

2. **Installa le dipendenze:**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente:**
   Duplica il file `.env.example` e rinominalo in `.env`, inserendo tutte le chiavi necessarie:
   ```env
   # AI & Search
   VITE_GROQ_API_KEY=tua_chiave_groq
   VITE_SERPER_API_KEY=tua_chiave_serper

   # Firebase Setup
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...

   # WordPress
   VITE_WP_BASE_URL=https://www.cosmonet.info
   VITE_WP_USERNAME=tuo_username
   VITE_WP_APP_PASSWORD=tua_application_password
   ```

4. **Avvia il server di sviluppo:**
   ```bash
   npm run dev
   ```
   L'applicazione sarà su `http://localhost:5173`.

## 🔒 Sicurezza e WordPress
Per poter leggere anche gli articoli **Programmati** e in **Bozza**, l'app utilizza l'autenticazione tramite *Application Passwords* di WordPress (`VITE_WP_APP_PASSWORD`).
Su GitHub, queste variabili devono essere inserite all'interno dei **Repository Secrets** e richiamate nel file di workflow `.github/workflows/deploy.yml` affinché il deploy funzioni correttamente.

---
*Progetto a uso interno per CosmoNet.info*
