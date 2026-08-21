/**
 * Implementation-detail layer of `@jiscribe/canvas`, exposed for plugin authors
 * (#144 tier 2: frame-based implementations). Unlike the stable API (`.`), this is NOT
 * covered by semver compatibility guarantees and may change without notice.
 *
 * This entry carries state / rendering / control dependencies (react /
 * @emotion). The headless schema-side helpers a plugin's `schema/**` needs
 * (createFrameObjectFactory / createFrameDocValidator / validateOptionalNumber /
 * ObjectDocValidateFn / AUTO_COLOR / DEFAULT_FONT_FAMILY) live in `./unstable-doc`
 * so they can be imported without pulling in the UI.
 */

export { createFrameObject } from "./rendering/objects/base/createFrameObject";
export type {
	FrameShapeProps,
	FrameTextOverlayProps,
	FrameTextOverlayRenderer,
} from "./rendering/objects/base/createFrameObject";
export type { TextEditable } from "./rendering/objects/base/TextOverlay/TextOverlay";

// Container for shapes whose body is not plain text (Markdown and the like). The display
// side and the core editing surface must share one visual contract (line-height / padding /
// placement / color and font resolution), so the container stays in core and only its
// contents are swapped. Use together with createFrameObject's renderTextOverlay.
export { TextOverlayFrame } from "./rendering/objects/base/TextOverlay/TextOverlayFrame";
export type { TextOverlayFrameProps } from "./rendering/objects/base/TextOverlay/TextOverlayFrame";

// For shapes that keep plain-text bodies but vary typography per slot (a record's title
// band, say). Pass the props from renderTextOverlay straight through and override only
// what needs to change.
export { TextOverlay } from "./rendering/objects/base/TextOverlay/TextOverlay";

// Only for a type that draws its own component instead of going through
// createFrameObject (which resolves this already): the per-canvas registry of
// text-style defaults, keyed by type and slot id. Resolve the slot through it
// before handing its fields to
// TextOverlay, or the drawn text and the editing surface — which always resolves —
// disagree wherever the type's defaults differ from TEXT_STYLE_FALLBACK.
export { useObjectTextStyleDefaultsRegistry } from "./rendering/objects/registry/ObjectTextStyleDefaultsRegistryContext";

// The active theme, for a component that has to read the host's handle
// dimensions (zoom-adjusted geometry).
export { useCanvasTheme } from "./theme/CanvasThemeContext";

export { createFrameBehavior } from "./controllers/behaviors/base/FrameController";

export { createFrameMapper } from "./states/objects/base/FrameMapper";

export { createFrameStateValidator } from "./states/objects/utils/createFrameStateValidator";
export type { StateRecord } from "./states/objects/utils/validateStateUtils";

// Reading a shape's own text off its state, for a renderer or a bounds calculator
// that has to branch on whether a slot is empty. The keys of `TextSlots` are the
// authority on the slots a shape has (there is no separate declaration).
// A renderer that draws the text takes readRichTextSlot instead: readTextSlot
// flattens per-range styling away, so drawing from it silently drops the runs.
export {
	readRichTextSlot,
	readTextSlot,
} from "./states/objects/types/TextSlots";
export type { TextSlots } from "./states/objects/types/TextSlots";

// For a type that draws its own group instead of going through createFrameObject
// (the sticky's shadowed paper, say): the same two derivations createFrameObject
// makes internally. `calcTextRegion` is the seam the in-place editor also goes
// through, so a renderer that places text itself must use it or the text jumps
// on entering edit mode.
export {
	calcTextRegion,
	calcFullTextRegion,
} from "./rendering/objects/utils/calcTextRegion";
export { createSvgTransform } from "./rendering/objects/utils/createSvgTransform";

export { resolveAutoColor } from "./rendering/objects/utils/resolveAutoColor";
export type { AutoColorRole } from "./rendering/objects/utils/resolveAutoColor";

// The box a text of its own takes — the `text` object's frame, and every label a
// shape sizes from its content rather than from its box. Laid out as authored, so
// the box grows sideways with the longest line and breaks only where the author
// typed a newline; nothing here wraps, and no caller has to reproduce the
// display-side wrapping to find its height.
export { calcTextBlockSize } from "@jiscribe/doc/text/calcTextBlockSize";

// For shapes deriving a text box's size from its content: measureTextWidth gives the
// width of one line, calcVisualLineCount the number of lines by reproducing the
// wrapping of the display-side CSS (pre-wrap + break-word), and calcVisualTextHeight
// what those lines add up to — which is not the count times the type size once part
// of the text is drawn larger, or in another font family (RichText).
export {
	calcVisualLineCount,
	calcVisualTextHeight,
	layoutVisualLines,
	measureTextWidth,
} from "@jiscribe/doc/text/measureText";
export type {
	TextMeasureFont,
	VisualLine,
} from "@jiscribe/doc/text/measureText";

export { PRECISION } from "@jiscribe/doc/model/precision";

// ---------------------------------------------------------------------------
// Phase A: type-specific selection control parts (packages/canvas/docs/12-plugin-architecture.md)
// ---------------------------------------------------------------------------

export { ControlStrategy } from "./controllers/gestures/registry/ControlStrategy";

export { SelectionControlPill } from "./controllers/ui/controls/SelectionControlPill";
export { getResizeCursorForRotation } from "./controllers/ui/utils";

// ---------------------------------------------------------------------------
// ObjectMenu UI kit (packages/canvas/docs/12-plugin-architecture.md)
// ---------------------------------------------------------------------------
// Grammar ObjectMenuHandler resolves for `data-part` under `data-kind="menu"`:
//   - `toggle:{sectionId}`     open/close a section
//   - `set:{property}:{value}` update the selected object's property, committing at once
//   - `command:{commandId}`    run a command
//   - `slider:{property}`      slider (drag previews; dragEnd and a track click commit)
// See packages/canvas/docs/04-gesture-system.md. Plugins should combine the shared parts
// below or call `onPropertyUpdate`; writing `data-part` directly couples them to internals
// and is discouraged.

export {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "./controllers/ui/menu/ObjectMenu/ObjectMenuStyled";

// The swatch shown on a color menu's toggle button (a filled circle, checkered
// when transparent). Pair it with a dropdown panel of your own swatches when the
// type picks from a palette other than ObjectMenuColorPickerGrid's.
export { ColorPreviewIcon } from "./controllers/ui/icons/ColorPreviewIcon";

export { ObjectMenuDropdownPanel } from "./controllers/ui/menu/ObjectMenu/common/ObjectMenuDropdownPanel";
export { ObjectMenuColorPickerGrid } from "./controllers/ui/menu/ObjectMenu/common/ObjectMenuColorPickerGrid";
export { ObjectMenuSlider } from "./controllers/ui/menu/ObjectMenu/common/ObjectMenuSlider";

export { useSubmenuPosition } from "./controllers/ui/menu/ObjectMenu/hooks/useSubmenuPosition";
export type { SubmenuPlacement } from "./controllers/ui/menu/ObjectMenu/hooks/useSubmenuPosition";

export { getFirstSelectedWithProp } from "./controllers/ui/menu/ObjectMenu/utils/getFirstSelectedWithProp";

export { useCanvasMessages } from "./controllers/messages/CanvasMessagesContext";
export { useCanvasLocale } from "./controllers/messages/CanvasLocaleContext";
export {
	resolveLocaleMessages,
	resolveLocalizedLabel,
} from "./controllers/messages/resolveLocaleMessages";
export type { LocaleMessages } from "./controllers/messages/resolveLocaleMessages";

// Re-exported as `canvasThemeCssVars` because `theme` alone is too generic a name.
// The value is the `--jiscribe-*` CSS variables plus a dark-theme fallback
// (see theme/CanvasTheme.ts).
export { theme as canvasThemeCssVars } from "./constants/theme";

// The scrollbar the canvas's own scrollable panels wear (the text editor, the shortcut
// help). A plugin panel that scrolls has no other way to match them, and a default
// browser scrollbar next to a custom one is exactly the kind of seam a plugin should not
// be introducing.
export { SCROLLBAR_WIDTH, scrollbarStyles } from "./constants/scrollbarStyles";
