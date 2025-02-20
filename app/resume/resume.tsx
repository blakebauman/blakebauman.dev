export function Resume({ message }: { message: string }) {
  return (
    <main className="flex justify-left pt-16 p-8 max-w-screen-lg">
      <div className="flex-1 flex flex-col gap-8 min-h-0">
        <header className="flex flex-col">
          <div className=" gap-0 md:p-8">
            <h1 className="text-5xl mb-4">Blake Bauman</h1>
            <p className="text-2xl text-zinc-700 dark:text-zinc-500 mb-2">
              Software Engineer/Principal Technical Architect @ Adobe
            </p>
            <p className="text-lg text-zinc-700 dark:text-zinc-600">
              Remote Arizona
            </p>
          </div>
        </header>
        <div className="w-full space-y-6">
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />
          <section className="mb-8 p-8">
            <h2 className="text-2xl">Who?</h2>
            <p className="text-zinc-700 dark:text-zinc-500 mt-8">
              Innovative and results-driven software engineer with a strong
              background in enterprise e-commerce, cloud architecture, and
              scalable software solutions. Proven experience leading complex
              Adobe Commerce implementations, integrating cutting-edge
              technologies, and mentoring high-performing teams. Now seeking to
              transition from consulting to product development, with a focus on
              AI, machine learning, and large language models (LLMs). Eager to
              apply my expertise in building scalable systems while deepening my
              knowledge in AI-driven product innovation. Looking for an
              opportunity to contribute to the full product lifecycle, drive
              technical excellence, and help shape intelligent, data-driven
              solutions.
            </p>
          </section>
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />
          <section className="mb-4 p-8">
            <h2 className="text-2xl mb-8">Experience</h2>
            <ol className="relative border-s border-zinc-200 dark:border-zinc-700 mb-8">
              <li className="mb-10 ms-4">
                <div className="absolute w-3 h-3 bg-zinc-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-red-900 dark:bg-red-400"></div>
                <time className="mb-1 text-sm font-normal leading-none text-zinc-400 dark:text-zinc-600">
                  February 2022 - Present
                </time>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mt-2">
                  Principal Technical Architect | Adobe
                </h3>
                <p className="mb-4 text-base font-normal text-zinc-500 dark:text-zinc-500">
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
                <div className="absolute w-3 h-3 bg-zinc-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-red-900 dark:bg-red-400"></div>
                <time className="mb-1 text-sm font-normal leading-none text-zinc-400 dark:text-zinc-600">
                  April 2019 - February 2022
                </time>
                <h3 className="text-lg text-zinc-900 dark:text-white mt-2">
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
                <div className="absolute w-3 h-3 bg-zinc-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-red-900 dark:bg-red-400"></div>
                <time className="mb-1 text-sm font-normal leading-none text-zinc-400 dark:text-zinc-600">
                  March 2017 - April 2019
                </time>
                <h3 className="text-lg text-zinc-900 dark:text-white mt-2">
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
          <section className="mb-4 p-8">
            <h2 className="text-2xl">Tools</h2>
            <p className="text-zinc-700 dark:text-zinc-500 mb-4">
              I appreciate all things. Here are some things I{"'"}m currently
              using.
            </p>
            <div className="grid grid-cols-4 gap-4">
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
          <section className="mb-4 p-8">
            <h2 className="text-2xl">Exploring</h2>
            <p className="text-zinc-700 dark:text-zinc-500 mb-4">
              Here are some things I{"'"}m currently spending my freetime on.
            </p>
            <div className="grid grid-cols-4 gap-4">
              <div>AI</div>
              <div>Desing Patterns</div>
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
          <blockquote className="text-center text-2xl p-8 text-zinc-900 italic dark:text-white">
            I{"'"}m able to adapt fast and learn
            <span className="relative inline-block before:absolute before:-inset-1 before:block before:-skew-y-3 before:bg-red-500 mx-2">
              <span className="relative text-white dark:text-zinc-950">
                whatever
              </span>
            </span>
            is needed to deliver success.
          </blockquote>
          <hr className="border-t border-zinc-200 dark:border-zinc-700" />
          <section className="mb-4 p-8">
            <h2 className="text-2xl">Interested?</h2>
            <p className="text-zinc-700 dark:text-zinc-500">
              Below are some ways we can continue the conversation.
            </p>
            <ul
              role="list"
              className="list-disc list-inside marker:text-red-400 dark:text-zinc-400 mt-8"
            >
              <li>
                Email:{" "}
                <a
                  href="mailto:blake.bauman@gmail.com"
                  className="text-red-400"
                >
                  blake.bauman@gmail.com
                </a>
              </li>
              <li>
                Phone:{" "}
                <a href="tel:+14148075866" className="text-red-400">
                  +1 414 807 5866
                </a>
              </li>
              <li>
                Web:{" "}
                <a href="https://blakebauman.dev" className="text-red-400">
                  blakebauman.dev
                </a>
              </li>
              <li>
                Github:{" "}
                <a
                  href="https://github.com/blakebauman"
                  className="text-red-400"
                >
                  blakebauman
                </a>
              </li>
              <li>
                Bluesky:{" "}
                <a
                  href="https://bsky.app/profile/blakebauman.dev"
                  className="text-red-400"
                >
                  @blakebauman.dev
                </a>
              </li>
            </ul>
          </section>
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

const resources = [
  {
    href: "https://reactrouter.com/docs",
    text: "React Router Docs",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        className="stroke-zinc-600 group-hover:stroke-current dark:stroke-zinc-300"
      >
        <path
          d="M9.99981 10.0751V9.99992M17.4688 17.4688C15.889 19.0485 11.2645 16.9853 7.13958 12.8604C3.01467 8.73546 0.951405 4.11091 2.53116 2.53116C4.11091 0.951405 8.73546 3.01467 12.8604 7.13958C16.9853 11.2645 19.0485 15.889 17.4688 17.4688ZM2.53132 17.4688C0.951566 15.8891 3.01483 11.2645 7.13974 7.13963C11.2647 3.01471 15.8892 0.951453 17.469 2.53121C19.0487 4.11096 16.9854 8.73551 12.8605 12.8604C8.73562 16.9853 4.11107 19.0486 2.53132 17.4688Z"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "https://rmx.as/discord",
    text: "Join Discord",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="20"
        viewBox="0 0 24 20"
        fill="none"
        className="stroke-zinc-600 group-hover:stroke-current dark:stroke-zinc-300"
      >
        <path
          d="M15.0686 1.25995L14.5477 1.17423L14.2913 1.63578C14.1754 1.84439 14.0545 2.08275 13.9422 2.31963C12.6461 2.16488 11.3406 2.16505 10.0445 2.32014C9.92822 2.08178 9.80478 1.84975 9.67412 1.62413L9.41449 1.17584L8.90333 1.25995C7.33547 1.51794 5.80717 1.99419 4.37748 2.66939L4.19 2.75793L4.07461 2.93019C1.23864 7.16437 0.46302 11.3053 0.838165 15.3924L0.868838 15.7266L1.13844 15.9264C2.81818 17.1714 4.68053 18.1233 6.68582 18.719L7.18892 18.8684L7.50166 18.4469C7.96179 17.8268 8.36504 17.1824 8.709 16.4944L8.71099 16.4904C10.8645 17.0471 13.128 17.0485 15.2821 16.4947C15.6261 17.1826 16.0293 17.8269 16.4892 18.4469L16.805 18.8725L17.3116 18.717C19.3056 18.105 21.1876 17.1751 22.8559 15.9238L23.1224 15.724L23.1528 15.3923C23.5873 10.6524 22.3579 6.53306 19.8947 2.90714L19.7759 2.73227L19.5833 2.64518C18.1437 1.99439 16.6386 1.51826 15.0686 1.25995ZM16.6074 10.7755L16.6074 10.7756C16.5934 11.6409 16.0212 12.1444 15.4783 12.1444C14.9297 12.1444 14.3493 11.6173 14.3493 10.7877C14.3493 9.94885 14.9378 9.41192 15.4783 9.41192C16.0471 9.41192 16.6209 9.93851 16.6074 10.7755ZM8.49373 12.1444C7.94513 12.1444 7.36471 11.6173 7.36471 10.7877C7.36471 9.94885 7.95323 9.41192 8.49373 9.41192C9.06038 9.41192 9.63892 9.93712 9.6417 10.7815C9.62517 11.6239 9.05462 12.1444 8.49373 12.1444Z"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
];
