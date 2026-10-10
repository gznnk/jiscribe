import type { ObjectPartSelection } from "../../CanvasSelection";
import { VERTEX_PART_KIND } from "../../partKinds/vertexPartKind";

/**
 * The part selection a click on a vertex handle writes (VertexControlHandler):
 * one collapsed range over the decimal index.
 *
 * @param vertexIndex - Index into the `points` of whichever object is selected;
 *   written as the handles spell it, so a fixture can hold an index the object
 *   has outgrown
 * @returns A part selection to put in `CanvasSelection.part`
 */
export const vertexPartSelection = (
	vertexIndex: number,
): ObjectPartSelection => ({
	kind: VERTEX_PART_KIND,
	ranges: [{ anchorId: String(vertexIndex), focusId: String(vertexIndex) }],
});
