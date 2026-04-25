import { useMemo } from "react";

import { collectDescendantIds } from "../../../../utils/collectDescendantIds";
import { objectRegistry } from "../../../../../registry/ObjectRegistry";
import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import type { ObjectMenuConfig } from "../types/ObjectMenuConfig";

/**
 * Merge a boolean property: only include if all configs have it set to true.
 */
const mergeBooleanProperty = (
	configs: ObjectMenuConfig[],
	key: keyof ObjectMenuConfig,
): boolean | undefined => {
	// Check if all configs have this property set to true
	const allTrue = configs.every((config) => config[key] === true);
	return allTrue ? true : undefined;
};

/**
 * Merge borderStyle property: only include if all configs have it,
 * and merge nested properties individually.
 */
const mergeBorderStyle = (
	configs: ObjectMenuConfig[],
): { radius?: boolean } | undefined => {
	// Check if all configs have borderStyle
	const allHaveBorderStyle = configs.every(
		(config) =>
			config.borderStyle !== undefined &&
			typeof config.borderStyle === "object",
	);

	if (!allHaveBorderStyle) {
		return undefined;
	}

	// Merge radius property: true if all configs have it set to true, false otherwise
	const allHaveRadius = configs.every(
		(config) => config.borderStyle?.radius === true,
	);

	return {
		radius: allHaveRadius,
	};
};

/**
 * Get the common menu configuration for selected objects.
 * Only returns menu items that are enabled (true) for all object types.
 * Each menu property is merged individually with its own merge logic.
 *
 * Pure function for testing and reusability.
 * Based on svg-canvas's getCommonMenuConfig but adapted for svg-canvas-2.
 *
 * @param state - Canvas state
 * @returns ObjectMenuConfig with only commonly enabled menu items set to true
 */
export const getMenuConfig = (state: CanvasState): ObjectMenuConfig => {
	const { selectedIds, objects } = state;

	if (selectedIds.length === 0) {
		return {};
	}

	// Collect unique object types (excluding "group").
	// For groups, collect types from all non-group descendants so that
	// recursive property updates are reflected in the menu.
	const types = new Set<string>();
	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) continue;
		if (obj.type !== "group") {
			types.add(obj.type);
		} else {
			for (const descId of collectDescendantIds(id, objects)) {
				const descObj = objects[descId];
				if (descObj && descObj.type !== "group") {
					types.add(descObj.type);
				}
			}
		}
	}

	if (types.size === 0) {
		return {};
	}

	// Get menu configs for all selected object types
	const menuConfigs: ObjectMenuConfig[] = [];
	for (const type of types) {
		const config = objectRegistry.getMenuConfig(type);
		if (config) {
			menuConfigs.push(config);
		}
	}

	if (menuConfigs.length === 0) {
		return {};
	}

	// Merge each property individually
	const result: ObjectMenuConfig = {};

	// Merge backgroundColor
	const backgroundColor = mergeBooleanProperty(menuConfigs, "backgroundColor");
	if (backgroundColor !== undefined) {
		result.backgroundColor = backgroundColor;
	}

	// Merge borderColor
	const borderColor = mergeBooleanProperty(menuConfigs, "borderColor");
	if (borderColor !== undefined) {
		result.borderColor = borderColor;
	}

	// Merge lineColor
	const lineColor = mergeBooleanProperty(menuConfigs, "lineColor");
	if (lineColor !== undefined) {
		result.lineColor = lineColor;
	}

	// Merge borderStyle (nested object with special handling)
	const borderStyle = mergeBorderStyle(menuConfigs);
	if (borderStyle !== undefined) {
		result.borderStyle = borderStyle;
	}

	// Merge arrowHead
	const arrowHead = mergeBooleanProperty(menuConfigs, "arrowHead");
	if (arrowHead !== undefined) {
		result.arrowHead = arrowHead;
	}

	// Merge lineStyle
	const lineStyle = mergeBooleanProperty(menuConfigs, "lineStyle");
	if (lineStyle !== undefined) {
		result.lineStyle = lineStyle;
	}

	// Merge fontStyle
	const fontStyle = mergeBooleanProperty(menuConfigs, "fontStyle");
	if (fontStyle !== undefined) {
		result.fontStyle = fontStyle;
	}

	// Merge textAlignment
	const textAlignment = mergeBooleanProperty(menuConfigs, "textAlignment");
	if (textAlignment !== undefined) {
		result.textAlignment = textAlignment;
	}

	// aspectRatio is not merged here - it's always undefined
	// Display control is handled in ObjectMenu based on single/multi selection
	// Active/inactive state is determined in KeepAspectRatioMenu itself
	result.aspectRatio = undefined;

	return result;
};

/**
 * Hook version of getMenuConfig with memoization.
 * Recomputes only when selectedIds or objects change.
 *
 * @param state - Canvas state
 * @returns ObjectMenuConfig with only commonly enabled menu items set to true
 */
export const useMenuConfig = (state: CanvasState): ObjectMenuConfig => {
	// TODO: メモ化の意味がほぼない
	return useMemo(() => getMenuConfig(state), [state]);
};
