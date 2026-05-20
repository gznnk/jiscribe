import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { validatePointsField } from "../../utils/validateDocUtils";

export const validatePolylineDoc: ObjectDocValidateFn = (o, path) =>
	validatePointsField(o, path);
