const WP_BASE  = import.meta.env.VITE_WP_BASE_URL  || 'https://www.cosmonet.info';
const WP_USER  = import.meta.env.VITE_WP_USERNAME   || '';
const WP_PASS  = import.meta.env.VITE_WP_APP_PASSWORD || '';

// Build Basic Auth header from WordPress Application Password
function getAuthHeaders() {
  if (!WP_USER || !WP_PASS) return {};
  const token = btoa(`${WP_USER}:${WP_PASS}`);
  return { Authorization: `Basic ${token}` };
}

/**
 * Fetch posts from WordPress REST API with authentication.
 * Supports: publish, future (scheduled), draft
 */
async function fetchWPPosts(status = 'publish', perPage = 100, page = 1) {
  const params = new URLSearchParams({
    status,
    per_page: perPage,
    page,
    _fields: 'id,slug,title,date,modified,link,status,categories,excerpt',
    orderby: 'date',
    order: 'desc',
  });

  try {
    const res = await fetch(`${WP_BASE}/wp-json/wp/v2/posts?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const posts = await res.json();
    if (!Array.isArray(posts)) return [];

    return posts.map(p => ({
      wpId:      p.id,
      slug:      p.slug,
      title:     (p.title?.rendered || '')
        .replace(/&amp;/g, '&').replace(/&#8217;/g, "'").replace(/&#8211;/g, '–'),
      wpLink:    p.link,
      wpStatus:  p.status,   // 'publish' | 'future' | 'draft'
      date:      p.date,
      source:    'wordpress',
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch ALL WordPress posts across all relevant statuses.
 * With auth: gets publish + future (scheduled) + draft.
 * Without auth: gets publish only.
 */
export async function fetchWordPressPosts() {
  const isAuth = !!(WP_USER && WP_PASS);
  const statuses = isAuth ? ['publish', 'future', 'draft'] : ['publish'];

  const results = await Promise.allSettled(
    statuses.map(s => fetchWPPosts(s, 100))
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
