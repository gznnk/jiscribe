import { cloneObjects } from "./cloneObjects";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import { createMultiSelectGroup } from "../../gestures/handlers/objects/utils/createMultiSelectGroup";

const PASTE_OFFSET = { x: 20, y: 20 };

export const handlePaste = (
	state: CanvasControllerState,
	data: ClipboardData,
): CanvasControllerState => {
	const { newObjects, newRootIds, newConnectorIds } = cloneObjects(
		data.rootIds,
		data.objects,
		data.connectorIds,
		PASTE_OFFSET,
	);

	const mergedObjects = { ...state.objects, ...newObjects };

	return {
		...state,
		objects: mergedObjects,
		rootIds: [...state.rootIds, ...newRootIds],
		connectorIds: [...state.connectorIds, ...newConnectorIds],
		selectedIds: newRootIds,
		multiSelectGroup: createMultiSelectGroup(newRootIds, mergedObjects, null),
		contextMenuPosition: null,
		lastDuplicate: null,
		commitVersion: state.commitVersion + 1,
	};
};
