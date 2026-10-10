import type { CanvasSelection } from "../CanvasSelection";
import { readActivePartFocusId } from "./readActivePartFocusId";
import { VERTEX_PART_KIND } from "../partKinds/vertexPartKind";

/**
 * The vertex picked on one object, as the index into its `points` — the one
 * place a vertex part id is read back as a number, the handles and the part
 * definition spelling it as the decimal index.
 *
 * @param selection - What the canvas is pointed at, taken as it stands (the
 *   reducer has already dropped a part naming a vertex the object has outgrown,
 *   reconcileSelection)
 * @param objectId - The object whose vertex is asked for; a pick on another
 *   object, or on a kind other than the vertices, names none
 * @returns The index, or null when no vertex of this object is picked. Of
 *   several picked vertices, the one read is the focus of the active range
 *   (readActivePartFocusId)
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
	return Number(readActivePartFocusId(part));
};
