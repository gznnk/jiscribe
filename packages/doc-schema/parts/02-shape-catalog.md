## Object quick reference

What each `type` is for. Pick the type that already means what you are drawing
rather than a `rect` with a label on it.

<!-- AUTOGEN:BEGIN object-quick-reference -->
<!-- AUTOGEN:END object-quick-reference -->

## Pictograms are symbols, not frames

`browserWindow` / `terminalWindow` / `smartphone` / `laptop` / `server` / `gear` /
`package` / `folder` / `file` / `envelope` / `queue` / `lock` / `shield` are
**pictograms**: symbols that stand for a thing in a diagram. Every detail they
draw — a title bar, a screen, teeth, a lid — is a fraction of the bounding box,
so they read at around their default size (roughly 100–160px) and distort when
blown up: a browser window scaled to a real screen becomes a giant title bar with
giant buttons. Give one a label and connect it to its neighbours; do not lay
content out inside it. **A screen mockup is `rect` for each region** (or
`container` for a titled one), with the pictogram left to mean "this is the web
UI".

## Where text is drawn

Every box shape draws its text somewhere inside its own box, but not always in
the middle of it, and for some types not inside it at all. Size the shape for
where its text actually goes.

- For `diamond` and `stadium`, text is placed within the full bounding box (not clipped to the shape interior).
- For `db`, text is placed in the body region below the top cap ellipse.
- For `cloud`, text is placed in a reduced central region inside the bumps, so give the shape generous width/height.
- For `document` and `callout`, text sits above the bottom wave/tail band.
- For `multiDocument`, text is confined to the front (bottom-left) sheet, so give the shape generous size.
- For `actor`, `server`, `package`, `envelope`, `queue`, `gear`, `lock`, `extract` and `cross`, the drawing fills the whole box and the text is drawn as a label below it, auto-sized to the text itself — so the box does not need to be widened for a long name, and omitting the text leaves a bare figure.
- **`record` is the exception**: its text is a set of named slots, and the typography lives inside each slot rather than on the shape (see "`record` — a titled box with compartments").
