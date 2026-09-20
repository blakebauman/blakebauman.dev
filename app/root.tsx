import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
import resumeData from './chat/resume.json';
import './app.css';

// Above-the-fold font cuts, imported as URLs so preloads point at the same
// hashed assets the app.css @font-face rules resolve to (Vite dedupes them).
// Two variable files cover the whole type system above the fold: Archivo
// carries every weight and width, Literata every optical size.
import displayWoff2 from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';
import bodyWoff2 from '@fontsource-variable/literata/files/literata-latin-opsz-normal.woff2?url';

const metaTitle = resumeData.hero
  ? `${resumeData.name} | ${resumeData.hero.headline}`
  : `${resumeData.name} | ${resumeData.title} @ ${resumeData.experience[0]?.company ?? 'Adobe'}`;
const firstSummary = resumeData.summary[0];
const metaDescription =
  (firstSummary ? firstSummary.slice(0, 155) + (firstSummary.length > 155 ? '...' : '') : null) ??
  `${resumeData.name} - ${resumeData.title}. Portfolio with AI-powered resume assistant.`;

// Archivo (display, variable weight + width), Literata (body, variable optical
// size) and JetBrains Mono (code) are self-hosted via @fontsource (see the
// app.css @import rules). Vite bundles the woff2 files into the build output,
// served same-origin. Only the two above-the-fold faces are preloaded; the mono
// cut is below the fold on the home page and inside case studies.
export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
  // Preload above-the-fold fonts (body serif, heading condensed, label mono) so they
  // start downloading with the HTML instead of after the CSS is parsed.
  // Font preloads require crossOrigin even for same-origin requests.
  { rel: 'preload', href: displayWoff2, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  { rel: 'preload', href: bodyWoff2, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* One committed look regardless of scheme, so one theme-color. */}
        <meta name="theme-color" content="#040404" />
        <meta name="description" content={metaDescription} />

        {/* Open Graph */}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={resumeData.website} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={resumeData.name} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />

        {/* Canonical URL */}
        <link rel="canonical" href={resumeData.website} />

        {/* Performance-focused meta tags */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={resumeData.name} />

        {/* JSON-LD structured data for Person */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: resumeData.name,
              jobTitle: resumeData.title,
              worksFor: {
                '@type': 'Organization',
                name: resumeData.experience[0]?.company ?? 'Adobe',
              },
              url: resumeData.website,
              sameAs: [
                resumeData.linkedin,
                resumeData.github,
                ...(resumeData.bluesky ? [resumeData.bluesky] : []),
              ],
            }),
          }}
        />

        <Meta />
        <Links />
      </head>
      <body className="antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Error';
  let details = 'Something went wrong on this page.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : `Error ${error.status}`;
    details =
      error.status === 404 ? 'That page is not part of the record.' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="bb-shell">
      <header className="bb-top">
        <div className="bb-wrap bb-top-in">
          <a className="bb-top-name" href="/">
            {resumeData.name}
          </a>
        </div>
      </header>

      <main className="bb-wrap" style={{ paddingBlock: 'clamp(64px, 14vh, 150px)' }}>
        <p className="t-meta">{message}</p>
        <h1 className="t-display" style={{ marginTop: 18, maxWidth: '14ch' }}>
          {details}
        </h1>
        {stack && (
          <pre
            className="bb-code"
            style={{
              marginTop: 32,
              padding: 18,
              overflowX: 'auto',
              font: '400 12.5px/1.65 var(--font-mono)',
            }}
          >
            <code>{stack}</code>
          </pre>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 40 }}>
          <a className="btn" href="/">
            Back to the record
          </a>
          <a
            className="btn-ghost"
            href={`mailto:${resumeData.email}?subject=Error%20on%20blakebauman.com`}
          >
            Report this
          </a>
        </div>
      </main>

      <footer className="bb-wrap bb-stamps" style={{ marginTop: 'auto' }}>
        <div className="bb-stamps-row">
          <span>Set in Archivo and Literata</span>
          <span>
            © {new Date().getFullYear()} {resumeData.name}
          </span>
        </div>
      </footer>
    </div>
  );
}
