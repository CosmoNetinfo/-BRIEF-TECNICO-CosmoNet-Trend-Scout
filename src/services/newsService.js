import { CORS_PROXY, RSS_FEEDS, SUBREDDITS } from '../config/sources.js';

// Parser RSS generico (lavora con XML testuale)
function parseRSS(xmlText, sourceUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item'));

  return items.slice(0, 5).map(item => ({
    title:       item.querySelector('title')?.textContent?.trim() || '',
    link:        item.querySelector('link')?.textContent?.trim() || '',
    description: item.querySelector('description')?.textContent
                   ?.replace(/<[^>]*>/g, '')
                   ?.slice(0, 200)
                   ?.trim() || '',
    pubDate:     item.querySelector('pubDate')?.textContent?.trim() || '',
    source:      new URL(sourceUrl).hostname.replace('www.', ''),
  })).filter(item => item.title.length > 5);
}

// Fetch singolo RSS via CORS proxy
async function fetchRSS(url) {
  try {
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return parseRSS(data.contents || '', url);
  } catch {
    return []; // sempre graceful, mai bloccare
  }
}

// Fetch subreddit (API JSON nativa, CORS ok)
async function fetchSubreddit(subreddit) {
  try {
    const name = subreddit.replace('r/', '');
    const res = await fetch(
      `https://www.reddit.com/r/${name}/hot.json?limit=5&t=week`,
      {
        headers: { 'User-Agent': 'CosmoNetTrendScout/1.0' },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.children || [])
      .filter(p => !p.data.stickied && p.data.score > 50)
      .slice(0, 3)
      .map(p => ({
        title:       p.data.title,
        link:        `https://reddit.com${p.data.permalink}`,
        description: p.data.selftext?.slice(0, 200) || '',
        pubDate:     new Date(p.data.created_utc * 1000).toUTCString(),
        source:      subreddit,
        score:       p.data.score,
      }));
  } catch {
    return [];
  }
}

// Funzione principale — raccoglie tutte le news per un topic
export async function fetchNewsForTopic(topicId) {
  const feeds = RSS_FEEDS[topicId] || [];
  const subreddits = SUBREDDITS[topicId] || [];

  const [rssResults, redditResults] = await Promise.all([
    Promise.all(feeds.map(url => fetchRSS(url))),
    Promise.all(subreddits.map(sub => fetchSubreddit(sub))),
  ]);

  const all = [...rssResults.flat(), ...redditResults.flat()];
  const seen = new Set();
  const deduped = all.filter(item => {
    const key = item.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 30);
}
