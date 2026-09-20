# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: peer engineers and technical leaders.** They arrive from a link in a Slack thread, a referral, an OSS commit trail, or a talk. They have ten seconds to decide whether to keep reading, then maybe two minutes if something pulls them in. They judge by the quality of the work and the quality of the writing about the work — not by claims, badges, or stack logos.

**Also primary: agents and agent-building engineers.** The record is queryable
by machine, not only readable by people: `POST /mcp` serves six read-only tools
over the same layer the on-site assistant uses, and `/llms.txt` points at it.
Someone pointing a client at this record is doing the same job as a reader
skimming the page, so a surface that serves humans and starves an agent is
unfinished. This is not a side effect of the chatbot; it is a designed path with
three deliberate pointers (the colophon, `/llms.txt`, and the `get_profile`
tool), because nothing discovers an MCP server on its own.

**Secondary: hiring managers / recruiters and prospective collaborators.** They want fast credibility signals and a clear answer to "what does Blake actually do?" The site should serve them without bending the design toward a resume scanner.

The site is a calling card for inbound conversations: the next role, advisory work, speaking, OSS collaboration. It is not a lead-funnel; conversion is "I want to talk to this person" rather than "fill out a contact form."

## Product Purpose

A personal portfolio that cements Blake Bauman as the person to talk to about enterprise commerce and agent infrastructure — and demonstrates the level of craft implied by that claim through the site itself.

It exists to:

1. Make a niche authority claim and back it up with specific, named work.
2. Produce inbound conversations from people whose taste already aligns.
3. Stand on its own as a piece of work that other engineers point at when describing what a personal site should be.

Success at six months: niche-aligned inbound (advisory, talks, role conversations) without active outreach; the site referenced by other engineers as a craft reference; the AI resume chatbot used and quoted, not gimmicked.

## Positioning

**Enterprise commerce and agent infrastructure, by someone who has shipped
both.** The two halves are usually different people: the architect who knows
Adobe Commerce, AEM Edge Delivery Services and AEP Agent Orchestrator at
enterprise scale, and the engineer who builds agent runtimes, MCP gateways and
evaluation harnesses from scratch. Blake does both, and each one is the reason
the other is credible — the platform work supplies the constraints that make the
infrastructure work realistic, and the infrastructure work is why the platform
opinions are not vendor recitation.

Cloudflare is where much of it runs, not what the claim is about. A neighbouring
portfolio can say "edge" or "AI agents"; it cannot truthfully say it has carried
an enterprise commerce platform and hand-built the agent substrate underneath
one, and name both with versions and failure modes.

## Operating Context

- **Arrival is lateral, not searched.** A link in a Slack thread, a referral, an
  OSS commit trail, a talk. There is no funnel above this page and no second
  visit assumed.
- **Evaluation is fast and adversarial.** The reader is a peer checking whether
  the claims survive contact. Ten seconds to decide to keep reading, then maybe
  two minutes. Specifics are the only thing that buys the second minute.
- **The record is queried as well as read.** An agent may reach `POST /mcp` with
  no page view at all. Both consumers answer from one tool layer in
  `app/agent/tools.ts`, deliberately, so the site and an external client never
  drift into two different accounts of the same work.
- **The artifact is the argument.** Readers open the source, check the network
  panel, and clone the repos. The implementation is in scope for judgement.

## Capabilities and Constraints

- Twenty-one projects in the record, fourteen shown on the page. Every project
  carries a `maturity` value (`production`, `prototype`, `reference`,
  `archived`) and it is load-bearing: blurring prototype into shipped work is
  the specific failure the record is built to prevent.
- Two independent display flags that are not interchangeable: `visibility:
  "private"` means no public source exists; `listed: false` means the entry is
  deliberately off the page. Both stay indexed and discussable.
- The assistant answers only from the record. A topic guardrail runs before any
  model call, so a question it refuses is one no amount of tooling can answer.
  Adding a capability the assistant should discuss means teaching the guardrail
  first.
- Retrieval quality is measured, not assumed: `pnpm run vectorize:eval` reports
  recall@k, MRR and score distribution against a golden set carrying
  paraphrases.
- Runs on Cloudflare Workers. Rate limited at 20 req/min per IP, shared between
  the chat and `/mcp` because both spend an embedding.
- One committed look for every visitor: no light theme and no theme toggle.
  Print resets to ink on white.

## Evidence on Hand

Real, in the repository:

- `app/chat/resume.json` — the single source for the rendered page and the
  chat. Twenty-one projects, three experience entries (Adobe ×2, Lyons
  Consulting Group / Capgemini), recognition.
- `app/content/case-studies.tsx` — three long-form case studies (felix,
  memoturn, fold), written from the repositories themselves rather than from
  resume.json, with hand-authored inline SVG diagrams.
- `app/chat/ai-context.json` — 41 chat-only entries (28 background, 10 FAQ,
  3 scope).
- Live systems named with versions: fold at v1.14.0 with a frozen API and 40/40
  MCP conformance; edgevault at edgevault.io; this site.
- **2nd Place, Adobe AI Summit & Hackathon (2025)** — a DA.live content
  generation plugin over Adobe Commerce catalog data, multi-agent LangChain
  workflow, WebSocket streaming, Firefly integration.
- `POST /mcp` and `/llms.txt` as working, queryable proof of the agent claim.

**Absences that must not be filled in.** The three `scope` entries in
ai-context.json exist to give the assistant language for these rather than
inventing:

- The record is qualitative by design. There are **no** traffic figures, revenue
  impact, team sizes, latency benchmarks, user counts or contract values, and
  none may be manufactured to strengthen a page.
- felix is a prototype and the case study says so in its own words. That
  sentence is worth more than the rest of the page and does not get softened.
- Outside the record entirely: availability, compensation, education,
  certifications, personal life, opinions on named companies.

## Product Principles

1. **Specificity is the proof.** Real project names, real versions, real
   failure modes. A claim without a nameable system behind it does not go on
   the page.
2. **Maturity is stated, never implied.** Prototype and production are labelled
   and never blurred together, including by ordering or emphasis. Saying what
   something is *not* buys more credibility than any adjective.
3. **The implementation is part of the claim.** Lighthouse, the HTML source, the
   network waterfall and the accessibility audit are read by this audience. If
   the copy says considered, the artifact has to agree.
4. **One record, two consumers.** Humans and agents answer from the same tool
   layer. A fact that is true on the page and absent from `/mcp` is a bug, not
   a scope decision.
5. **Absence is content.** What the record does not cover is written down
   explicitly, so neither the site nor the assistant fills the gap with
   plausible invention.

## Brand Personality

**Three words: considered, exact, dry.**

- **Considered** — every choice has a reason. Restraint as a signal of competence, not absence of effort. Generous space because the content can carry it.
- **Exact** — names systems precisely, numbers where they matter, no rounded-up impact. Typesetting tight. Code samples real and runnable. Specificity over polish.
- **Dry** — quietly funny when it earns it. Never bit. Never theatrical. The site does not perform; it states.

Voice in copy: declarative sentences. Specific nouns. Few adjectives. No "passionate about", no "leveraging", no "I'm a developer who…". When a number is given, it's a real one. When a claim is made, the proof is one click away.

Emotional goal: the reader closes the tab and thinks "okay, this person is the real thing" — not "wow, that was a cool site." The site disappears behind the work.

## Anti-references

The site must NOT look like:

- **Generic SaaS / Vercel-template default.** Cream/off-white ground, gradient blobs, Inter everywhere, hero metric block, three identical feature cards, "Ship faster" copy. The current AI-default for "tasteful tech site."
- **Crypto / web3 neon-on-black.** Wrong tone entirely.
- **Agency-loud / Awwwards-bait.** Scroll choreography, theatrical motion, autoplay backgrounds, mystery-meat navigation. Reads as "designer trying hard."
- **Resume-PDF-as-website.** Black-on-white, Times or Helvetica, no point of view. Reads as having nothing to say.

Watch list — second-order reflexes that are easy to slip into when the first set is avoided:

- The "tasteful engineer with a serif display face and lots of space" template. This is the saturated reflex for *this* lane in 2024–2026 (paulstamatiou / robinrendle / andy.works tribute act). Editorial-typographic is the chosen aesthetic, but the site needs one specific, load-bearing move that makes it clearly Blake's, not a generic entry in the lane.
- Monospace-everywhere "developer who just discovered IBM Plex Mono."
- Footnote-and-figure-number print pastiche where the structure isn't earned by content density.

## Design Principles

*(Legacy section, kept as written. Principles 1, 4 and 5 are visual and are now
implemented and enforced in `docs/DESIGN.md` — the Body-Serif Rule, the Two-Hue
Rule, the width ladder and the motion budget. Treat DESIGN.md as authoritative
where the two overlap; the strategic half has moved up into Product Principles.)*

1. **Type carries it; color punctuates.** Hierarchy and rhythm come from typography first. Color appears where it does work — never decoratively. A near-monochromatic palette with one earned accent is more on-brand than a five-role system used because it exists.

2. **Specificity over polish.** Real project names, real numbers, real code. A page about commerce on Cloudflare names the products, the constraints, the failure modes. Polish without specificity reads as a template; specificity without polish still reads as the real thing.

3. **The site is the artifact.** Performance, semantic markup, edge rendering, accessibility, motion budget — the implementation itself is part of the claim. If the copy says "considered," the Lighthouse score, the HTML source, and the network waterfall must agree.

4. **One signature move, load-bearing.** To escape the saturated editorial lane, the site commits to one specific gesture that is recognizably Blake's — a typographic detail, an interaction, a structural quirk, a recurring motif. It must be functional, not decorative, and it must appear consistently. The brand and prototype phases identify what it is.

5. **No theatrics.** No scroll hijacking, no parallax, no autoplay video, no "wow on load" animation. Motion is permitted only where it serves comprehension or makes interaction feel right. The default is stillness.

## Accessibility & Inclusion

**WCAG 2.2 AA is a standing commitment, currently met.** This section previously
read "deferred"; it is not deferred any more, and the bar does not move back.

Verified and recorded in `docs/DESIGN.md`:

- An automated contrast audit over the rendered DOM (106 text elements on the
  home page, 70 on a case study) returns zero failures. Every ratio in DESIGN.md
  was computed from rendered sRGB values.
- Pointer targets meet 2.5.8 where the inline-link exception does not apply.
- `prefers-reduced-motion` removes the motion budget entirely, and the width-axis
  signature falls back to weight and colour rather than being gutted.
- Type floors at 11px; body copy sets at 17px with a 420 weight carrying
  dark-ground compensation, and zoom and user font settings are preserved.
- Diagrams carry `<title>` and `<desc>`, scroll rather than scaling below 660px,
  and the chat frame is a labelled region.

**Re-measure, do not reason.** OKLCH lightness is perceptual and estimating from
it produces wrong answers. Any palette change re-runs the DOM audit and records
the measured ratios. The same applies to type: the mechanical check is
`impeccable detect --scope type`.
