/** One object {@link restackBeneath} is asked to move beneath others among its siblings. */
export type RestackBeneathRequest = {
	/** The object to move; one that is not among the siblings is left alone. */
	id: string;
	/**
	 * For each object it has to end up beneath, that object's id followed by the ids of
	 * the groups holding it, innermost first: the first of them among the siblings is
	 * the sibling it goes beneath, and a path with none among them asks for nothing.
	 */
	beneathPaths: readonly (readonly string[])[];
};

/**
 * One parent's children restacked so that each object asked for sits just beneath the
 * lowest sibling it has to be beneath (an object never leaves its parent, so a shape
 * in a group is stood for by the group). One already lower than that stays where it
 * is; several brought beneath one sibling keep the order they had among themselves.
 *
 * @param siblingIds - One parent's children in drawing order, the back first, as `doc.root`, a group's `children` and a state's `rootIds` / `childIds` all hold them
 * @param requests - What to move and beneath what; a request naming no sibling to go beneath moves nothing
 * @returns The ids in their new order, a new array even when nothing moved, and the ids that moved, in the order they had before
 */
export const restackBeneath = (
	siblingIds: readonly string[],
	requests: readonly RestackBeneathRequest[],
): { orderedIds: string[]; movedIds: string[] } => {
	const indexById = new Map(siblingIds.map((id, index) => [id, index]));
	const beneathIdByMovedId = new Map<string, string>();
	for (const { id, beneathPaths } of requests) {
		const ownIndex = indexById.get(id);
		if (ownIndex === undefined) {
			continue;
		}
		let lowestIndex: number | undefined;
		for (const path of beneathPaths) {
			const siblingId = path.find(
				(pathId) => pathId !== id && indexById.has(pathId),
			);
			if (siblingId !== undefined) {
				const index = indexById.get(siblingId) as number;
				lowestIndex =
					lowestIndex === undefined ? index : Math.min(lowestIndex, index);
			}
		}
		if (lowestIndex !== undefined && ownIndex > lowestIndex) {
			beneathIdByMovedId.set(id, siblingIds[lowestIndex]);
		}
	}
	const movedIds = siblingIds.filter((id) => beneathIdByMovedId.has(id));
	const movedIdsByBeneathId = new Map<string, string[]>();
	for (const movedId of movedIds) {
		const beneathId = beneathIdByMovedId.get(movedId) as string;
		const moved = movedIdsByBeneathId.get(beneathId);
		if (moved === undefined) {
			movedIdsByBeneathId.set(beneathId, [movedId]);
		} else {
			moved.push(movedId);
		}
	}
	const orderedIds: string[] = [];
	// A moved object can itself be what another goes beneath; it brings that one along.
	const place = (id: string): void => {
		for (const movedId of movedIdsByBeneathId.get(id) ?? []) {
			place(movedId);
		}
		orderedIds.push(id);
	};
	for (const id of siblingIds) {
		if (!beneathIdByMovedId.has(id)) {
			place(id);
		}
	}
	return { orderedIds, movedIds };
};
