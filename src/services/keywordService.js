export async function fetchTrendingKeywords(topic, siteUrl = 'cosmonet.info') {
  const apiKey = import.meta.env.VITE_SERPER_API_KEY;

  if (!apiKey || apiKey.includes('xxxxxxxxxx')) return { keywords: [], peopleAlsoAsk: [] };

  const queries = [
    topic,
    `${topic} 2026`,
    `${topic} novità`,
    `migliore ${topic}`,
  ];

  const keywords = new Set();
  const peopleAlsoAsk = [];

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: queries[0],
        gl: 'it',
        hl: 'it',
        num: 10,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { keywords: [], peopleAlsoAsk: [] };

    const data = await res.json();

    (data.relatedSearches || []).forEach(r => {
      if (r.query) keywords.add(r.query);
    });

    (data.peopleAlsoAsk || []).forEach(q => {
      if (q.question) {
        peopleAlsoAsk.push(q.question);
        keywords.add(q.question.toLowerCase().replace(/[?!]/g, '').trim());
      }
    });

    (data.organic || []).slice(0, 5).forEach(r => {
      if (r.title) {
        const words = r.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        words.forEach(w => keywords.add(w));
      }
    });

  } catch {
    // Fallback
  }

  return {
    keywords: Array.from(keywords).slice(0, 20),
    peopleAlsoAsk: peopleAlsoAsk.slice(0, 8),
  };
}
