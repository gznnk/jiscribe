/**
 * The edges of an automatic layout in the order it is to read them: by where the
 * source sits in the stacking order, then the target, then the connector itself.
 * Dagre's result depends on the order it is given the edges, and the layout restacks
 * connectors under the captions they run through (restackBeneath); an order taken
 * from the shapes holds still across that, since restacking moves connectors alone and
 * keeps the order of those it brings beneath one shape, so a second layout reads the
 * order the first did.
 *
 * @param edges - The edges, each named by its connector's id and its two ends' owners
 * @param treeOrderIds - Every object's id in tree order: a parent before its children, siblings back to front, as `doc.root` and a state's `rootIds` / `childIds` hold them; connectors included. Only the first of a repeated id counts
 * @returns A new array, ties between edges whose ends sit at the same places kept in the connectors' own tree order
 * @throws Error naming an edge, or an owner of its ends, that `treeOrderIds` leaves out
 */
export const sortEdgesByEndOrder = <
	Edge extends { id: string; sourceId: string; targetId: string },
>(
	edges: readonly Edge[],
	treeOrderIds: readonly string[],
): Edge[] => {
	const indexById = new Map<string, number>();
	treeOrderIds.forEach((id, index) => {
		if (!indexById.has(id)) {
			indexById.set(id, index);
		}
	});
	const indexOf = (id: string): number => {
		const index = indexById.get(id);
		if (index === undefined) {
			throw new Error(`${id} is not in the tree order the edges are sorted by`);
		}
		return index;
	};
	return edges
		.map((edge) => ({
			edge,
			keys: [indexOf(edge.sourceId), indexOf(edge.targetId), indexOf(edge.id)],
		}))
		.sort(
			(left, right) =>
				left.keys[0] - right.keys[0] ||
				left.keys[1] - right.keys[1] ||
				left.keys[2] - right.keys[2],
		)
		.map(({ edge }) => edge);
};
