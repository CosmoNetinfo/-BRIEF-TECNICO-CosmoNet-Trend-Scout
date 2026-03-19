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
 * Fetch ALL pages of posts for a given status from WordPress REST API.
 */
async function fetchWPPostsAllPages(status = 'publish') {
  const params = new URLSearchParams({
    status,
    per_page: '100',
    page: '1',
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
    
    const allPosts = [...posts];
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);

    // Fetch remaining pages concurrently
    if (totalPages > 1) {
      const pagePromises = [];
      for (let i = 2; i <= totalPages; i++) {
        const pageParams = new URLSearchParams(params);
        pageParams.set('page', i.toString());
        pagePromises.push(
          fetch(`${WP_BASE}/wp-json/wp/v2/posts?${pageParams}`, { headers: getAuthHeaders() })
            .then(r => r.ok ? r.json() : [])
        );
      }
      const pagesData = await Promise.all(pagePromises);
      for (const pageData of pagesData) {
        if (Array.isArray(pageData)) allPosts.push(...pageData);
      }
    }

    return allPosts.map(p => ({
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
    statuses.map(s => fetchWPPostsAllPages(s))
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
