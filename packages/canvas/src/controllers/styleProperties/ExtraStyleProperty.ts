import type {
	ExtraStylePropertyDescriptor,
	StyleValueType,
} from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import { SelectionStyleProperty } from "./SelectionStyleProperty";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/** The slice of StylePropertyRegistry this handler reads (structural, avoids the import cycle). */
type ExtraStyleLookup = {
	getExtra(
		type: ObjectType,
		property: string,
	): ExtraStylePropertyDescriptor | undefined;
};

/**
 * Fallback handler for properties with no registered handler: an object
 * supports the property iff its type declares it in ExtraStyleProperties.
 * Undeclared properties therefore apply to nothing (fail-closed).
 */
export class ExtraStyleProperty extends SelectionStyleProperty {
	constructor(private readonly lookup: ExtraStyleLookup) {
		super();
	}

	protected resolveValueType(
		obj: ObjectState,
		property: string,
	): StyleValueType | undefined {
		return this.lookup.getExtra(obj.type, property)?.valueType;
	}
}
