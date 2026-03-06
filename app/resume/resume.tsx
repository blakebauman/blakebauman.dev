import { lazy, Suspense } from 'react';
import resumeData from '../chat/resume.json';
import { PoweredByTooltip } from './powered-by-tooltip';

// Lazy load the chatbot since it's not part of the initial viewport
const Chatbot = lazy(() => import('./chatbot'));

function scrollToChat() {
  document.getElementById('ai-agent-section')?.scrollIntoView({ behavior: 'smooth' });
}

interface ResumeProps {
  chatEnabled: boolean;
}

export function Resume({ chatEnabled }: ResumeProps) {
  return (
    <main className="w-full min-h-screen">
      {/* Floating CTA - hidden when printing or chat disabled */}
      {chatEnabled && (
        <a
          href="#ai-agent-section"
          onClick={e => {
            e.preventDefault();
            scrollToChat();
          }}
          className="print:hidden fixed bottom-6 right-6 z-50 bg-red-500 text-white dark:text-zinc-950 px-4 py-2 font-semibold shadow-lg hover:bg-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          aria-label="Scroll to chat with Blake's AI assistant"
        >
          Ask about Blake
        </a>
      )}
      <div className="w-full max-w-[2000px] mx-auto px-[5vw] py-fluid-lg flex flex-col gap-fluid-xl">
        {/* Priority content - above the fold */}
        <header className="flex flex-col">
          <div className="gap-0 section-padding flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              {resumeData.hero ? (
                <>
                  <h1 className="text-fluid-5xl mb-4">{resumeData.hero.headline}</h1>
                  <p className="text-fluid-2xl text-zinc-700 dark:text-zinc-400 mb-2">
                    {resumeData.hero.subheadline}
                  </p>
                  <p className="text-fluid-lg text-zinc-700 dark:text-zinc-500">
                    {resumeData.name} · {resumeData.location}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-fluid-5xl mb-4">{resumeData.name}</h1>
                  <p className="text-fluid-2xl text-zinc-700 dark:text-zinc-400 mb-2">
                    {resumeData.title} @ {resumeData.experience[0]?.company ?? 'Adobe'}
                  </p>
                  <p className="text-fluid-lg text-zinc-700 dark:text-zinc-500">
                    {resumeData.location}
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden mt-4 md:mt-0 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Print Resume
            </button>
          </div>
        </header>
        <div className="w-full space-y-fluid-lg">
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />
          <section className="mb-8 section-padding">
            <h2 className="text-fluid-2xl">Who?</h2>
            {resumeData.summary.map(paragraph => (
              <p
                key={paragraph.slice(0, 40)}
                className="text-fluid-base text-zinc-700 dark:text-zinc-400 mt-8"
              >
                {paragraph}
              </p>
            ))}
          </section>
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />
          {chatEnabled && (
            <section
              id="ai-agent-section"
              className="mb-4 section-padding scroll-mt-8 print:hidden"
            >
              <div className="flex items-center mb-4">
                <h2 className="text-fluid-2xl">AI Agent</h2>
                <PoweredByTooltip />
              </div>
              <Suspense
                fallback={<div className="h-64 animate-pulse bg-zinc-100 dark:bg-zinc-800" />}
              >
                <Chatbot />
              </Suspense>
            </section>
          )}
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />

          {/* Defer loading of content below the fold */}
          <Suspense fallback={<div className="h-64 animate-pulse bg-zinc-100 dark:bg-zinc-800" />}>
            <section className="mb-4 section-padding">
              <h2 className="text-fluid-2xl mb-8">Experience</h2>
              <ol className="relative border-s border-zinc-200 dark:border-zinc-700 mb-8">
                {resumeData.experience.map((exp, index) => (
                  <li
                    key={`${exp.company}-${exp.role}-${index}`}
                    className={index < resumeData.experience.length - 1 ? 'mb-10 ms-4' : 'ms-4'}
                  >
                    <div className="absolute w-3 h-3 bg-zinc-200 mt-1.5 -start-1.5 border border-white dark:border-red-900 dark:bg-red-400" />
                    <time className="mb-1 text-fluid-sm font-normal leading-none text-zinc-400 dark:text-zinc-500">
                      {exp.years}
                    </time>
                    <h3
                      className={`text-fluid-lg text-zinc-900 dark:text-white mt-2 mb-1 ${index === 0 ? 'font-semibold' : ''}`}
                    >
                      {exp.role} | {exp.company}
                    </h3>
                    <p
                      className={
                        index < resumeData.experience.length - 1
                          ? 'mb-4 text-fluid-base font-normal text-zinc-500 dark:text-zinc-400'
                          : 'text-fluid-base font-normal text-zinc-500 dark:text-zinc-500'
                      }
                    >
                      {exp.description}
                    </p>
                  </li>
                ))}
              </ol>
              <a href={resumeData.linkedin} className="text-red-400 text-fluid-base">
                View more on my LinkedIn Profile
              </a>
            </section>
            {resumeData.recognition && resumeData.recognition.length > 0 && (
              <>
                <hr className="border-t border-zinc-200 dark:border-zinc-700" />
                <section className="mb-4 section-padding">
                  <h2 className="text-fluid-2xl mb-8">Recognition</h2>
                  {resumeData.recognition.map(item => (
                    <div key={item.title} className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-fluid-lg font-semibold text-zinc-900 dark:text-white">
                          {item.title}
                        </h3>
                        <span className="text-fluid-sm text-zinc-500">{item.year}</span>
                      </div>
                      <p className="text-fluid-base text-zinc-600 dark:text-zinc-400 mt-2">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </section>
              </>
            )}
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 section-padding">
              <h2 className="text-fluid-2xl mb-8">Tools</h2>
              {Array.isArray(resumeData.tools) ? (
                <div className="flex flex-wrap gap-2">
                  {resumeData.tools.map(tool => (
                    <span
                      key={tool}
                      className="text-fluid-sm px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(resumeData.tools).map(([group, tools]) => (
                    <div key={group} className="p-5 border border-zinc-200 dark:border-zinc-700">
                      <h3 className="text-fluid-base font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0"
                          aria-hidden="true"
                        />
                        {group}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {tools.map(tool => (
                          <span
                            key={tool}
                            className="text-fluid-sm px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 section-padding">
              <h2 className="text-fluid-2xl mb-8">Exploring</h2>
              {Array.isArray(resumeData.exploring) ? (
                <div className="flex flex-wrap gap-2">
                  {resumeData.exploring.map(item => (
                    <span
                      key={item}
                      className="text-fluid-sm px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(resumeData.exploring).map(([group, items]) => (
                    <div key={group} className="p-5 border border-zinc-200 dark:border-zinc-700">
                      <h3 className="text-fluid-base font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0"
                          aria-hidden="true"
                        />
                        {group}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {items.map(item => (
                          <span
                            key={item}
                            className="text-fluid-sm px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 section-padding">
              <h2 className="text-fluid-2xl mb-8">Projects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {resumeData.projects.map(project => (
                  <a
                    key={project.name}
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border border-zinc-200 dark:border-zinc-700 hover:border-red-400 transition-colors"
                  >
                    <h3 className="text-fluid-lg font-semibold text-zinc-900 dark:text-white mb-2">
                      {project.name}
                    </h3>
                    <p className="text-fluid-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      {project.description}
                    </p>
                    {project.context && (
                      <p className="text-fluid-sm text-zinc-500 dark:text-zinc-500 mb-3 italic">
                        {project.context}
                      </p>
                    )}
                    {!project.context && <div className="mb-3" />}
                    <div className="flex flex-wrap gap-2">
                      {project.tech.map(t => (
                        <span key={t} className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800">
                          {t}
                        </span>
                      ))}
                    </div>
                  </a>
                ))}
              </div>
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 section-padding">
              <h2 className="text-fluid-2xl mb-8">Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-fluid-base">
                  Email:{' '}
                  <a href={`mailto:${resumeData.email}`} className="text-red-400">
                    {resumeData.email}
                  </a>
                </div>
                <div className="text-fluid-base">
                  Github:{' '}
                  <a
                    href={resumeData.github}
                    className="text-red-400"
                    rel="me"
                    aria-label="GitHub profile"
                  >
                    {resumeData.github.split('/').filter(Boolean).pop() ?? 'GitHub'}
                  </a>
                </div>
                <div className="text-fluid-base">
                  LinkedIn:{' '}
                  <a
                    href={resumeData.linkedin}
                    className="text-red-400"
                    rel="me"
                    aria-label="LinkedIn profile"
                  >
                    {resumeData.linkedin.split('/').filter(Boolean).pop() ?? 'LinkedIn'}
                  </a>
                </div>
              </div>
            </section>
          </Suspense>
        </div>
        <footer className="py-4 border-t border-zinc-200 dark:border-zinc-700 text-center section-padding">
          <p className="text-fluid-sm text-zinc-700 dark:text-zinc-700">
            &copy; {new Date().getFullYear()} {resumeData.name}. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
