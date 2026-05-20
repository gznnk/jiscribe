import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { validateTransformFields } from "../../utils/validateDocUtils";

export const validateGroupDoc: ObjectDocValidateFn = (o, path) => [
	// children の配列検証と再帰処理は validateStructure.ts 側で行う
	...validateTransformFields(o, path),
];
