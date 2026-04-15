import type { Point } from "@workspace/geometry";

import { moveGroup } from "./primitives/GroupController";
import { createMultiSelectGroup } from "./utils/createMultiSelectGroup";
import { determineSelection } from "./utils/determineSelection";
import { getAncestors } from "./utils/getAncestors";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { Mods } from "../../../../registry/ObjectRegistryTypes";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { updateAffectedGroupBounds } from "../../../ui/utils/updateAffectedGroupBounds";
import { commitTextEdit } from "../../../utils/commitTextEdit";

/**
 * オブジェクトのクリック処理
 * 階層的な選択ロジックを適用し、選択状態を更新する
 */
function handleObjectClick(
	canvasState: CanvasControllerState,
	targetObject: ObjectState,
	mods: Mods,
	button: number,
): CanvasControllerState {
	// Only handle left-click (button 0)
	if (button !== 0) {
		return canvasState;
	}

	// 階層的選択ロジックで新しい選択を決定
	const selectedIds = determineSelection(targetObject, canvasState, mods);

	// 変更がない場合は現在の状態を返す
	if (selectedIds === null) {
		return canvasState;
	}

	// 複数選択の場合は multiSelectGroup を作成
	let multiSelectGroup = null;
	if (1 < selectedIds.length) {
		multiSelectGroup = createMultiSelectGroup(selectedIds, canvasState.objects);
	}

	return {
		...canvasState,
		selectedIds,
		multiSelectGroup,
	};
}

/**
 * オブジェクトのドラッグ処理
 * Registry経由で各形状のmoveByDeltaを動的に解決
 */
function handleObjectDrag(
	canvasState: CanvasControllerState,
	delta: Point,
	button: number,
): CanvasControllerState {
	// Only handle left-click drag (button 0)
	if (button !== 0) {
		return canvasState;
	}

	const eventStartObjects = canvasState.eventStartState?.objects;
	if (!eventStartObjects) {
		return canvasState;
	}

	const selectedIds = canvasState.selectedIds;
	const updatedObjects = { ...eventStartObjects };

	// 選択中のすべてのオブジェクトを移動
	for (const selectedId of selectedIds) {
		const selectedObject = eventStartObjects[selectedId];
		if (!selectedObject) continue;

		if (selectedObject.type === "group") {
			// Group: 再帰的に子も移動
			moveGroup(selectedId, eventStartObjects, updatedObjects, delta);
		} else {
			// Registry経由で形状ごとのmoveByDeltaを取得
			const moveByDelta = objectRegistry.getMoveByDelta(selectedObject.type);
			if (moveByDelta) {
				updatedObjects[selectedId] = moveByDelta(selectedObject, delta);
			}
		}
	}

	const nextState = {
		...canvasState,
		objects: updatedObjects,
	};

	// multiSelectGroup も同期して移動
	const multiSelectGroup = canvasState.multiSelectGroup;
	const eventStartMultiSelectGroup =
		canvasState.eventStartState?.multiSelectGroup;
	if (multiSelectGroup && eventStartMultiSelectGroup) {
		nextState.multiSelectGroup = {
			...multiSelectGroup,
			cx: eventStartMultiSelectGroup.cx + delta.x,
			cy: eventStartMultiSelectGroup.cy + delta.y,
		};
	}

	return nextState;
}

/**
 * ドラッグ開始時の選択処理
 */
function handleObjectDragStart(
	canvasState: CanvasControllerState,
	targetObject: ObjectState,
	delta: Point,
	mods: Mods,
	button: number,
): CanvasControllerState {
	// Only handle left-click drag (button 0)
	if (button !== 0) {
		return canvasState;
	}

	const { id } = targetObject;

	// 選択状態の判定
	const isCurrentlySelected = canvasState.selectedIds.includes(id);
	const ancestors = getAncestors(canvasState, id);
	const isAncestorSelected = ancestors.some((ancestorId) =>
		canvasState.selectedIds.includes(ancestorId),
	);

	let selectedIds: string[];

	if (isCurrentlySelected || isAncestorSelected) {
		// すでに選択済み: 現在の選択を維持
		selectedIds = canvasState.selectedIds;
	} else {
		// 未選択: 階層的選択ロジックを適用
		const newSelection = determineSelection(targetObject, canvasState, mods);
		selectedIds = newSelection ?? canvasState.selectedIds;
	}

	// 選択状態を更新し、エッジスクロールを有効化
	const nextState = {
		...canvasState,
		selectedIds,
		edgeScrollEnabled: true,
	};

	// ドラッグ処理を実行
	return handleObjectDrag(nextState, delta, button);
}

/**
 * ドラッグ終了時の処理
 */
function handleObjectDragEnd(
	canvasState: CanvasControllerState,
	delta: Point,
	button: number,
): CanvasControllerState {
	// エッジスクロールを無効化
	const nextState = {
		...canvasState,
		edgeScrollEnabled: false,
	};

	// 最終的なドラッグ処理
	const resultState = handleObjectDrag(nextState, delta, button);

	// 親グループのバウンディングボックスを更新
	return updateAffectedGroupBounds(resultState, resultState.selectedIds);
}

/**
 * Handles events that occur on objects (not on canvas).
 * This is the main entry point for object-level event handling.
 *
 * Registry経由で各形状の処理を動的に解決するため、形状に依存しない。
 *
 * Note: eventStartState is managed by handleGesture(), not here.
 */
export const ObjectEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "object";
	},

	handle(state, event) {
		// Commit text editing if active (except for doubleClick which starts editing)
		let nextState = state;
		if (state.textEditState && event.type !== "doubleClick") {
			nextState = commitTextEdit(state, event.time);
		}

		const targetObjectId = event.targetId;
		if (!targetObjectId) {
			return nextState;
		}

		const targetObject = nextState.objects[targetObjectId];
		if (!targetObject) {
			return nextState;
		}

		// クリックイベントの処理
		if (event.type === "click") {
			return handleObjectClick(
				nextState,
				targetObject,
				event.mods,
				event.button,
			);
		}

		// ダブルクリックイベントの処理
		if (event.type === "doubleClick") {
			// テキストを持つオブジェクトの場合はテキスト編集を開始
			if (isTextStyleState(targetObject)) {
				return {
					...nextState,
					textEditState: {
						objectId: targetObject.id,
						text: targetObject.text ?? "",
					},
				};
			}
			return nextState;
		}

		// ドラッグイベントの処理
		const objectStartState = nextState.eventStartState?.objects[targetObjectId];
		if (!objectStartState) {
			return nextState;
		}

		if (event.type === "dragStart") {
			return handleObjectDragStart(
				nextState,
				objectStartState,
				event.delta,
				event.mods,
				event.button,
			);
		} else if (event.type === "drag") {
			return handleObjectDrag(nextState, event.delta, event.button);
		} else if (event.type === "dragEnd") {
			return handleObjectDragEnd(nextState, event.delta, event.button);
		}

		return nextState;
	},
};
