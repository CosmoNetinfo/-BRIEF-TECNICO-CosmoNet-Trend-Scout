// CORS proxy per RSS da domini esterni
export const CORS_PROXY = 'https://api.allorigins.win/get?url=';

// Topic disponibili nell'app
export const TOPICS = [
  { id: 'ai',        label: 'Intelligenza Artificiale', color: 'violet' },
  { id: 'linux',     label: 'Linux',                    color: 'emerald' },
  { id: 'opensource',label: 'Open Source',              color: 'sky' },
  { id: 'gaming',    label: 'Gaming',                   color: 'amber' },
  { id: 'wordpress', label: 'WordPress',                color: 'blue' },
];

// RSS feeds per topic
// Sono URL pubblici, tutti disponibili via CORS proxy
export const RSS_FEEDS = {
  ai: [
    'https://feeds.feedburner.com/venturebeat/SZYF',                     // VentureBeat AI
    'https://www.artificialintelligence-news.com/feed/',                  // AI News
    'https://intelligenzaartificialeitalia.net/feed/',                    // ITA
    'https://www.wired.it/feed/rss',                                      // Wired IT
    'https://news.google.com/rss/search?q=intelligenza+artificiale&hl=it&gl=IT&ceid=IT:it', // Google News ITA
    'https://news.google.com/rss/search?q=AI+LLM+2026&hl=it&gl=IT&ceid=IT:it',
  ],
  linux: [
    'https://www.omgubuntu.co.uk/feed',
    'https://9to5linux.com/feed',
    'https://www.phoronix.com/rss.php',
    'https://linux.it/feed/',                                             // ITA
    'https://news.google.com/rss/search?q=linux+2026&hl=it&gl=IT&ceid=IT:it',
  ],
  opensource: [
    'https://opensource.com/feed',
    'https://www.linuxjournal.com/node/feed',
    'https://news.google.com/rss/search?q=open+source+2026&hl=it&gl=IT&ceid=IT:it',
  ],
  gaming: [
    'https://www.hdblog.it/gaming/rss/',                                  // ITA
    'https://feeds.feedburner.com/ign/news',
    'https://www.eurogamer.net/?format=rss',
    'https://news.google.com/rss/search?q=gaming+pc+2026&hl=it&gl=IT&ceid=IT:it',
  ],
  wordpress: [
    'https://wordpress.org/news/feed/',
    'https://wptavern.com/feed',
    'https://torquemag.io/feed/',
    'https://news.google.com/rss/search?q=wordpress+2026&hl=it&gl=IT&ceid=IT:it',
  ],
};

// Subreddit per topic (API JSON nativa, no CORS proxy)
export const SUBREDDITS = {
  ai:         ['r/artificial', 'r/MachineLearning', 'r/LocalLLaMA'],
  linux:      ['r/linux', 'r/Ubuntu', 'r/linuxquestions'],
  opensource: ['r/opensource', 'r/programming'],
  gaming:     ['r/pcgaming', 'r/linux_gaming'],
  wordpress:  ['r/Wordpress'],
};

// Google Trends RSS Italia (non topic-specific, ma utile per volume)
export const TRENDS_RSS = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=IT';
