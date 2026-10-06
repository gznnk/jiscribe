import type { TextVerticalBasis } from "@jiscribe/doc/model/objects/types/text/TextVerticalBasis";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import type { StyleEntry } from "../StyleEntry";

/**
 * A state seen with the one field this entry reads and writes. The basis belongs
 * to a type holding a single body rather than to every object, so it is absent
 * from the shared `ObjectState`; the type's table answering for the intent at all
 * is what says this object carries one.
 */
type TextPlacedObjectState = ObjectState &
	Pick<TextStyleState, "textVerticalBasis">;

/**
 * Which box the body's `verticalAlign` is measured against: the region the type
 * keeps clear of its own decoration, or the shape's whole height.
 *
 * `"region"` removes the field rather than writing itself into it, the absence
 * being what that basis is spelled with — and what every document written before
 * the field existed means (TextStyleState).
 *
 * The selected objects alone, both ways: the switch is offered for the selection,
 * so a plain box selected beside a switchable shape has no say and a member of a
 * selected group is not dragged along.
 */
export const textVerticalBasisEntry: StyleEntry<
	ObjectState,
	TextVerticalBasis
> = {
	apply: (object, _pick, basis, ctx) => {
		if (!ctx.selected) {
			return null;
		}
		const placed = object as TextPlacedObjectState;
		if (basis === "frame") {
			return placed.textVerticalBasis === "frame"
				? object
				: ({ ...placed, textVerticalBasis: "frame" } as ObjectState);
		}
		if (placed.textVerticalBasis === undefined) {
			return object;
		}
		const { textVerticalBasis: _onFrame, ...onRegion } = placed;
		return onRegion;
	},
	read: (object, _pick, ctx) =>
		ctx.selected
			? [(object as TextPlacedObjectState).textVerticalBasis ?? "region"]
			: [],
};
