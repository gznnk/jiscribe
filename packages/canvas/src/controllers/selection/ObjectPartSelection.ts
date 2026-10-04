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
 * Ranges rather than a set of ids: the set is what a reader derives (through the
 * kind, which alone knows what lies between two of its parts), while the ends
 * are what the gestures need — Shift grows the last range from its anchor, Ctrl
 * adds a collapsed one. Storing the set would lose those ends, the way a DOM
 * `Selection` would lose them if it kept the covered nodes instead of its
 * `Range`s. Every range written today is collapsed, and every reader takes the
 * one slot it names (`ranges[0].anchorId`); the readers widen when a gesture
 * first writes a wider range.
 *
 * The reducer clears it (reconcileObjectPartSelection) once it stops describing
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
