---
name: blakebauman.com
description: A black-ground record set in one grotesque at four widths, on a page that is the viewport rather than a card centred on it.
colors:
  night: "#080A0F"
  basalt: "#14171D"
  ink: "#F0EFEC"
  ink-2: "#9A9A94"
  ink-3: "#5F6066"
  red: "#FC432E"
  ember: "#4E251E"
  ember-lift: "#603932"
  well: "#05070B"
  dot: "color-mix(in oklab, #F0EFEC 10%, transparent)"
  hair: "color-mix(in oklab, #F0EFEC 14%, transparent)"
  hair-strong: "color-mix(in oklab, #F0EFEC 26%, transparent)"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "clamp(72px, 13vw, 200px)"
    fontWeight: 500
    lineHeight: 0.86
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 110"
  display-long:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "clamp(60px, 11vw, 170px)"
    fontWeight: 500
    lineHeight: 0.88
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 110"
  lead:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "clamp(44px, 8vw, 116px)"
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 104"
  headline:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "clamp(34px, 5vw, 68px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 104"
  sub:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "clamp(26px, 3.2vw, 40px)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.014em"
    fontVariation: "'wdth' 104"
  title:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "29px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.008em"
    fontVariation: "'wdth' 104"
  lede:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "clamp(20px, 2.4vw, 24px)"
    fontWeight: 500
    lineHeight: 1.38
    letterSpacing: "0"
    fontVariation: "'wdth' 100, 'opsz' 24"
  body:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "0"
    fontVariation: "'wdth' 100, 'opsz' 16"
  body-small:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "0"
    fontVariation: "'wdth' 100"
  ui:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Archivo Variable, Archivo Fallback, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 88"
  code:
    fontFamily: "JetBrains Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.7
    letterSpacing: "0"
rounded:
  none: "0"
spacing:
  gutter: "clamp(20px, 4vw, 96px)"
  col-gap: "clamp(12px, 1.6vw, 24px)"
  row-max: "1240px"
  measure: "65ch"
  section: "clamp(56px, 9vh, 104px)"
  dot-gap: "22px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.night}"
    typography: "{typography.ui}"
    rounded: "{rounded.none}"
    padding: "13px 24px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.night}"
    rounded: "{rounded.none}"
    padding: "13px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.none}"
    padding: "13px 24px"
  button-ghost-hover:
    backgroundColor: "transparent"
    textColor: "{colors.red}"
    rounded: "{rounded.none}"
    padding: "13px 24px"
  button-copy:
    backgroundColor: "{colors.basalt}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 9px"
  chip-status:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 9px"
  chip-status-active:
    backgroundColor: "{colors.red}"
    textColor: "{colors.night}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 9px"
  chip-maturity:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  grid-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 9px"
  grid-toggle-pressed:
    backgroundColor: "{colors.red}"
    textColor: "{colors.night}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 9px"
  input-chat:
    backgroundColor: "{colors.night}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.none}"
    padding: "13px 15px"
  chat-well:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.none}"
    padding: "clamp(18px, 2.6vw, 26px)"
  figure-well:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "clamp(18px, 3vw, 30px)"
  code-well:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.none}"
    padding: "18px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 2px"
  nav-link-current:
    backgroundColor: "transparent"
    textColor: "{colors.red}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 2px"
---

# Design System: blakebauman.com

## Overview

**Creative North Star: "The Plateau at Night"**

The page is a black field with very large type on it. One grotesque — Archivo — carries display, heading, UI and body alike, at a single weight, and rank is expressed by size, by width on the variable font's `wdth` axis, and by which column a thing occupies. There is no second family in the reading band, no case change inside prose, no shadow, no gradient, no rounded corner, and no accent but one red. What remains has to do the work, which is the point: a record whose claim is that the implementation is part of the work cannot afford decoration standing in for structure.

The page is fluid. `--shell` is `100%` and the gutter (`clamp(20px, 4vw, 96px)`) is the margin, so the edge of the viewport is the edge of the sheet at every width rather than a fixed card floating in a dark room. Fluidity has exactly one cost — a row composed on twelve columns at 2560px puts a name at one edge and its action at the other with nothing trackable between — and the system pays it with `--row-max: 1240px`, the content width at 1440 where the composition was measured, so nothing at or below that width moves.

Beneath that sits one twelve-column grid, and *one* is the load-bearing word. `--row-max` and `--cols` together define a single box — capped, anchored to the left gutter, twelve columns of `minmax(0, 1fr)` separated by `--col-gap` — and every composed region on the site is declared against it in one rule: the masthead, the lead and role rows, recognition, the two-up Position and Colophon sections, the chat section, the case-study meta strip, and the overlay itself. What differs between them is which columns a child takes. The columns never differ. Regions adopt the twelve at 900px and collapse to a single column below, because twelve columns at phone width is a grid you cannot compose in; the one-column state is the same declaration with `--cols` at 1, not a second layout.

The grid overlay (`app/components/grid.tsx`) draws that box as red hairlines on demand, and its state survives navigation and reload. It is the signature element and it is functional rather than decorative: a reader gets to check the structure instead of taking it on faith — which is why it has to be the *same* box. It sits in `.bb-cols`, the shared grid, so the columns it draws and the columns the page composes on cannot drift apart. They had: before this, seven regions carried their own split on their own breakpoint (`1.5fr/1fr`, `0.75fr/1.6fr`, a bare `132px` column) and half were uncapped, so at 1742px the page ran three right edges and the overlay's columns described nothing but the lead rows. Below 900px the overlay draws the single content column as its two edges rather than as a fill, because 14% red washed over a whole phone screen is a tint and not a ruler.

Two rules follow from this and both are easy to break. A full-width hairline — the section rules, the top bar, the footer — is a *page* rule and stays full-bleed; anything set in type sits in the columns. And a block that is a `.bb-wrap` as well as a grid (the masthead, the top bar) carries the gutter inside its own box, so its cap has to include it and its start margin has to be released, or the grid comes out two gutters short and centred against a page that is anchored left.

**Key Characteristics:**
- Black ground (`#080A0F`), near-neutral, never warmed.
- One face, one weight (500), four widths; size and width are the whole hierarchy.
- Radius 0 everywhere; hairlines and fills instead of shadows.
- Fluid page, one capped twelve-column box (1240px) that every region composes on, revealed on demand.
- One signal red, used for state and for exactly one structural rule.
- Motion is state transition only: 120ms and 220ms on one ease-out-quart curve.

## Colors

A near-neutral dark field carrying one accent hue at two lightnesses — a signal that never fills and a fill that never signals; every neutral sits close enough to grey that it reads as material rather than as colour.

### Primary
- **Signal Red** (`--red`): The only chromatic accent. Adobe Spectrum red-900 for a dark theme, chosen over Spectrum's logo red (`#FA0F00`, which measures 4.8:1 here). It works in both directions — 5.6:1 as type on night and as ground under night-coloured type — which is why one value covers link hover, focus ring, the active status chip, the primary button, the 3px masthead rule, the current nav item, the grid overlay's columns, the chat cursor, code keywords and the `::selection` highlight (night on red, 5.6:1). It is never a surface.

### Secondary
- **Ember** (`--ember`) and **Ember Lift** (`--ember-lift`): The structural fill, in the accent's own hue. Fill only, never text: the code-block header, the markdown table head, the chat error block, the assistant's marker square, the blockquote rule, and the case-study diagram fills and strokes. It replaces a sage green sampled from pinyon-juniper, which left the palette carrying two unrelated colours; the ember was derived rather than picked — the same OKLCH lightness as the sage (31.9%), at the red's hue (30) and twice its chroma, because at the sage's chroma that hue reads brown rather than red. Ink on ember measures 11.4:1 (the sage gave 11.0:1), ink on ember-lift 8.6:1, ink-2 on ember 4.6:1, red on ember 3.7:1; ember against night is 1.5:1, so it still reads as a tint of the ground rather than a new plane.

### Neutral
- **Night** (`--night`): The page ground and the only background under running text.
- **Basalt** (`--basalt`): A material token with exactly one use left in the stylesheet: the copy control on a fenced code block inside a chat answer (`.bb-copy-btn`). It is a chip on a night-ground block, not a container — a lighter square that reads as pressable against the darker code under it. Ink-2 on basalt is 6.3:1. It is not a general surface material and nothing else should reach for it as one.
- **Well** (`--well`): One step *below* night, and the ground for every container that holds its own content: the chat frame, the expanded chat sheet, the case-study figure scroller and case-study code blocks. OKLCH L 0.128 C 0.0108 h 260 — the same blue family as night and inside the same near-neutral band. Every text ratio against it is higher than against night: ink 17.5:1, ink-2 7.1:1, red 5.7:1, ink-3 3.2:1. Figures and code bodies moved here from basalt and every value improved (figures: node stroke 2.86:1 → 3.22:1, label 15.6:1 → 17.5:1, sub-label 6.3:1 → 7.1:1; code: ink 15.6:1 → 17.5:1, red 5.1:1 → 5.7:1, string 8.8:1 → 9.9:1). The node-stroke figure is the one that mattered: at 2.86:1 a UI boundary sat under the 3:1 floor, and the move cleared it.
- **Dot** (`--dot`, 10% ink; `--dot-gap` 22px): The pitch and ink of the grid, painted on the chat surfaces only. A dot composites to `#1D1E22`, 1.2:1 against the well — texture, not an edge. The well and the dot grid are separable: figures and code blocks take the well without the dots, because a pattern under a diagram or under code is noise.
- **Ink** (`--ink`): Body and display text; 17.2:1 on night.
- **Ink 2** (`--ink-2`): Metadata, muted prose, secondary links; 7.0:1 on night, so it stays AA at any size.
- **Ink 3** (`--ink-3`): 3.2:1 on night. Borders, separators and container strokes. Not a text colour at body size.
- **Hair** / **Hair Strong** (`--hair` at 14% ink, `--hair-strong` at 26%): The two hairline weights. Every rule, divider and resting border in the system is one of these two; there is no third weight and no heavier "object" line.

### Named Rules
**The Chroma Discipline Rule.** Neutrals are near-neutral and stay there: night, basalt and the ink ramp all measure below 0.013 OKLCH chroma (night `C 0.0115` at hue 267, basalt `C 0.0129`, ink `C 0.0041`). That residual is the plateau's blue sky in the ground, not warmth — no beige, no brown, no "touch of warmth" in the near-black, and no neutral that reads as a hue. Measured from the shipped hexes; a repo note elsewhere states these are at chroma *exactly* 0, and the artifact does not support that figure.

**The One Hue Rule.** There is one chromatic hue in the system and it appears at two lightnesses: red signals, ember fills. Red marks state or a single structural rule and is never a surface; ember is never text. Nothing else is coloured — a second hue is what the sage was, and removing it is what made the palette one voice instead of two.

**The Unmeasurable Texture Rule.** The contrast harness reads each element's resolved `background-color` and cannot see a `background-image`, so on the dotted well it reports the well every time and never measures a dot. Measured by hand, text sitting directly on a dot: ink 14.5:1, ink-2 5.9:1, red 4.7:1 — and `--ink-3` **2.7:1, under the 3:1 floor**. The chat renders only ink and ink-2 today (verified from computed styles), so nothing fails; `--ink-3` on the dotted well is the one combination in this system that passes the automated audit and fails the eye. Any new patterned ground inherits this: measure the composite by hand, because the audit will not.

**The Measured Contrast Rule.** Every contrast figure in this document was measured against rendered sRGB, never reasoned from OKLCH lightness — OKLCH lightness is perceptual and estimating ratios from it produces wrong answers. Re-measure the whole table after any palette change. The audited state: 438 text elements across `/` and `/work/felix` at 1440 and 390, none below WCAG AA.

## Typography

**Display Font:** Archivo Variable (self-hosted; fallback "Archivo Fallback" → Helvetica → Arial)
**Body Font:** Archivo Variable — the same face. `--font-body` is an alias of `--font-display`.
**Label/Mono Font:** JetBrains Mono Variable (code, timestamps, source chips, the MCP endpoint)

**Body copy sets in Archivo, a sans.** An earlier iteration of this site set body in a serif (Literata); that face is not in this build and no serif is loaded anywhere. Any instruction elsewhere in the repo asserting a serif body, or naming Literata, IBM Plex or Helvetica Neue as a family here, is stale. Helvetica appears only as the metric source for the fallback `@font-face`: Archivo at wght 500 / wdth 100 was measured with fontTools against the shipped woff2 at 0.66% wider than Helvetica and Arial, x-height 0.526 against 0.523, which is what `size-adjust: 100.66%` and the ascent/descent overrides encode. Self-hosting removed a real split — Helvetica Neue is Monotype-licensed and resolves only on Apple platforms, so every other visitor was previously served Arial, a different face at a different weight.

**Character:** Industrial, tight, and loud at the top of the ramp. Display sets at 0.86 line-height with `-0.03em` tracking so the name behaves as a block of material; prose runs at 1.6 to 65ch and is quiet by comparison.

### Hierarchy
- **Display** (500, `clamp(72px, 13vw, 200px)`, 0.86, wdth 110): The masthead name, uppercase, and nothing else. `display-long` (`clamp(60px, 11vw, 170px)`, 0.88) is the case-study title.
- **Lead** (500, `clamp(44px, 8vw, 116px)`, 0.96, wdth 104): Featured project names in the work list.
- **Headline** (500, `clamp(34px, 5vw, 68px)`, 1.0, wdth 104): Section heads. **Sub** (`clamp(26px, 3.2vw, 40px)`, 1.12) is the case-study section head.
- **Title** (500, 29px, 1.2, wdth 104): Role names in the record.
- **Lede** (500, `clamp(20px, 2.4vw, 24px)`, 1.38, `opsz` 24, capped 48–58ch): The masthead subhead, case-study one-liner, colophon and section openers.
- **Body** (500, 20px, 1.6, `opsz` 16, max 65ch): Running prose. **Body small** (17px) carries descriptors, role descriptions and chat answers.
- **UI** (500, 14px, `0.02em`): Values in meta lists, footnotes, figure captions, back links.
- **Label** (500, 11px, `0.1em`, uppercase, wdth 88, tabular numerals): Every stamp, key, chip and metadata line in the system.
- **Code** (JetBrains Mono, 13px, 1.7): Code blocks; 11px for source chips, timestamps and paths, and `0.92em`/`0.88em` for mono inline in prose so it tracks its context.

Painted ramp, in px: 11 / 14 / 17 / 20 / 24 / 29 / 40 / 68 / 116 / 170 / 200. `--fs-role`, `--fs-title-s`, `--fs-title-xs`, `--fs-sm`, `--fs-button`, `--fs-label` and `--fs-code-s` are aliases onto those stops, not stops of their own.

### Named Rules
**The Width Ladder Rule.** Archivo's `wdth` axis encodes rank, and there are exactly four stops: 110% display, 104% heading, 100% UI, 88% metadata. No fifth value, no interpolation between them. This exists because size would otherwise be the only hierarchy device — one family, one weight, no case change in the reading band — and an audit of the previous build found nine of thirteen adjacent size steps too close to read apart. The ladder only exists if the Fontsource `wdth` entrypoint is imported (`@fontsource-variable/archivo/wdth.css`); import the `wght` entrypoint instead and every `font-stretch` in the sheet silently does nothing while the build stays green.

**The 1.15x Rule.** Adjacent stops on the type ramp are at least 1.15x apart. Two stops closer than that are two names for one role, not two roles; collapse the newer one onto the existing stop as an alias.

**The Two Weights Rule.** 500 for everything, 700 only for `<strong>`, which is semantic rather than hierarchical. Weight never carries rank — width and size do. Nine aliases once pointed at one weight value, which is a pretend axis; do not rebuild it.

## Elevation

There is no elevation. Radius is 0 on every surface in the system, there is no `box-shadow` anywhere, no gradient, and no decorative blur. Depth is carried by three things instead: **scale** (the ramp spans 11px to 200px, so importance is legible before anything is read), **hairline weight** (`--hair` at 14% ink for structure, `--hair-strong` at 26% for emphasis and for a resting interactive border), and **column position** (metadata hangs in columns 1–2, content spans 3–9, the action sits in 11–12). Panels are distinguished by material, not by height, and the material moves *downward*: a container that holds its own content — the chat, a figure, a code block — sits in `--well`, a ground below night, bounded by an `--ink-3` stroke. That is depth by recession rather than by lift, and the chat marks it further with a dot grid rather than with a shadow.

The one blur in the build is functional, not ornamental: the sticky top bar is a 92% night wash with `backdrop-filter: saturate(140%) blur(8px)` so scrolling display type does not collide with the nav text sitting over it.

### Named Rules
**The Flat Sheet Rule.** No shadow, no gradient, no radius, no glow. If something needs to separate from what is behind it, give it a hairline, a different material (the well or ember), or more space — never a lift.

**The Contained Content Rule.** A container that holds its own content rather than carrying the page's — the conversation, a diagram, a code block — sits in `--well` on a 1px `--ink-3` stroke. One ground for all three is one fewer material to justify, and it is the darkest ground in the system, so every token gains contrast on the way in.

**The Motion Budget Rule.** Motion is state transition only: `--t-fast` 120ms and `--t-mid` 220ms on `cubic-bezier(0.22, 1, 0.36, 1)`. No scroll choreography, no entrance animation, and nothing that gates content on an animation finishing. `prefers-reduced-motion` reduces everything to 0.01ms.

## Components

### Buttons
- **Shape:** Square (0 radius), 1px stroke, uppercase label at the 88% width stop, tracking `0.08em`.
- **One box for both:** `.btn` and `.btn-ghost` share `display: inline-flex`, centred on both axes, `min-height: 48px`, `padding: 13px 24px`. They previously used `inline-block` with different padding (14/26 against 11/18) and the ghost's intrinsic height was 40px; the two rendered at a matching 52px only because the flex row holding them stretched its items, so their agreement was accidental. Any new pair of actions inherits the shared box, not the row.
- **Primary (`.btn`):** Red fill, night text, red border — `--night` on `--red`, 5.64:1.
- **Primary hover:** Fills with `--ink`, border to `--ink`, label pinned to `--night` — 17.22:1. The hover gets *heavier*, not lighter; the old transparent invert made the primary action quieter than the ghost beside it at the moment the two most need to differ.
- **Primary focus:** `.btn:focus-visible` overrides the global red ring to `--ink`. A red ring on a red fill reads as a soft double border.
- **Ghost (`.btn-ghost`):** Transparent on an `--ink-3` stroke with `--ink` text, 17.22:1. It was `--ink-2` (7:1), which beside a solid red fill read as disabled rather than as the quieter of two live choices.
- **Ghost hover:** Text and border both go `--red`, 5.64:1 — the whole control takes the accent rather than an ink border around red text.
- **Labels:** A control names its action. The mailto button reads "Email me" on both the home colophon and the case studies.
- **Disabled:** Goes ghost rather than dimming a bright fill, so the loudest thing on screen is never the thing you cannot press.
- **Copy chip (`.bb-copy-btn`):** The one exception to the button box — a 11px label-stop chip at `5px 9px`, `--basalt` fill on an `--ink-3` stroke with `--ink-2` text (6.3:1), sitting on a night-ground code block in a chat answer. Hover lifts the text to ink; a completed copy turns text and border red.

### Chips
- **Status (`.status`):** Uppercase 11px label, `--ink-2` on an `--ink-3` stroke, `5px 9px`. `.status.active` inverts to a red fill with night text — the only place a chip is loud.
- **Maturity (`.bb-lead .mat`):** Same treatment on `--hair-strong`, `4px 8px`. It hangs in the margin columns and leads the row, because maturity is the fact the work section exists to state.
- **Source chip (`.bb-chat-source`):** Mono 11px, `--ink-2`, `--ink-3` stroke, `3px 7px` — provenance reads as data, not as a tag.

### Cards / Containers
- **Corner Style:** 0.
- **Background:** `--well` for every container that holds its own content — the figure scroller, case-study code blocks, the chat frame and the expanded sheet — with the dot grid added on the chat surfaces only; `--night` under all running prose and under fenced code inside a chat answer.
- **Border:** 1px `--ink-3` on panels; 1px `--hair` on dividers and section tops.
- **Shadow Strategy:** None. See Elevation.
- **Internal Padding:** `clamp(18px, 2.6vw, 26px)` on panels, `18px` on code bodies.

### Inputs / Fields
- **Chat input (`.bb-chat-input`):** A single `--hair-strong` box containing a night-ground field and a red send button; the field itself has no border and no focus outline of its own.
- **Focus:** The wrapper takes `:focus-within` and turns its border red, so the composed control lights as one object.
- **Global focus:** `2px solid var(--red)` with `3px` offset on `:focus-visible`.

### Navigation
- **Top bar (`.bb-top`):** 54px, sticky, a 92% night wash over `blur(8px)`, closed by a `--hair` bottom border. The name sets at the UI stop in uppercase at the 88% width; nav items set at the 11px label stop in `--ink-2`, hover to ink, and the current route takes red text plus a red bottom border.
- **Mobile:** The nav is a deliberate horizontal scroller with a right-edge fade mask below 720px, scrollbar hidden, mask removed above. Links carry a 24px minimum pointer target (WCAG 2.2 2.5.8) because "Top" and "Ask" measured 23px wide without it.

### Grid Overlay and Toggle (signature)
Twelve full-height columns of red at 14% fill with 80% red edges, drawn fixed over the page, staggered in at 12ms per column. The toggle carries a four-bar mark of the thing it turns on, sets `aria-pressed`, inverts to a red fill when on, persists in `localStorage`, and is restored by an inline script before first paint. The fill was raised from 8%/52% because at the old values a pixel diff could only resolve half the columns — a structure you have to squint at does not discharge the claim the control makes.

### Masthead
Uppercase display name spanning all twelve columns, a 3px red rule directly beneath it spanning the same twelve (a child of the masthead grid, never nested in a column), then the subhead in 1–6 and the meta list in 8–12 sharing the row below. Column 7 is empty and is the separation; the row gap stays small, because a uniform gap detached the rule from the name and pushed the email below the fold at 1440x900. The metadata takes five columns rather than four for one reason: the contact address sets 176px, cannot break, and four columns at the 900px threshold leave it 178px — a fit by two pixels is a coincidence, not a column count. The meta list is a two-column `<dl>` of 11px uppercase keys against 14px tabular-numeral values over a `--hair` top border.

### Composed Rows (`.bb-lead`, `.bb-role`, `.bb-sec-head`)
Every composed region sits on the twelve columns, all capped at `--row-max`. A lead row puts maturity in columns 1–2, the project name at lead scale across 3–9, the descriptor narrower beneath it across 3–8, and the action in 11–12; hover states rank in colour (name and action to red, bottom border to `--hair-strong`), never in movement. A role row is the same skeleton: years in 1–2, role and company in 3–9, status chip in 11–12. A section head is flex at every width — heading, a `flex: 1` hairline that runs from the last letter to the stamp, then the stamp — because placed on the columns the rule floated detached in the middle of the row; it is capped at `--row-max` like the rest, so both its ends still land on the grid. The remaining regions take the same twelve: masthead subhead 1–6 and meta 8–12, Position prose 1–7 and its footnote 9–12, recognition 1–2 and 3–9 like the roles above it, the chat aside 1–4 and the frame 5–12, the colophon 1–5 and its actions 9–12, and the case-study meta strip five facts of two columns each.

### Case Study (`app/routes/work.tsx`)
Back link, display-long title, a one-line summary capped at 48ch, and a meta strip of 11px keys over 14px values on a hairline. Body sections are separated by `clamp(44px, 6.5vh, 76px)`, prose holds the 65ch measure, and lists are hairline-separated rows rather than bullets. Every block in the hero and the body is capped at `--row-max` (1240px) on the child rather than on the centred wrapper, so the page has one right edge held to the left margin. Term/detail lists set their `<strong>` at `--wt-strong`; it previously set `--wt`, identical to its parent, which cancelled the browser's bold and made the terms invisible. Figures are hand-authored inline SVG inside a well-ground scroller with a `min-width: 660px` floor, so on a phone a diagram scrolls rather than scaling into illegibility; in print that floor is released so it scales to the page. Code blocks sit on the same well behind an ember header carrying a mono path on the left and a label-stop tag on the right. The diagram primitive `Box` defaults its fill to `var(--well)` so an ordinary node sits flush with the figure ground and reads by its `--ink-3` stroke alone (3.22:1); only a deliberately emphasised node carries a fill, and those take `--ember` with an `--ember-lift` stroke.

### Chat ("Ask the record")
The frame (`.bb-chat-frame`) sits in `--well` on an `--ink-3` stroke, minimum 340px tall, with the stream scrolling inside it (`max-height: 46vh`) rather than growing the page. A `radial-gradient` dot grid (`--dot` at 1px on a `--dot-gap` 22px pitch) is painted on the frame and not on the scrolling transcript, so the grid stays put while the conversation moves over it. Expanding (`.bb-chat-modal-card`) keeps the same well and the same grid at the same pitch and changes only the size of the surface: it is a full-viewport sheet, `100%` x `100dvh`, not a centred card. The old `min(920px, 100%)` cap made Expand a lie — once the page went fluid the card was *narrower* than the inline frame it replaced at wide viewports. Turns are separated by `--hair` and led by an uppercase 11px speaker line with a 7px square marker — ember-lift for the assistant, red for Blake — and a mono timestamp pushed to the right. Tool steps and source chips share one metadata register, because they are two halves of one claim. Markdown inside an answer is styled in the stylesheet, never inline in the component: the previous version inlined palette tokens and a palette change turned every one of them into an invalid value with no error.

### Print
The whole identity resets to ink on white: night and basalt become `#fff`, red becomes `#111`, body drops to 11pt at weight 400 with normal tracking, and the top bar, chat frame and index note are removed. Ember flattens to `#f0f0f0` (and ember-lift to `#999`) rather than white, because it carries the diagram nodes and the code header that would otherwise disappear; the well goes white and `--dot` goes transparent, so the grid does not print.

## Do's and Don'ts

### Do:
- **Do** set body copy in Archivo (`--font-body`, which aliases `--font-display`) at 500, 20px, 1.6, to a 65ch measure.
- **Do** pick one of the four width stops — 110 / 104 / 100 / 88 — for anything new, and import `@fontsource-variable/archivo/wdth.css` or the stops do not exist.
- **Do** express hierarchy with size, width and column position, in that order.
- **Do** compose new rows on the twelve columns with metadata in 1–2, content in 3–9, action in 11–12, and cap them at `--row-max` (1240px).
- **Do** add a new region to the shared grid rule rather than giving it a `grid-template-columns` of its own, and put every `grid-column` inside the `min-width: 900px` query — `--cols` is 1 below it, and a span of seven on a one-column grid generates six implicit columns.
- **Do** give body copy that is not itself a grid child `--measure-cols` (seven columns, 62ch at 20px) or `--measure-cols-s` (six, 65ch at 17px) instead of `--measure`, so the line stops on a column the overlay draws. Both are shares of the box, not pixel figures, so they track the columns at every width.
- **Do** use `--hair` (14%) for structure and `--hair-strong` (26%) for emphasis and resting interactive borders; those are the only two hairline weights.
- **Do** keep type on night, the well or ember only; ink on all three measures 11:1 or better. Basalt carries one 11px label (the copy chip) and is not a surface for prose.
- **Do** re-measure contrast against the rendered DOM after any palette change, and re-measure the Archivo/Helvetica metrics if the font package or the weight moves.
- **Do** set every stamp, key and chip at the 11px label stop, uppercase, `0.1em`, tabular numerals.
- **Do** put any container that holds its own content — conversation, diagram, code — on `--well` with a 1px `--ink-3` stroke, and add the dot grid only on the chat surfaces.
- **Do** give `.btn` and `.btn-ghost` the same box: `inline-flex`, centred, `min-height: 48px`, `padding: 13px 24px`. Agreement is declared, not inherited from whatever row happens to hold them.
- **Do** re-declare `color` inside any rule that changes a control's background on hover.
- **Do** name the action in a control's label — the mailto button reads "Email me", not "Talk to me".
- **Do** keep tokens in the stylesheet; a renamed token must break visibly in one place rather than silently in five inline styles.

### Don't:
- **Don't** introduce a serif, a second sans, or any third family. Mono is JetBrains Mono and is confined to code, paths, timestamps and readouts.
- **Don't** warm the neutrals or push any neutral above ~0.013 OKLCH chroma. The residual blue in night is the world; beige is not.
- **Don't** add a second accent hue. Red signals, ember fills, and they are one hue at two lightnesses; nothing else is coloured.
- **Don't** set text on ember below large size — red on ember measures 3.7:1 — and don't set body-size text in `--ink-3` (3.2:1 on night); it is a border and decoration value.
- **Don't** add a radius, a shadow, a gradient or a decorative blur. If separation is needed, use a hairline, a different material, or space.
- **Don't** add a type stop within 1.15x of an existing one; alias onto the existing stop instead.
- **Don't** use weight for hierarchy. 700 belongs to `<strong>` and nowhere else.
- **Don't** put the masthead's red rule inside a column. It is a child of the masthead grid spanning `1 / -1`, so it ends on the same line as the section stamps, the row actions and the last footer stamp. The masthead is no longer exempt from `--row-max`: `--fs-display` clamps at 200px, the name sets 1692px and wraps to two lines at every width below that, so the exemption bought empty space rather than larger type.
- **Don't** add scroll-triggered animation, entrance reveals, or any motion outside the 120ms/220ms state-transition budget.
- **Don't** put `--ink-3` text — or any new colour — on the dotted well without measuring it against a dot by hand. Ink-3 on a dot is 2.7:1, under the 3:1 floor, and the contrast harness cannot see a `background-image`, so it will report the well and pass.
- **Don't** cap the expanded chat at a fixed card width; it is `100%` x `100dvh` on purpose, because a fluid inline frame outgrows any cap.
- **Don't** let `.bb-shell` become a scroll container; it clips on x only, or the sticky top bar stops sticking.
- **Don't** change a button's hover background without re-declaring its `color` in the same rule. The global `a:hover { color: var(--red) }` outranks `.btn`, which only declares its colour at rest: when the primary's hover became an `--ink` fill, the label went red on near-white at **3.05:1**, a real failure that the old transparent hover had hidden (red on night is 5.64:1). The automated contrast harness will not catch this — it measures the resting state only.
- **Don't** move the figure ground without moving the diagram node default with it. `.bb-figure-scroll` is `--well` and `Box` in `app/content/case-studies.tsx` defaults `fill = 'var(--well)'` so an ordinary node sits flush and reads by its stroke; if the ground changes and the default does not, every unfilled node grows a panel behind it.
- **Don't** treat `--basalt` as a surface material. It has exactly one use in the stylesheet — the copy chip on a chat code block — and reaching for it as a panel ground undoes the recession that makes containers read.
- **Don't** set a case-study `<strong>` at `--wt`. It is identical to its parent and cancels the browser's bold, which made every term in a term/detail list invisible; `--wt-strong` (700) is what that second weight is for.
- **Don't** leave a case-study block uncapped. Hero and body children take `--row-max` on the child, not on the centred wrapper, or the page grows a second and third right edge at wide viewports.
- **Don't** reintroduce kickers or eyebrows above headings. The masthead subhead opens with the job title verbatim instead, and nothing in the build uses one.
