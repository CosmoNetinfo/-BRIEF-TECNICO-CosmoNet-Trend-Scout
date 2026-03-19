const WP_BASE = 'https://www.cosmonet.info/wp-json/wp/v2';

/**
 * Fetch posts from WordPress REST API.
 * Combines published (status=publish) and scheduled (status=future) posts.
 * Uses the public endpoint — no auth required for published posts.
 * For future/scheduled posts, the WP site needs to allow unauthenticated access
 * OR we pass credentials (app password). We attempt both statuses and merge.
 */
async function fetchWPPosts(status = 'publish', perPage = 50) {
  const params = new URLSearchParams({
    status,
    per_page: perPage,
    _fields: 'id,slug,title,date,modified,link,status,categories',
    orderby: 'date',
    order: 'desc',
  });

  const res = await fetch(`${WP_BASE}/posts?${params}`);
  if (!res.ok) return [];

  const posts = await res.json();
  return posts.map(p => ({
    wpId:       p.id,
    slug:       p.slug,
    title:      p.title.rendered.replace(/&amp;/g, '&').replace(/&#8217;/g, "'"),
    wpLink:     p.link,
    wpStatus:   p.status,   // 'publish' | 'future'
    date:       p.date,
    modifiedAt: p.modified,
    source:     'wordpress',
  }));
}

/**
 * Fetch both published and scheduled posts.
 * Scheduled posts may return 401 if the site doesn't expose them publicly.
 * In that case we still return published ones.
 */
export async function fetchWordPressPosts() {
  const [published, scheduled] = await Promise.allSettled([
    fetchWPPosts('publish', 50),
    fetchWPPosts('future', 50),
  ]);

  const result = [];
  if (published.status === 'fulfilled') result.push(...published.value);
  if (scheduled.status === 'fulfilled') result.push(...scheduled.value);

  return result;
}
