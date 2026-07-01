import { collectDescendantIds } from "./collectDescendantIds";
import type { ObjectFeatures } from "../../schemas/objects/types/ObjectFeatures";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import { objectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * コネクターラベルのネストしたスタイル更新を表すドット記法のプロパティ群。
 * フラットなトップ階層プロパティ配管にドット記法のまま相乗りし、収束点の
 * handlePropertyUpdate（connector 分岐）だけがネスト解釈する。
 */
const LABEL_STYLE_PROPERTIES = new Set([
	"label.fill",
	"label.stroke",
	"label.strokeWidth",
	"label.strokeDashType",
	"label.fontColor",
	"label.fontSize",
	"label.fontWeight",
]);

// 数値として保存する label サブキー（それ以外は文字列のまま）。
const LABEL_NUMERIC_KEYS = new Set(["strokeWidth", "fontSize"]);

const isLabelStyleProperty = (property: string): boolean =>
	LABEL_STYLE_PROPERTIES.has(property);

/**
 * `label.*` プロパティを connector.label へネスト merge する。
 * ラベル未設定（text 無し）なら何もしない。数値サブキー（strokeWidth/fontSize）は数値化する。
 */
const updateConnectorLabelStyle = (
	state: CanvasControllerState,
	connector: ConnectorState,
	property: string,
	value: string,
): CanvasControllerState => {
	const label = connector.label;
	if (!label) {
		return state;
	}

	const key = property.slice("label.".length);
	let parsed: string | number = value;
	if (LABEL_NUMERIC_KEYS.has(key)) {
		const n = Number(value);
		if (isNaN(n)) {
			return state;
		}
		parsed = n;
	}

	return {
		...state,
		objects: {
			...state.objects,
			[connector.id]: {
				...connector,
				label: { ...label, [key]: parsed },
			} as ObjectState,
		},
	};
};

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
	if (property !== "startArrow" && property !== "endArrow") {
		return false;
	}
	return objectType === "polyline" || objectType === "connector";
};

const parsePropertyValue = (property: string, value: string): unknown => {
	switch (property) {
		case "strokeWidth":
		case "rx":
		case "fontSize": {
			const n = Number(value);
			return isNaN(n) ? null : n;
		}
		case "lockAspectRatio":
			return value === "true";
		default:
			return value;
	}
};

/**
 * 選択中の全オブジェクトに対してプロパティを更新する。
 * Connector が選択されている場合（selectedConnectorId != null）はその Connector を更新する。
 * lockAspectRatio かつ複数選択時は multiSelectGroup のみ更新。
 */
export const handlePropertyUpdate = (
	state: CanvasControllerState,
	property: string,
	value: string,
): CanvasControllerState => {
	const { selectedIds, selectedConnectorId, objects, multiSelectGroup } = state;

	// Connector 選択時（selectedIds は空）
	if (selectedIds.length === 0 && selectedConnectorId !== null) {
		const connector = objects[selectedConnectorId];
		if (!connector) {
			return state;
		}

		// ラベルのネストスタイル（label.fill / label.stroke / label.strokeWidth）は
		// トップ階層でなく connector.label へ書く。
		if (isLabelStyleProperty(property)) {
			return updateConnectorLabelStyle(
				state,
				connector as ConnectorState,
				property,
				value,
			);
		}

		const features = objectMapperRegistry.getFeatures(connector.type);
		const supported = features
			? isPropertySupported(features, property)
			: false;
		const arrowSupported = isArrowPropertySupported(connector.type, property);
		if (!supported && !arrowSupported) {
			return state;
		}

		const parsedValue = parsePropertyValue(property, value);
		if (parsedValue === null) {
			return state;
		}

		return {
			...state,
			objects: {
				...objects,
				[selectedConnectorId]: {
					...connector,
					[property]: parsedValue,
				} as ObjectState,
			},
		};
	}

	if (selectedIds.length === 0) {
		return state;
	}

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
	if (parsedValue === null) {
		return state;
	}

	// ルートレベルの選択オブジェクトに対してプロパティを更新
	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) {
			continue;
		}

		const features = objectMapperRegistry.getFeatures(obj.type);
		const supported = features
			? isPropertySupported(features, property)
			: false;
		const arrowSupported = isArrowPropertySupported(obj.type, property);

		if (!supported && !arrowSupported) {
			continue;
		}

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
				if (!descObj) {
					continue;
				}
				const features = objectMapperRegistry.getFeatures(descObj.type);
				const supported = features
					? isPropertySupported(features, property)
					: false;
				if (!supported) {
					continue;
				}
				updatedObjects[descId] = {
					...descObj,
					[property]: parsedValue,
				} as ObjectState;
				changed = true;
			}
		}
	}

	if (!changed) {
		return state;
	}

	return {
		...state,
		objects: updatedObjects,
	};
};
