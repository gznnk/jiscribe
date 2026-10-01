/**
 * A selection of sub-parts inside one object — the vertices of a polyline, the
 * text slots of a record, the cells of a table. The object type owns the
 * part-id namespace (`kind`) and the meaning of each id; core only carries the
 * triple around and hands it back to the type through
 * {@link ObjectPartKindDefinition}.
 *
 * Not to be confused with a deletion request
 * ({@link import("./resolveDeletableParts").ObjectPartTarget}): this is what is
 * picked, that is what an operation is asked for, and turning the one into the
 * other is the command's business.
 */
export type ObjectPartSelection = {
	/** The object the parts belong to; every part id is resolved against it alone. */
	objectId: string;
	/** Part-id namespace owned by the object type: "textSlot", "vertex", "cell". */
	kind: string;
	/** Non-empty, in the type's own order. Core neither sorts nor dedups. */
	partIds: readonly string[];
	/**
	 * Where a shift-extended range started, and the end it keeps while the other
	 * end moves; always a member of partIds. Absent means the first of them, which
	 * is what a selection made one part at a time leaves behind.
	 */
	anchorPartId?: string;
};
