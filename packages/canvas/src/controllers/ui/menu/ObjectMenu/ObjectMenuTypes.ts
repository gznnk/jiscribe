import type { CanvasControllerState } from "../../../CanvasTypes";

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

export type ObjectMenuItemProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

export type BuiltinItem =
	| { type: Exclude<BuiltinItemKey, "borderStyle"> }
	| { type: "borderStyle"; radius?: boolean };

export type CustomItem = {
	type: "custom";
	id: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: React.ComponentType<any>;
};

export type ObjectMenuItem = BuiltinItem | CustomItem;

export type ObjectMenuSection = {
	id: string;
	items: ObjectMenuItem[];
};

export type ObjectMenuSectionFactory<TState = unknown> = (
	state: TState,
) => ObjectMenuSection[];
