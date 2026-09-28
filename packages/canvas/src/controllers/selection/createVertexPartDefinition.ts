import type { Poly } from "@jiscribe/doc/model/objects/types/Poly";

import type { ObjectPartDefinition } from "./ObjectPartRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/** The part-id namespace of the vertices a poly-geometry type stores in `points`. */
export const VERTEX_PART_KIND = "vertex";

/**
 * The `vertex` part definition for a type whose state carries a `points` array,
 * with part ids spelled as the decimal index into it ("0", "1", …) — the same
 * ids the vertex handles already carry in their `data-part`.
 *
 * @param minVertexCount - How few vertices the type still draws as itself; a
 *   deletion that would leave fewer is refused rather than applied. An open
 *   line needs 2, a closed outline 3.
 * @returns A definition to put in the type's `ObjectTypeDefinition.parts`
 */
export const createVertexPartDefinition = <TState extends ObjectState & Poly>(
	minVertexCount: number,
): ObjectPartDefinition<TState> => ({
	kind: VERTEX_PART_KIND,

	has: (object, partId) => {
		const index = Number(partId);
		return (
			Number.isInteger(index) && index >= 0 && index < object.points.length
		);
	},

	delete: (object, partIds) => {
		const removedIndices = new Set(partIds.map(Number));
		if (object.points.length - removedIndices.size < minVertexCount) {
			return null;
		}
		return {
			...object,
			points: object.points.filter((_, index) => !removedIndices.has(index)),
		};
	},
});
