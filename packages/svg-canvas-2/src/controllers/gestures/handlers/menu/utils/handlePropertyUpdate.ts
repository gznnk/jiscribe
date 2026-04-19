import { objectRegistry } from "../../../../../registry/ObjectRegistry";
import type { ObjectFeatures } from "../../../../../schemas/objects/types/ObjectFeatures";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";

/**
 * プロパティが対象オブジェクトの features でサポートされているか判定する。
 */
const isPropertySupported = (
	features: ObjectFeatures,
	property: string,
): boolean => {
	switch (property) {
		case "fill":
			return features.fill === true;
		case "stroke":
		case "strokeWidth":
		case "strokeDashType":
			return features.stroke === true;
		case "rx":
			return features.radius === true;
		case "lockAspectRatio":
			return features.transform === true;
		case "startArrow":
		case "endArrow":
			// Arrow properties are type-specific, not feature-based
			return false;
		default:
			return false;
	}
};

/**
 * Arrow プロパティが対象オブジェクトタイプでサポートされているか判定する。
 */
const isArrowPropertySupported = (
	objectType: string,
	property: string,
): boolean => {
	if (property !== "startArrow" && property !== "endArrow") return false;
	return objectType === "polyline" || objectType === "connector";
};

/**
 * プロパティ値を適切な型にパースする。
 */
const parsePropertyValue = (property: string, value: string): unknown => {
	switch (property) {
		case "strokeWidth":
		case "rx":
			return Number(value);
		case "lockAspectRatio":
			return value === "true";
		default:
			return value;
	}
};

/**
 * 選択中の全オブジェクトに対してプロパティを更新する。
 * objectRegistry の features を使って、対象オブジェクトがそのプロパティをサポートしているか判定する。
 *
 * @param state - 現在の CanvasControllerState
 * @param property - 更新するプロパティ名 (例: "fill", "stroke", "lockAspectRatio")
 * @param value - 設定する値の文字列表現
 * @returns 更新後の CanvasControllerState
 */
export const handlePropertyUpdate = (
	state: CanvasControllerState,
	property: string,
	value: string,
): CanvasControllerState => {
	const { selectedIds, objects } = state;
	if (selectedIds.length === 0) return state;

	const updatedObjects = { ...objects };
	let changed = false;

	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) continue;

		const features = objectRegistry.getFeatures(obj.type);
		const supported = features
			? isPropertySupported(features, property)
			: false;
		const arrowSupported = isArrowPropertySupported(obj.type, property);

		if (!supported && !arrowSupported) continue;

		const parsedValue = parsePropertyValue(property, value);
		updatedObjects[id] = {
			...obj,
			[property]: parsedValue,
		} as ObjectState;
		changed = true;
	}

	if (!changed) return state;

	return {
		...state,
		objects: updatedObjects,
	};
};
