import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateArrowFields,
	validateEndpointRef,
	validatePolyFields,
	validateStrokeStyleFields,
} from "../../utils/validateDocUtils";

export const validateConnectorDoc: ObjectDocValidateFn = (o, path) => [
	...validatePolyFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateArrowFields(o, path),
	...validateEndpointRef(o.source, `${path}.source`),
	...validateEndpointRef(o.target, `${path}.target`),
];
