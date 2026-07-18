import { SelectionStyleProperty } from "./SelectionStyleProperty";
import type { StyleValueType } from "../../schemas/objects/types/ExtraStyleProperty";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * lockAspectRatio is transform-gated but routes differently from standard
 * properties: with a multi-selection it is written to the multiSelectGroup
 * itself (not the members), and it never recurses into group descendants.
 */
export class LockAspectRatioProperty extends SelectionStyleProperty {
	protected override get appliesToDescendants(): boolean {
		return false;
	}

	protected resolveValueType(obj: ObjectState): StyleValueType | undefined {
		return obj.features?.transform === true ? "boolean" : undefined;
	}

	override apply(
		state: CanvasControllerState,
		property: string,
		value: string,
	): CanvasControllerState {
		const { selectedIds, multiSelectGroup } = state;
		if (selectedIds.length > 0 && multiSelectGroup) {
			return {
				...state,
				multiSelectGroup: {
					...multiSelectGroup,
					lockAspectRatio: value === "true",
				},
			};
		}
		return super.apply(state, property, value);
	}
}
