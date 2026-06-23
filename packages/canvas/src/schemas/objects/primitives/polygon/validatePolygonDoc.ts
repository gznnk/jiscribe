import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import {
	validateFillStyleFields,
	validatePolyFields,
	validateStrokeStyleFields,
} from "../../utils/validateDocUtils";

// polygon は閉じた多角形のため最低 3 点必要（スキーマも minItems: 3）。
// polyline と異なり 2 点は退化した線分なので弾く。
export const validatePolygonDoc: ObjectDocValidateFn = (o, path) => [
	...validatePolyFields(o, path, 3),
	...validateStrokeStyleFields(o, path),
	...validateFillStyleFields(o, path),
];
