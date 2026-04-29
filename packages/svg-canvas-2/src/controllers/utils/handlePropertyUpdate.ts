import { collectDescendantIds } from "./collectDescendantIds";
import { objectRegistry } from "../../registry/ObjectRegistry";
import type { ObjectFeatures } from "../../schemas/objects/types/ObjectFeatures";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../CanvasTypes";

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
		case "text":
		case "textAlign":
		case "verticalAlign":
		case "fontColor":
		case "fontSize":
		case "fontFamily":
		case "fontWeight":
			return features.text === true;
		case "lockAspectRatio":
			return features.transform === true;
		case "startArrow":
		case "endArrow":
			return false;
		default:
			return false;
	}
};

const isArrowPropertySupported = (
	objectType: string,
	property: string,
): boolean => {
	if (property !== "startArrow" && property !== "endArrow") return false;
	return objectType === "polyline" || objectType === "connector";
};

const parsePropertyValue = (property: string, value: string): unknown => {
	switch (property) {
		case "strokeWidth":
		case "rx":
		case "fontSize":
			return Number(value);
		case "lockAspectRatio":
			return value === "true";
		default:
			return value;
	}
};

/**
 * 選択中の全オブジェクトに対してプロパティを更新する。
 * lockAspectRatio かつ複数選択時は multiSelectGroup のみ更新。
 */
export const handlePropertyUpdate = (
	state: CanvasControllerState,
	property: string,
	value: string,
): CanvasControllerState => {
	const { selectedIds, objects, multiSelectGroup } = state;
	if (selectedIds.length === 0) return state;

	// lockAspectRatio かつ複数選択時は multiSelectGroup のみ更新
	if (property === "lockAspectRatio" && multiSelectGroup) {
		const parsedValue = parsePropertyValue(property, value) as boolean;
		return {
			...state,
			multiSelectGroup: {
				...multiSelectGroup,
				lockAspectRatio: parsedValue,
			},
		};
	}

	const updatedObjects = { ...objects };
	let changed = false;

	// property/value の組み合わせは全オブジェクトで共通なので一度だけ変換
	const parsedValue = parsePropertyValue(property, value);

	// ルートレベルの選択オブジェクトに対してプロパティを更新
	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) continue;

		const features = objectRegistry.getFeatures(obj.type);
		const supported = features
			? isPropertySupported(features, property)
			: false;
		const arrowSupported = isArrowPropertySupported(obj.type, property);

		if (!supported && !arrowSupported) continue;

		updatedObjects[id] = {
			...obj,
			[property]: parsedValue,
		} as ObjectState;
		changed = true;
	}

	// Recursively update descendants of selected groups (lockAspectRatio は除外)
	if (property !== "lockAspectRatio") {
		for (const id of selectedIds) {
			const descendantIds = collectDescendantIds(id, objects);
			for (const descId of descendantIds) {
				const descObj = updatedObjects[descId] ?? objects[descId];
				if (!descObj) continue;
				const features = objectRegistry.getFeatures(descObj.type);
				const supported = features
					? isPropertySupported(features, property)
					: false;
				if (!supported) continue;
				updatedObjects[descId] = {
					...descObj,
					[property]: parsedValue,
				} as ObjectState;
				changed = true;
			}
		}
	}

	if (!changed) return state;

	return {
		...state,
		objects: updatedObjects,
	};
};
