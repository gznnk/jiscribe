import type { ObjectState } from "../../../../states/objects/base/ObjectState";

export type BuiltinItemKey =
	| "arrowHead"
	| "lineColor"
	| "lineStyle"
	| "backgroundColor"
	| "borderColor"
	| "borderStyle"
	| "fontStyle"
	| "textAlignment"
	| "aspectRatio"
	| "stackOrder"
	| "group";

/**
 * Applies a style property change from an ObjectMenu item to the current selection.
 *
 * @param property - Style property key resolved by the style-property registry (e.g. `strokeWidth`)
 * @param value - New value as a string; the property's own parser converts it
 * @param commit - true records the change in history (blur / Enter / key release),
 *   false only previews it live
 * @param coalesceHistory - true merges this commit into the immediately preceding
 *   commit for the same property and selection, so a burst (e.g. arrow-key repeat
 *   on a slider) becomes a single undo entry. Defaults to false, i.e. every commit
 *   gets its own entry
 */
export type ObjectMenuPropertyUpdater = (
	property: string,
	value: string,
	commit: boolean,
	coalesceHistory?: boolean,
) => void;

/**
 * Contract for custom menu item components. Exposes only the slices of canvas
 * state that menu items need, not the whole controller state.
 */
export type ObjectMenuItemProps = {
	objects: Record<string, ObjectState>;
	selectedIds: string[];
	selectedConnectorId: string | null;
	/** ID of the currently open menu section (`toggle:{sectionId}`). */
	openSectionId: string | null;
	onPropertyUpdate: ObjectMenuPropertyUpdater;
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
