/**
 * A selection of sub-parts inside one object — the vertices of a polyline, the
 * text slots of a record, the cells of a table. The object type owns the
 * part-id namespace (`kind`) and the meaning of each id; core only carries the
 * triple around and hands it back to the type through
 * {@link ObjectPartDefinition}.
 */
export type ObjectPartSelection = {
	/** The object the parts belong to; every part id is resolved against it alone. */
	objectId: string;
	/** Part-id namespace owned by the object type: "textSlot", "vertex", "cell". */
	kind: string;
	/** Non-empty, in the type's own order. Core neither sorts nor dedups. */
	partIds: readonly string[];
	/** Where a multi-part selection started, for shift-extend; always a member of partIds. */
	anchorPartId?: string;
};
