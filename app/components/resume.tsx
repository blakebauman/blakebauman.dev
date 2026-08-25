import { lazy, Suspense, useMemo } from 'react';
import resumeData from '../chat/resume.json';
import { LEAD_SLUGS, leadCopyFor } from '../content/case-studies';
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
  listed?: boolean;
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
  // Two independent reasons a project is not rendered: the repository is private,
  // or the entry is deliberately unlisted. Both stay in the JSON and stay indexed,
  // so the chatbot can still answer about them.
  const visible = (resumeData.projects as ProjectEntry[]).filter(
    p => p.visibility !== 'private' && p.listed !== false
  );

  // Scale is ranking. Three projects carry the page at display weight and link
  // to their own case study; everything else is a compact index line. The split
  // is deliberate rather than persona-ordered, so the claim the page makes does
  // not change depending on who is reading it.
  const lead = LEAD_SLUGS.map(slug => visible.find(p => p.name === slug)).filter(
    (p): p is ProjectEntry => Boolean(p)
  );
  const tail = orderProjects(
    visible.filter(p => !LEAD_SLUGS.includes(p.name)),
    persona
  );

  const todayYear = new Date().getFullYear();
  const sections = useMemo(
    () => [
      { id: 'top', label: 'Top' },
      { id: 'work', label: 'Work' },
      { id: 'position', label: 'Position' },
      { id: 'record', label: 'Record' },
      ...(chatEnabled ? [{ id: 'ask', label: 'Ask' }] : []),
      { id: 'colophon', label: 'Colophon' },
    ],
    [chatEnabled]
  );
  const sectionIds = useMemo(() => sections.map(s => s.id), [sections]);
  const current = useCurrentSection(sectionIds, 'top');

  return (
    <div className="bb-shell">
      <header className="bb-top print:hidden">
        <div className="bb-wrap bb-top-in">
          <a className="bb-top-name" href="#top">
            {resumeData.name}
          </a>
          <nav className="bb-top-nav" aria-label="Sections">
            {sections.map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={current === section.id ? 'current' : undefined}
                aria-current={current === section.id ? 'location' : undefined}
              >
                {section.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section className="bb-wrap bb-masthead" id="top">
          <div>
            {/* No eyebrow here: the subhead opens with the job title verbatim,
                so a label above the name was pure repetition. */}
            <h1>{resumeData.name}</h1>
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
        </section>

        <section className="bb-wrap bb-sec" id="work" aria-labelledby="work-label">
          <div className="bb-sec-head">
            <h2 id="work-label">The work</h2>
            <span className="rule" aria-hidden="true" />
            <span className="stamp">{lead.length} in depth</span>
          </div>

          <div className="bb-lead-list">
            {lead.map(project => (
              <a className="bb-lead" key={project.name} href={`/work/${project.name}`}>
                <span className="nm">{project.name}</span>
                <span className="go">Case study →</span>
                <span className="kind">{leadCopyFor(project.name)}</span>
              </a>
            ))}
          </div>

          <p className="bb-index-note">
            The rest of the record, in brief. Each links to its repository.
          </p>
          <div className="bb-index">
            {tail.map((project, i) => (
              <span key={project.name} style={{ display: 'contents' }}>
                {i > 0 && (
                  <span className="sep" aria-hidden="true">
                    ·
                  </span>
                )}
                <a href={project.github ?? project.website ?? '#'}>{project.name}</a>
              </span>
            ))}
          </div>
        </section>

        <section
          className="bb-wrap bb-sec bb-position"
          id="position"
          aria-labelledby="position-label"
        >
          <div className="bb-sec-head">
            <h2 id="position-label">Position</h2>
            <span className="rule" aria-hidden="true" />
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

        <section className="bb-wrap bb-sec bb-record" id="record" aria-labelledby="record-label">
          <div className="bb-sec-head">
            <h2 id="record-label">Record</h2>
            <span className="rule" aria-hidden="true" />
            <span className="stamp">{resumeData.experience.length} roles</span>
          </div>

          <div className="bb-roles">
            {resumeData.experience.map((exp, idx) => (
              <article key={`${exp.company}-${exp.role}-${exp.years}`} className="bb-role">
                <div className="term">{exp.years.replace(/-/g, '–')}</div>
                <div>
                  <h3 className="role">{exp.role}</h3>
                  <span className="company">{exp.company}</span>
                  <p className="desc">{exp.description}</p>
                </div>
                <div className="status-cell">
                  <span className={`status${idx === 0 ? ' active' : ''}`}>
                    {idx === 0 ? 'Current' : 'Filed'}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {resumeData.recognition && resumeData.recognition.length > 0 && (
            <div className="bb-rec">
              {resumeData.recognition.map(item => (
                <div key={item.title} className="bb-rec-block">
                  <div className="term">{item.year}</div>
                  <div>
                    <p className="title">{item.title}</p>
                    <p className="desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {chatEnabled && (
          <section className="bb-wrap bb-sec" id="ask" aria-labelledby="ask-label">
            <div className="bb-sec-head">
              <h2 id="ask-label">{resumeData.copy.artifactHeading}</h2>
              <span className="rule" aria-hidden="true" />
              <span className="stamp">Live</span>
            </div>

            <div className="bb-ask-grid">
              <div className="bb-ask-aside">
                <p className="frame-text">{resumeData.copy.artifactSubhead}</p>
                <ul className="notes">
                  <li>Retrieval over the same record you are reading</li>
                  <li>Workers AI and Vectorize, streamed from the edge</li>
                  <li>Off-topic questions are declined, not improvised</li>
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
                        font: '600 11px/1 var(--font-display)',
                        fontStretch: 'var(--w-meta)',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                      }}
                    >
                      Loading the index
                    </div>
                  }
                >
                  <Chatbot greeting={chatGreeting} suggestedPrompts={suggestedPrompts} />
                </Suspense>
              </div>
            </div>
          </section>
        )}

        <section className="bb-wrap bb-sec" id="colophon" aria-labelledby="colophon-label">
          <div className="bb-sec-head">
            <h2 id="colophon-label">Colophon</h2>
            <span className="rule" aria-hidden="true" />
          </div>
          <div className="bb-colophon-grid">
            <p>{resumeData.copy.colophon}</p>
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
              <button type="button" className="btn-ghost print:hidden" onClick={handlePrint}>
                Print this record
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bb-wrap bb-stamps">
        <div className="bb-stamps-row">
          <span>Set in Archivo and Literata</span>
          <span>Built on Cloudflare Workers</span>
          <span>
            © {todayYear} {resumeData.name}
          </span>
        </div>
      </footer>
    </div>
  );
}
