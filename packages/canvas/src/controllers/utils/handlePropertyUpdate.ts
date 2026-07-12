import { collectDescendantIds } from "./collectDescendantIds";
import type { ObjectFeatures } from "../../schemas/objects/types/ObjectFeatures";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Dot-notation properties that represent nested style updates on a connector label.
 * They ride along the flat top-level property plumbing in dot notation, and only the
 * convergence point handlePropertyUpdate (connector branch) interprets them as nested.
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

// Label subkeys stored as numbers (others stay as strings).
const LABEL_NUMERIC_KEYS = new Set(["strokeWidth", "fontSize"]);

const isLabelStyleProperty = (property: string): boolean =>
	LABEL_STYLE_PROPERTIES.has(property);

/**
 * Nested-merges a `label.*` property into connector.label.
 * Does nothing if the label is unset (no text). Numeric subkeys (strokeWidth/fontSize) are coerced to numbers.
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
			return features.arrow === true;
		default:
			return false;
	}
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
 * Updates a property on all selected objects.
 * If a connector is selected (selectedConnectorId != null), updates that connector.
 * For lockAspectRatio with a multi-selection, updates only the multiSelectGroup.
 */
export const handlePropertyUpdate = (
	state: CanvasControllerState,
	property: string,
	value: string,
): CanvasControllerState => {
	const { selectedIds, selectedConnectorId, objects, multiSelectGroup } = state;

	// Connector selected (selectedIds is empty)
	if (selectedIds.length === 0 && selectedConnectorId !== null) {
		const connector = objects[selectedConnectorId];
		if (!connector) {
			return state;
		}

		// Nested label styles (label.fill / label.stroke / label.strokeWidth) are
		// written to connector.label rather than the top level.
		if (isLabelStyleProperty(property)) {
			return updateConnectorLabelStyle(
				state,
				connector as ConnectorState,
				property,
				value,
			);
		}

		const features = connector.features;
		const supported = features
			? isPropertySupported(features, property)
			: false;
		if (!supported) {
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

	// For lockAspectRatio with a multi-selection, update only the multiSelectGroup
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

	// The property/value pair is common to all objects, so parse it once
	const parsedValue = parsePropertyValue(property, value);
	if (parsedValue === null) {
		return state;
	}

	// Update the property on the root-level selected objects
	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) {
			continue;
		}

		const features = obj.features;
		const supported = features
			? isPropertySupported(features, property)
			: false;

		if (!supported) {
			continue;
		}

		updatedObjects[id] = {
			...obj,
			[property]: parsedValue,
		} as ObjectState;
		changed = true;
	}

	// Recursively update descendants of selected groups (excluding lockAspectRatio)
	if (property !== "lockAspectRatio") {
		for (const id of selectedIds) {
			const descendantIds = collectDescendantIds(id, objects);
			for (const descId of descendantIds) {
				const descObj = updatedObjects[descId] ?? objects[descId];
				if (!descObj) {
					continue;
				}
				const features = descObj.features;
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
