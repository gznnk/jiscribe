import { collectSelectedPartIds } from "./collectSelectedPartIds";
import { VERTEX_PART_KIND } from "./createVertexPartKindDefinition";
import type { ObjectPartSelection } from "./ObjectPartSelection";

/**
 * The vertex picked on one object, as the index into its `points` — the one
 * place a vertex part id is read back as a number, the handles and the part
 * definition spelling it as the decimal index.
 *
 * @param objectPartSelection - The parts picked one level below the object,
 *   taken as it stands (the reducer has already dropped one naming a vertex the
 *   object has outgrown, reconcileObjectPartSelection); null when none are
 * @param objectId - The object whose vertex is asked for; a pick on another
 *   object, or on a kind other than the vertices, names none
 * @returns The index, or null when no vertex of this object is picked. The first
 *   of the covered ids (collectSelectedPartIds) is the one read: every range
 *   written today is collapsed, so it is the only one
 */
export const readSelectedVertexIndex = (
	objectPartSelection: ObjectPartSelection | null,
	objectId: string,
): number | null => {
	if (
		objectPartSelection === null ||
		objectPartSelection.objectId !== objectId ||
		objectPartSelection.kind !== VERTEX_PART_KIND
	) {
		return null;
	}
	return Number(collectSelectedPartIds(objectPartSelection)[0]);
};
