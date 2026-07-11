# Product

## Register

brand

## Users

**Primary: peer engineers and technical leaders.** They arrive from a link in a Slack thread, a referral, an OSS commit trail, or a talk. They have ten seconds to decide whether to keep reading, then maybe two minutes if something pulls them in. They judge by the quality of the work and the quality of the writing about the work — not by claims, badges, or stack logos.

**Secondary: hiring managers / recruiters and prospective collaborators.** They want fast credibility signals and a clear answer to "what does Blake actually do?" The site should serve them without bending the design toward a resume scanner.

The site is a calling card for inbound conversations: the next role, advisory work, speaking, OSS collaboration. It is not a lead-funnel; conversion is "I want to talk to this person" rather than "fill out a contact form."

## Product Purpose

A personal portfolio that cements Blake Bauman as the person to talk to about Cloudflare-platform commerce and edge-AI work — and demonstrates the level of craft implied by that claim through the site itself.

It exists to:

1. Make a niche authority claim and back it up with specific, named work.
2. Produce inbound conversations from people whose taste already aligns.
3. Stand on its own as a piece of work that other engineers point at when describing what a personal site should be.

Success at six months: niche-aligned inbound (advisory, talks, role conversations) without active outreach; the site referenced by other engineers as a craft reference; the AI resume chatbot used and quoted, not gimmicked.

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

1. **Type carries it; color punctuates.** Hierarchy and rhythm come from typography first. Color appears where it does work — never decoratively. A near-monochromatic palette with one earned accent is more on-brand than a five-role system used because it exists.

2. **Specificity over polish.** Real project names, real numbers, real code. A page about commerce on Cloudflare names the products, the constraints, the failure modes. Polish without specificity reads as a template; specificity without polish still reads as the real thing.

3. **The site is the artifact.** Performance, semantic markup, edge rendering, accessibility, motion budget — the implementation itself is part of the claim. If the copy says "considered," the Lighthouse score, the HTML source, and the network waterfall must agree.

4. **One signature move, load-bearing.** To escape the saturated editorial lane, the site commits to one specific gesture that is recognizably Blake's — a typographic detail, an interaction, a structural quirk, a recurring motif. It must be functional, not decorative, and it must appear consistently. The brand and prototype phases identify what it is.

5. **No theatrics.** No scroll hijacking, no parallax, no autoplay video, no "wow on load" animation. Motion is permitted only where it serves comprehension or makes interaction feel right. The default is stillness.

## Accessibility & Inclusion

Deferred for the visual brief. We will harden later with a dedicated pass (`/impeccable harden` or equivalent) covering WCAG AA contrast, keyboard navigation, screen-reader semantics, `prefers-reduced-motion`, and focus visibility.

The visual direction should not paint itself into a corner that's hostile to accessibility — in particular, the palette must reach AA contrast for body text on its chosen ground, and any signature motion gesture must have a reduced-motion fallback that doesn't gut the brand.
