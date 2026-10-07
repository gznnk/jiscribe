import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import type { ExtraStyleIntent, StyleIntent } from "../../../style/StyleIntent";

export type BuiltinItemKey =
	| "arrowHead"
	| "lineColor"
	| "lineStyle"
	| "backgroundColor"
	| "borderColor"
	| "borderStyle"
	| "font"
	| "textFormat"
	| "textAlignment"
	| "group"
	| "openReference";

/**
 * Reflects one style edit in the current selection, from an ObjectMenu item or a
 * properties-sidebar row (both surfaces are handed the same callback). The write
 * mirror of `useSelectionStyle`, which reads the same selection.
 *
 * @param intent - What the edit means, paired with its value: one of the engine's
 *   own kinds, typed (`{ kind: "fontSize", size: 24 }`), or a name the shape
 *   declared for itself, whose value stays the transport string
 *   (`{ kind: "headerHeight", value: "32" }`). A row holding a property name and
 *   a string from the DOM reads it with `styleIntentOf` first
 * @param commit - true records the change in history (blur / Enter / key release),
 *   false only previews it live
 * @param coalesceHistory - true merges this commit into the immediately preceding
 *   commit for the same intent kind and selection, so a burst (e.g. arrow-key
 *   repeat on a slider) becomes a single undo entry. Defaults to false, i.e. every
 *   commit gets its own entry
 */
export type StyleIntentUpdater = (
	intent: StyleIntent | ExtraStyleIntent,
	commit: boolean,
	coalesceHistory?: boolean,
) => void;

/** What the host receives when the "open reference" menu item is pressed. */
export type OpenReferencePayload = {
	/** ID of the object whose `meta.reference` is being opened. */
	objectId: string;
	/**
	 * The `meta.reference` string as authored, guaranteed non-empty. The canvas
	 * neither resolves nor validates it; the host does.
	 */
	reference: string;
};

/**
 * Opens the reference of the selected object. Supplied by the host — the menu
 * item is offered only while one is registered.
 *
 * @param payload - The selected object's ID and its raw `meta.reference`
 */
export type OpenReferenceHandler = (payload: OpenReferencePayload) => void;

/**
 * Contract for custom menu item components. Exposes only the slices of canvas
 * state that menu items need, not the whole controller state.
 */
export type ObjectMenuItemProps = {
	objects: Record<string, ObjectState>;
	/** What the canvas is pointed at: the objects picked, and the part picked below a single one of them (CanvasSelection). */
	selection: CanvasSelection;
	/** ID of the currently open menu section (`toggle:{sectionId}`). */
	openSectionId: string | null;
	onStyleIntent: StyleIntentUpdater;
};

export type BuiltinItem =
	| { type: Exclude<BuiltinItemKey, "borderStyle" | "textAlignment"> }
	| { type: "borderStyle"; radius?: boolean }
	| {
			type: "textAlignment";
			/**
			 * Whether the vertical row is offered. Omitted = offered. A type whose
			 * height is measured from its own text has no slack to distribute, so
			 * every vertical value would draw the same thing.
			 */
			vertical?: boolean;
	  };

export type CustomItem = {
	type: "custom";
	id: string;
	component: React.ComponentType<ObjectMenuItemProps>;
};

export type ObjectMenuItem = BuiltinItem | CustomItem;

export type ObjectMenuSection = {
	id: string;
	items: ObjectMenuItem[];
};
