import type { ObjectPartSelection } from "./ObjectPartSelection";

/**
 * What the canvas is pointed at: the objects picked, and the parts picked one
 * level below them. Nested rather than two fields of the state, so every writer
 * that moves the object selection states what becomes of the part in the same
 * breath, and reconcileSelection is left as the safety net it is.
 */
export type CanvasSelection = {
	/**
	 * The selected objects' ids, in the order they were selected. Shapes, groups
	 * and connectors alike, with one rule the writers keep: a connector is
	 * selected on its own — one of them, never alongside a shape
	 * (applyConnectorSelection / determineSelection / resolveRequestedSelection).
	 * Readers that need the connector therefore ask for it by that shape
	 * (getSelectedConnectorId).
	 */
	objectIds: readonly string[];

	/**
	 * Sub-parts addressed one level below the object selection, in a namespace the
	 * object's own type owns (`kind`) — the text slots of a
	 * `features.text === "slots"` shape, the vertices of a polyline, a polygon or
	 * a connector. Non-null only while `objectIds` holds exactly one id, which is
	 * the object the parts belong to. Always valid where it is read: every reducer
	 * branch that rewrites the selection or the objects drops a part the state no
	 * longer backs (reconcileSelection), instead of every reader
	 * validating it.
	 */
	part: ObjectPartSelection | null;
};

/**
 * Nothing selected. One frozen instance every clearing writer hands over
 * (clearAllSelection / resetUiState / a press on empty canvas), so a clear that
 * changes nothing leaves the reference memoized readers compare by.
 */
export const EMPTY_SELECTION: CanvasSelection = Object.freeze({
	objectIds: Object.freeze([]),
	part: null,
});
