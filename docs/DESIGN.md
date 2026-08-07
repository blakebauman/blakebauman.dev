---
name: blakebauman.dev
description: A senior engineer's portfolio. Cloudflare-platform commerce and edge AI, set in IBM Plex on Slate Mist.
colors:
  slate-mist: "#E5E7EA"
  plat-deep: "#D9DCE0"
  inkpress: "#22252A"
  cordovan: "#11141A"
  vermilion: "#3D4148"
  margin-rose: "#7E8289"
typography:
  display:
    fontFamily: "IBM Plex Sans Condensed, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(60px, 8vw, 120px)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "IBM Plex Sans Condensed, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(32px, 3.8vw, 46px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.012em"
  title:
    fontFamily: "IBM Plex Sans Condensed, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  body:
    fontFamily: "IBM Plex Serif, Georgia, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.18em"
  button:
    fontFamily: "IBM Plex Sans Condensed, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  none: "0px"
  hairline: "2px"
spacing:
  xs: "4px"
  s: "8px"
  m: "16px"
  l: "32px"
  xl: "64px"
  xxl: "96px"
components:
  button-cordovan:
    backgroundColor: "{colors.cordovan}"
    textColor: "{colors.slate-mist}"
    typography: "{typography.button}"
    rounded: "{rounded.hairline}"
    padding: "16px 28px"
  button-cordovan-hover:
    backgroundColor: "{colors.vermilion}"
  button-inked:
    backgroundColor: "{colors.inkpress}"
    textColor: "{colors.slate-mist}"
    typography: "{typography.button}"
    rounded: "{rounded.hairline}"
    padding: "11px 19px"
  button-inked-hover:
    backgroundColor: "{colors.cordovan}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.inkpress}"
    typography: "{typography.button}"
    rounded: "{rounded.hairline}"
    padding: "9px 17px"
  button-ghost-hover:
    backgroundColor: "{colors.inkpress}"
    textColor: "{colors.slate-mist}"
---

# Design System: blakebauman.dev

## 1. Overview

**Creative North Star: "The Listing Office"**

The site is a 1960s real-estate listing office, transposed to a senior engineer's portfolio. The page reads as a platted document with five numbered sections (01 Masthead, 02 Position, 03 Record, 04 Working artifact, 05 Colophon). Every entry is filed, dated, stamped. Type carries hierarchy; lightness punctuates. The voice is considered, exact, dry.

What the system explicitly rejects: the SaaS / Vercel-template default (cream ground, gradient blob hero, three-card feature grid, Inter-everywhere typography). Cream is substituted for cool monochrome Slate Mist to escape the warm-on-warm archival-editorial reflex (the saturated default for "tasteful engineer site" in 2024–2026). Inter is rejected for IBM Plex Serif as the body face. Skill walls are absent: stack information lives inline in each record entry, never in a logo grid.

The signature gesture is the **Enamel Mark**, a 6–8px solid-ink square that recurs as a load-bearing indicator across the system — current section in nav, active listing entry, group label, section eyebrow, colophon stamp. Single-purpose, single-tone, derived from the seed's enamel-sign craft. It carries meaning, not decoration. The mark renders in the system's deepest ink (Cordovan in the token graph) so it always reads as the strongest tone in any composition.

**Key Characteristics:**

- Type carries hierarchy; ink-weight punctuates. The system is monochromatic: a single cool-tinted hue (~250°) at five lightness stops.
- Two committed themes, selected by `prefers-color-scheme` alone. No toggle, no control in the UI: the page is a record, not a preferences panel. Slate Mist is the primary ground and the one the frontmatter documents; the dark ground is its designed counterpart, not an inversion.
- Hairline-only rounding: 0px (display, marks, masthead) and 2px (buttons, tinted surfaces). No SaaS-default 8–12px radii.
- Real-estate-listing register: **listing block**, **plat rule**, **enamel mark**, **recordation stamp** are the four signature motifs.
- IBM Plex three-voice: Sans Condensed (display), Serif (body, anchoring the editorial register), Mono (eyebrows, metadata, code).
- Motion budget: state transitions only (120ms ease-out). No scroll choreography, no parallax, no autoplay, no "wow on load."

## 2. Colors: The Recordation Palette

A monochromatic ink scale on a cool-tinted ground. Every value sits on the same 250° hue with chroma ≤0.005 — pure neutrals, no saturated accent. Emphasis is carried by lightness alone, the way ink weight differentiates type in a printed document. The token names from the prior warm-accent system (Cordovan, Vermilion, Margin Rose) are preserved as scale labels; their values now express ink depth, not hue.

### Primary

- **Cordovan** (`#11141A` / `oklch(10% 0.005 250)`): The deepest ink in the system. Links, CTA fill, the Enamel Mark, current-page indicator, signature button. The visual role of the load-bearing accent, expressed as the strongest lightness step rather than a saturated hue. Used at ≤10% of any given screen surface.

### Secondary

- **Vermilion** (`#3D4148` / `oklch(30% 0.005 250)`): Hover and focus states for Cordovan elements. The hover lifts: ink lightens from 10% to 30% on interaction — print-document feedback, not a saturation swap. Never a primary fill.

### Tertiary

- **Margin Rose** (`#7E8289` / `oklch(55% 0.005 250)`): Mid-grey for marginalia, low-emphasis annotations, quiet panels in long-form. Rare appearances.

### Neutral

- **Slate Mist** (`#E5E7EA` / `oklch(91% 0.005 250)`): Page ground. The substrate the listing is set on. ~85% of pixel surface.
- **Plat Deep** (`#D9DCE0` / `oklch(87% 0.005 250)`): Secondary surface. Recognition blocks, the chat frame, type-row demonstrations. Low-contrast lift on the ground.
- **Inkpress** (`#22252A` / `oklch(18% 0.005 250)`): Body text, headings, primary text. Cool-tinted near-black, never pure `#000`.

### Named Rules

**The One Voice Rule.** Cordovan (the deepest-ink stop) is the single committed emphasis tone. It carries CTAs, links, the Enamel Mark, and current-state indicators. No second hue enters the system. Vermilion is its hover lift, not a peer.

**The Cool-Ground Rule.** The page ground is cool monochrome-tint, never cream or any cream rebrand (vellum, kami, bone, ivory, eggshell, oatmeal). The cream-ground default is the editorial-archival reflex this brand explicitly rejects. If a designer is tempted to "warm the ground a touch," that's the reflex.

**The Punctuation Rule.** Cordovan-stop ink punctuates ≤10% of pixel surface. The body sits at Inkpress (18% ink); Cordovan (10% ink) is reserved for marks, links, CTAs, and current-state indicators. If the deepest stop reaches 30%+, something is wrong with the typesetting.

**The Single-Hue Rule.** Every color in the system sits on hue 250° with chroma ≤0.005. No saturated accent, no warm-cool contrast, no second hue. The brand commits to monochrome; emphasis is lightness, not saturation. If a designer reaches for a saturated value to "add warmth" or "make it pop," that's the reflex this rule exists to refuse. The rule replaces the prior Warm-Cool Inversion Rule, which was retired with the move to monochrome.

### After Hours: the dark ramp

Served on `prefers-color-scheme: dark`. Same hue, same chroma, same five roles. The ramp is rebuilt end-for-end rather than flipped, because the organising idea is *emphasis is the strongest tone on the page*: on paper that is the deepest stop, on a dark ground it is the brightest.

- **Cordovan** `oklch(97% 0.005 250)` / `#F3F5F8` — emphasis. Same role, opposite end. Still ≤10% of surface.
- **Vermilion** `oklch(78% 0.005 250)` / `#B5B8BA` — hover lift. Still moves *toward the ground*: ink lightened 10%→30% on paper, so here it dims 97%→78%. Same gesture, same direction of travel.
- **Inkpress** `oklch(90% 0.005 250)` / `#DBDEE1` — body. Never pure white; 100% blooms on a dark ground.
- **Slate Mist** `oklch(22% 0.005 250)` / `#191B1D` — ground. Never pure black.
- **Plat Deep** `oklch(27% 0.005 250)` / `#242628` — lifted surface. In dark, a lift is *lighter*. Flipping the light values would sink it into a hole instead.
- **Ink-soft** `oklch(70% 0.005 250)` / `#9C9FA1` — AA metadata.

**The Perceptual-Floor Rule.** OKLCH lightness is perceptual, not sRGB-linear: `oklch(14%)` renders `#08090B`, which is black for practical purposes and collapses the gap between ground and lifted surface. The dark ground sits at 22% and Plat Deep at 27%, preserving the same perceptual step the light theme has between 91% and 87%. Verify a dark value's rendered hex before trusting its lightness number.

**The Alpha-Asymmetry Rule.** Plat Rules invert to light-on-dark, and their alphas come down with them: a white hairline at 0.55 reads far heavier than a black one at the same value. Dark uses 0.16 / 0.40 / 0.09 against light's 0.18 / 0.55 / 0.10.

**The No-Dimmed-Emphasis Rule.** Disabled states never dim an emphasis fill with `opacity`. That reads as muted on paper and as a bright grey block in dark, where it becomes the loudest element on screen while being non-interactive. Disabled controls go ghost: transparent fill, ink-soft label, hairline rule.

Print resets the ramp to ink-on-white regardless of scheme, so a dark-mode visitor's printout is not a sheet of black.

## 3. Typography

**Display Font:** IBM Plex Sans Condensed (with Helvetica Neue, Arial, sans-serif fallbacks)
**Body Font:** IBM Plex Serif (with Georgia, serif fallbacks)
**Label / Mono Font:** IBM Plex Mono (with ui-monospace, SF Mono, Menlo fallbacks)

**Character:** A three-voice IBM Plex system. Sans Condensed handles display gravity without theatrics — condensed weight gives editorial weight without serif display pastiche. Plex Serif anchors body copy in the editorial register, deliberately rejecting the "developer who picked Inter" reflex. Plex Mono signals engineered without becoming the body face.

### Hierarchy

- **Display** (700, `clamp(60px, 8vw, 120px)`, 0.92 line-height, -0.02em letter-spacing): The masthead name. One per page. Set tight; tracking pulls in.
- **Headline** (600, `clamp(32px, 3.8vw, 46px)`, 1.05 line-height, -0.012em letter-spacing): Section h2 — Position, Record, Ask the resume, Colophon. Tight, condensed, on-grid with the body baseline.
- **Title** (600, 22px, 1.25 line-height, -0.005em letter-spacing): Listing role names, project entry names, callout titles inside listing blocks.
- **Body** (400, 17px, 1.6 line-height): Prose. Plex Serif. Cap measure 60–70ch. Full ink, no opacity softening.
- **Label** (500, 12px, 1 line-height, 0.18em letter-spacing, uppercase): Eyebrows, group labels, recordation stamps, mono metadata. The Plex Mono voice.
- **Button** (600, 13px, 1 line-height, 0.04em letter-spacing): All button labels. Plex Sans Condensed weight 600.

### Named Rules

**The Body-Serif Rule.** Body sets in Plex Serif, never Plex Sans. The serif anchor pulls the site out of the saturated "developer-who-picked-Inter" lane. This is the single most load-bearing typographic decision in the system.

**The Mono-Reserved Rule.** Plex Mono is for metadata, eyebrows, recordation stamps, and code only. Mono-as-body is on the watch list ("developer who just discovered IBM Plex Mono").

**The No-Em-Dash Rule.** Em dashes are not used in copy. Year ranges use en dashes (`2022–Present`, never `2022—Present` or `2022-Present`). Sentence interruptions use commas, colons, semicolons, parentheses. Also not `--`.

**The Italic-One-Word Rule.** Italic accent is one word per heading at most; usually zero. Italic is for actual emphasis, not decoration.

**The Tabular-Numerals Rule.** Numerals are tabular in tables, listings, and metadata; proportional in prose.

## 4. Elevation

The system is **flat by default**. There are no decorative shadows. Depth is conveyed through three mechanisms, in priority order:

1. **Surface tint.** Plat Deep (`#D9DCE0`) lifts cards/frames slightly off the Slate Mist ground. The contrast is intentionally low — the lift is a subtle layer, not a card with a drop shadow.
2. **Plat Rules.** 1px horizontal rules in Inkpress at 18% opacity (`var(--rule)`) for fine subdivisions, 55% (`var(--rule-strong)`) for major section borders. The surveyor's line on a platted document.
3. **Type weight.** Hierarchy comes from scale + weight contrast (≥1.25 ratio between steps), not from drop shadows or boxed cards.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. No `box-shadow`. The chat frame and recognition block lift off ground via Plat Deep tint, not via shadow.

**The Plat-Rule Rule.** Horizontal rules are the divider vocabulary. They use `var(--rule)` for fine subdivisions and `var(--rule-strong)` for major section borders. Never thicker than 1px. Never in saturated color (no Cordovan rules — that would violate The Punctuation Rule).

## 5. Components

### Buttons

**Character:** Square geometry from the real-estate-listing register. Hairline rounding (2px) — sharp enough to read engineered, soft enough to not feel crude on body-sized elements. Three patterns, each with a clear emphasis.

- **Shape:** 2px hairline radius (`rounded.hairline`). Never larger; the SaaS-default 8–12px radius is rejected.
- **Cordovan (signature)** — the brand's headline action. Cordovan fill, Slate Mist text, 16px/28px padding. Hover transitions to Vermilion at 120ms. Used for "Talk to me" — the primary outbound action. One per page.
- **Inked (default)** — Inkpress fill, Slate Mist text, 11px/19px padding. The default for in-page actions ("Read the case study"). Hover transitions to Cordovan.
- **Ghost (outline)** — Transparent fill, 1px Inkpress border, Inkpress text, 9px/17px padding. Lowest emphasis. Hover fills with Inkpress and inverts text to Slate Mist.

All button labels: Plex Sans Condensed 600 weight, 13px, 0.04em letter-spacing, uppercase optional (used in colophon CTA, not in inline buttons).

### Listing Block (signature)

**Character:** The system's primary content motif. A real-estate-listing-derived metadata block.

- **Structure:** A 110px year column on the left, body column on the right. Two-column grid with 12px row gap, 32px column gap.
- **Header:** title (role/project name) + " at " + company (when applicable) + a status badge.
- **Stack row:** Plex Mono 12px, uppercase, 0.06em letter-spacing, separated by middle dots. Lists the technologies/systems.
- **Description:** Plex Serif 17px, 1.6 line-height, max 70ch.
- **Plat Rule** (1px Inkpress at 55% opacity) divides entries.

### Status Badge

A small 1px-bordered mono label sitting inside the listing-block header.

- **Style:** Plex Mono 10.5px, 0.16em letter-spacing, uppercase. 4px/8px padding. 1px ink border at 55% opacity. 70% text opacity.
- **States:** `Active` uses Cordovan border + Cordovan text at full opacity. `Filed` and `Private` use ink at 70% opacity (default style).
- **Stacking:** Multiple badges sit side-by-side. A private active project shows `Private` + `Active` as two separate badges.

### Enamel Mark (signature)

**Character:** The brand's load-bearing indicator. A 6–8px Cordovan square. The most consistent visual signal across the site.

- **Used for:** sticky-nav current-page indicator, listing-block group label, section eyebrow prefix, colophon footer mark.
- **Negative form:** outlined (transparent fill, 1px ink rule at 55% opacity) for inactive/dim states (group labels for "Working artifacts · personal", "Recognition", inactive nav links).
- **Solid color, no gradient, no shadow, no rotation.** It is always a square at right angles.

### Recordation Stamp

**Character:** Small mono metadata. Format: `Rec. YYYY-MM-DD · v0.1`, `Lot 0042`, `Filed 2026-05-01`, `Set in IBM Plex`.

- **Style:** Plex Mono 11px, 0.12em letter-spacing, uppercase, 60% opacity. Inside a 1px ink rule border at 55% opacity. 4px/10px padding.
- **Used in:** footer stamps row, article footers, masthead document strip in the catalog-compressed variant, colophon section.

### Chat Frame (Working Artifact)

**Character:** The chatbot lives inside a Plat Deep block. Reads as a working artifact, not a feature box.

- **Container:** Plat Deep background, 36px padding. No border, no shadow. The lift comes from the surface tint.
- **Stream messages:** each leads with a mono eyebrow ("You" or "Blake (the index)") preceded by an Enamel Mark (filled cordovan for assistant, outline for user). Body text in Plex Serif.
- **Input row:** Plex Serif input on Slate Mist with 1px ink-strong border. Cordovan submit button flush-right (square edges where it meets the input).
- **Suggested prompts:** 1px ink-strong border, mono text 11px, no fill. Hover swaps to Cordovan border + Cordovan text.

### Sticky Nav

**Character:** Document header. Slate Mist background, persistent on scroll, separated from content by a 1px hairline rule.

- **Structure:** Logo mark on left (Plex Sans Condensed 700, 13px, 0.06em letter-spacing, uppercase), section links on right (Plex Mono 11px, 0.18em letter-spacing, uppercase).
- **Each link** prefixed with a 6px Enamel Mark. Outlined for inactive (62% opacity), Cordovan-filled for current (100% opacity).
- **Border-bottom:** 1px `var(--rule)`. Never a saturated color.

### Inputs / Fields

- **Style:** Slate Mist background, 1px `var(--rule-strong)` border (no rounded corners on chat input; 2px hairline allowed elsewhere).
- **Focus:** Cordovan outline at 2px offset. No glow, no border-color change in saturated hue.
- **Disabled:** 50% opacity. No greyed-out backgrounds.

### Code (in chat messages)

- **Inline code:** Plex Mono 0.9em, ink at 6% background tint, 1px/6px padding, 2px radius.
- **Pre/code blocks:** Plex Mono 0.85em, Slate Mist background (lighter than chat-frame surface), 1px `var(--rule)` border, 14px/16px padding, no shadow.

## 6. Do's and Don'ts

### Do:

- **Do** carry the Enamel Mark consistently as a load-bearing indicator. It marks meaning (current, primary, latest), never decoration.
- **Do** use Plex Serif for body. The serif is the anchor that pulls the site out of the "developer who picked Inter" lane.
- **Do** name systems precisely in copy. "A queue" becomes "a Cloudflare Queue with a 30-second visibility window." Specificity is the dominant rhetorical move.
- **Do** use full ink for body text. Opacity-softened body (e.g., body at 65%) is on the watch list — that's the Arc-Browser-marketing-site reflex.
- **Do** keep year ranges in en dashes (`2022–Present`), not em dashes or hyphens.
- **Do** lift surfaces via Plat Deep tint, never via box-shadow.
- **Do** cap body measure at 60–70ch.
- **Do** use tabular numerals in listings and tables; proportional in prose.
- **Do** verify every claim names the system, the constraint, or the number that backs it up.

### Don't:

- **Don't** use cream or any cream rebrand (vellum, kami, bone, ivory, eggshell, oatmeal, parchment, washi, biscuit) as the page ground. The Slate Mist ground is committed.
- **Don't** use Inter, Helvetica Neue, or any neutral grotesque as the primary face. IBM Plex is the brand commitment. Inter is on the explicit anti-references list in PRODUCT.md.
- **Don't** add gradient backgrounds, glassmorphism, blur effects, or `background-clip: text` gradient text. All on the absolute ban list.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe accent on cards, list items, or callouts. Side-stripe borders are an absolute ban.
- **Don't** add the hero-metric template (big number + small label + supporting stats + gradient accent). SaaS cliché, named in the absolute bans.
- **Don't** stack identical card grids. Three identical icon+heading+text cards in a row is a watch-list pattern from PRODUCT.md.
- **Don't** extend the dark theme by inverting light values. The dark ramp is a designed variant with its own lightness stops and its own alpha scale; see "After Hours" in the Colors section. New tokens need a dark counterpart chosen by role, not by arithmetic.
- **Don't** add a theme toggle. The two themes follow `prefers-color-scheme` and nothing else. A control would make the page a preferences panel; it is a record.
- **Don't** add scroll choreography, parallax, autoplay video, or "wow on load" animations. Motion is permitted only where it serves comprehension. PRODUCT.md anti-reference: Awwwards-bait.
- **Don't** use exclamation points outside of quoted speech.
- **Don't** use em dashes in copy. Use commas, colons, semicolons, periods, parentheses.
- **Don't** use marketing adjectives. Banned list from PRODUCT.md voice rules: artisanal, crafted, premium, curated, beloved, cozy, warm, inviting, thoughtfully, delightfully, lovingly, uncompromising, bespoke, leveraging, passionate.
- **Don't** invent "Tools" or "Skills" walls. Logo grids of every tool used are an explicit anti-reference. Stack information lives inline in each record entry.
- **Don't** add a floating "Talk to me" FAB. The colophon CTA + masthead email is sufficient. Three CTAs for the same action is excess (and contradicts brand-board iteration #3).
- **Don't** soften the "first production" claim back to "the first production." The line is `one of the first production AEM Edge Delivery Services plus Adobe Commerce B2B integrations`. Specificity is honesty, not promotion.
- **Don't** add sticky bottom CTAs, intercom-style chat bubbles, or banner cookie consents that violate the document register. The page is a record, not a funnel.
- **Don't** rename the six DESIGN.md sections. Tooling parses Overview / Colors / Typography / Elevation / Components / Do's and Don'ts character-for-character.

If someone could look at this interface and say "AI made that," it has failed. The category-reflex test for this brand: a peer engineer, given just the category ("personal portfolio for a Cloudflare-platform commerce engineer"), should NOT be able to predict the palette + theme. The brand now commits to monochrome — that has its own saturated reflex (the "minimal-monochrome editorial" lane: Helvetica or grotesque-on-white, no accent, lots of whitespace). The escape hatch from THAT reflex is the load-bearing IBM Plex three-voice system, the listing-block document register, and the Enamel Mark as a consistent meaning-bearing element. Without those, monochrome would collapse into the next default. With them, it reads as committed.
