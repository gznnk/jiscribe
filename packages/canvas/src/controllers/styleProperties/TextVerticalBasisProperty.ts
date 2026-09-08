import { isTextVerticalBasis } from "@jiscribe/doc/model/objects/types/TextVerticalBasis";

import type { StylePropertyHandler } from "./StylePropertyHandler";
import type { ObjectTextVerticalBasisRegistry } from "../../states/registry/ObjectTextVerticalBasisRegistry";
import type { CanvasControllerState } from "../CanvasTypes";
import type { TextPlacedObjectState } from "../utils/textVerticalBasisSelection";
import { collectTextVerticalBasisIds } from "../utils/textVerticalBasisSelection";

/**
 * `textVerticalBasis` stated outright ("region" / "frame"), the way the sidebar's
 * segmented control writes it — the ObjectMenu's button flips it through
 * ToggleTextVerticalBasisCommand instead. Written only to the selected objects
 * whose body actually moves with it (ObjectTextVerticalBasisRegistry), so a
 * selection mixing them with plain boxes leaves the boxes alone.
 *
 * Bound to the canvas's own registry, so unlike the system handlers it is one
 * instance per canvas rather than shared. "region" removes the field rather than
 * writing it, that being the reading of its absence (see the command).
 */
export class TextVerticalBasisProperty implements StylePropertyHandler {
	constructor(
		private readonly textVerticalBasisRegistry: ObjectTextVerticalBasisRegistry,
	) {}

	apply(
		state: CanvasControllerState,
		property: string,
		value: string,
	): CanvasControllerState {
		if (!isTextVerticalBasis(value)) {
			throw new Error(
				`${property} takes "region" or "frame", not ${JSON.stringify(value)}`,
			);
		}
		const ids = collectTextVerticalBasisIds(
			state,
			this.textVerticalBasisRegistry,
		);
		if (ids.length === 0) {
			return state;
		}
		const objects = { ...state.objects };
		for (const id of ids) {
			const { textVerticalBasis: _previousBasis, ...onRegion } = state.objects[
				id
			] as TextPlacedObjectState;
			const placed: TextPlacedObjectState =
				value === "frame"
					? { ...onRegion, textVerticalBasis: "frame" }
					: onRegion;
			objects[id] = placed;
		}
		return { ...state, objects };
	}
}
