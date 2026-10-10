/**
 * A range of parts inside one kind: the fixed end a Shift-extension grows from,
 * and the end that moves. Collapsed (`anchorId === focusId`) for a single part.
 */
export type ObjectPartRange = {
	/** The end a Shift-extension leaves where it is. */
	anchorId: string;
	/** The end a Shift-extension moves. */
	focusId: string;
};

/**
 * The sub-parts addressed one level below the object selection, in a namespace
 * the object's own type owns (`kind`). The object they belong to is the sole
 * selected one (`CanvasSelection.objectIds[0]`), which is why none is named
 * here.
 *
 * Ranges rather than a set of ids: the set is what a reader derives through the
 * kind, which alone knows what lies between two of its parts
 * (collectObjectPartIds), while the ends are what the gestures need — Shift
 * grows the last range from its anchor (ObjectEventHandler); no gesture adds a
 * second range yet, and Ctrl keeps toggling the object. Storing the set would
 * lose those ends, the way a DOM `Selection` would lose them if it kept the
 * covered nodes instead of its `Range`s. A reader acting on one part
 * alone takes the active range's focus (readActivePartFocusId).
 *
 * The reducer clears it (reconcileSelection) once it stops describing
 * something real, so every reader takes `state.selection.part` as it stands.
 * That catches a part that is **gone**, not one that was **renumbered**. Where
 * the ids are positions (the vertices of a polyline, the rows and columns of a
 * table), an operation that renumbers them — an insertion, a removal — rewrites
 * or clears the selection itself; left alone, it would silently go on addressing
 * the part that took the number over.
 */
export type ObjectPartSelection = {
	/** Part-id namespace owned by the object type: "textSlot", "vertex", "cell". */
	kind: string;

	/**
	 * Non-empty. The last range is the active one, the one Shift extends. Core
	 * neither sorts nor dedups: the order is the one the gestures built up.
	 */
	ranges: readonly ObjectPartRange[];
};

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
	 * (selectConnectorAlone / determineClickSelection / selectRequestedIds).
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
