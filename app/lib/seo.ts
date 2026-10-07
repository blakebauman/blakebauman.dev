import { resumeData } from '../chat/data';
import type { CaseStudy } from '../content/case-studies';

/**
 * Page metadata and the schema.org entity graph.
 *
 * Every page used to inherit one hardcoded head from root.tsx: the home URL as
 * canonical, the home description, `og:type=website`. Route meta was appended
 * after it rather than replacing it, so a case study shipped two descriptions,
 * two og:types, and a canonical telling search engines it was a duplicate of
 * `/` — which is the one instruction guaranteed to keep it out of results.
 * Page-specific tags now come only from here, called by each route's `meta`.
 */

export const SITE_URL = resumeData.website.replace(/\/$/, '');

/** 1200×630, regenerated with `pnpm run og:image`. */
export const OG_IMAGE = {
  url: `${SITE_URL}/og.png`,
  width: 1200,
  height: 630,
  alt: `${resumeData.name}, ${resumeData.title}`,
};

/**
 * How this content may be used, per contentsignals.org. Sent as a header and
 * written into robots.txt. `ai-train=yes` is deliberate: the point of the site
 * is for models to know who this is, and a model that was never trained on the
 * record has only the other Blake Baumans to go on.
 */
export const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=yes';

/** Last substantive edit to the record, ISO date. Feeds sitemap and JSON-LD. */
export const RECORD_UPDATED = resumeData.updated;

export function absoluteUrl(path: string): string {
  if (path === '/' || path === '') return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The markdown twin of an HTML path: `/` → `/index.md`, `/work/x` → `/work/x.md`. */
export function markdownPath(path: string): string {
  return path === '/' || path === '' ? '/index.md' : `${path.replace(/\/$/, '')}.md`;
}

const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const PROFILE_ID = `${SITE_URL}/#profile`;

/** Every profile that is the same person. The more of these agree, the firmer the entity. */
export function sameAs(): string[] {
  const urls = [
    resumeData.linkedin,
    resumeData.github,
    resumeData.bluesky,
    ...(resumeData.profiles ?? []).map(p => p.url),
  ].filter((u): u is string => Boolean(u));
  return [...new Set(urls)];
}

/**
 * The one sentence that says which Blake Bauman this is. Answer engines lift
 * the first sentence of a source more than any other, so it names the person,
 * the role, the employer and the place together.
 */
export function identitySentence(): string {
  const current = resumeData.experience[0];
  const where = resumeData.location.replace(/^Remote,\s*/i, '');
  return `${resumeData.name} is a ${resumeData.title}${current ? ` at ${current.company}` : ''}, based in ${where}, who architects enterprise commerce and builds agent infrastructure.`;
}

function person() {
  const current = resumeData.experience[0];
  const region = resumeData.location.replace(/^Remote,\s*/i, '');
  const [givenName, ...rest] = resumeData.name.split(' ');
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: resumeData.name,
    givenName,
    familyName: rest.join(' '),
    url: `${SITE_URL}/`,
    image: resumeData.image ? absoluteUrl(resumeData.image) : OG_IMAGE.url,
    jobTitle: resumeData.title,
    description: identitySentence(),
    ...(current && {
      worksFor: {
        '@type': 'Organization',
        name: current.company,
        ...(current.company === 'Adobe' && { url: 'https://www.adobe.com' }),
      },
    }),
    address: {
      '@type': 'PostalAddress',
      addressRegion: region,
      addressCountry: 'US',
    },
    knowsAbout: resumeData.skills,
    sameAs: sameAs(),
    mainEntityOfPage: { '@id': PROFILE_ID },
  };
}

function website() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: resumeData.name,
    inLanguage: 'en',
    publisher: { '@id': PERSON_ID },
  };
}

/** Home: the person, the site, and the profile page that ties them together. */
export function homeGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      person(),
      website(),
      {
        '@type': 'ProfilePage',
        '@id': PROFILE_ID,
        url: `${SITE_URL}/`,
        name: `${resumeData.name} | ${resumeData.title}`,
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: { '@id': PERSON_ID },
        dateModified: RECORD_UPDATED,
      },
    ],
  };
}

/** A case study: an article by the person, about a piece of software. */
export function caseStudyGraph(study: CaseStudy) {
  const url = absoluteUrl(`/work/${study.slug}`);
  const language = study.meta.find(m => m.k === 'Language')?.v;
  const repo = study.links.find(l => l.href.includes('github.com'))?.href;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      person(),
      website(),
      {
        '@type': 'TechArticle',
        '@id': `${url}#article`,
        headline: study.name,
        description: study.oneLine,
        url,
        image: OG_IMAGE.url,
        inLanguage: 'en',
        dateModified: study.updated,
        author: { '@id': PERSON_ID },
        publisher: { '@id': PERSON_ID },
        isPartOf: { '@id': WEBSITE_ID },
        about: {
          '@type': 'SoftwareSourceCode',
          name: study.name,
          ...(repo && { codeRepository: repo }),
          ...(language && { programmingLanguage: language }),
          author: { '@id': PERSON_ID },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: resumeData.name, item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: study.name, item: url },
        ],
      },
    ],
  };
}

interface PageMetaInput {
  title: string;
  description: string;
  /** Site-relative path, e.g. `/` or `/work/felix`. */
  path: string;
  type: 'website' | 'profile' | 'article';
  jsonLd?: Record<string, unknown>;
}

/**
 * The full head for one page, as React Router meta descriptors. One of each
 * tag, self-canonical, with a markdown alternate for agents.
 */
export function pageMeta({ title, description, path, type, jsonLd }: PageMetaInput) {
  const url = absoluteUrl(path);
  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    {
      tagName: 'link',
      rel: 'alternate',
      type: 'text/markdown',
      href: absoluteUrl(markdownPath(path)),
    },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: resumeData.name },
    { property: 'og:image', content: OG_IMAGE.url },
    { property: 'og:image:width', content: String(OG_IMAGE.width) },
    { property: 'og:image:height', content: String(OG_IMAGE.height) },
    { property: 'og:image:alt', content: OG_IMAGE.alt },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: OG_IMAGE.url },
    ...(jsonLd ? [{ 'script:ld+json': jsonLd }] : []),
  ];
}
