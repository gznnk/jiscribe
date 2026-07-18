import { SelectionStyleProperty } from "./SelectionStyleProperty";
import type { StyleValueType } from "../../schemas/objects/types/ExtraStyleProperty";
import type { ObjectFeatureFlag } from "../../schemas/objects/types/ObjectFeatures";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Standard system style property: supported by every object whose ObjectFeatures
 * flag `gate` is on. The constructor arguments are the whole declaration.
 */
export class FeatureGatedStyleProperty extends SelectionStyleProperty {
	constructor(
		readonly gate: ObjectFeatureFlag,
		readonly valueType: StyleValueType,
	) {
		super();
	}

	protected resolveValueType(obj: ObjectState): StyleValueType | undefined {
		return obj.features?.[this.gate] === true ? this.valueType : undefined;
	}
}
