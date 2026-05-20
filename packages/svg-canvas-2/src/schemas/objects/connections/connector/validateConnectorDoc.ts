import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { validateEndpointRef, validatePointsField } from "../../utils/validateDocUtils";

export const validateConnectorDoc: ObjectDocValidateFn = (o, path) => {
	const errors = validatePointsField(o, path);
	if ("source" in o) errors.push(...validateEndpointRef(o.source, `${path}.source`));
	if ("target" in o) errors.push(...validateEndpointRef(o.target, `${path}.target`));
	return errors;
};
