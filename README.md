# QGI [Quality Glass Industries] glass shop kiosk
## aka: the world's stupidest tool
the one and only tool, that runs off my laptop fully, because i cant be bothered to migrate this to whatever fucking [servers](https://www.youtube.com/watch?v=dQw4w9WgXcQ) i can get off google and/or pay with a giftcard
the tool that is just **so** stupidly autistic it cant be bothered to not be vibecoded
the one tool i used up all my [claude dot ai](https://www.youtube.com/watch?v=dQw4w9WgXcQ) usage on

that is right
# this glass shop kiosk
built for my family's glass shop
except its also for some reason on github
because i couldnt be bothered to just use [localhost](https://reddit.com/r/evilautism) (<- yes that is a reddit link in my real github profile thats public
## r u hr? or my unc?
uhhh. i can 100% defo explain the 2 rickroll links in this page. or the code. definitely. totally. /j

# Changelog

## 1.0.5
**Authored by** claude sonnet 4.6

### ui
- additions now have an animation for when u select them
- also transitions now work faster than HRT can

## v1.0.4
**Authored by** Claude Sonnet 4.6 (Anthropic)

### UI
my weekly limit is made of utter vibes lololol
one line fix
addition cards no longer try to be as tall as their counterparts

## v1.0.3
**Authored by** Claude Sonnet 4.6 (Anthropic) x @legobele
### bugfixes
removed the dashed -1" off edge extension line and its label entirely
fixed the angle arc geometry — was drawing from 0→angle in the wrong orientation which caused the squished-parallelogram shape. now correctly anchored at the bevel start point, sweeping from horizontal (0) downward by angle_rad, matching what your paint diagram showed
bevel footprint now scales properly with angle: steep (45°) = short wide cut, shallow (5°) = long narrow cut, all clamped to canvas width

size input — fraction picker:

numpad now has whole-inches keys (0-9, 00, ⌫) + a 16-button fraction grid (0, 1/16", 1/8"... 15/16") rendered below
selected fraction highlights in blue, tapping another updates it
display shows e.g. 24 3/8" not 24.375
stores as decimal internally (24.375) for math/server, displays as fractions everywhere facing the user
toFracStr() handles the decimal→fraction display conversion throughout (review slide, size display, etc.)

edge rounding radius — fraction picker:

slider completely gone, replaced with a compact grid of fractions from — (none) up to 1/2" (reasonable max for corner rounding)
same visual style as the size fraction grid
diagram scales the arc proportionally to the selected inch value
serializes to server as e.g. radius=1/4" instead of radius=6mm
default state is 0 (unselected) not 6mm

## v1.0.2
**Authored by** Claude Sonnet 4.6 (Anthropic) x @legobele

### bugfixes
the DIAGRAMS. OH GOD. MAY GOD HELP US ALL

## v1.0.1
# QGI Kiosk — Change Log 1.0.0 → v1.0.1
**Date:** 2026-03-21  
**Authored by:** Claude Sonnet 4.6 (Anthropic)  
**Previous file:** index.html (v1.0.0, ~1393 lines, slide-based)  
**New file:** index.html (v1.0.0, ~1500 lines, slide-based)

### bugfixes (oh god)
- the thickness selection WORKS NOW!!!!!! YAY!!!!!!
- the spanish version speaks puertorican spanish fully!!!
- vibes
- the autism autism'd back here lol

## v1.0.0
# QGI Kiosk — Change Log v0.7 → v1.0.0
**Date:** 2026-03-21  
**Authored by:** Claude Sonnet 4.6 (Anthropic)  
**Previous file:** index.html (v0.7, ~1994 lines, scroll-based)  
**New file:** index.html (v1.0.0, ~1393 lines, slide-based)

---

## ARCHITECTURE

### Old
Single-page scroll. All steps visible simultaneously on the DOM. Opacity/animation on `.step` divs but they all existed in normal document flow. User could theoretically see or interact with steps out of order.

### New
Full-screen slide system. Each slide is `position:absolute; inset:0`. Only `.active` slide is visible and interactive (`pointer-events:all`). Forward nav adds `.exit` (slides left) and new slide comes in from right. Back nav is reverse. A `history[]` stack tracks where you came from for the back button. `onSlideEnter()` hook fires per-slide to rebuild grids, update dots, etc.

---

## UI CHANGES

### Slide-based layout (was: scroll-based)
- `#kiosk` is `overflow:hidden`. Each `.slide` is absolutely positioned and fills 100vh.
- Transitions: `opacity + translateX` with `cubic-bezier(.4,0,.2,1)`.
- Slides: `sl-lang → sl-customer → sl-type → sl-size → sl-thick → sl-color → sl-add → sl-pay → sl-review → sl-success` (10 slides total).
- Back button in every chrome header; disabled (opacity:0) on lang slide and success slide.

### Header chrome
- Every non-lang slide has a sticky top header bar in `--blue` (`#005BAA`, Interglass-style blue).
- Contains: back button (← circle), brand name in Syne 800, step progress dots, EN/ES language badge.
- Progress dots: completed = faint white, current = full white pill shape, upcoming = very faint.

### Typography
- **Display:** Syne 800 (slide titles, brand name, language selection) — replaces Segoe UI everywhere.
- **Body:** DM Sans 400/500/600/700 — replaces Segoe UI. Loaded from Google Fonts.
- Old purple gradient aesthetic is completely gone.

### Color palette
- `--blue: #005BAA` primary (Interglass-inspired blue, replaces `#667eea` purple).
- `--bg: #eef2f7` page background.
- White surface cards with `var(--border): #d1dce8` borders.
- Accent: `--success: #16a34a` for additions selection, confirm button, success state.
- Warning: amber (`#fef3c7` / `#f59e0b` / `#92400e`) for full-lite alerts.

### Language selection (NEW SLIDE — was: corner toggle button)
- First slide shown. Full-screen, blue gradient background.
- Two large cards: 🇺🇸 English / 🇵🇷 Español.
- Choosing a language calls `setLang()` which sets `lang` and navigates to `sl-customer`.
- Language toggle badge still available on every subsequent slide for mid-flow changes.

---

## NEW SLIDES / STEPS

### Slide 1: Customer Info (was: no customer info step at all in v0.7 UI, added mid-scroll)
- Customer Name (required — enables Continue button via `validateCust()`).
- Project Name (optional).
- Both stored in `order.customerName` / `order.projectName`.

### Slide 2: Glass Type (NEW — was not a step)
- Two type cards: Float Glass / Laminated Glass.
- Two modifier switches below, enabled only when Float is selected:
  - 🔥 **Tempered** switch
  - 💎 **Ultra-Clear** switch
- Switches are rendered as pill toggles with animated track + thumb (CSS only).
- Switches are `.off` (opacity 0.38, pointer-events none) until Float is selected.
- Laminated disables and resets both switches.
- Resolved glass type displayed in a live indicator: "Selected type: Float / Tempered / Ultra-Clear / Ultra-Clear Tempered / Laminated".
- `resolveGlassType()` maps base + switches → catalog key: `float`, `tempered`, `ultra-clear-float`, `ultra-clear-tempered`, `laminated`.

### Slide 3: Size (was: Step 1 in v0.7)
- Width and Height shown as large tap targets (not `<input>` elements directly).
- Tapping opens the custom numpad modal (see below).
- Max cut size card shown below, dynamically populated per glass type from `LITE_SIZES`.
- Full lite banner (amber warning) shown when dimensions exceed max cut.
- Full lite check logic:
  - Checks all available lite sizes for the glass type.
  - Tries both orientations (W×H and H×W, since glass can be rotated).
  - If neither fits (W ≤ liteW-1 AND H ≤ liteH-1), flags as full lite.
  - Full lite flag saved in `order.isFullLite`.

**Lite size data (hardcoded, from spec):**
- Float / Tempered / Ultra-Clear: 130"×96" or 142"×98" (1" margin = cut limit is 129"×95" or 141"×97").
- Laminated: 71"×95" or 84"×130".
- Mirror 1/8": 83"×129". Mirror 1/4": 141"×97". *(Mirror is float type, size limit applies per thickness — currently uses float lite sizes as conservative fallback; a future improvement could check thickness-specific mirror limits.)*

### Slide 4: Thickness (was: Step 2 "Select Glass Thickness")
- `buildThickGrid()` runs on slide enter.
- Collects all thicknesses available across all colors for `order.glassType` from `GLASS_CATALOG`.
- Renders each thickness as an option card with a **visual bar diagram** (`th-visual` + `th-bar`).
- Bar height is set by CSS class (`th-1-8`, `th-1-4`, ..., `th-3-4`) — visually proportional.
- Card also shows metric equivalent (3mm, 6mm, etc.).
- Laminated cards show `X/2+PVB+X/2` badge.
- Picking a thickness resets `order.color` (since color options depend on thickness).

**Full thickness catalog (from spec):**
- Float Clear: 1/8", 5/32", 3/16", 1/4", 5/16", 3/8", 1/2", 5/8", 3/4"
- Float Ultra-Clear: 1/4", 3/8", 1/2"
- Float Gray: 1/4", 3/8", 1/2"
- Float Bronze: 1/8", 1/4", 3/8", 1/2"
- Float Blue-Green: 1/4", 3/8"
- Float Arctic Blue: 3/8"
- Mirror Clear: 1/4", 1/8"
- Mirror Clear w/ backing: 1/8"
- Mirror Bronze: 1/4"
- Mirror Antique: 1/4"
- Cianite Clear: 3/16"
- Cianite Bronze: 1/4"
- Rain Glass: 3/8"
- Barb Wire: 1/4"
- Acid Etch: 3/8", 1/2"
- White Lacquered: 1/4"
- Black Lacquered: 1/4"
- Optic White Lacquered: 1/8"
- Low-E: 1/4", 3/8", 1/2"
- Tempered: same as float minus mirror, barb, lacquered types
- Laminated Clear: 1/4", 5/16", 3/8", 1/2", 5/8", 3/4"
- Laminated Gray/Bronze/Blue-Green/White: 1/4"

### Slide 5: Color (was: Step 3 "Choose Glass Color")
- `buildColorGrid()` runs on slide enter.
- Filters `GLASS_CATALOG[glassType]` to only show colors that include the selected thickness.
- Each card has a **CSS swatch thumbnail** (110px tall, `glass-thumb` class + color-specific class).

**CSS swatch classes and their visual treatment:**
| Class | Visual |
|---|---|
| `sw-clear` | Light blue-gray diagonal gradient |
| `sw-ultra-clear` | Near-white gradient |
| `sw-gray` | Gray diagonal gradient |
| `sw-bronze` | Warm brown gradient |
| `sw-blue-green` | Teal gradient |
| `sw-arctic-blue` | Deep blue gradient |
| `sw-mirror-clear` | Multi-stop silver/white gradient (simulates reflection) |
| `sw-mirror-bronze` | Multi-stop bronze/gold gradient |
| `sw-mirror-antique` | Multi-stop warm brown gradient |
| `sw-mirror-back` | Greenish-gray gradient (backing film) |
| `sw-cianite-clear` | Repeating diagonal stripe (printed texture) |
| `sw-cianite-bronze` | Repeating diagonal stripe, bronze tones |
| `sw-rain` | Vertical gradient + `::after` repeating-linear vertical lines |
| `sw-barb-wire` | Gray + `::after` crosshatch grid |
| `sw-acid-etch` | Near-white + `::before` "FROSTED" text stamp |
| `sw-white-lac` | White gradient |
| `sw-black-lac` | Near-black gradient |
| `sw-optic-white` | Pure white |
| `sw-low-e` | Blue gradient + `::after` "Low-E" label |
- Laminated cards show `LAM` badge overlay.

### Slide 6: Additions (was: Step 4 — partial rebuild)
Cards that expand in-place when selected. Toggle with `toggleAdd()`. Details hidden when inactive.

**Beveling** (redesigned):
- Angle slider (5°–45°, default 15°).
- Side checkboxes (Top/Bottom/Left/Right), all checked by default.
- Live canvas diagram (`bevel-canvas`, 260×110) drawn with `drawBevelDiag()`.
- Diagram shows glass shape with beveled corners, highlights active sides in blue vs gray.
- Angle label drawn on canvas.

**Diamon-Fusion®** (kept, minor changes):
- Warning box: price varies by perimeter (amber).
- Lifetime warranty note (green success box).
- Removed "requires consultation" language — it's a straight-up selectable option.

**Edge Rounding** (redesigned):
- Radius slider (1mm–25mm, default 6mm).
- Live canvas diagram (`er-canvas`, 260×110) drawn with `drawERDiag()`.
- Shows rounded rectangle proportional to radius, with radius label.

**Sandblasting** (kept, simplified):
- Button/card with description.
- Info note about pattern being confirmed at counter.

### Slide 7: Payment Method (was: embedded in page, now full slide)
- Three cards: Cash / Credit+Debit / Apple Pay + Google Pay + ATH Móvil.
- Payment notice reminder (green box): payment processed at sales counter.

### Slide 8: Review (new dedicated slide)
- Sections: Customer, Glass (type/dims/thickness/color), Additions, Payment.
- Each section is tappable — navigates back to that step for editing.
- Full lite alert shown if `order.isFullLite === true`.
- Additions section shows checked list or "None selected".
- "Place Order" button (green) triggers `submitOrder()`.

### Slide 9: Success
- Animated check circle (CSS `@keyframes pop`).
- Large order ID in monospace font in blue box.
- QR code (via qrcodejs CDN) encodes: Order ID + Customer name + Project name as plaintext.
- Copy Order ID button (copies to clipboard, shows "Copied!" confirmation).
- Mobile save instructions: iOS long-press photo save, Android download image.
- Sales counter reminder.
- "Place Another Order" resets everything via `resetOrder()`.

---

## REMOVED FEATURES

### Time estimating system
Completely removed. No `estimatedTime`, no progress bar in the confirmation modal. As requested — employees handle this.

### Easter eggs
Removed. No ND family references, no test data quirks, no joke payment methods.

### Confirmation modal (popup)
Replaced by dedicated success slide (`sl-success`).

---

## SERVER.JS
**Not changed.** Zero modifications. Still on port 3000. All existing API endpoints intact. The kiosk posts to `/api/orders` with the same structure as before (plus new fields: `glassType`, `isFullLite`, `lang`). Server handles extra fields gracefully since it doesn't strip unknown keys.

**New fields in order payload** (backwards-compatible additions):
- `specifications.glassType` — resolved type key (e.g. `"tempered"`)
- `specifications.isFullLite` — boolean
- `specifications.lang` — `"en"` or `"es"` (language the customer used)
- Addition strings now include detail suffixes: e.g. `"beveling:angle=15:sides=top,bot,lft"`, `"edgerounding:radius=6mm"`

---

## TRANSLATION SYSTEM
- `T` object with `en` and `es` keys.
- All UI strings covered: labels, descriptions, button text, type names, color names, addition names.
- `applyI18n()` walks `[data-i18n]` and `[data-i18n-ph]` attributes.
- `t(key)` helper falls back to `en` if key missing in current lang.
- Color and type names have dedicated translation keys (`cClear`, `tFloat`, etc.) for use in the review slide.
- Note: `"Arctic Blue"` — the inventory reportedly has it misspelled as "Artic Blue". The kiosk corrects the spelling.
- Note: "Cianite" — kept as-is from inventory (appears to be a brand/internal name for printed glass).

---

## KNOWN LIMITATIONS / FUTURE WORK
1. **Mirror size limits per thickness** — currently uses float lite sizes as a conservative fallback. A future PR could implement thickness-specific mirror limits (1/8"→83×129, 1/4"→141×97).
2. **Inventory checking (Sortly API)** — not implemented, explicitly deferred per spec.
3. **More additions** — spec notes more additions will be added later.
4. **Keyboard input for size** — the numpad modal is shown for all users; no UA detection currently needed since `inputmode="none"` prevents virtual keyboards from conflicting. The numpad IS the input method for everyone, which is correct for a kiosk.
5. **QR code** — currently encodes plain text. Future work could encode a URL to the order tracker.
