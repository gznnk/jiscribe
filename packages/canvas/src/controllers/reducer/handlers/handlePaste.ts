import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import { cloneObjects } from "../../utils/cloneObjects";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";

const PASTE_OFFSET = { x: 20, y: 20 };

export const handlePaste = (
	state: CanvasControllerState,
	data: ClipboardData,
): CanvasControllerState => {
	// data.rootIds は z-order 済みのトップレベル（オブジェクト + コネクター）混在配列。
	// cloneObjects は同じ順序で新 ID を返すので、そのまま前面（rootIds 末尾）へ積めばよい。
	const { newObjects, newTopLevelIds } = cloneObjects(
		data.rootIds,
		data.objects,
		PASTE_OFFSET,
	);

	const mergedObjects = { ...state.objects, ...newObjects };

	// 選択はコピーした図形のみ（コネクターは selectedConnectorId で別管理のため除外）。
	const newObjectIds = newTopLevelIds.filter(
		(id) => mergedObjects[id]?.type !== "connector",
	);

	return {
		...state,
		objects: mergedObjects,
		rootIds: [...state.rootIds, ...newTopLevelIds],
		selectedIds: newObjectIds,
		// 図形選択を非空にするため、相互排他のコネクター/頂点選択を解除する
		// （他の selectedIds 変更経路と同様。解除しないと SwapArrows / Delete などが
		// 画面に出ていない旧コネクター/旧頂点に作用する）
		selectedConnectorId: null,
		selectedVertex: null,
		multiSelectGroup: createMultiSelectGroup(newObjectIds, mergedObjects, null),
		contextMenuPosition: null,
		lastDuplicate: null,
		commitVersion: state.commitVersion + 1,
	};
};
