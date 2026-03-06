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

const metaTitle = resumeData.hero
  ? `${resumeData.name} | ${resumeData.hero.headline}`
  : `${resumeData.name} | ${resumeData.title} @ ${resumeData.experience[0]?.company ?? 'Adobe'}`;
const firstSummary = resumeData.summary[0];
const metaDescription =
  (firstSummary ? firstSummary.slice(0, 155) + (firstSummary.length > 155 ? '...' : '') : null) ??
  `${resumeData.name} - ${resumeData.title}. Portfolio with AI-powered resume assistant.`;

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#18181b" media="(prefers-color-scheme: dark)" />
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

        {/* Resource hints */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

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
    <main className="w-full min-h-screen flex flex-col items-center justify-center px-[5vw] py-fluid-lg bg-white dark:bg-zinc-950">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-fluid-5xl font-bold text-zinc-900 dark:text-white mb-2">{message}</h1>
        <p className="text-fluid-base text-zinc-600 dark:text-zinc-400 mb-6">{details}</p>
        {stack && (
          <pre className="w-full p-4 overflow-x-auto text-left text-fluid-sm text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 mb-6">
            <code>{stack}</code>
          </pre>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-red-500 text-white dark:text-zinc-950 font-semibold hover:bg-red-600 transition-colors text-fluid-base"
          >
            Back to home
          </a>
          <a
            href={`mailto:${resumeData.email}?subject=Error%20on%20blakebauman.dev`}
            className="inline-flex items-center justify-center px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-fluid-base"
          >
            Report an issue
          </a>
        </div>
      </div>
    </main>
  );
}
