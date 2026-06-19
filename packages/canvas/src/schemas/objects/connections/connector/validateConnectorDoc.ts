import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateArrowFields,
	validateEndpointRef,
	validateStrokeStyleFields,
	validateWaypointFields,
} from "../../utils/validateDocUtils";

// points は中間経由点のみ（端点は source/target が持つ）のため空配列を許容する
export const validateConnectorDoc: ObjectDocValidateFn = (o, path) => [
	...validateWaypointFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateArrowFields(o, path),
	...validateEndpointRef(o.source, `${path}.source`),
	...validateEndpointRef(o.target, `${path}.target`),
];
