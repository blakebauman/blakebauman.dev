import { lazy, Suspense } from 'react';
import resumeData from '../chat/resume.json';
import { orderProjects, type Persona } from '../lib/persona';

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
  year?: string;
  status?: string;
  visibility?: 'public' | 'private';
}

export function Resume({ chatEnabled, persona, chatGreeting, suggestedPrompts }: ResumeProps) {
  // Filter to public projects only for display; private projects remain in JSON for vectorize/chatbot.
  // Reorder by the visitor's persona (signal-aware, deterministic) — falls back to canonical order.
  const projects = orderProjects(
    (resumeData.projects as ProjectEntry[]).filter(p => p.visibility !== 'private'),
    persona
  );
  const todayYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('en-US', { month: '2-digit', year: 'numeric' });
  // currentMonth -> "05/2026"; reformat to YYYY-MM
  const recStamp = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <>
      <nav className="bb-nav print:hidden" aria-label="Primary">
        <div className="bb-nav-inner">
          <a className="bb-nav-mark" href="#top">
            <span className="dot" aria-hidden="true" /> BLAKE BAUMAN
          </a>
          <div className="bb-nav-links">
            <a className="current" href="#position">
              <span className="mark" aria-hidden="true" /> Position
            </a>
            <a href="#record">
              <span className="mark" aria-hidden="true" /> Record
            </a>
            {chatEnabled && (
              <a href="#artifact">
                <span className="mark" aria-hidden="true" /> Artifact
              </a>
            )}
            <a href="#colophon">
              <span className="mark" aria-hidden="true" /> Colophon
            </a>
          </div>
        </div>
      </nav>

      <main className="bb-main">
        <header className="bb-masthead" id="top">
          <div className="bb-eyebrow">
            <span className="mark" aria-hidden="true" />
            <span className="num">01</span> · {resumeData.name} · Rec.{' '}
            {currentMonth.split('/').reverse().join('-')} · v0.1
          </div>
          <h1 className="name">{resumeData.name}</h1>
          <p className="subhead">{resumeData.copy.subhead}</p>
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
          <h2 id="position-label" className="bb-eyebrow">
            <span className="mark" aria-hidden="true" />
            <span className="num">02</span> · Position
          </h2>
          {resumeData.summary.map((paragraph, idx) => (
            <p key={paragraph.slice(0, 40)} className="lede" data-idx={idx}>
              {paragraph}
            </p>
          ))}
          <p className="footnote">{resumeData.copy.positionFootnote}</p>
        </section>

        <section className="bb-record" id="record" aria-labelledby="record-label">
          <div className="bb-eyebrow">
            <span className="mark" aria-hidden="true" />
            <span className="num">03</span> · Record
          </div>
          <h2 id="record-label">Record</h2>

          <div className="bb-group">
            <div className="bb-group-label">
              <span className="mark" aria-hidden="true" /> Roles
            </div>
            {resumeData.experience.map((exp, idx) => (
              <article
                key={`${exp.company}-${exp.role}-${exp.years}`}
                className={`bb-listing${idx === 0 ? ' first' : ''}`}
              >
                <div className="bb-listing-row">
                  <div className="year">
                    {exp.years.replace(/-/g, '–').replace(/Present/i, 'Present')}
                  </div>
                  <div className="body">
                    <div className="head">
                      <span className="role">{exp.role}</span>
                      <span className="at">at</span>
                      <span className="company">{exp.company}</span>
                      <span className={`status${idx === 0 ? ' active' : ''}`}>
                        {idx === 0 ? 'Active' : 'Filed'}
                      </span>
                    </div>
                    <p className="desc">{exp.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="bb-group">
            <div className="bb-group-label">
              <span className="mark dim" aria-hidden="true" /> Working artifacts · personal
            </div>
            {projects.map((project, idx) => {
              const isActive = (project.status ?? '').toLowerCase() === 'active';
              const year = project.year ?? '—';
              return (
                <article key={project.name} className={`bb-listing${idx === 0 ? ' first' : ''}`}>
                  <div className="bb-listing-row">
                    <div className="year">{year}</div>
                    <div className="body">
                      <div className="head">
                        <span className="role">{project.name}</span>
                        <span className={`status${isActive ? ' active' : ''}`}>
                          {project.status ?? 'Filed'}
                        </span>
                      </div>
                      {project.tech && project.tech.length > 0 && (
                        <div className="stack">
                          {project.tech.map(t => t.toUpperCase()).join(' · ')}
                        </div>
                      )}
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
                  <div className="stamp">Recognition · Rec. {item.year}</div>
                  <p className="title">{item.title}</p>
                  <p className="desc">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {chatEnabled && (
          <section className="bb-artifact" id="artifact" aria-labelledby="artifact-label">
            <div className="bb-eyebrow">
              <span className="mark" aria-hidden="true" />
              <span className="num">04</span> · Working artifact
            </div>
            <h2 id="artifact-label">{resumeData.copy.artifactHeading}</h2>
            <p className="frame-text">{resumeData.copy.artifactSubhead}</p>
            <div className="bb-chat-frame" role="region" aria-label="Resume chatbot demonstration">
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
                      opacity: 0.5,
                    }}
                  >
                    Loading the index…
                  </div>
                }
              >
                <Chatbot greeting={chatGreeting} suggestedPrompts={suggestedPrompts} />
              </Suspense>
            </div>
          </section>
        )}

        <section className="bb-colophon" id="colophon" aria-labelledby="colophon-label">
          <h2 id="colophon-label" className="bb-eyebrow">
            <span className="mark" aria-hidden="true" />
            <span className="num">05</span> · Colophon
          </h2>
          <div className="bb-colophon-grid">
            <div>
              <p>{resumeData.copy.colophon}</p>
            </div>
            <div className="cta">
              <a className="btn" href={`mailto:${resumeData.email}`}>
                Talk to me
              </a>
              <span className="secondary">
                Or find me on <a href={resumeData.github}>github</a>,{' '}
                <a href={resumeData.linkedin}>linkedin</a>
                {resumeData.bluesky && (
                  <>
                    , <a href={resumeData.bluesky}>bluesky</a>
                  </>
                )}
                .{' '}
                <button
                  type="button"
                  className="bb-print-btn print:hidden"
                  onClick={handlePrint}
                  style={{ marginLeft: 8 }}
                >
                  Print
                </button>
              </span>
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
    </>
  );
}
