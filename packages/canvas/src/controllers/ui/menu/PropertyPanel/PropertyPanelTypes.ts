import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { LocaleMessages } from "../../../messages/resolveLocaleMessages";
import type {
	DocumentProperty,
	MetaProperty,
	TransformProperty,
} from "../../../reducer/CanvasActions";
import type { StylePropertyUpdater } from "../ObjectMenu/ObjectMenuTypes";

/**
 * The controls the properties sidebar knows how to draw. Each names one row (or
 * one pair of rows) of a section:
 *
 * - `position` / `size` / `rotation` — the frame the transform handles are drawn
 *   around, stated as numbers
 * - `lockAspectRatio` / `autoHeight` — the two switches that govern how the
 *   shape resizes
 * - `fill` / `fillOpacity` / `strokeColor` / `strokeWidth` / `strokeDashType` /
 *   `strokeOpacity` / `radius` — the shape style
 * - `arrowHeads` — the two ends of an arrow
 * - `fontFamily` / `fontSize` / `fontColor` / `textFormat` / `textAlign` /
 *   `verticalAlign` / `textLayout` — the text style of the selected slot
 */
export type PropertyPanelBuiltinItemKey =
	| "position"
	| "size"
	| "rotation"
	| "lockAspectRatio"
	| "autoHeight"
	| "fill"
	| "fillOpacity"
	| "strokeColor"
	| "strokeWidth"
	| "strokeDashType"
	| "strokeOpacity"
	| "radius"
	| "arrowHeads"
	| "fontFamily"
	| "fontSize"
	| "fontColor"
	| "textFormat"
	| "textAlign"
	| "verticalAlign"
	| "textVerticalBasis"
	| "textLayout";

/** One of the controls the panel itself draws, named by its kind. */
export type PropertyPanelBuiltinItem = { type: PropertyPanelBuiltinItemKey };

/**
 * One row a plugin draws itself, named by an id of its own rather than by a
 * built-in kind — the sibling of the ObjectMenu's `custom` item, and reached
 * through the same public surface (`@jiscribe/canvas/unstable`).
 *
 * The id is what the multi-type merge matches the row by, so two types offering
 * the same row have to spell it the same way. A row that is not slot-aware needs
 * no opt-out: the text-slot narrowing drops every custom row.
 */
export type PropertyPanelCustomItem = {
	type: "custom";
	/** Identity of the row within its section; must not collide with a built-in kind. */
	id: string;
	/** Drawn with {@link PropertyPanelItemProps}; return null to leave the row out for this selection. */
	component: React.ComponentType<PropertyPanelItemProps>;
};

/**
 * One row of a section: a built-in kind the panel draws, or a component a plugin
 * supplies. A union of objects discriminated by `type`, so the two are told apart
 * before either is drawn.
 */
export type PropertyPanelItem =
	PropertyPanelBuiltinItem | PropertyPanelCustomItem;

/** One accordion of the properties sidebar. */
export type PropertyPanelSection = {
	/**
	 * Identifies the section: what the multi-type merge matches on, what the
	 * collapse state is stored under, and what a core section's label is looked
	 * up by (resolvePropertyPanelSectionLabel).
	 */
	id: string;
	/**
	 * Heading of the accordion. A plain string is locale-agnostic; a dictionary is
	 * resolved against the canvas locale, exactly as a stencil category's label is.
	 * The core sections carry their English wording here and take their displayed
	 * label from CanvasMessages, so a host that overrides the messages moves them too.
	 */
	label: string | LocaleMessages<string>;
	items: PropertyPanelItem[];
	/** Whether the section is offered for the selection at all; a section every row of which would return null hides its heading with it. Omitted = always offered. */
	isShown?: (selection: PropertyPanelSelection) => boolean;
};

/**
 * What {@link PropertyPanelSection.isShown} is asked about: the slices of the
 * selection a section's visibility can turn on, which are the ones its rows read
 * to decide the same thing for themselves.
 */
export type PropertyPanelSelection = Pick<
	PropertyPanelItemProps,
	"objects" | "selectedIds" | "selectedConnectorId"
>;

/**
 * States one number of the selection's transform frame, dispatching
 * TRANSFORM_PROPERTY_UPDATE. The sibling of {@link StylePropertyUpdater}
 * for the geometry the style-property registry does not own.
 *
 * @param property - Which of the frame's five numbers is being stated
 * @param value - World units, `rotation` in degrees; the frame is the single selected object's or the multiSelectGroup's, and `x` / `y` name its top-left corner
 * @param commit - true records the change in history (blur / Enter / key release), false only previews it live
 * @param coalesceHistory - true merges this commit into the immediately preceding
 *   commit for the same property and selection, so a burst (arrow-key repeat on a
 *   number field) becomes a single undo entry. Defaults to false, i.e. every commit
 *   gets its own entry
 */
export type PropertyPanelTransformUpdater = (
	property: TransformProperty,
	value: number,
	commit: boolean,
	coalesceHistory?: boolean,
) => void;

/**
 * States one of the document's own settings, dispatching DOCUMENT_PROPERTY_UPDATE.
 * The route the Canvas section writes through, and the only property updater whose
 * target is the document rather than a selection.
 *
 * Panel-internal on purpose: it is not part of {@link PropertyPanelItemProps},
 * because a plugin row is only ever drawn for a selected object type and the
 * Canvas section — which is what is on screen when there is no selection — holds
 * no plugin rows.
 *
 * @param property - Which document setting is being stated
 * @param value - A literal CSS color for `background`, or null to clear the setting so the host theme decides again
 * @param commit - true records the change in history (a swatch, blur / Enter), false only previews it live
 * @param coalesceHistory - true merges this commit into the immediately preceding
 *   commit for the same property, so a burst becomes a single undo entry. Defaults
 *   to false, i.e. every commit gets its own entry
 */
export type PropertyPanelDocumentUpdater = (
	property: DocumentProperty,
	value: string | null,
	commit: boolean,
	coalesceHistory?: boolean,
) => void;

/**
 * States one field of the selected object's `meta`, dispatching
 * META_PROPERTY_UPDATE. The route the Meta section writes through, and the only
 * property updater whose target is the object itself rather than how it is drawn.
 *
 * Panel-internal on purpose, as {@link PropertyPanelDocumentUpdater} is: the
 * section is the panel's own, drawn for whatever single object is selected, so
 * no plugin row is ever handed it.
 *
 * @param property - Which of the two meta fields is being stated
 * @param value - The text to state, or null to drop the field; an empty string drops it too, so an emptied field leaves no empty note in the document
 * @param commit - true records the change in history (blur / Enter), false only previews it live
 * @param coalesceHistory - true merges this commit into the immediately preceding
 *   commit for the same field and selection, so a burst becomes a single undo entry.
 *   Defaults to false, i.e. every commit gets its own entry
 */
export type PropertyPanelMetaUpdater = (
	property: MetaProperty,
	value: string | null,
	commit: boolean,
	coalesceHistory?: boolean,
) => void;

/**
 * Contract for custom property-panel item components. Exposes only the slices of
 * canvas state an item needs, not the whole controller state — the same bargain
 * {@link ObjectMenuItemProps} strikes, with the frame and its updater added
 * because a sidebar row states geometry as well as style.
 */
export type PropertyPanelItemProps = {
	objects: Record<string, ObjectState>;
	selectedIds: string[];
	selectedConnectorId: string | null;
	/** The frame a multi-selection is transformed through; null while one object or nothing is selected. */
	multiSelectGroup: GroupState | null;
	onPropertyUpdate: StylePropertyUpdater;
	onTransformUpdate: PropertyPanelTransformUpdater;
};
