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

import monoWoff2 from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2?url';
// Above-the-fold font cuts, imported as URLs so preloads point at the same
// hashed assets the app.css @font-face rules resolve to (Vite dedupes them).
import condBoldWoff2 from '@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-700-normal.woff2?url';
import serifWoff2 from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-normal.woff2?url';

const metaTitle = resumeData.hero
  ? `${resumeData.name} | ${resumeData.hero.headline}`
  : `${resumeData.name} | ${resumeData.title} @ ${resumeData.experience[0]?.company ?? 'Adobe'}`;
const firstSummary = resumeData.summary[0];
const metaDescription =
  (firstSummary ? firstSummary.slice(0, 155) + (firstSummary.length > 155 ? '...' : '') : null) ??
  `${resumeData.name} - ${resumeData.title}. Portfolio with AI-powered resume assistant.`;

// IBM Plex is self-hosted via @fontsource (see app.css @font-face imports).
// Latin subset only, 5 cuts: Serif 400 + 400i, Sans Condensed 600 + 700, Mono 500.
// Vite bundles the woff2 files into the build output, served same-origin.
export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
  // Preload above-the-fold fonts (body serif, heading condensed, label mono) so they
  // start downloading with the HTML instead of after the CSS is parsed.
  // Font preloads require crossOrigin even for same-origin requests.
  { rel: 'preload', href: serifWoff2, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  { rel: 'preload', href: condBoldWoff2, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  { rel: 'preload', href: monoWoff2, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Matches the Slate Mist ground / its dark counterpart in app.css. */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#E5E7EA" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#191B1D" />
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
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main
      className="flex min-h-screen w-full flex-col items-center justify-center"
      style={{ padding: 'clamp(48px, 6vw, 96px) var(--gutter)' }}
    >
      <div className="w-full max-w-2xl text-center">
        <div
          className="mb-6 inline-flex items-center gap-2"
          style={{
            font: '500 11px/1 var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.65,
          }}
        >
          <span
            style={{ width: 7, height: 7, background: 'var(--cordovan)', display: 'inline-block' }}
          />
          {message}
        </div>
        <h1
          className="mb-4"
          style={{
            font: '700 var(--h1)/1.05 var(--font-cond)',
            letterSpacing: '-0.012em',
          }}
        >
          {details}
        </h1>
        {stack && (
          <pre
            className="mb-8 w-full overflow-x-auto p-4 text-left"
            style={{
              font: '400 var(--body-sm)/1.55 var(--font-mono)',
              background: 'var(--plat-deep)',
              color: 'var(--inkpress)',
              opacity: 0.85,
            }}
          >
            <code>{stack}</code>
          </pre>
        )}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="/"
            className="inline-flex items-center justify-center"
            style={{
              padding: '13px 22px',
              background: 'var(--cordovan)',
              color: 'var(--plat)',
              font: '600 13px/1 var(--font-cond)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              borderBottom: 0,
            }}
          >
            Back to home
          </a>
          <a
            href={`mailto:${resumeData.email}?subject=Error%20on%20blakebauman.dev`}
            className="inline-flex items-center justify-center"
            style={{
              padding: '12px 21px',
              border: '1px solid var(--inkpress)',
              color: 'var(--inkpress)',
              font: '600 13px/1 var(--font-cond)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              borderBottom: '1px solid var(--inkpress)',
            }}
          >
            Report an issue
          </a>
        </div>
      </div>
    </main>
  );
}
