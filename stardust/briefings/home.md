<!-- stardust:provenance
  generated_by: briefings
  date: 2026-05-01
  synthesized_inputs:
    - PRODUCT.md (designer-authored — Users, Purpose, Personality)
    - .impeccable.md (designer-authored — taste, anti-references, signature-move principle)
    - stardust/brand-profile.json (designer-approved brand voice, motifs, motion budget)
    - inline interview (IA shape: single-page; inventory: mostly the resume)
  note: Copy section is candidate copy in the brand voice — the user has not yet committed individual lines verbatim. Edit to claim. Two TBDs intentional: the Record entries (pulled at prototype phase from the live KV resume data) and the "Talk to me" CTA destination.
-->
---
page: Home
path: /
type: landing
---

# Intent

The page makes a peer engineer who arrived from a Slack thread, OSS trail,
or talk close the tab thinking "this person is the real thing — I want to
talk to them about Cloudflare-platform commerce or edge-AI work." It states
the niche, lists the record, and demonstrates the niche claim in real time
through the on-page chatbot. It is not a lead-funnel; the conversion is "I
want to start a conversation."

# Audience

- **Primary: peer engineers and technical leaders** (senior, staff,
  principal). Skeptical of marketing, fluent with named systems. Ten
  seconds to keep them; two minutes if pulled in. Judges by quality of
  writing about the work, not by claims.
- **Secondary: hiring managers and directors** scanning for credibility
  before reaching out. Want role + systems + impact in under sixty seconds.
- **Tertiary: niche readers** interested specifically in Cloudflare-platform
  commerce or edge AI. Probably already aligned on taste.
- **Arrival**: referral links, Slack/Discord, talk references, GitHub
  trails, occasionally direct.

# Key Messages

1. **Primary.** Blake builds and operates commerce systems on the
   Cloudflare platform: Workers, Durable Objects, Vectorize, Queues, R2,
   KV. The niche is specific and the systems are named.
2. **The site is the proof.** The chatbot on this page runs on the same
   edge as the site, against a 768-dimensional vector index of this resume.
   Verifiability is the brand's claim about itself.
3. **The record is live.** Roles, systems built, talks given, OSS work,
   maintained as a record rather than a marketing document. What's listed
   is what happened.

# Calls to Action

- **Primary**: "Talk to me" → direct contact ([TBD] mailto vs scheduling
  link vs hidden contact page).
- **Secondary**: "Try the chatbot" → focuses the on-page chat input.
- **Tertiary**: scroll cue to the record / listings section. No CTA needed;
  the listing block does the work.

# Tone

As specified in `brand-profile.json` voice block. Considered, exact, dry.
Names systems precisely. No marketing adjectives. No exclamation points
outside quoted speech. No em dashes. First person singular. Specificity
over polish. Quietly funny at most once on this page (likely the colophon
or one aside in the masthead).

# Sections (page outline)

The page is a single document in the real-estate-listing register, with
five sections top-to-bottom. The prototype phase commits the layout; this
section names what each block is for.

1. **Masthead** — name, position statement (one sentence), recordation
   stamp.
2. **Position** — one paragraph stating the niche, the current focus, and
   what's being claimed.
3. **Record (Listings)** — the resume itself, set in listing-block format
   (year · role · stack · status). The motif's primary surface.
4. **Working artifact** — the chatbot, presented as a live demonstration
   rather than a feature box. One sentence of framing, then the input.
5. **Colophon** — about this site, recordation stamp, "Talk to me" CTA.

# Copy

## Masthead

- Eyebrow: `BLAKE BAUMAN · REC. {{current ISO month}} · v{{current site version}}`
- Headline (H1): `Blake Bauman`
- Subhead (one sentence): `Senior engineer building commerce on the Cloudflare platform. Edge-resident systems, durable carts, retrieval-augmented agents.`

## Position (one paragraph)

> I build and operate commerce systems on the Cloudflare platform: Workers,
> Durable Objects, Queues, Vectorize, R2, KV. I write occasionally about
> edge AI, mostly when I have something specific to report. The list below
> is the live record of what I've worked on; the chatbot below it answers
> questions about that record on the same edge it was built on.

## Record (resume)

[TBD] — pulled at prototype time from the existing resume data in
`RESUME_DATA_KV` and reformatted into the listing-block motif. The brand
profile defines the motif; the prototype phase commits the per-entry
typography. Each entry: `YEAR · ROLE · COMPANY · STACK · STATUS`, with one
sentence of context per entry where it earns it.

## Working artifact (chatbot framing)

- Eyebrow: `§ 04 · WORKING ARTIFACT`
- Heading: `Ask the resume`
- Framing (one sentence): `This runs on the same edge as the site, against a 768-dimensional vector index of the record above. It will tell you what I've worked on and what I haven't.`
- Input placeholder: `What did Blake do at <company>?`
- Footnote (small, mono): `Workers AI · @cf/baai/bge-base-en-v1.5 · Vectorize · 768d.`

## Colophon

- Eyebrow: `COLOPHON`
- Body (two short lines): `Set in IBM Plex. Cordovan accents on Slate Mist ground. The site is the artifact.`
- Recordation stamp: `REC. {{ISO date of last build}} · v{{site version}}`
- CTA: `Talk to me` → [TBD destination]

# Imagery

Photography is rare on this site, per the brand. The home page does not
require any photography to land. If imagery is added later, it sits inside
the Record section as an artifact-photograph (a screenshot of a system's
admin UI, a real diagram, a talk slide), captioned in Plex Mono.

- **Default**: no photography. Masthead, listings, chatbot, and colophon
  are entirely typographic.
- **Optional artifact figure** (if added): a screenshot or diagram of one
  named system, captioned. Source hint: TBD by the prototype phase.
