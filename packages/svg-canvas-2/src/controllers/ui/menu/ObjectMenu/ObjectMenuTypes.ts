import type { CanvasControllerState } from "../../../CanvasTypes";

export type BuiltinSectionKey =
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

export type MenuSectionProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

export type BuiltinSection =
	| { type: Exclude<BuiltinSectionKey, "borderStyle"> }
	| { type: "borderStyle"; radius?: boolean };

export type CustomSection = {
	type: "custom";
	id: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: React.ComponentType<any>;
};

export type MenuSection = BuiltinSection | CustomSection;

export type MenuSectionGroup = {
	id: string;
	sections: MenuSection[];
};

export type MenuSectionFactory<TState = unknown> = (
	state: TState,
) => MenuSectionGroup[];
