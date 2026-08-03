/**
 * Implementation-detail layer of `@workspace/canvas`, exposed for plugin authors
 * (#144 tier 2: frame-based implementations). Unlike the stable API (`.`), this is NOT
 * covered by semver compatibility guarantees and may change without notice.
 *
 * This entry carries state / presentation / controller dependencies (react /
 * @emotion). The headless schema-side helpers a plugin's `schema/**` needs
 * (createFrameObjectFactory / createFrameDocValidator / validateOptionalNumber /
 * ObjectDocValidateFn / AUTO_COLOR / DEFAULT_FONT_FAMILY) live in `./unstable-doc`
 * so they can be imported without pulling in the UI.
 */

// Raw registry registration, downgraded from the stable layer (#144 §3): the
// declarative `CanvasPlugin.objects` is the intended path; this is the
// lower-level primitive it's built on.
export { applyObjectDefinition } from "./controllers/registries";

export { createFrameObject } from "./presentations/objects/base/createFrameObject";
export type {
	FrameShapeProps,
	FrameTextOverlayProps,
	FrameTextOverlayRenderer,
} from "./presentations/objects/base/createFrameObject";
export type { TextEditable } from "./presentations/objects/base/TextOverlay/TextOverlay";

// Container for shapes whose body is not plain text (Markdown and the like). The display
// side and the core editing textarea must share one visual contract (line-height / padding /
// placement / color and font resolution), so the container stays in core and only its
// contents are swapped. Use together with createFrameObject's renderTextOverlay.
export { TextOverlayFrame } from "./presentations/objects/base/TextOverlay/TextOverlayFrame";
export type { TextOverlayFrameProps } from "./presentations/objects/base/TextOverlay/TextOverlayFrame";

// For shapes that keep plain-text bodies but vary typography per slot (a record's title
// band, say). Pass the props from renderTextOverlay straight through and override only
// what needs to change.
export { TextOverlay } from "./presentations/objects/base/TextOverlay/TextOverlay";

export { createFrameBehavior } from "./controllers/behaviors/base/FrameController";

export { createFrameMapper } from "./states/objects/base/FrameMapper";

export { createFrameStateValidator } from "./states/objects/utils/createFrameStateValidator";
export type { StateRecord } from "./states/objects/utils/validateStateUtils";

// Reading a shape's own text off its state, for a renderer or a bounds calculator
// that has to branch on whether a slot is empty. The keys of `TextSlots` are the
// authority on the slots a shape has (there is no separate declaration).
export { readTextSlot } from "./states/objects/types/TextSlots";
export type { TextSlots } from "./states/objects/types/TextSlots";

// For a type that draws its own group instead of going through createFrameObject
// (the sticky's shadowed paper, say): the same two derivations createFrameObject
// makes internally. `calcTextRegion` is the seam the in-place editor also goes
// through, so a renderer that places text itself must use it or the text jumps
// on entering edit mode.
export { calcTextRegion } from "./presentations/objects/utils/calcTextRegion";
export { createSvgTransform } from "./presentations/objects/utils/createSvgTransform";

export { resolveAutoColor } from "./presentations/objects/utils/resolveAutoColor";
export type { AutoColorRole } from "./presentations/objects/utils/resolveAutoColor";

// For shapes deriving a text box's size from its content: measureTextWidth gives the
// width of one line, calcVisualLineCount the number of lines by reproducing the
// wrapping of the display-side CSS (pre-wrap + break-word).
export {
	calcVisualLineCount,
	measureTextWidth,
} from "./presentations/objects/utils/measureText";
export type { TextMeasureFont } from "./presentations/objects/utils/measureText";

// ---------------------------------------------------------------------------
// Below-label shapes: the box is fully taken by the drawing, so the text hangs
// under it as a caption sized from itself (server / actor / cross …).
// ---------------------------------------------------------------------------
// The three pieces go together: register the region as the type's `textRegion`
// and the bounds as its `visualBounds` (without the latter, zoom-to-fit and the
// export viewBox crop the label away), and place the hit area inside the shape's
// own `data-kind="object"` group so the label can be grabbed. The typography
// they measure with lives in `./unstable-doc` as BELOW_LABEL_STYLE_DEFAULTS.
export {
	BELOW_LABEL_GAP,
	calcBelowLabelTextRegion,
} from "./presentations/objects/utils/calcBelowLabelTextRegion";
export { calcBelowLabelVisualBounds } from "./presentations/objects/utils/calcBelowLabelVisualBounds";
export { BelowLabelHitArea } from "./presentations/objects/base/BelowLabelHitArea";

// Polygon/outline helpers for drawing frame-based plugin shapes and their connector outline.
export { formatPolygonPoints } from "./presentations/objects/utils/formatPolygonPoints";
export {
	centeredPolygonOutline,
	OUTLINE_CURVE_SEGMENTS,
} from "./presentations/objects/utils/outlineHelpers";

export { PRECISION } from "./constants/precision";

// ---------------------------------------------------------------------------
// Phase A: type-specific selection control parts (docs/05_extensibility/plugin-architecture-requirements.md §4)
// ---------------------------------------------------------------------------

export { ControlStrategy } from "./controllers/gestures/registry/ControlStrategy";

export { SelectionControlPill } from "./controllers/ui/controls/SelectionControlPill";
export { getResizeCursorForRotation } from "./controllers/ui/utils";

// ---------------------------------------------------------------------------
// ObjectMenu UI kit (docs/05_extensibility/plugin-architecture-requirements.md §4 UC1)
// ---------------------------------------------------------------------------
// Grammar ObjectMenuHandler resolves for `data-part` under `data-kind="menu"`:
//   - `toggle:{sectionId}`     open/close a section
//   - `set:{property}:{value}` update the selected object's property, committing at once
//   - `command:{commandId}`    run a command
//   - `slider:{property}`      slider (drag previews, dragEnd commits)
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
