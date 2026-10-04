import type { CanvasSelection } from "./CanvasSelection";
import { collectSelectedPartIds } from "./collectSelectedPartIds";
import { VERTEX_PART_KIND } from "./createVertexPartKindDefinition";

/**
 * The vertex picked on one object, as the index into its `points` — the one
 * place a vertex part id is read back as a number, the handles and the part
 * definition spelling it as the decimal index.
 *
 * @param selection - What the canvas is pointed at, taken as it stands (the
 *   reducer has already dropped a part naming a vertex the object has outgrown,
 *   reconcileObjectPartSelection)
 * @param objectId - The object whose vertex is asked for; a pick on another
 *   object, or on a kind other than the vertices, names none
 * @returns The index, or null when no vertex of this object is picked. The first
 *   of the covered ids (collectSelectedPartIds) is the one read: every range
 *   written today is collapsed, so it is the only one
 */
export const readSelectedVertexIndex = (
	selection: CanvasSelection,
	objectId: string,
): number | null => {
	const { part } = selection;
	if (
		part === null ||
		selection.objectIds[0] !== objectId ||
		part.kind !== VERTEX_PART_KIND
	) {
		return null;
	}
	return Number(collectSelectedPartIds(part)[0]);
};
