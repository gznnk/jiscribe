import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";

export const validateGroupDoc: ObjectDocValidateFn = (_o, _path) => {
	// children の配列検証と再帰処理は validateStructure.ts 側で行う
	return [];
};
