> 🌐 日本語版: [08-rendering-and-theme.ja.md](./08-rendering-and-theme.ja.md)

# Rendering and Theme

The role of the rendering layer (`rendering/`) and the conventions for handling color.

## The rendering layer is pure rendering

Components under `rendering/` **receive State via Props and render SVG**. They neither hold nor
change the document or canvas state, and they take no event handlers either: what can be interacted
with is declared through the `data-kind` / `data-id` / `data-part` attributes, and the gesture system
at the root receives it and dispatches it to handlers ([Gesture System](./04-gesture-system.md)).
Local state confined to drawing is allowed (e.g. `CanvasView.tsx` keeps `useState` / `useLayoutEffect`
to derive the grid-line color from the background as painted).
The dependency contract is that they do not depend on `controllers` (a prohibition from
[Architecture](./02-architecture.md)); they may reference `states` (types and pure functions) and
`theme` (the theme tokens).

Main structure:

- `layers/` … the layers, one per render stacking level
- `objects/` … per-shape components and the parts they build on (e.g. `primitives/`, `connector/`, `base/TextOverlay`)
- `defs/` … the canvas-wide SVG `<defs>`; the canvas holds nothing of its own there and lists the `svgDefs` registered object types ship (filters, gradients, etc.)

By committing to pure rendering, the presentation is determined purely as a function of state, making it easy to test and reuse.

## Choose between "presentation attribute" and "CSS" for color

The deciding factor is not emotion vs. inline style, but rather **whether a presentation attribute suffices, or whether CSS-function resolution is required**.

- Static colors that do not use CSS functions → an SVG presentation attribute is enough (`fill="currentColor"`, `stroke="#888"`, etc.).
- Using `var(--jiscribe-*)` or `color-mix()` → **these are not resolved by presentation attributes**.
  Apply them as CSS properties (`style={{ fill: ... }}` or emotion).

### Choosing between emotion and inline style

- Component chrome (containers / buttons / panels / inputs, etc.—anything with `:hover`, state, or layout) → emotion `styled`.
- Small SVG fills inside icons, where CSS is needed solely for CSS-function resolution → inline `style`.
  Since the icon set is unified around plain SVG attributes, do not mix emotion and attributes within a single icon.

Relevant code examples:

- `style={{ fill: theme.transparentChecker }}` … `controllers/ui/icons/ColorPreviewIcon.tsx`
- `style={{ stroke: theme.transparentChecker }}` … `controllers/ui/icons/BorderColorIcon.tsx`

## Distinguish UI chrome (theme tokens) from shape-data colors

There are two kinds of color with different natures, and their origins must always be kept separate.

|               | UI chrome                                      | Shape data                                   |
| ------------- | ---------------------------------------------- | -------------------------------------------- |
| Examples      | menus, toolbars, selection frames, snap guides | a shape's `fill` / `stroke` / `fontColor`    |
| Origin        | theme tokens in `theme/themeTokens.ts`         | values saved in the document (`.jis`)        |
| Follows theme | yes (follows the host-injected theme)          | no (data specified by the user) ※except auto |

### `"auto"` (theme-following color) — an exception in shape data (issue #38)

As an exception, shape-data colors permit the sentinel value `"auto"`. `"auto"` carries the
unambiguous **data-level meaning** of "no concrete color specified = follow the theme," and because
the saved value does not become theme-dependent, it does not break portability. The default `stroke` /
`fontColor` for new shapes is this `"auto"`.

- **Storage**: `.jis` and State retain `"auto"` as-is. The Mapper does not convert it.
- **Resolution**: at render time, `rendering/objects/utils/resolveAutoColor.ts` resolves it to a
  theme color **per role** (described below, along with the exception).
- **Explicit color**: once the user picks a concrete color in the color picker, it is saved as a concrete
  value at that point and thereafter displayed theme-independently as before (backward compatible).

#### auto resolves to a theme token per role

The color that `"auto"` "should follow" is determined by the field's role. Shape-data auto is resolved
by `resolveAutoColor(value, role)` (`rendering/objects/utils/resolveAutoColor.ts`). The roles and what
each resolves to are defined there (`AutoColorRole` and its token table); for example:

- Ink (`ink`) … `stroke` / `fontColor` → `theme.objectInk` (`var(--jiscribe-object-ink)`)
- Surface (`surface`) … `fill` → `theme.objectSurface` (`var(--jiscribe-object-surface)`)

`objectInk` / `objectSurface` are shape-only tokens, separate from the UI chrome's `foreground` / `surface`,
so a host can set the shape ink (e.g. pure black on a light theme) without changing its menu text color.

A connector label's background (`fill`) is the exception: it bypasses `resolveAutoColor`, and
`resolveLabelFill` (`rendering/objects/connector/ConnectorLabel/utils/resolveLabelFill.ts`) resolves auto
and an unspecified value to the canvas surface color, `theme.canvasBg` (so the label knocks out the line
behind it).

**Single rule**: "auto resolves to the role's theme token, and color is applied via CSS." Because
`var(--jiscribe-*)` is not resolved by SVG presentation attributes, **color is never applied via attributes**,
including stroke / fill / arrow color.

- Since shape elements are emotion `styled` (`RectElement`, etc.), the resolved color is **passed via the
  `strokeColor` / `fillColor` props and interpolated as CSS on the styled-definition side**. emotion
  interpolates strings into the template, but the CSS safety (injection defense) of the interpolated color
  and font values is already guaranteed at the **external-input boundary** (the parser's two-stage
  validation / clipboard state validation), so no sanitization is performed at the sink (Principle 4).
- For plain SVG elements without styled (render previews' `<rect>`, icons, etc.), apply it via inline `style`.

This makes both the kind of resolved value and the method of applying it consistent across all fields.
It does not rely on implicit resolution via `currentColor` or a `color` setting on `ContentGroup`
(eliminating the previous coexistence of two schemes: "foreground uses currentColor, surface uses a token"
and "attribute vs. style").

- The "surface + foreground" pairing (fill:auto + fontColor:auto) preserves readability, just like VSCode's
  surface↔foreground pair. The default for `fill` remains `"transparent"` (no fill), and `"auto"` is a
  separate option.
- Since Sticky has a fixed colored background, its `fontColor` is not set to `"auto"` and stays at `#000000`.
- The color previews in the UI chrome (the swatches in the ObjectMenu and the properties panel) resolve
  auto through the same functions rendering does (`resolveAutoColor`, and `resolveLabelFill` for the
  label background) and are handed the token color. The resolved value can be a `var(--jiscribe-*)`, so
  `ColorPreviewIcon` applies its fill via inline `style`.

## Host theme injection (issue #150)

Theming is host-injectable and neutral — the canvas knows nothing about VSCode.

- **Neutral tokens**: `theme` (`theme/themeTokens.ts`) references neutral `--jiscribe-*` CSS custom
  properties, each with the dark preset value as its fallback (`var(--jiscribe-foreground, #cccccc)`).
  emotion styles can stay static module-level constants because the theme resolves at CSS time.
- **Injection**: the host passes a `CanvasTheme` (`theme/CanvasTheme.ts`) via the Canvas / CanvasThumbnail
  `theme` prop. The Canvas root injects `theme.tokens` as `--jiscribe-*` custom properties
  (`theme/themeCssVars.ts`); custom properties inherit, so every descendant style resolves them.
- **Two delivery paths**: CSS-consumed tokens flow through the custom properties; JS-consumed values
  (e.g. handle dimensions, for zoom-adjusted geometry, and `colorScheme` below) flow through `CanvasThemeContext`
  (`useCanvasTheme()`) and must be concrete values, never `var(...)` strings.
  - **Why fonts are not on the theme**: a box derived from its content is measured in JS against the
    family the doc names (`@jiscribe/doc`'s `text/layout`), so a family the canvas does not ship is one it cannot
    measure faithfully — the box comes out sized for a face the text is not drawn in. The families a
    document may name are therefore a closed set (`CANVAS_FONT_FAMILIES`, shipped by
    `@jiscribe/canvas/fonts.css`), and a slot naming none falls back to `DEFAULT_FONT_FAMILY`. That
    constant is the single fallback: every drawing and measurement site imports it directly rather
    than being handed a family from above, and it is also what a newly created shape is written with.
  - **Why a loaded font is a second signal**: the family alone does not settle what text measures.
    Web fonts arrive after the first paint, so a box derived from its content is measured against
    the stack's generic keyword and drawn moments later in a face with other metrics.
    `useFontsLoadedNonce` watches `document.fonts` (`ready` for the first layout, `loadingdone` for
    the later unicode-range fetches a JP character triggers) and returns a counter. Canvas turns a
    change in it into a `REMEASURE_TEXT` dispatch, which re-runs `reconcileObjectContentSizes` with
    its `forceRemeasure` flag — the one pass the slots cannot ask for. That covers the arrivals
    nobody waited for; the mounted document's own faces are covered by the preload gate below, which
    dispatches its own re-measure as it settles. Neither hook is reached directly: `useDocFonts`
    (`controllers/hooks/useDocFonts.ts`) is the entry point Canvas and CanvasThumbnail take, with
    those two behind it — it folds them into one counter and one `onFacesChanged` callback and
    reports whether the content is still held back.
    `CanvasThumbnail` has no reducer to dispatch through, so it takes both signals as a memo key on
    `canvasToState` instead. A pass that moves no box returns the same state reference, so the
    two events overlapping costs nothing. A dispatch only reaches boxes that live in the state, so
    the render layer is handed a counter as `FontsLoadedNonceContext` as well — this one plus the
    gate's settling, since neither says anything but "measure again". The sites
    that measure while they render (a record's bands, a connector's label box, a text object's hit
    bands) subscribe to it, and a change pierces their memo so the measurement re-runs. The faces
    themselves are opt-in: a host imports
    `@jiscribe/canvas/fonts.css` to get the ones `CANVAS_FONT_FAMILIES` names.
  - **Why the content waits for its faces**: the nonce repairs the layout, but visibly — the first
    frame is drawn against the fallback and snaps into place a moment later. So a canvas asks for
    the faces its document draws in before it shows anything. `collectDocFontRequests` walks the
    mounted state's text slots and connector labels — each slot resolved through the same type
    defaults the drawing side resolves, each run that overrides a family, weight or style counted as
    its own face — and yields one request per distinct face with the characters that face has to
    draw. `useDocFontsPreload` hands each to `document.fonts.load`. The characters are the point:
    with unicode-range subsets nothing is pending until text has been laid out, so `fonts.ready`
    settles at once and says nothing, while naming the text is what makes the browser fetch exactly
    the subsets the document needs. Until they arrive the scene is hidden — `visibility: hidden` on
    the content group, so it is still laid out (a hidden group still has the browser fetching what
    it draws) and the ground below it, background and grid, keeps showing. The gate opens on
    whichever comes first: every request settled, or `FONT_PRELOAD_TIMEOUT_MS` (2 s), a blank canvas
    past which is worse than the re-flow the nonce still repairs. Settling dispatches the
    `REMEASURE_TEXT` and flips the flag in one callback, so the frame that reveals the content is
    already measured against the faces it is drawn in. Only the document mounted with is covered: a
    document swapped in later goes through the nonce path alone. A host that never imported
    `fonts.css` loses nothing — with no face to fetch, the load resolves at once.
- **Standard themes**: `darkCanvasTheme` (the default; its values double as the token fallbacks) and
  `lightCanvasTheme` are exported from the package (`theme/themePresets.ts`).
- **`colorScheme`**: a theme field shapes read as a JS value (`CanvasColorScheme`). It names the ground
  the tokens paint (`"light"` / `"dark"`) for artwork that ships a rendition per ground and cannot be
  recoloured through tokens — the AWS icons pick their official Light or Dark drawing by it
  (`plugins/aws-shapes/src/presentation/AwsIconArt.tsx`, read through `useCanvasTheme()`). It is required
  rather than inferred from `canvasBg`, because a token may be a `var(...)` string the canvas cannot
  read. A host that keeps its tokens fixed but follows the editor's ground (VSCode) therefore holds one
  theme per scheme and swaps them.
- **VSCode mapping layer**: the VSCode host (not this package) maps `--vscode-*` onto the neutral
  tokens by passing `var(--vscode-..., <dark fallback>)` strings as token values
  (`apps/vscode-extension/src/webview/vscodeCanvasTheme.ts`). That is the only remaining VSCode
  coupling, and it lives host-side.

### Details

- Render-only "generic" shapes (arrows, GroupIcon, etc.) do not import `theme` directly. Auto resolution
  of shape-data colors is delegated to the rendering layer's resolvers (`resolveAutoColor` and the like),
  and shapes merely receive the resolved color via props/`style`. Within the rendering layer, `theme` is
  referenced directly only where the theme itself is the subject, such as auto resolution and the canvas's
  own styles (`CanvasViewStyled.ts`). On the other hand,
  ObjectMenu-specific color icons (ColorPreviewIcon / BorderColorIcon, etc.) are UI chrome, so referencing
  `theme` tokens is permitted.
- The checkerboard of the transparent (none) indicator is expressed with `theme.transparentChecker`
  (the foreground color lightly overlaid), so its shading automatically inverts between light and dark.
  Do not use a fixed gray.
- Short-lived accent overlays (snap guides, etc.) are UI chrome too and are painted with theme tokens
  (`controllers/ui/feedback/SnapGuides/SnapGuides.tsx` uses `theme.handleAccent`). A token can be a
  `var(--jiscribe-*)`, so apply it via inline `style`, not a presentation attribute.
