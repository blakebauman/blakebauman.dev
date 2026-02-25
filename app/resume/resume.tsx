import { lazy, Suspense } from 'react';
import resumeData from '../chat/resume.json';

// Lazy load the chatbot since it's not part of the initial viewport
const Chatbot = lazy(() => import('./chatbot'));

function scrollToChat() {
  document.getElementById('ai-agent-section')?.scrollIntoView({ behavior: 'smooth' });
}

export function Resume() {
  return (
    <main className="flex justify-left pt-16 p-8 max-w-screen-lg">
      {/* Floating CTA - hidden when printing */}
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
      <div className="flex-1 flex flex-col gap-8 min-h-0">
        {/* Priority content - above the fold */}
        <header className="flex flex-col">
          <div className="gap-0 md:p-8 flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-5xl mb-4">{resumeData.name}</h1>
              <p className="text-2xl text-zinc-700 dark:text-zinc-400 mb-2">
                {resumeData.title} @ {resumeData.experience[0]?.company ?? 'Adobe'}
              </p>
              <p className="text-lg text-zinc-700 dark:text-zinc-500">{resumeData.location}</p>
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
        <div className="w-full space-y-6">
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />
          <section className="mb-8 md:p-8">
            <h2 className="text-2xl">Who?</h2>
            <p className="text-zinc-700 dark:text-zinc-400 mt-8">
              Innovative and results-driven software engineer with a strong background in enterprise
              e-commerce, cloud architecture, and scalable software solutions. Proven experience
              leading complex Adobe Commerce implementations, integrating cutting-edge technologies,
              and mentoring high-performing teams.
            </p>
            <p className="text-zinc-700 dark:text-zinc-400 mt-8">
              Now seeking to transition from consulting to product development, with a focus on AI,
              machine learning, and large language models (LLMs). Eager to apply my expertise in
              building scalable systems while deepening my knowledge in AI-driven product
              innovation. Looking for an opportunity to contribute to the full product lifecycle,
              drive technical excellence, and help shape intelligent, data-driven solutions.
            </p>
          </section>
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />

          {/* Defer loading of content below the fold */}
          <Suspense fallback={<div className="h-64 animate-pulse bg-zinc-100 dark:bg-zinc-800" />}>
            <section className="mb-4 md:p-8">
              <h2 className="text-2xl mb-8">Experience</h2>
              <ol className="relative border-s border-zinc-200 dark:border-zinc-700 mb-8">
                {resumeData.experience.map((exp, index) => (
                  <li
                    key={`${exp.company}-${exp.role}-${index}`}
                    className={index < resumeData.experience.length - 1 ? 'mb-10 ms-4' : 'ms-4'}
                  >
                    <div className="absolute w-3 h-3 bg-zinc-200 mt-1.5 -start-1.5 border border-white dark:border-red-900 dark:bg-red-400" />
                    <time className="mb-1 text-sm font-normal leading-none text-zinc-400 dark:text-zinc-500">
                      {exp.years}
                    </time>
                    <h3
                      className={`text-lg text-zinc-900 dark:text-white mt-2 mb-1 ${index === 0 ? 'font-semibold' : ''}`}
                    >
                      {exp.role} | {exp.company}
                    </h3>
                    <p
                      className={
                        index < resumeData.experience.length - 1
                          ? 'mb-4 text-base font-normal text-zinc-500 dark:text-zinc-400'
                          : 'text-base font-normal text-zinc-500 dark:text-zinc-500'
                      }
                    >
                      {exp.description}
                    </p>
                  </li>
                ))}
              </ol>
              <a href={resumeData.linkedin} className="text-red-400">
                View more on my LinkedIn Profile
              </a>
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 md:p-8">
              <h2 className="text-2xl">Tools</h2>
              <p className="text-zinc-700 dark:text-zinc-500 mb-8">
                I appreciate all things. Here are some things I{"'"}m currently using.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {resumeData.tools.map(tool => (
                  <div key={tool}>{tool}</div>
                ))}
              </div>
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <blockquote className="text-center text-2xl md:p-8 text-zinc-900 italic dark:text-white">
              I{"'"}m able to adapt fast and learn
              <span className="relative inline-block before:absolute before:-inset-1 before:block before:-skew-y-3 before:bg-red-500 mx-2">
                <span className="relative text-white dark:text-zinc-950">whatever</span>
              </span>
              is needed to deliver success.
            </blockquote>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 md:p-8">
              <h2 className="text-2xl">Exploring</h2>
              <p className="text-zinc-700 dark:text-zinc-500 mb-8">
                Here are some things my curiosity is leading me to explore.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {resumeData.exploring.map(item => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 md:p-8">
              <h2 className="text-2xl">Projects</h2>
              <p className="text-zinc-700 dark:text-zinc-500 mb-8">
                Open source projects and experiments.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {resumeData.projects.map(project => (
                  <a
                    key={project.name}
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border border-zinc-200 dark:border-zinc-700 hover:border-red-400 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                      {project.name}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                      {project.description}
                    </p>
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
            <section id="ai-agent-section" className="mb-4 md:p-8 scroll-mt-8 print:hidden">
              <h2 className="text-2xl mb-4">AI Agent</h2>
              <Suspense
                fallback={<div className="h-64 animate-pulse bg-zinc-100 dark:bg-zinc-800" />}
              >
                <Chatbot />
              </Suspense>
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 md:p-8">
              <h2 className="text-2xl">Contact</h2>
              <p className="text-zinc-700 dark:text-zinc-500 mb-8">
                Below are some ways we can continue the conversation.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  Email:{' '}
                  <a href={`mailto:${resumeData.email}`} className="text-red-400">
                    {resumeData.email}
                  </a>
                </div>
                <div>
                  Phone:{' '}
                  <a href={`tel:${resumeData.phone.replace(/\D/g, '')}`} className="text-red-400">
                    {resumeData.phone}
                  </a>
                </div>
                <div>
                  Web:{' '}
                  <a
                    href={resumeData.website}
                    className="text-red-400"
                    rel="me"
                    aria-label="Personal website"
                  >
                    blakebauman.dev
                  </a>
                </div>
                <div>
                  Github:{' '}
                  <a
                    href={resumeData.github}
                    className="text-red-400"
                    rel="me"
                    aria-label="GitHub profile"
                  >
                    blakebauman
                  </a>
                </div>
                <div>
                  LinkedIn:{' '}
                  <a
                    href={resumeData.linkedin}
                    className="text-red-400"
                    rel="me"
                    aria-label="LinkedIn profile"
                  >
                    blakebauman
                  </a>
                </div>
                <div>
                  Bluesky:{' '}
                  <a
                    href="https://bsky.app/profile/blakebauman.dev"
                    className="text-red-400"
                    rel="me"
                    aria-label="Bluesky profile"
                  >
                    @blakebauman.dev
                  </a>
                </div>
              </div>
            </section>
          </Suspense>
        </div>
        <footer className="py-4 border-t border-zinc-200 dark:border-zinc-700 text-center">
          <p className="text-sm text-zinc-700 dark:text-zinc-700">
            &copy; {new Date().getFullYear()} Blake Bauman. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
