import { CASE_STUDIES } from '../content/case-studies';
import { RECORD_UPDATED, SITE_URL } from '../lib/seo';

export function loader() {
  // Case-study routes are generated from the same list the home page ranks by,
  // so adding one to CASE_STUDIES puts it in the sitemap without a second edit.
  // lastmod is the only field search engines still weigh; changefreq and
  // priority are ignored by Google and kept only because they cost nothing.
  const urls = [
    { loc: `${SITE_URL}/`, lastmod: RECORD_UPDATED, changefreq: 'weekly', priority: '1.0' },
    ...CASE_STUDIES.map(study => ({
      loc: `${SITE_URL}/work/${study.slug}`,
      lastmod: study.updated,
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
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
