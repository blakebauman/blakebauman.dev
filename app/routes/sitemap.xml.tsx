import { LEAD_SLUGS } from '../content/case-studies';

const ORIGIN = 'https://blakebauman.com';

export function loader() {
  // Case-study routes are generated from the same list the home page ranks by,
  // so adding one to CASE_STUDIES puts it in the sitemap without a second edit.
  const urls = [
    { loc: ORIGIN, changefreq: 'weekly', priority: '1.0' },
    ...LEAD_SLUGS.map(slug => ({
      loc: `${ORIGIN}/work/${slug}`,
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
