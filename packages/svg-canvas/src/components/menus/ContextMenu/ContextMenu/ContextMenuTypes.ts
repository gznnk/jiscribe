/**
 * Context menu types.
 */
export type ContextMenuType =
	| "Undo"
	| "Redo"
	| "Copy"
	| "Paste"
	| "SelectAll"
	| "Group"
	| "Ungroup"
	| "Export"
	| "Delete";

/**
 * Context menu state.
 */
export type ContextMenuState = "Enable" | "Disable" | "Hidden";

/**
 * Context menu state map.
 */
export type ContextMenuStateMap = {
	[key in ContextMenuType]: ContextMenuState;
};
