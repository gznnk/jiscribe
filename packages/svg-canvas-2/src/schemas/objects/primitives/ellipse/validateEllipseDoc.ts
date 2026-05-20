import { isNumber } from "@workspace/basic-validators";

import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";

export const validateEllipseDoc: ObjectDocValidateFn = (o, path) => {
	const errors = [];
	if (!isNumber(o.cx)) errors.push({ path: `${path}.cx`, message: "must be a number" });
	if (!isNumber(o.cy)) errors.push({ path: `${path}.cy`, message: "must be a number" });
	if (!isNumber(o.rx)) errors.push({ path: `${path}.rx`, message: "must be a number" });
	if (!isNumber(o.ry)) errors.push({ path: `${path}.ry`, message: "must be a number" });
	return errors;
};
