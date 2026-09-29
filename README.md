# Desat Info Tech — website

Marketing site for **Desat Info Tech**, an IT / SaaS product development company.
Static HTML, CSS and vanilla JavaScript. No build step, no framework, no npm
install. The only external request is Google Fonts (Inter).

```
index.html                    homepage: 10 sections, all inline SVG, and the
                              JSON island that carries the other 16 pages
styles.css                    tokens, layout, components, motion, responsive, print
script.js                     20 self-contained modules, each defensive
services.html                 index of all eight practices
service-<slug>.html           × 8 — one detail page per service
about.html  contact.html      company pages
blog.html  case-studies.html  careers.html
terms.html  privacy.html
tools/data.js                 content model for the generated pages
tools/build-pages.js          authoring script — writes the 16 sub-pages
tools/build-home.js           authoring script — services rows + content island
tools/build.js                runs both in order: node tools\build.js
tools/audit.js                link / anchor / id / heading / island checks
tools/strip-marks.js          one-off: unwrapped every heading highlight
```

`tools/` is a convenience, not a dependency. The site it produces is plain
static HTML; edit `tools/data.js` and re-run `node tools\build.js` to keep the
shared header, footer, gradient definitions and the homepage's content island in
step across pages. Nothing needs rebuilding to *run* the site.

## Running it

Double-click `index.html`, or serve the directory:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Opening the single file directly is a supported way to read the site: every
internal link resolves inside `index.html` through the page viewer below, so
nothing 404s when the sibling files are out of reach.

## Design system

Indigo → violet primary with an amber accent, on lilac-white and deep-ink bands.

| Token | Value | Use |
| --- | --- | --- |
| `--brand` | `#4F46E5` | Indigo: button gradients, icon fills, borders |
| `--brand-2` | `#7C3AED` | Violet: gradient partner, dark-band aurora |
| `--brand-3` | `#06B6D4` | Cyan: progress bar, card edge gradients, logo glyphs |
| `--accent` | `#F59E0B` | Amber: **decoration only** (see note) |
| `--deep` | `#0B1020` | Near-black indigo: dark section bands |
| `--brand-ink` | `#4338CA` | Indigo for **text** on light bands (7.0:1) |
| `--cream` | `#F5F3FE` | Alternating light section bands |
| `--cream-soft` | `#FAF9FF` | Hero gradient start |
| `--light` | `#F7F6FC` | Footer background |
| `--ink` | `#0B1020` | Headings |
| `--body` | `rgba(34,42,76,.78)` | Body copy |

Type is Inter (400/500/600/700), 15px base, H1 up to 44px, container 1240px.
Radii: 12px base, 16px cards, 5px buttons.

**Wordmark.** A 44px gradient tile (`url(#brand-g)`) carrying a stroked **D**
with an amber period set beside it. The stem and bowl are separate paths, each
carrying `pathLength="1"` — that is what lets the load entrance draw them stroke
by stroke without measuring a path length in JavaScript. Headings are plain text:
the gradient underline treatment that used to pick out a few words has been
removed, because at one line of type it read as decoration rather than
hierarchy.

**Alternating bands.** Sections alternate light → dark → light down the page.
The dark bands are not a flat fill: each carries two counter-drifting aurora
blobs (`.band--primary::before` / `::after`). They animate `transform` only and
are `will-change: transform`, so they stay on the compositor.

### A note on the accent and WCAG

Amber `#F59E0B` is **2.1:1 on white** — it fails both the 4.5:1 body floor and
the 3:1 large-text floor. It is therefore restricted to decoration: the browser
chrome dot, the period in the logo, card edge gradients, and the tail
of the scroll-progress bar. It never carries running text. The same rule is why
`.stat__num`'s gradient runs `--brand-ink → --brand → --brand-2`
(7.9 / 6.3 / 5.7) and stops short of amber.

Dark bands are `--deep`, where white measures **18.9:1**. Verified contrast on
the built page, not estimated:

| Pair | Ratio |
| --- | --- |
| White on dark band | 18.93:1 |
| Body copy on white card | 13.97:1 |
| Hero title on cream | 17.25:1 |
| `--brand-ink` on cream | 7.20:1 |
| Pill text on white | 7.90:1 |

## Sections (homepage)

1. Sticky header — logo, dropdown nav, search, CTA, off-canvas mobile menu
2. Hero — pill, word-split H1, dual CTAs, product dashboard mock, floating chips,
   one-shot light wipe behind the copy
3. Client logo marquee (auto-scrolling, pauses on hover, 6 colour lockups)
4. About with Product / Engineering / Cloud tabs
5. Services — **8 full-width expanding rows**, each with its own animated SVG scene
6. Why choose us — animated stat counters plus 6 differentiators
7. Testimonials — 4-slide carousel with a progress-filling active dot
8. Industries served — 6 tiles, each with a 118px medallion illustration
9. Contact CTA
10. Footer

### Industries medallions

Each tile carries a single glyph on a 120×120 viewBox: a tinted halo circle, a
bold outline in that sector's gradient, and one amber dot in the top-right corner
for the six to share. The previous artwork was a 200×132 scene drawn at
`width: 100%`, which put a ~460px-wide illustration above a 17px heading — it
swamped the card and its 3.5px strokes turned to mush at full size. `.illus` is
now a fixed 118px (92px under 640px) centred in a soft radial halo, so the glyph
keeps its intended stroke weight at every card width.

## The services expanding rows

The eight services are stacked as **full-width rows** rather than a card grid.
Each row is collapsed to a single line — index number, title, one-line promise,
animated scene and a chevron — and expands in place into the full write-up:
summary, commitments, the prose, what you get, how we work, the stack, the FAQ
and two calls to action. Nothing is hidden behind a page transition, so the
whole offer is legible from the homepage.

```css
.srow__panel { display: grid; grid-template-rows: 0fr; }
.srow.is-open .srow__panel { grid-template-rows: 1fr; }
```

`grid-template-rows: 0fr → 1fr` animates to the content's natural height without
a hard-coded `max-height`, so the transition stays correct however long the copy
is. `visibility` is delayed by the transition duration rather than switched, so
collapsed content leaves the tab order and the accessibility tree only after it
has finished collapsing.

**Rows open independently**, not as a one-at-a-time accordion. Closing the row a
visitor just opened because they clicked a second one is the kind of surprise a
comparison shopper does not want.

**`aria-expanded` is the source of truth.** It is what assistive technology
announces, and `.is-open` — which the CSS expands from — is derived from it, so
the two can never drift apart.

**The row head is a `<button>` that owns its panel.** That keeps the hit area the
full width of the row and avoids nesting a link inside a button. The panel's own
links are ordinary links in ordinary document flow.

On hover the row lifts 4px, the gradient hairline grows across its top edge, the
index number turns violet, the scene scales up, and a **pointer-tracked spotlight**
(`--rgx` / `--rgy`) follows the cursor. On open the chevron rotates, the hairline
stays lit, and the panel's cards stagger in on `--i`.

Responsive: the scene moves onto its own line under the title at 640px, and the
two-column panel collapses to one.

**Reduced motion keeps the row but drops the animation.** The blanket rule sets
`transition-duration: .001ms !important`, which beats the `.is-open` rule's 550ms
regardless of specificity — so the panel opens and closes instantly. The blanket
also zeroes `transition-delay`, and that half matters as much as the first: the
panel's collapse relies on `visibility 0s .55s`, so without it the closed row's
links would stay in the tab order for 550ms, and the staggered cards would sit
motionless through their delays before appearing all at once. A paused animation
is not a reduced one.

## The in-page page viewer

The site is normally opened as a **single file from a preview panel**, where the
sibling `.html` files are not addressable at all — clicking a plain `href` to
`about.html` produced *"no url found"*. So `index.html` carries a JSON island
(`<script type="application/json" id="siteData">`) holding all sixteen pages'
`<main>` markup, and module 20 in `script.js` renders it into the native
`<dialog id="pageView">` above instead of navigating.

Three deliberate safety valves, in order:

1. **Only a link whose target is in the island is intercepted.** Any other href
   is left completely alone.
2. **With scripting off nothing runs**, so the hrefs are followed normally and
   the pages open as real documents. The pages still exist on disk and are still
   generated by `tools/build-pages.js`.
3. The island is rebuilt from the generated files by `tools/build-home.js`, so
   the in-page copy can never drift from the standalone page — they are the same
   markup.

The island is sanitised as it is written: motion hooks (`data-reveal`,
`data-delay`, `data-depth`, `data-count`, `data-draw`) are stripped because the
motion modules already ran on this document and would otherwise strand injected
content at `opacity: 0`, and every `id` is namespaced with `pv-` so nothing
collides with the homepage's own ids (`aria-labelledby`, `aria-controls` and
`<label for>` are rewritten to match).

Native `<dialog>.showModal()` supplies the focus trap, Escape, inertness behind
the overlay, the backdrop and backdrop-click dismissal. None of it is
hand-rolled.

To regenerate everything:

```
node tools\build.js     # build-pages.js, then build-home.js
node tools\audit.js     # links, anchors, ids, headings, island completeness
```

## The eight animated scenes

Each service row carries a looping SVG scene that shows what that service
actually does — a build assembling, a phone syncing, a CI pipeline running,
packets crossing a connector, bars growing, a monolith splitting into services, a
shield pulsing.

| Row | Scene | Keyframes |
| --- | --- | --- |
| SaaS Product Development | window filling in, badge popping | `aNudge` `aPop` |
| Custom Web & Mobile Apps | tablet + phone, rows swapping | `aSwap` `aBob` `aFlick` |
| UI/UX & Design Systems | swatch row, one swatch popping | `aPop` `aNudge` |
| Cloud, DevOps & Reliability | dot running a pipeline, heartbeat | `aRun` `aBeat` |
| API & Systems Integration | packets crossing both ways | `aRun` `aFlick` |
| Data & Analytics Platforms | bars growing, scan line | `aGrow` `aScan` |
| Legacy Modernisation | monolith splitting into four | `aSplit` |
| Managed Support & AMS | shield pulsing, ring expanding | `aPulse` `aRing` `aPop` `aFlick` |

These eight SVGs are **lifted across verbatim** by `tools/build-home.js` from
the markup they used to live in, so they are never re-typed and cannot drift.

Rules that keep them cheap and safe:

- **Only `transform` and `opacity` are animated**, so all of it stays on the
  compositor.
- **Every keyframe is authored `0%,100%` at rest and `50%` at its peak.** That is
  deliberate: the reduced-motion block collapses these to a single iteration, so
  the `0%` frame is what a motion-sensitive visitor is left looking at.
- **`.an` sets `transform-box: fill-box`** so SVG children scale about their own
  box rather than the viewBox.
- **`data-draw` is deliberately absent** from these eight svgs. The line-draw
  module claims every stroked shape and sets `stroke-dasharray`, which would
  fight any dashed stroke used as a marching-ants effect.
- `prefers-reduced-motion` sets `.art .an { animation: none !important }`, so the
  scenes hold their rest frame rather than freezing mid-loop.

## Motion

Everything is hand-rolled. Each module owns a distinct set of custom properties
so no two modules ever write the same property, and CSS composes them:

| Module | Writes | Applied via |
| --- | --- | --- |
| Reveal | `--rx0` / `--ry0` | `translate` |
| Service rows | `--rgx` / `--rgy` (spotlight), `--i` (panel stagger) | radial gradient position, staggered `transition-delay` |
| Hover lift | `--lift` | folded into `translate` |
| Tilt | `--tiltX` / `--tiltY` | `transform` |
| Magnetic buttons | `--mx` / `--my` | `translate` |
| Parallax | `--py` | `translate` |
| Progress bar | `--p` | `scale` |

Parallax deliberately targets the independent `translate` property rather than
`transform`, so it composes with the `rotate` keyframe animations on the same
elements instead of overwriting them.

The effects: scroll progress bar, word-split mask reveal on the H1, 3D card
tilt, magnetic buttons, cursor-following hero spotlight, scroll-linked parallax,
SVG line-draw on stroked illustrations, breathing aurora backgrounds, sheen
sweeps on cards and buttons, dot-fill on the carousel, a mask-wipe reveal on
section headings, the load entrance below, and the eight service scenes above.

**Reveal is progressive enhancement.** The hidden state is scoped to a
`.js-motion` class that `script.js` adds to `<html>` as its very first action, so
if the script never runs the page renders plainly visible rather than blank.

**The load entrance is CSS-only and additive.** `styles.css` §18b stages the top
of the home page so the hero arrives as a sequence rather than a block: the header
settles first (50–450ms), a light wipe crosses the hero (2.6s, `z-index: 0`, behind
the copy), the headline words wait on `--d + --wd` so they cannot beat their own
eyebrow, and then the panel builds — tiles pop at 1.02s, bars grow from 1.26s, the
trend line draws off the existing `.is-in` transition. The hero's `data-delay`
values (160 / 340 / 640 / 760 / 900ms) are the spine of that sequence.

Every keyframe in the section supplies only the `from` state against a finished
base value, with `animation-fill-mode: backwards`. Cut the animations out
entirely — script disabled, reduced motion, an engine that will not run keyframes
— and each element renders in its final place, immediately; nothing is waiting on
a keyframe to become readable. The reduced-motion block also has to zero
`animation-delay`, not just duration: a `.001ms` animation with a 1.7s delay would
otherwise park every element in its `from` state for the full delay and then snap,
which is a motionless pause rather than a reduction.

**Line-draw only touches strokes.** Filled shapes are left alone — a dash offset
on a closed fill just hides it, which reads as a bug rather than an animation.
The hero trend line is measured separately since it sits outside any
`[data-draw]` svg.

**Dot fill is JS-driven, not CSS.** It reads the same clock that advances the
slide, so pausing autoplay on hover cannot leave the fill and the timer out of
step.

## Behaviour notes

- **Scroll reveals** use IntersectionObserver with a 400ms interval backstop.
  The backstop matters: IntersectionObserver never fires while a document is
  hidden (background tab, prerender, some webviews), which would otherwise
  leave the page permanently at `opacity: 0`.
- **The backstop tests one side only** — "has the element reached the trigger
  line", not "is the element on screen". A poll only sees the scroll position at
  the instant it runs, so a fast scroll can step clean over an element without
  it ever being in the viewport. Requiring `r.bottom > 0` would strand those at
  `opacity: 0` permanently. The counters backstop has the same fix.
- **Stat counters** tween off a timer, not `requestAnimationFrame`, reading
  `performance.now()` for the same reason rAF is avoided — it is throttled to a
  stop in a hidden document.
- **Magnetic buttons** capture their un-translated rect on `pointerenter`.
  Measuring inside `pointermove` would feed the button's own offset back into
  the maths and the button would chase the cursor with growing amplitude.
- **Logo marquee** is two identical tracks sliding left by their own width, so
  the second takes over exactly where the first left off. The clone has all `id`s
  stripped, since a deep clone otherwise duplicates them in the document;
  gradient references still resolve because every illustration points at one
  shared `<defs>` block.
- **The closed search overlay must not intercept clicks.** `.search` sets
  `display: grid`, which beats the UA's `[hidden] { display: none }` — so with
  `position: fixed; inset: 0; z-index: 150` the invisible panel silently
  swallowed *every* click on the page. Fixed with `.search[hidden] { display: none }`
  plus `.search:not(.is-open) { pointer-events: none }`, and by flipping `is-open`
  synchronously with a layout flush rather than inside `requestAnimationFrame`.
- **Search** filters a hardcoded index and is rooted per-page: on a sub-page the
  in-page destinations are prefixed with `index.html`, on the homepage the
  prefix is empty so smooth scrolling still applies.
- **Carousel dots** are padded to a 28px (46px active) touch target while the
  visible pill stays 9px, clearing the WCAG 2.2 target-size floor.
- `prefers-reduced-motion` is honoured throughout, and there is a print
  stylesheet.

## The contact form

The site is static, so there is no server to POST to. Rather than ship a form
that silently fails, submitting composes a `mailto:` link with the fields
pre-filled and hands it to the visitor's mail client. The markup still carries
`action="mailto:..."` so the form degrades to a plain (if ugly) mailto submit
when JavaScript does not run. **It sends nothing from the browser.**

## Placeholders to replace

Clearly marked in the markup; these are the only invented details:

- **Client logos** — 6 fictional colour lockups in the trust band. Each is a
  gradient glyph plus a wordmark; swap the text and glyph for a real client's
  logo. The gradient ids live in the shared `<defs>` at the top of the body.
- **Testimonial attributions** — `Client name` / `Role, Company`, tagged
  `data-placeholder="true"`
- **Stat figures** — 12+ years, 180+ products, 96% retention (homepage);
  5+ / 67+ / 36% (`about.html`); "24 active engagements", "96% on-time delivery",
  "58 engineers deployed" and the throughput figures under the chart (the hero
  dashboard mock)
- **Social links** — well-formed but invented handles
  (`linkedin.com/company/desat-infotech`, `x.com/desatinfotech`,
  `github.com/desat-infotech`). They will not resolve to live profiles.
- **Case studies and blog listings** — placeholder summaries marked as awaiting
  sign-off; no real client is named
- **Roles on `careers.html`** — placeholder listings; nothing is advertised as
  open until a hiring manager confirms it
- **`terms.html` and `privacy.html`** — placeholder legal copy. Both must be
  reviewed by a qualified lawyer and reconciled with the third-party services
  actually in use (Google Fonts) before launch.

**Contact details are real, not placeholders.** `desatinfotech@gmail.com`,
`+91 97150 12063` and the Salem address are the business's own details, entered
once in `COMPANY` in `tools/data.js` and rendered into the CTA band, the contact
page hero and the footer address block of every generated page — and repeated in
`index.html`, which the generator deliberately never writes to. The contact
form's `mailto:` in `script.js` uses the same address. Everything now points at
one place: change `COMPANY`, re-run `node tools\build.js`, done.

The copy itself is written fresh for Desat Info Tech; no text or artwork was
copied from the reference site. **The imagery is original and is being kept** —
every logo, scene, mock and illustration here was drawn for this build, so
nothing needs licensing or attribution. The items above are placeholders because
they stand in for real facts, not because they stand in for someone else's
assets; the client logos are the only ones worth replacing, and only with logos
a real client has approved.

## Verification

Checked programmatically. **This model has no image input, so nothing was
eyeballed** — every claim below comes from computed styles, DOM state, real
hit-testing and audits.

- **Static audit** (`node tools\audit.js`) across all 17 pages: 901 internal
  links, 88 in-page anchors, 301 ids — 0 dead links, 0 unresolved anchors,
  0 duplicate ids, exactly 1 `h1` per page, 0 heading-level skips.
- **Content island**: 16 of 16 sub-pages inlined (166 KB), every entry parses and
  contains real section markup, no unexpected or missing keys.
- **Load entrance**: `document.getAnimations()` lists every staged animation at
  the intended time — `sheen` (50ms/2.6s), `dropIn` ×8 (50–450ms), `markIn` /
  `markDraw` ×4 / `markDot` (40 / 200 / 820ms), `popIn` ×3 (1.02–1.22s),
  `barGrow` ×8 (1.26–1.68s) — and the hero reveals resolve `is-in` at delays of
  160 / 340 / 640 / 760 / 900ms.
- **Nothing is hidden behind the entrance.** With `animation` and `transition`
  neutralised, every animated element reports its finished state: sheen
  `opacity: 0`, brand `opacity: 1`, `mk__stem` `stroke-dashoffset: 0px`, the dot
  and bars at `scale: none`, tiles and the trend line at full. With `js-motion`
  removed from `<html>` — i.e. script never running — the pill, H1 and product
  panel all report `opacity: 1`.
- **Heading highlights removed**: `document.querySelectorAll('mark.hl')` is 0 on
  the homepage, on a generated sub-page and inside the viewer body.
- **Industries**: `.illus` measures 118 × 118 on a `0 0 120 120` viewBox, inside
  a 460 × 150 art box — down from a full-width drawing at roughly 460 × 304.
- **Contact details** resolve on both the hand-authored homepage and a generated
  page: `mailto:desatinfotech@gmail.com`, `tel:+919715012063`, the three-line
  address in the CTA band and the footer, and the form's `action`.
- **Lighthouse 100 accessibility / 100 best practices / 100 SEO, zero failures**
  on `index.html`, `services.html`, `service-saas-product-development.html`,
  `contact.html` and `about.html`.
- **Row interaction sweep by real pointer sequence** (`pointerdown` → `mousedown`
  → `mouseup` → `click` at a hit-tested point, not `.click()`): all 8 row
  toggles expand, `aria-expanded` flips, all 8 panels measure 1801–2069px of
  real height, all 8 open independently, toggling collapses again, and a
  collapsed panel reports `visibility: hidden`.
- **Page viewer end-to-end**: hero CTA → viewer renders `services.html`
  (10.5 KB, 8 service cards); a link inside the viewer renders the service page
  (breadcrumbs + 3 FAQs); the crumb's Home link closes the viewer. Backdrop
  click dismisses; Escape dismisses; the Close button dismisses.
- **Contact form inside the viewer**: injected form keeps working — labels
  resolve to the namespaced ids, and the delegated submit handler pre-fills the
  `mailto:` and updates the note.
- **Search**: open → panel is `pointer-events: auto` and sits on top of the page
  → close → `hidden` + `display: none` + `pointer-events: none`.
- **All 30 animated elements** resolve to a real keyframe; 0 report
  `animation-name: none`; 12 keyframes in use across the 8 scenes.
- Tabs, carousel (`translateX(0%)` → `-100%`, 4 dots) and the burger nav all
  toggle and reverse under real pointer sequences.
- **No horizontal overflow** at 1000px on `index`, `services`, `contact`,
  `about`, a service page and `terms`; no overflow inside the expanded row
  panels or the viewer body; the dialog box fits the viewport.
- **Zero console errors or warnings** across the whole interaction sweep.

Three environment caveats worth knowing:

- **The preview panel serves one file.** `index.html` therefore carries every
  other page's markup inline — see *The in-page page viewer* above. Without the
  island, links to sibling files produce *"no url found"*.
- In a headless or background tab Chrome **freezes the animation timeline**, so
  transition end states cannot be read via `getComputedStyle` — elements report
  their start value forever. End states were confirmed by neutralising the
  transition list and reading the resolved cascade.
- **No viewport emulation and no screenshots are available to this model**, so
  the responsive breakpoints were verified by inspecting the media queries and
  their declared values rather than by rendering at each width, and **nothing
  here has been eyeballed**.

## Browser support

Current Chrome, Edge, Firefox and Safari. Uses `IntersectionObserver`,
CSS custom properties, `clamp()`, `backdrop-filter`, `mask-image`, `:has()` and
the independent `translate` / `rotate` / `scale` properties. The `mask-image` on
the marquee is progressive enhancement — without it the marquee still scrolls,
just without the soft edge fade.
