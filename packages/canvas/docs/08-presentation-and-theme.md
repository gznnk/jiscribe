> 🌐 日本語版: [08-presentation-and-theme.ja.md](./08-presentation-and-theme.ja.md)

# Presentation and Theme

The role of the rendering layer (presentations) and the conventions for handling color.

## presentations are pure rendering (Dumb Components)

Components under `presentations/` **only receive State via Props and render SVG**;
they hold no state and contain no logic. Event handlers are received through Props.
Their only dependency is `presentations → states` (type references); they do not depend
on `controllers` (a prohibition from [Architecture](./02-architecture.md)).

Structure:

- `layers/` … render stacking order (`background` / `content`)
- `objects/` … per-shape components (`primitives/` / `connections/` / `annotations/`, `base/TextOverlay`, `arrows/`)
- `defs/` … SVG `defs` (filters, etc.)

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
| Origin        | theme tokens in `constants/theme.ts`           | values saved in the document (`.jis.json`)   |
| Follows theme | yes (follows the host-injected theme)          | no (data specified by the user) ※except auto |

### `"auto"` (theme-following color) — an exception in shape data (issue #38)

As an exception, shape-data colors permit the sentinel value `"auto"`. `"auto"` carries the
unambiguous **data-level meaning** of "no concrete color specified = follow the theme," and because
the saved value does not become theme-dependent, it does not break portability. The default `stroke` /
`fontColor` for new shapes is this `"auto"`.

- **Storage**: `.jis.json` and State retain `"auto"` as-is. The Mapper does not convert it.
- **Resolution**: at render time, `presentations/objects/utils/resolveAutoColor.ts` resolves it to a
  theme color **per role** (described below).
- **Explicit color**: once the user picks a concrete color in the color picker, it is saved as a concrete
  value at that point and thereafter displayed theme-independently as before (backward compatible).

#### auto resolves to a theme token per role

The color that `"auto"` "should follow" is determined by the field's role. Resolution is **consolidated
into a single function**, `resolveAutoColor(value, role)` (`presentations/objects/utils/resolveAutoColor.ts`).

| Role    | Target fields          | Resolves to (theme token)                                |
| ------- | ---------------------- | -------------------------------------------------------- |
| Ink     | `stroke` / `fontColor` | `theme.objectInk` (`var(--jiscribe-object-ink)`)         |
| Surface | `fill`                 | `theme.objectSurface` (`var(--jiscribe-object-surface)`) |

These two are shape-only tokens, separate from the UI chrome's `foreground` / `surface`, so a host can
set the shape ink (e.g. pure black on a light theme) without changing its menu text color.

**Single rule**: "auto resolves to the role's theme token, and color is applied via CSS." Because
`var(--jiscribe-*)` is not resolved by SVG presentation attributes, **color is never applied via attributes**,
including stroke / fill / arrow color.

- Since shape elements are emotion `styled` (`RectElement`, etc.), the resolved color is **passed via the
  `strokeColor` / `fillColor` props and interpolated as CSS on the styled-definition side**. emotion
  interpolates strings into the template, but the CSS safety (injection defense) of the interpolated color
  and font values is already guaranteed at the **external-input boundary** (`parseCanvasText`'s two-stage
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
- The color preview icon in the UI chrome is at a different layer from shape-data resolution
  (`resolveAutoColor`); following chrome convention, it indicates auto with `currentColor` (the chrome foreground).

## Host theme injection (issue #150)

Theming is host-injectable and neutral — the canvas knows nothing about VSCode.

- **Neutral tokens**: `theme` (`constants/theme.ts`) references neutral `--jiscribe-*` CSS custom
  properties, each with the dark preset value as its fallback (`var(--jiscribe-foreground, #cccccc)`).
  emotion styles can stay static module-level constants because the theme resolves at CSS time.
- **Injection**: the host passes a `CanvasTheme` (`theme/CanvasTheme.ts`) via the Canvas / CanvasThumbnail
  `theme` prop. The Canvas root injects `theme.tokens` as `--jiscribe-*` custom properties
  (`theme/themeCssVars.ts`); custom properties inherit, so every descendant style resolves them.
- **Two delivery paths**: CSS-consumed tokens flow through the custom properties; JS-consumed values
  (handle dimensions for zoom-adjusted geometry, `fontFamily` for canvas text measurement and
  new-shape defaults) flow through `CanvasThemeContext` (`useCanvasTheme()`) and must be concrete
  values, never `var(...)` strings. The default fontFamily also reaches doc creation via
  `state.docDefaults` → `ObjectFactory` (`pickSupportedDocDefaults` applies it only to shapes whose
  DOC_DEFAULTS declare `fontFamily`).
  - **Why fontFamily has both a Context and a state route**: the two consumers have opposite
    structural constraints. The rendering side must work without a reducer (`CanvasThumbnail` has
    none, yet connector-label measurement needs a font) → Context with a default value. The creation
    side runs outside React (gesture handlers are pure `(state, gesture) → state` functions inside
    the reducer, where `useContext` cannot reach) → controller state. Both routes derive from the
    same `theme` prop in Canvas.tsx (state is kept in sync via `SET_DOC_DEFAULTS`), so the source of
    truth is single. Rejected alternatives: attaching docDefaults to every GESTURE action (leaks
    theme concerns into the recognizer layer) and a module-level mutable default (hidden state;
    breaks multiple Canvases with different themes on one page). Unifying the routes would mean
    moving doc creation out of the reducer, which is not worth losing the reducer's determinism
    and state-transition testability.
- **Standard themes**: `darkCanvasTheme` (the default; its values double as the token fallbacks) and
  `lightCanvasTheme` are exported from the package (`theme/themePresets.ts`).
- **VSCode mapping layer**: the VSCode host (not this package) maps `--vscode-*` onto the neutral
  tokens by passing `var(--vscode-..., <dark fallback>)` strings as token values
  (`apps/vscode-extension/src/webview/vscodeCanvasTheme.ts`). That is the only remaining VSCode
  coupling, and it lives host-side.

### Details

- Presentational "generic" shapes (arrows, GroupIcon, etc.) do not import `theme` directly. Auto resolution
  of shape-data colors is delegated to the rendering layer's `resolveAutoColor` (the single point of theme
  coupling), and shapes merely receive the resolved color via props/`style`. On the other hand,
  ObjectMenu-specific color icons (ColorPreviewIcon / BorderColorIcon, etc.) are UI chrome, so referencing
  `theme` tokens is permitted.
- The checkerboard of the transparent (none) indicator is expressed with `theme.transparentChecker`
  (the foreground color lightly overlaid), so its shading automatically inverts between light and dark.
  Do not use a fixed gray.
- Short-lived accent overlays (snap guides, etc.) work in both themes even with a vivid fixed color, so do
  not force them into the theme. Consider tokenizing only when a color conflict arises.
