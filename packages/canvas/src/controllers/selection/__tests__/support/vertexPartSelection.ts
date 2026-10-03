import { VERTEX_PART_KIND } from "../../createVertexPartKindDefinition";
import type { ObjectPartSelection } from "../../ObjectPartSelection";

/**
 * The part selection a click on a vertex handle writes (VertexControlHandler):
 * one collapsed range over the decimal index.
 *
 * @param objectId - The polyline, polygon or connector the vertex belongs to
 * @param vertexIndex - Index into the object's `points`; written as the handles
 *   spell it, so a fixture can hold an index the object has outgrown
 * @returns A selection to put in `CanvasControllerState.objectPartSelection`
 */
export const vertexPartSelection = (
	objectId: string,
	vertexIndex: number,
): ObjectPartSelection => ({
	objectId,
	kind: VERTEX_PART_KIND,
	ranges: [{ anchorId: String(vertexIndex), focusId: String(vertexIndex) }],
});
