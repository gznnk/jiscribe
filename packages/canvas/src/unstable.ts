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

// Side-effect first, as in `.`: a host reaching the canvas through this entry
// alone still gets the renderer's text measurement offered.
import "./text/offerRendererTextMeasurement";

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

// The stroke / fill counterpart, for the same kind of type: the per-canvas
// registry of shape-style defaults, keyed by type. Resolve stroke, width, dash
// and fill through it before drawing, or a document that omits one of them draws
// differently from the same shape the editor's factory created.
export { useObjectShapeStyleDefaultsRegistry } from "./rendering/objects/registry/ObjectShapeStyleDefaultsRegistryContext";

// The active theme, for a component that has to read the host's handle
// dimensions (zoom-adjusted geometry).
export { useCanvasTheme } from "./theme/CanvasThemeContext";

export { createFrameBehavior } from "./controllers/behaviors/base/FrameController";

export { createFrameMapper } from "./states/objects/base/FrameMapper";

// The state-side parts a `geometry: "point"` type's own mapper is assembled from,
// that family being refused by createFrameMapper above (its doc holds no box to
// convert, so it measures its own in `toState` — TextMapper is the worked
// example): the id / type / meta conversion every type shares, and the two
// directions of the transform group.
export { ObjectMapper } from "./states/objects/base/ObjectMapper";
export {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "./states/objects/base/TransformMapper";

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

export { formatPolygonPoints } from "./rendering/objects/utils/formatPolygonPoints";

export { resolveAutoColor } from "./rendering/objects/utils/resolveAutoColor";
export type { AutoColorRole } from "./rendering/objects/utils/resolveAutoColor";

// The paint declarations of a styled shape element, for a type defining its own
// styled parts instead of reusing the sdk's ShapeBody*: interpolating these is
// what puts the color and the opacity beside it on one CSS route (doc 08).
export { fillPaint, strokePaint } from "./rendering/objects/utils/shapePaint";
export type {
	FillPaintProps,
	StrokePaintProps,
} from "./rendering/objects/utils/shapePaint";

// The box a text of its own takes — the `text` object's frame, and every label a
// shape sizes from its content rather than from its box. Laid out as authored, so
// the box grows sideways with the longest line and breaks only where the author
// typed a newline; nothing here wraps, and no caller has to reproduce the
// display-side wrapping to find its height.
export { calcTextBlockSize } from "@jiscribe/doc/text/block/calcTextBlockSize";

// For shapes deriving a text box's size from its content: measureTextWidth gives the
// width of one line, calcVisualLineCount the number of lines by reproducing the
// wrapping of the display-side CSS (pre-wrap + break-word), and calcVisualTextHeight
// what those lines add up to — which is not the count times the type size once part
// of the text is drawn larger, or in another font family (RichText).
export { calcVisualLineCount } from "@jiscribe/doc/text/layout/calcVisualLineCount";
export { calcVisualTextHeight } from "@jiscribe/doc/text/layout/calcVisualTextHeight";
export { layoutVisualLines } from "@jiscribe/doc/text/layout/layoutVisualLines";
export { measureTextWidth } from "@jiscribe/doc/text/layout/measureTextWidth";
export type { VisualLine } from "@jiscribe/doc/text/layout/VisualLine";
export type { TextMeasureFont } from "@jiscribe/doc/text/measure/TextMeasureFont";

export { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";

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
// below or call `onStyleIntent`; writing `data-part` directly couples them to internals
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

// The current value a row of either surface states (packages/canvas/docs/10-style-properties.md).
// `useSelectionStyle(name)` answers what the whole selection says about one style
// property — the value of exactly the objects a write of the same name would
// reach, so a row cannot disagree with its own write. A core name ("fill",
// "fontSize") comes back typed; a kind a type declares for itself comes
// back `unknown` under that name alone, the engine not knowing what the
// declaration holds, so a row of the declaring type passes its table instead —
// `useSelectionStyle(CONTAINER_STYLE, "headerFill")` — and the answer is typed
// from the declaration. The helpers fold the three cases into something
// drawable, and SHAPE_STYLE_FALLBACK is the last resort a row shows when nothing
// the selection reaches carries the property at all.
//
// A row writes through the mirror of that read: `onStyleIntent(intent, commit)`
// (StyleIntentUpdater), where a core name goes as its typed intent
// (`{ kind: "fill", color }`) and a type's own kind as `{ kind, value }`, the
// value either typed as the declaration holds it or left as the transport
// string. `styleIntentOf(property, value)` is there for a widget that holds a
// name and a string from the DOM instead.
export { useSelectionStyle } from "./controllers/style/SelectionStyleReaderContext";
export type {
	CoreStyleIntent,
	CoreStyleIntentKind,
	ExtraStyleIntent,
	StyleIntent,
} from "./controllers/style/StyleIntent";
export { styleIntentOf } from "./controllers/style/styleIntentOf";
export type { SelectionValue } from "./controllers/style/SelectionValue";
export {
	isMixedSelectionValue,
	selectionMixedValues,
	selectionValueOr,
	selectionValueOrFirst,
} from "./controllers/style/SelectionValue";
export { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";

// What a type declares about its own styles (packages/canvas/docs/10-style-properties.md).
// A type's table is `ObjectTypeDefinition.style`: one `{ apply, read }` pair per
// intent kind, composed onto the ones its `features` derive — and a kind
// declared there replaces the derived one, which is how a type whose storage
// differs from the core guess (a table whose fill lives on its cells) says where
// the edit lands. `fieldEntry(path, valueType)` is the entry for a field of the
// type's own, dots being a path into a nested object; `objectField` / `slotField`
// / `runOrSlot` / `toggleRunOrSlot` are the ones the engine builds its own
// entries from, for a type replacing a derived kind, with `defaultSlotsOf` as
// the slot answer the core types give. An entry stating a field the type's doc
// cannot hold (`extraKeys`) is refused at registration.
export { fieldEntry } from "./controllers/style/entries/fieldEntry";
export { objectField } from "./controllers/style/entries/objectField";
export { runOrSlot } from "./controllers/style/entries/runOrSlot";
export { defaultSlotsOf } from "./controllers/style/entries/slotEntry";
export type { SlotsOf } from "./controllers/style/entries/slotEntry";
export { slotField } from "./controllers/style/entries/slotField";
export { toggleRunOrSlot } from "./controllers/style/entries/toggleRunOrSlot";
export type { StyleValueType } from "./controllers/style/coerceStyleValue";
export type {
	StyleContext,
	StyleEntry,
	StyleTable,
} from "./controllers/style/StyleEntry";

// ---------------------------------------------------------------------------
// Properties sidebar UI kit (packages/canvas/docs/12-plugin-architecture.md)
// ---------------------------------------------------------------------------
// A type declares its sidebar sections in `propertyPanel`, and a row it draws
// itself is a `{ type: "custom"; id; component }` item among the built-in ones.
// The component is handed PropertyPanelItemProps and nothing else: the selection
// and the objects it names, plus `onStyleIntent` for a style property and
// `onTransformUpdate` for one of the frame's five numbers. Build the row out of
// the widgets below so it lines up with the built-in ones — PropertyRow supplies
// the label column every row shares, except PropertyCheckbox, which is a row of
// its own from the section's left edge. The widgets that write do it either through
// the callback (PropertyColorField) or through the same `data-part` grammar the
// ObjectMenu uses (PropertySegmentedControl / PropertyCheckbox); writing
// `data-part` by hand is discouraged for the same reason as there.
// Custom rows are dropped while a text slot is selected, since a plugin row has
// no way to say it is slot-aware.
// A section may also carry `isShown`, asked about the selection
// (PropertyPanelSelection) before the section is drawn: a section whose every row
// would return null uses it to take its heading away with them.

export type {
	PropertyPanelSection,
	PropertyPanelItem,
	PropertyPanelCustomItem,
	PropertyPanelItemProps,
	PropertyPanelSelection,
	PropertyPanelTransformUpdater,
} from "./controllers/ui/menu/PropertyPanel/PropertyPanelTypes";

export { PropertyRow } from "./controllers/ui/menu/PropertyPanel/common/PropertyRow";
export { PropertyNumberField } from "./controllers/ui/menu/PropertyPanel/common/PropertyNumberField";
export type { PropertyNumberUpdater } from "./controllers/ui/menu/PropertyPanel/common/PropertyNumberField";
export { PropertyColorField } from "./controllers/ui/menu/PropertyPanel/common/PropertyColorField";
export { PropertyDropdownField } from "./controllers/ui/menu/PropertyPanel/common/PropertyDropdownField";
export { PropertySegmentedControl } from "./controllers/ui/menu/PropertyPanel/common/PropertySegmentedControl";
export type { PropertySegmentedOption } from "./controllers/ui/menu/PropertyPanel/common/PropertySegmentedControl";
export { PropertyCheckbox } from "./controllers/ui/menu/PropertyPanel/common/PropertyCheckbox";

// The `data-part` grammar the menu targets are read by (command: / toggle: /
// set: / slider:). Build the strings with these rather than spelling the
// prefixes, so a plugin's buttons and the core's are read by the same rule.
export {
	commandPart,
	setPart,
	sliderPart,
	togglePart,
} from "./controllers/gestures/handlers/menu/utils/menuParts";

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
export { theme as canvasThemeCssVars } from "./theme/themeTokens";

// The scrollbar the canvas's own scrollable panels wear (the text editor, the shortcut
// help). A plugin panel that scrolls has no other way to match them, and a default
// browser scrollbar next to a custom one is exactly the kind of seam a plugin should not
// be introducing.
export { SCROLLBAR_WIDTH, scrollbarStyles } from "./theme/themeScrollbarStyles";

// What a plugin's own commands are written against (`CanvasPlugin.commands`).
// A command is a pure state transition, so its two parameter types come along:
// the controller state it reads and returns, and the registry bundle it resolves
// per-type declarations through. Both are the canvas's working surface rather
// than a settled contract — they live here, and not on the stable entry, because
// a command has to see them to be one at all.
export type {
	Command,
	ExecutableCommand,
	KeyBinding,
	PlatformKeyBindings,
} from "./controllers/commands/CommandTypes";
export type { CanvasControllerState } from "./controllers/CanvasTypes";
export type { CanvasSelection } from "./controllers/selection/CanvasSelection";
export type {
	ObjectPartRange,
	ObjectPartSelection,
} from "./controllers/selection/ObjectPartSelection";
export { isTextSlotSelection } from "./controllers/selection/textSlotPartKind";
export { collectSelectedPartIds } from "./controllers/selection/collectSelectedPartIds";
export { getSelectedConnectorId } from "./controllers/utils/getSelectedConnectorId";
export type { ICanvasRegistries } from "./controllers/registries/ICanvasRegistries";
