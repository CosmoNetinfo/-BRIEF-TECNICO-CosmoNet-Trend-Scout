const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

async function callGroq(messages, jsonMode = true) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || apiKey.includes('xxxxxxxxxxxxx')) throw new Error('VITE_GROQ_API_KEY mancante o non valida nel file .env');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq error ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!jsonMode) return content;

  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Risposta Groq non è JSON valido');
  }
}

export async function generateArticleIdeas({ news, keywords, peopleAlsoAsk, topic, siteContext }) {
  const newsContext = news.slice(0, 20).map((n, i) =>
    `${i + 1}. [${n.source}] "${n.title}"${n.description ? ` — ${n.description.slice(0, 100)}` : ''}`
  ).join('\n');

  const kwContext = keywords.length > 0
    ? keywords.join(', ')
    : 'Nessuna keyword disponibile — usa le tue conoscenze sul mercato italiano';

  const paaContext = peopleAlsoAsk.length > 0
    ? peopleAlsoAsk.map(q => `- ${q}`).join('\n')
    : 'Nessuna domanda disponibile';

  const prompt = `Sei un content strategist SEO italiano esperto di ${topic}.
Lavori per: ${siteContext}
Data attuale: ${new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}.

--- NEWS RECENTI DEL SETTORE ---
${newsContext}

--- KEYWORD PIÙ CERCATE DAGLI UTENTI ITALIANI ---
${kwContext}

--- DOMANDE REALI DEGLI UTENTI (Google "People Also Ask") ---
${paaContext}

Il tuo compito:
1. Analizza le news: identifica quali sono RILEVANTI e ATTUALI (non semplici ricicli di notizie vecchie)
2. Combina le news con le keyword: trova intersezioni dove c'è sia interesse attuale (news) sia domanda reale (keyword)
3. Genera 8 idee articolo CONCRETE per cosmonet.info

REGOLE IMPORTANTI:
- Titoli in italiano, naturali, non keyword-stuffed
- Ogni articolo deve avere una ragione URGENTE per essere scritto ORA
- Priorità ALTA = news fresca + keyword ad alto volume
- Priorità MEDIA = trend emergente o keyword interessante senza news urgente
- Priorità BASSA = evergreen utile ma non urgente
- Non includere articoli su eventi già ampiamente coperti da tutti

Restituisci ESCLUSIVAMENTE questo JSON:
{
  "articles": [
    {
      "title": "Titolo articolo in italiano",
      "keyword_principale": "parola chiave target principale",
      "keywords_secondarie": ["kw1", "kw2", "kw3"],
      "urgenza": "alta | media | bassa",
      "rationale": "Perché scrivere questo articolo ORA (max 2 righe)",
      "news_di_riferimento": "Titolo della news che ha ispirato l'idea (o null)",
      "tipo": "tutorial | news | guida | recensione | confronto | opinione",
      "stima_traffico": "alto | medio | basso"
    }
  ],
  "trending_keywords": [
    {
      "keyword": "parola chiave",
      "volume_stimato": "alto | medio | basso",
      "competizione": "alta | media | bassa",
      "opportunita": "Breve nota sull'opportunità per cosmonet.info"
    }
  ],
  "insight_editoriale": "Un consiglio strategico generale per cosmonet.info questa settimana (max 3 righe)"
}`;

  return callGroq([{ role: 'user', content: prompt }], true);
}

export async function analyzeManualBrief(text) {
  try {
    const prompt = `Analizza il seguente prompt/brief fornito dall'utente e stabilisci i metadati base per un articolo SEO.

TESTO DELL'UTENTE:
"${text}"

Estrai i seguenti dati e rispondi ESCLUSIVAMENTE con un JSON valido strutturato così:
{
  "title": "Un titolo SEO accattivante di max 60 caratteri (dedotto dal testo)",
  "kw": "keyword principale (1-3 parole)",
  "diff": "Bassa",
  "cat": "News"
}
Non inserire spiegazioni, solo il JSON.`;

    const res = await callGroq([{ role: 'user', content: prompt }], true);
    return res;
  } catch (error) {
    console.error('Groq manual brief error:', error);
    return {
      title: text.length > 60 ? text.substring(0, 60) + '...' : text,
      kw: '',
      diff: 'Media',
      cat: 'Generale'
    };
  }
}
