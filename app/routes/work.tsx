import { Link } from 'react-router';
import resumeData from '../chat/resume.json';
import { type CaseStudySection, caseStudyFor } from '../content/case-studies';
import type { Route } from './+types/work';

// The case studies are static module content, including hand-authored SVG. A
// loader return value has to survive serialisation, so only the slug crosses
// that boundary and the component resolves the study itself.
export function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug ?? '';
  if (!caseStudyFor(slug)) {
    throw new Response('Not found', { status: 404 });
  }
  return { slug };
}

export function meta({ data }: Route.MetaArgs) {
  const study = data?.slug ? caseStudyFor(data.slug) : undefined;
  if (!study) {
    return [{ title: 'Not found | Blake Bauman' }];
  }
  return [
    { title: `${study.name} | Blake Bauman` },
    { name: 'description', content: study.oneLine },
    { property: 'og:title', content: `${study.name} · ${resumeData.name}` },
    { property: 'og:description', content: study.oneLine },
    { property: 'og:type', content: 'article' },
  ];
}

function Section({ section }: { section: CaseStudySection }) {
  return (
    <section className="bb-cs-sec">
      <h2>{section.heading}</h2>

      {section.paragraphs?.map(p => (
        <p key={p.slice(0, 48)}>{p}</p>
      ))}

      {section.list && (
        <ul className="bb-cs-list">
          {section.list.map(item => (
            <li key={item.term}>
              <strong>{item.term}</strong> {item.detail}
            </li>
          ))}
        </ul>
      )}

      {section.figure && (
        <figure className="bb-figure">
          <div className="bb-figure-scroll">{section.figure.node}</div>
          <figcaption>{section.figure.caption}</figcaption>
        </figure>
      )}

      {section.code && (
        <div className="bb-code">
          <div className="bb-code-head">
            <span className="path">{section.code.path}</span>
            <span className="tag">{section.code.tag}</span>
          </div>
          <pre>
            <code>{section.code.lines}</code>
          </pre>
        </div>
      )}
    </section>
  );
}

export default function Work({ loaderData }: Route.ComponentProps) {
  const study = caseStudyFor(loaderData.slug);
  if (!study) return null;

  return (
    <div className="bb-shell">
      <header className="bb-top print:hidden">
        <div className="bb-wrap bb-top-in">
          <Link className="bb-top-name" to="/">
            {resumeData.name}
          </Link>
          <nav className="bb-top-nav" aria-label="Sections">
            <Link to="/#work">All work</Link>
            <Link to="/#ask">Ask the record</Link>
          </nav>
        </div>
      </header>

      <main>
        <div className="bb-wrap bb-cs-hero">
          <Link className="bb-back" to="/#work">
            ← The record
          </Link>
          <h1>{study.name}</h1>
          <p className="one-line">{study.oneLine}</p>

          <dl className="bb-cs-meta">
            {study.meta.map(m => (
              <div key={m.k}>
                <dt>{m.k}</dt>
                <dd>{m.v}</dd>
              </div>
            ))}
          </dl>

          <div className="bb-contact" style={{ marginTop: 26 }}>
            {study.links.map(l => (
              <a key={l.href} href={l.href} rel="noopener noreferrer">
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div className="bb-wrap bb-cs-body" style={{ paddingBottom: 'clamp(60px, 10vh, 120px)' }}>
          {study.sections.map(section => (
            <Section key={section.heading} section={section} />
          ))}

          <section className="bb-cs-sec">
            <h2>Ask about it</h2>
            <p>
              The assistant on the home page answers from this same record, and will tell you what
              is not on it.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
              <Link className="btn" to="/#ask">
                Ask the record
              </Link>
              <a className="btn-ghost" href={`mailto:${resumeData.email}`}>
                Talk to me
              </a>
            </div>
          </section>
        </div>
      </main>

      <footer className="bb-wrap bb-stamps">
        <div className="bb-stamps-row">
          <span>Set in Archivo and Literata</span>
          <span>Built on Cloudflare Workers</span>
          <span>
            © {new Date().getFullYear()} {resumeData.name}
          </span>
        </div>
      </footer>
    </div>
  );
}
