import { isNumber } from "@workspace/basic-validators";

import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";

export const validateRectDoc: ObjectDocValidateFn = (o, path) => {
	const errors = [];
	if (!isNumber(o.x)) errors.push({ path: `${path}.x`, message: "must be a number" });
	if (!isNumber(o.y)) errors.push({ path: `${path}.y`, message: "must be a number" });
	if (!isNumber(o.width)) errors.push({ path: `${path}.width`, message: "must be a number" });
	if (!isNumber(o.height)) errors.push({ path: `${path}.height`, message: "must be a number" });
	return errors;
};
