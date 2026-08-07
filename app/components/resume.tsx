import { lazy, Suspense, useMemo } from 'react';
import resumeData from '../chat/resume.json';
import { orderProjects, type Persona } from '../lib/persona';
import { useCurrentSection } from './section-index';

const Chatbot = lazy(() => import('./chatbot'));

interface ResumeProps {
  chatEnabled: boolean;
  persona: Persona;
  chatGreeting: string;
  suggestedPrompts: string[];
}

function handlePrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

interface ProjectEntry {
  name: string;
  description: string;
  context?: string;
  tech: string[];
  github?: string;
  website?: string;
  year?: string;
  status?: string;
  visibility?: 'public' | 'private';
}

// Project name -> external site, for linkifying project mentions in the hero subhead.
const PROJECT_SITES = new Map<string, string>(
  (resumeData.projects as ProjectEntry[]).flatMap(p =>
    p.website ? [[p.name.toLowerCase(), p.website] as [string, string]] : []
  )
);

const PROJECT_MENTION = new RegExp(`\\b(${[...PROJECT_SITES.keys()].join('|')})\\b`, 'gi');

function linkifyProjectMentions(text: string) {
  if (PROJECT_SITES.size === 0) return text;
  return text.split(PROJECT_MENTION).map((part, index) => {
    const site = PROJECT_SITES.get(part.toLowerCase());
    return site ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: static text, parts never reorder
      <a key={index} href={site} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    );
  });
}

export function Resume({ chatEnabled, persona, chatGreeting, suggestedPrompts }: ResumeProps) {
  // Filter to public projects only for display; private projects remain in JSON for vectorize/chatbot.
  // Reorder by the visitor's persona (signal-aware, deterministic) — falls back to canonical order.
  const projects = orderProjects(
    (resumeData.projects as ProjectEntry[]).filter(p => p.visibility !== 'private'),
    persona
  );
  const todayYear = new Date().getFullYear();
  const recStamp = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const filedMonth = recStamp.slice(0, 7);

  // The document index. Numbers live here and only here — they do navigational
  // work in the rail rather than sitting as an eyebrow above every heading.
  const sections = useMemo(
    () => [
      { id: 'top', num: '01', label: 'Masthead' },
      { id: 'position', num: '02', label: 'Position' },
      { id: 'record', num: '03', label: 'Record' },
      ...(chatEnabled ? [{ id: 'artifact', num: '04', label: 'Artifact' }] : []),
      { id: 'colophon', num: chatEnabled ? '05' : '04', label: 'Colophon' },
    ],
    [chatEnabled]
  );
  const sectionIds = useMemo(() => sections.map(s => s.id), [sections]);
  const current = useCurrentSection(sectionIds, 'top');

  const entryCount = resumeData.experience.length + projects.length;

  return (
    <div className="bb-shell">
      <aside className="bb-rail print:hidden">
        <a className="bb-rail-mark" href="#top">
          <span className="dot" aria-hidden="true" /> Blake Bauman
        </a>

        <nav className="bb-rail-index" aria-label="Document sections">
          <ol>
            {sections.map(section => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={current === section.id ? 'current' : undefined}
                  aria-current={current === section.id ? 'location' : undefined}
                >
                  <span className="num" aria-hidden="true">
                    {section.num}
                  </span>
                  <span className="mark" aria-hidden="true" />
                  <span className="label">{section.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="bb-rail-foot">
          <span>Rec. {recStamp}</span>
          <span>Lot 0042</span>
        </div>
      </aside>

      <main className="bb-doc">
        <header className="bb-masthead" id="top">
          <div className="strip">
            <span className="mark" aria-hidden="true" />
            <span>{resumeData.name}</span>
            <span aria-hidden="true">·</span>
            <span>Filed {filedMonth}</span>
            <span aria-hidden="true">·</span>
            <span>v0.1</span>
          </div>

          <div className="name-block">
            <h1 className="name">{resumeData.name}</h1>
            <p className="subhead">{linkifyProjectMentions(resumeData.copy.subhead)}</p>
          </div>

          <dl className="bb-masthead-meta">
            <dt>Based</dt>
            <dd>{resumeData.location}</dd>
            <dt>Contact</dt>
            <dd>
              <a href={`mailto:${resumeData.email}`}>{resumeData.email}</a>
            </dd>
            <dt>Elsewhere</dt>
            <dd>
              <a href={resumeData.github}>github</a> · <a href={resumeData.linkedin}>linkedin</a>
              {resumeData.bluesky && (
                <>
                  {' · '}
                  <a href={resumeData.bluesky}>bluesky</a>
                </>
              )}
            </dd>
          </dl>
        </header>

        <section className="bb-position" id="position" aria-labelledby="position-label">
          <div className="bb-sec-head">
            <h2 id="position-label">Position</h2>
          </div>
          <div className="body-grid">
            <div className="lede-set">
              {resumeData.summary.map(paragraph => (
                <p key={paragraph.slice(0, 40)} className="lede">
                  {paragraph}
                </p>
              ))}
            </div>
            <p className="footnote">{resumeData.copy.positionFootnote}</p>
          </div>
        </section>

        <section className="bb-record" id="record" aria-labelledby="record-label">
          <div className="bb-sec-head">
            <h2 id="record-label">Record</h2>
            <span className="stamp">{entryCount} entries</span>
          </div>

          <div className="bb-group">
            <div className="bb-group-label">
              <span className="mark" aria-hidden="true" /> Roles
            </div>
            <div className="bb-ledger-head" aria-hidden="true">
              <span>Term</span>
              <span>Role</span>
              <span>Party</span>
              <span>Status</span>
            </div>
            {resumeData.experience.map((exp, idx) => (
              <article key={`${exp.company}-${exp.role}-${exp.years}`} className="bb-listing">
                <div className="year">{exp.years.replace(/-/g, '–')}</div>
                <div className="title">
                  <span className="role">{exp.role}</span>
                </div>
                <div className="meta">
                  <span className="company">{exp.company}</span>
                </div>
                <div className="status-cell">
                  <span className={`status${idx === 0 ? ' active' : ''}`}>
                    {idx === 0 ? 'Active' : 'Filed'}
                  </span>
                </div>
                <div className="detail">
                  <p className="desc">{exp.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="bb-group">
            <div className="bb-group-label">
              <span className="mark dim" aria-hidden="true" /> Working artifacts · personal
            </div>
            <div className="bb-ledger-head" aria-hidden="true">
              <span>Term</span>
              <span>Entry</span>
              <span>Stack</span>
              <span>Status</span>
            </div>
            {projects.map(project => {
              const isActive = (project.status ?? '').toLowerCase() === 'active';
              return (
                <article key={project.name} className="bb-listing">
                  <div className="year">{project.year ?? '—'}</div>
                  <div className="title">
                    <span className="role">{project.name}</span>
                  </div>
                  <div className="meta">
                    {project.tech && project.tech.length > 0 && (
                      <span className="stack">
                        {project.tech.map(t => t.toUpperCase()).join(' · ')}
                      </span>
                    )}
                  </div>
                  <div className="status-cell">
                    <span className={`status${isActive ? ' active' : ''}`}>
                      {project.status ?? 'Filed'}
                    </span>
                  </div>
                  <div className="detail">
                    <p className="desc">
                      {project.description}
                      {project.context ? ` ${project.context}` : ''}
                    </p>
                    {project.github && (
                      <div className="repo">
                        <a href={project.github} rel="noopener noreferrer">
                          {project.github.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {resumeData.recognition && resumeData.recognition.length > 0 && (
            <div className="bb-group">
              <div className="bb-group-label">
                <span className="mark dim" aria-hidden="true" /> Recognition
              </div>
              {resumeData.recognition.map(item => (
                <div key={item.title} className="bb-rec-block">
                  <div className="stamp">Rec. {item.year}</div>
                  <p className="title">{item.title}</p>
                  <p className="desc">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {chatEnabled && (
          <section className="bb-artifact" id="artifact" aria-labelledby="artifact-label">
            <div className="bb-sec-head">
              <h2 id="artifact-label">{resumeData.copy.artifactHeading}</h2>
              <span className="stamp">Live</span>
            </div>

            <div className="bb-artifact-grid">
              <div className="bb-artifact-aside">
                <p className="frame-text">{resumeData.copy.artifactSubhead}</p>
                <ul className="notes">
                  <li>
                    <span className="mark" aria-hidden="true" />
                    Retrieval over the same record you are reading
                  </li>
                  <li>
                    <span className="mark" aria-hidden="true" />
                    Workers AI · Vectorize · streamed from the edge
                  </li>
                  <li>
                    <span className="mark" aria-hidden="true" />
                    Off-topic questions are declined, not improvised
                  </li>
                </ul>
              </div>

              <div className="bb-chat-frame" role="region" aria-label="Resume chatbot">
                <Suspense
                  fallback={
                    <div
                      style={{
                        minHeight: 240,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        font: '500 11px/1 var(--font-mono)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-soft)',
                      }}
                    >
                      Loading the index…
                    </div>
                  }
                >
                  <Chatbot greeting={chatGreeting} suggestedPrompts={suggestedPrompts} />
                </Suspense>
              </div>
            </div>
          </section>
        )}

        <section className="bb-colophon" id="colophon" aria-labelledby="colophon-label">
          <div className="bb-sec-head">
            <h2 id="colophon-label">Colophon</h2>
            <span className="stamp">v0.1</span>
          </div>
          <div className="bb-colophon-grid">
            <div>
              <p>{resumeData.copy.colophon}</p>
            </div>
            <div className="cta">
              <a className="btn" href={`mailto:${resumeData.email}`}>
                Talk to me
              </a>
              <p className="secondary">
                Or find me on <a href={resumeData.github}>github</a>,{' '}
                <a href={resumeData.linkedin}>linkedin</a>
                {resumeData.bluesky && (
                  <>
                    , <a href={resumeData.bluesky}>bluesky</a>
                  </>
                )}
                .
              </p>
              <button type="button" className="bb-print-btn print:hidden" onClick={handlePrint}>
                Print this record
              </button>
            </div>
          </div>
        </section>

        <footer className="bb-stamps print:hidden">
          <div className="bb-stamps-row">
            <span>Rec. {recStamp} · v0.1</span>
            <span>Lot 0042</span>
            <span>Set in IBM Plex</span>
            <span>
              © {todayYear} {resumeData.name}
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
