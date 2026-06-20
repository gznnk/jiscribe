import { cloneObjects } from "./cloneObjects";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import { createMultiSelectGroup } from "../../gestures/handlers/objects/utils/createMultiSelectGroup";

const PASTE_OFFSET = { x: 20, y: 20 };

export const handlePaste = (
	state: CanvasControllerState,
	data: ClipboardData,
): CanvasControllerState => {
	// data.rootIds はオブジェクトとコネクターの z-order 混在配列。
	// cloneObjects は「offset を当てる対象（=非コネクター）」と「コネクター」を分けて受けるため、
	// 型で振り分けてから渡す。
	const objectRootIds = data.rootIds.filter(
		(id) => data.objects[id]?.type !== "connector",
	);
	const connectorIds = data.rootIds.filter(
		(id) => data.objects[id]?.type === "connector",
	);

	const { newObjects, newRootIds, idRemap } = cloneObjects(
		objectRootIds,
		data.objects,
		connectorIds,
		PASTE_OFFSET,
	);

	const mergedObjects = { ...state.objects, ...newObjects };

	// コピー集合の相対的な重なり順（z-order 済みの data.rootIds）を保って前面へ追加する。
	const orderedNewIds = data.rootIds
		.map((id) => idRemap.get(id))
		.filter((id): id is string => id !== undefined);

	return {
		...state,
		objects: mergedObjects,
		rootIds: [...state.rootIds, ...orderedNewIds],
		selectedIds: newRootIds,
		multiSelectGroup: createMultiSelectGroup(newRootIds, mergedObjects, null),
		contextMenuPosition: null,
		lastDuplicate: null,
		commitVersion: state.commitVersion + 1,
	};
};
