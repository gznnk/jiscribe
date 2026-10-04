import type { Poly } from "@jiscribe/doc/model/objects/types/Poly";

import type { ObjectPartKindDefinition } from "./ObjectPartKindRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/** The part-id namespace of the vertices a poly-geometry type stores in `points`. */
export const VERTEX_PART_KIND = "vertex";

/** A vertex id as the handles spell it: a non-negative integer with no sign, padding or exponent. */
const CANONICAL_INDEX = /^(0|[1-9]\d*)$/;

/**
 * The `vertex` part definition for a type whose state carries a `points` array,
 * with part ids spelled as the decimal index into it ("0", "1", …). The kind half
 * of the `data-part` its vertex handles carry, which `vertexPart` builds.
 *
 * @param minVertexCount - How few vertices the type still draws as itself; a
 *   deletion that would leave fewer is refused rather than applied. An open
 *   line needs 2, a closed outline 3.
 * @returns A definition to put in the type's `ObjectTypeDefinition.partKinds`
 */
export const createVertexPartKindDefinition = <
	TState extends ObjectState & Poly,
>(
	minVertexCount: number,
): ObjectPartKindDefinition<TState> => ({
	kind: VERTEX_PART_KIND,

	// Only the canonical decimal spelling names a vertex: `has` is the gate an
	// untrusted id passes before `delete` parses it, and Number() alone would let
	// "" (→ 0), " 1 " or "1e0" through as vertices of their own.
	has: (object, partId) =>
		CANONICAL_INDEX.test(partId) && Number(partId) < object.points.length,

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
