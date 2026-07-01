import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { validateTransformFields } from "../../utils/validateDocUtils";

/** Validates a GroupDoc's transform fields; child validation is handled elsewhere. */
export const validateGroupDoc: ObjectDocValidateFn = (o, path) => [
	// Array validation and recursive processing of children is done in validateStructure.ts.
	...validateTransformFields(o, path),
];
