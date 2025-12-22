import type { Diagram } from "../../types/state/core/Diagram";
import type { GroupState } from "../../types/state/shapes/GroupState";
import { calcUnrotatedItemableBoundingBox } from "../../utils/core/calcUnrotatedItemableBoundingBox";
import { hasRotateDisabledItem } from "../../utils/shapes/group/hasRotateDisabledItem";
import { MULTI_SELECT_GROUP } from "../SvgCanvasConstants";

/**
 * Creates a multi-select group from a list of selected items.
 *
 * @param selectedItems - The list of selected items to group
 * @param previousKeepProportion - The previous keepProportion setting to preserve
 * @returns A GroupState object representing the multi-select group
 */
export const createMultiSelectGroup = (
	selectedItems: Diagram[],
	previousKeepProportion = true,
): GroupState => {
	const boundingBox = calcUnrotatedItemableBoundingBox(selectedItems);

	// Check if any selected item has rotation disabled
	const rotateEnabled = !hasRotateDisabledItem(selectedItems);

	return {
		id: MULTI_SELECT_GROUP,
		type: "Group",
		x: boundingBox.left + (boundingBox.right - boundingBox.left) / 2,
		y: boundingBox.top + (boundingBox.bottom - boundingBox.top) / 2,
		width: boundingBox.right - boundingBox.left,
		height: boundingBox.bottom - boundingBox.top,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		keepProportion: previousKeepProportion,
		rotateEnabled,
		inversionEnabled: true,
		isSelected: true,
		isRootSelected: false,
		isAncestorSelected: false,
		showOutline: true,
		outlineDisabled: false,
		isTransforming: false,
		itemableType: "group",
		items: [],
	} as GroupState;
};
