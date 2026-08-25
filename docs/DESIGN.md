---
name: blakebauman.dev
description: A senior engineer's portfolio. Enterprise commerce and agent infrastructure, set in Archivo and Literata on near-pure black.
colors:
  black: "#040404"
  panel: "#121212"
  line: "#242424"
  ink: "#F5F5F5"
  muted: "#9E9E9E"
  ox: "#510433"
  gold: "#F5AE39"
typography:
  display:
    fontFamily: "Archivo Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(56px, 9vw, 96px)"
    fontWeight: 800
    fontStretch: "118%"
    lineHeight: 0.86
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Archivo Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(30px, 4vw, 44px)"
    fontWeight: 700
    fontStretch: "108%"
    lineHeight: 1.06
    letterSpacing: "-0.022em"
  title:
    fontFamily: "Archivo Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "21px"
    fontWeight: 650
    fontStretch: "100%"
    lineHeight: 1.25
    letterSpacing: "-0.008em"
  body:
    fontFamily: "Literata Variable, Georgia, Times New Roman, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    fontStretch: "88%"
    lineHeight: 1.1
    letterSpacing: "0.14em"
  button:
    fontFamily: "Archivo Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    fontStretch: "88%"
    lineHeight: 1
    letterSpacing: "0.1em"
rounded:
  none: "0px"
spacing:
  xs: "4px"
  s: "8px"
  m: "16px"
  l: "32px"
  xl: "64px"
  xxl: "104px"
components:
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.black}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "14px 26px"
  button-gold-hover:
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "11px 18px"
  button-ghost-hover:
    textColor: "{colors.ink}"
---

# Design System: blakebauman.dev

## 1. Overview

**Creative North Star: "Scale is ranking."**

A near-pure black page where typographic scale, not decoration, states what matters.
Three projects carry the site at display weight and each owns a case study; the
remaining eleven are one quiet index line. A visitor cannot misread the hierarchy
because the hierarchy *is* the type size.

This system replaced "The Listing Office" (Slate Mist monochrome, IBM Plex, the
Enamel Mark, a five-part platted-document register) in a full identity departure.
Nothing from that system carries over.

What the system explicitly rejects: the SaaS / Vercel-template default, crypto
neon-on-black, Awwwards-bait scroll choreography, and resume-PDF-as-website. The
live risk is the first one: near-pure black with a saturated accent sits close
to the Vercel and Linear default, and that adjacency was accepted knowingly. The
three things that keep it out of that lane are load-bearing and must not be
traded away:

1. **A serif body face on black.** Literata carries every paragraph. The lane
   this design sits next to never does this; it is the single strongest
   separator and the cheapest one to lose by accident.
2. **The width ladder** (below), which no template uses.
3. **Scale-as-ranking** instead of a card grid.

**Key Characteristics:**

- Neutrals at chroma exactly 0, so black stays black rather than acquiring a tint.
- One committed look for every visitor. No light theme, no toggle, selected by
  nothing. Print resets to ink on white.
- Zero border radius. Not 2px, not 8px. Square.
- Flat by default: no shadows, no gradients, no glassmorphism, no glow.
- Motion budget: state transitions only, 120–220ms, ease-out-quart.

## 2. Colors

A neutral ramp at chroma 0 with exactly two hues in the whole system. Oxblood is
structural (it fills things); gold is the single signal (it marks things).

### Primary

- **Gold** (`#F5AE39` / `oklch(0.800 0.150 75)`): The one signal colour. Current
  nav item, active status chips, links on hover, the primary button, focus rings,
  code keywords, the streaming cursor. **10.9:1 on black**, and black text on a
  gold fill is also **10.9:1**, so filled chips need no special handling.

### Secondary

- **Oxblood** (`#510433` / `oklch(0.290 0.115 350)`): Structural fill, never
  text. Code-block headers, the audit bar in the fold diagram, harness nodes,
  error surfaces, text selection. Ink on oxblood is **13.6:1**.
- **Oxblood lift** (`#681946` / `oklch(0.360 0.120 350)`): Hover and marker
  states for oxblood elements.

### Neutral

- **Black** (`#040404` / `oklch(0.110 0 0)`): Page ground. ~90% of pixel surface.
- **Panel** (`#121212` / `oklch(0.175 0 0)`): Lifted surface: chat frame, code
  blocks, figure containers.
- **Line** (`#242424` / `oklch(0.280 0 0)`): Component borders.
- **Ink** (`#F5F5F5` / `oklch(0.970 0 0)`): Body and headings. **19.0:1** on black.
- **Muted** (`#9E9E9E` / `oklch(0.700 0 0)`): Metadata, captions, secondary prose.
  **7.7:1** on black, comfortably past AA at body size, which is the point.
- **Sep** (`#7A7A7A` / `oklch(0.580 0 0)`): Decorative separators only.

### Named Rules

**The Chroma-Zero Rule.** Every neutral sits at chroma exactly 0. Not 0.005, not
"a touch of warmth." A tinted near-black is the tell of a designer hedging on a
black page. Only `--ox` and `--gold` carry hue.

**The Two-Hue Rule.** Oxblood fills, gold marks. No third hue enters the system,
and neither of the two crosses roles: oxblood is never text, gold is never a
large background field.

**The Measured-Not-Asserted Rule.** Every contrast figure in this document was
computed from the rendered sRGB values, not estimated. An automated audit over the
live DOM (106 text elements on the home page, 70 on a case study) returns zero
failures. Re-run it after any palette change; do not reason about OKLCH lightness
and assume it passes.

**The Ghost-Disabled Rule.** Disabled controls never dim a gold fill with
`opacity`. On a black ground that produces a bright grey block that is the
loudest thing on screen while being non-interactive. Disabled goes transparent
with a muted label.

## 3. Typography

**Display Font:** Archivo Variable (with Helvetica Neue, Arial, sans-serif fallbacks)
**Body Font:** Literata Variable (with Georgia, Times New Roman, serif fallbacks)
**Label / Mono Font:** JetBrains Mono Variable (with ui-monospace, SF Mono, Menlo fallbacks)

**Character:** Three families, at the cap. Archivo carries weight 100–900 and
width 62–125% in one file, which is what makes the width ladder possible at all.
Literata is a screen-reading serif built for long text, and putting a serif on a
black page is the decision that separates this design from the lane it sits
beside. JetBrains Mono stays confined to code and readouts. All self-hosted via
Fontsource; the `wdth` entrypoint for Archivo is required, not optional.

### The width ladder (signature)

Archivo's variable width axis encodes **rank**. Wider means more important.
There are four stops and no others:

| Stop | Width | Used for |
|---|---|---|
| Display | `118%` | The masthead name, case-study titles |
| Head | `108%` | Section headings |
| UI | `100%` | Titles, body-adjacent UI, index entries |
| Meta | `88%` | Labels, chips, metadata, nav, buttons |

Lead project names sit at `112%` and travel to `122%` on hover, which is the
ladder made interactive: the interaction states the hierarchy rather than
decorating it. `font-stretch` affects layout, so this transition is bounded to a
single line and falls back to weight and colour under reduced motion.

### Hierarchy

- **Display** (800, `clamp(56px, 9vw, 96px)`, 0.86, -0.035em): one per page.
- **Headline** (700, `clamp(30px, 4vw, 44px)`, 1.06, -0.022em): section h2.
- **Title** (650, 21px, 1.25): role names, callout titles.
- **Body** (400, 17px, 1.62): Literata. Measure capped at 65ch.
- **Label** (600, 12px, 0.14em, uppercase): eyebrows, chips, metadata.

### Named Rules

**The Body-Serif Rule.** Body sets in Literata, never Archivo. This is the single
most load-bearing typographic decision in the system and the main thing keeping
the page out of the Vercel-black lane. If body ever becomes a sans, the design
has failed regardless of what else is right.

**The Display-Ceiling Rule.** No heading exceeds 96px and no letter-spacing goes
tighter than -0.035em. Above that the page is shouting; tighter than that the
letters touch.

**The Mono-Reserved Rule.** JetBrains Mono is for code, diagram labels and
readouts only. Never body, never headings.

**The No-Em-Dash Rule.** Em dashes are not used in copy. Year ranges use en
dashes (`2022–Present`). Sentence interruptions use commas, colons, semicolons or
parentheses. Also not `--`.

**The Tabular-Numerals Rule.** Numerals are tabular in metadata, terms and
tables; proportional in prose.

## 4. Elevation

Flat by default. Depth comes from three mechanisms, in priority order:

1. **Surface tint.** Panel (`#121212`) lifts the chat frame, code blocks and
   figure containers off the ground. No shadow.
2. **Hairlines.** `--hair` (ink at 14%) for fine subdivision, `--hair-strong`
   (ink at 26%) for emphasis. Never thicker than 1px, never coloured.
3. **Type scale and width.** Hierarchy is typographic before it is spatial.

### Named Rules

**The Flat-By-Default Rule.** No `box-shadow` anywhere. No blur except the one
functional case: the sticky top bar's backdrop, which exists so text passing
underneath stays readable.

**The Zero-Radius Rule.** `border-radius: 0` on everything except the chat
spinner. Square is the commitment; a 2px "softening" reopens the argument.

## 5. Components

### Top bar

Sticky, 54px, black at 92% with a backdrop blur and a hairline bottom border.
Name at left in Meta width, section links at right. Current section is gold with
a gold underline. On narrow viewports the link row scrolls horizontally under a
mask rather than hard-clipping. Every anchor target carries
`scroll-margin-top: 54px` so the bar never covers a heading it scrolled to.

### Lead row (signature)

The home page's primary motif and the answer to "what matters here."

- **Structure:** a two-column grid: name and the "Case study →" action on the
  first line, descriptor spanning both columns beneath.
- **Name:** `clamp(38px, 5.6vw, 72px)`, weight 750, width 112%.
- **Hover:** name widens to 122% and turns gold; the bottom hairline strengthens.
- **Descriptor:** Literata 16px muted, capped at 62ch.
- Below 560px the action drops to its own line.

### Index line

The eleven projects that are not featured, as one wrapping line of links
separated by `·` at `--sep`. Deliberately not a card grid: these entries have
earned a name and a link, not a box.

### Status chips

Archivo Meta width, 10.5px, 0.14em, uppercase, 5px/9px padding, square, 1px
border. Default is a muted outline. `.active` fills gold with black text.
`.ox` fills oxblood with ink.

### Buttons

- **Gold (primary):** gold fill, black text, 14px/26px. Hover inverts to
  transparent with a gold label and border. One per page.
- **Ghost:** transparent, muted text, `--line` border, 11px/18px. Hover lifts to
  ink.

### Figures

Hand-authored inline SVG, no charting dependency. Each carries `<title>` and
`<desc>` and `role="img"`. Wrapped in a panel container with `overflow-x: auto`;
the SVG has `min-width: 660px` so it **scrolls rather than scaling itself into
illegibility** on a phone. Caption in Archivo Meta below.

### Code blocks

Panel background inside a `--line` border. Header bar in oxblood carrying the
file path in mono at left and a language tag at right. Body in JetBrains Mono
13px with gold keywords and muted comments. `overflow-x: auto`.

### Chat frame

Panel background, `--line` border, minimum 340px tall. The stream scrolls inside
the frame (max 46vh) rather than growing the page. Each message leads with a mono
eyebrow preceded by a 7px square, gold for the assistant and oxblood-lift for the
visitor. Input row is a black field inside a `--hair-strong` border that turns
gold on focus-within, with a gold submit button flush right.

## 6. Do's and Don'ts

### Do:

- **Do** keep body copy in Literata. It is the load-bearing anti-Vercel decision.
- **Do** carry the width ladder consistently. Width means rank, everywhere.
- **Do** let scale state the hierarchy. Three projects big, the rest small.
- **Do** re-run the DOM contrast audit after any colour change, and record the
  measured ratios rather than reasoning about lightness.
- **Do** give every diagram a `<title>` and `<desc>`, and let it scroll on mobile.
- **Do** name systems precisely in copy: versions, licences, protocol names.
- **Do** say what a project is *not*. The felix case study states plainly that it
  is not battle-tested. That sentence is worth more than the rest of the page.
- **Do** use en dashes for ranges and tabular numerals in metadata.

### Don't:

- **Don't** set body copy in a sans-serif. See The Body-Serif Rule.
- **Don't** tint the neutrals. Chroma stays at exactly 0.
- **Don't** introduce a third hue, and don't make oxblood a text colour or gold a
  large background field.
- **Don't** add border radius. Zero, everywhere.
- **Don't** add a light theme or a theme toggle. One committed look.
- **Don't** add `box-shadow`, gradients, `background-clip: text`, or
  glassmorphism. The sticky bar's backdrop blur is the only blur in the system.
- **Don't** use `border-left`/`border-right` thicker than 1px as a coloured stripe.
- **Don't** rebuild the record as identical cards. The index line is the answer.
- **Don't** add tiny uppercase tracked eyebrows above every section, or numbered
  section markers (`01 / 02 / 03`). The previous system used both; they are AI
  scaffolding and they do not come back.
- **Don't** add scroll choreography, parallax, reveal-on-scroll, or entrance
  animation. Motion is state transitions only.
- **Don't** dim a gold fill to indicate disabled. Go ghost.
- **Don't** let a diagram scale below 660px. It must scroll.
- **Don't** use em dashes, exclamation points outside quoted speech, or marketing
  adjectives (crafted, premium, curated, seamless, leveraging, passionate).
- **Don't** rename the six sections of this document. Tooling parses Overview /
  Colors / Typography / Elevation / Components / Do's and Don'ts
  character-for-character.

If someone could look at this interface and say "AI made that," it has failed.
The category-reflex test for this brand: a peer engineer, given only the category
("personal portfolio for a commerce and agent-infrastructure engineer"), should
not be able to predict the result. Black-with-an-accent is a predictable answer,
and that is the accepted risk in this direction. What makes it unpredictable is
the serif body, the width ladder, and a page that ranks three things instead of
listing fourteen. Remove any one of those and the design collapses back into the
default it is standing next to.
