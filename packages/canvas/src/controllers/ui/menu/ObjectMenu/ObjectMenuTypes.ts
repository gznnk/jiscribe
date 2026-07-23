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
 * Contract for custom menu item components. Exposes only the slices of canvas
 * state that menu items need, not the whole controller state.
 */
export type ObjectMenuItemProps = {
	objects: Record<string, ObjectState>;
	selectedIds: string[];
	selectedConnectorId: string | null;
	/** ID of the currently open menu section (`toggle:{sectionId}`). */
	openSectionId: string | null;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

export type BuiltinItem =
	| { type: Exclude<BuiltinItemKey, "borderStyle"> }
	| { type: "borderStyle"; radius?: boolean };

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
