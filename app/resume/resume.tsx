import { lazy, Suspense } from "react";
import type { ResumeProps } from "./types";

// Lazy load the chatbot since it's not part of the initial viewport
const Chatbot = lazy(() => import("./chatbot"));

export function Resume({ message }: ResumeProps) {
  return (
    <main className="flex justify-left pt-16 p-8 max-w-screen-lg">
      <div className="flex-1 flex flex-col gap-8 min-h-0">
        {/* Priority content - above the fold */}
        <header className="flex flex-col">
          <div className="gap-0 md:p-8">
            <h1 className="text-5xl mb-4">Blake Bauman</h1>
            <p className="text-2xl text-zinc-700 dark:text-zinc-400 mb-2">
              Software Engineer/Principal Technical Architect @ Adobe
            </p>
            <p className="text-lg text-zinc-700 dark:text-zinc-500">
              Remote Arizona
            </p>
          </div>
        </header>
        <div className="w-full space-y-6">
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />
          <section className="mb-8 md:p-8">
            <h2 className="text-2xl">Who?</h2>
            <p className="text-zinc-700 dark:text-zinc-400 mt-8">
              Innovative and results-driven software engineer with a strong
              background in enterprise e-commerce, cloud architecture, and
              scalable software solutions. Proven experience leading complex
              Adobe Commerce implementations, integrating cutting-edge
              technologies, and mentoring high-performing teams.
            </p>
            <p className="text-zinc-700 dark:text-zinc-400 mt-8">
              Now seeking to transition from consulting to product development,
              with a focus on AI, machine learning, and large language models
              (LLMs). Eager to apply my expertise in building scalable systems
              while deepening my knowledge in AI-driven product innovation.
              Looking for an opportunity to contribute to the full product
              lifecycle, drive technical excellence, and help shape intelligent,
              data-driven solutions.
            </p>
          </section>
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />
          
          {/* Defer loading of content below the fold */}
          <Suspense fallback={<div className="h-64 animate-pulse bg-zinc-100 dark:bg-zinc-800" />}>
            <section className="mb-4 md:p-8">
              <h2 className="text-2xl mb-8">Experience</h2>
              <ol className="relative border-s border-zinc-200 dark:border-zinc-700 mb-8">
                <li className="mb-10 ms-4">
                  <div className="absolute w-3 h-3 bg-zinc-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-red-900 dark:bg-red-400" />
                  <time className="mb-1 text-sm font-normal leading-none text-zinc-400 dark:text-zinc-500">
                    February 2022 - Present
                  </time>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mt-2 mb-1">
                    Principal Technical Architect | Adobe
                  </h3>
                  <p className="mb-4 text-base font-normal text-zinc-500 dark:text-zinc-400">
                    Contributed to the first production implementation of AEM Edge
                    Delivery Services integrated with Adobe Commerce B2B Cloud for
                    a Fortune 500 company. Led internal initiatives to drive
                    adoption and support for new Adobe products and services,
                    including hosting a webinar on Commerce with Edge Delivery.
                    Additionally, mentored and trained team members, fostering
                    expertise and collaboration.
                  </p>
                </li>
                <li className="mb-10 ms-4">
                  <div className="absolute w-3 h-3 bg-zinc-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-red-900 dark:bg-red-400" />
                  <time className="mb-1 text-sm font-normal leading-none text-zinc-400 dark:text-zinc-500">
                    April 2019 - February 2022
                  </time>
                  <h3 className="text-lg text-zinc-900 dark:text-white mt-2 mb-1">
                    Technical Architect | Adobe
                  </h3>
                  <p className="text-base font-normal text-zinc-500 dark:text-zinc-500">
                    Successfully led the migration of a global Beverage company
                    from Adobe Commerce on-prem to Adobe Commerce Cloud, ensuring
                    a seamless transition with minimal disruption. Provided
                    governance, best practices, and architectural reviews across
                    multiple implementations. Additionally, mentored team members,
                    fostering growth and knowledge sharing within the
                    organization.
                  </p>
                </li>
                <li className="ms-4">
                  <div className="absolute w-3 h-3 bg-zinc-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-red-900 dark:bg-red-400" />
                  <time className="mb-1 text-sm font-normal leading-none text-zinc-400 dark:text-zinc-600">
                    March 2017 - April 2019
                  </time>
                  <h3 className="text-lg text-zinc-900 dark:text-white mt-2 mb-1">
                    Technical Architect | Lyons Consulting Group (Capgemini)
                  </h3>
                  <p className="text-base font-normal text-zinc-500 dark:text-zinc-500">
                    Led a team in the design and implementation of Adobe Commerce
                    (Magento Commerce) for a leading Running Shoe and Activewear
                    company. Spearheaded the integration of Adobe Scene7 to
                    optimize product imagery across the customer experience,
                    enhancing visual merchandising and performance.
                  </p>
                </li>
              </ol>
              <a
                href="https://www.linkedin.com/in/blakebauman"
                className="text-red-400"
              >
                View more on my LinkedIn Profile
              </a>
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 md:p-8">
              <h2 className="text-2xl">Tools</h2>
              <p className="text-zinc-700 dark:text-zinc-500 mb-8">
                I appreciate all things. Here are some things I{"'"}m currently
                using.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>JavaScript</div>
                <div>TypeScript</div>
                <div>PHP</div>
                <div>Edge Computing</div>
                <div>Cloudflare Workers</div>
                <div>Postgres</div>
                <div>Redis</div>
                <div>React</div>
                <div>Edge Computing</div>
                <div>Hono</div>
                <div>RPC</div>
                <div>React-Router</div>
              </div>
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <blockquote className="text-center text-2xl md:p-8 text-zinc-900 italic dark:text-white">
              I{"'"}m able to adapt fast and learn
              <span className="relative inline-block before:absolute before:-inset-1 before:block before:-skew-y-3 before:bg-red-500 mx-2">
                <span className="relative text-white dark:text-zinc-950">
                  whatever
                </span>
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
                <div>AI</div>
                <div>Design Patterns</div>
                <div>Cloudflare Workflows</div>
                <div>Cloudflare D1</div>
                <div>LLMs</div>
                <div>Machine Learning</div>
                <div>Redis</div>
                <div>React</div>
                <div>Edge Computing</div>
                <div>Hono</div>
                <div>RPC</div>
                <div>React-Router</div>
              </div>
            </section>
            <hr className="border-t border-zinc-200 dark:border-zinc-700" />
            <section className="mb-4 md:p-8">
              <h2 className="text-2xl mb-4">AI Agent</h2>
              <Suspense fallback={<div className="h-64 animate-pulse bg-zinc-100 dark:bg-zinc-800" />}>
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
                  Email:{" "}
                  <a
                    href="mailto:blake.bauman@gmail.com"
                    className="text-red-400"
                  >
                    blake.bauman@gmail.com
                  </a>
                </div>
                <div>
                  Phone:{" "}
                  <a href="tel:+14148075866" className="text-red-400">
                    +1 414 807 5866
                  </a>
                </div>
                <div>
                  Web:{" "}
                  <a href="https://blakebauman.dev" className="text-red-400">
                    blakebauman.dev
                  </a>
                </div>
                <div>
                  Github:{" "}
                  <a
                    href="https://github.com/blakebauman"
                    className="text-red-400"
                  >
                    blakebauman
                  </a>
                </div>
                <div>
                  Bluesky:{" "}
                  <a
                    href="https://bsky.app/profile/blakebauman.dev"
                    className="text-red-400"
                  >
                    @blakebauman.dev
                  </a>
                </div>
                <div>&nbsp;</div>
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