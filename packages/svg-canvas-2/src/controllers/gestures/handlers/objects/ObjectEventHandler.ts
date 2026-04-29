import type { Point } from "@workspace/geometry";
import { calcKeyPointsBoundingBox } from "@workspace/geometry";

import { moveGroup } from "./primitives/GroupController";
import { createMultiSelectGroup } from "./utils/createMultiSelectGroup";
import { determineSelection } from "./utils/determineSelection";
import { getAncestors } from "./utils/getAncestors";
import { buildSnapFeedback, findSnap, SNAP_THRESHOLD_PX } from "./utils/snap/findSnap";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { Mods } from "../../../../registry/ObjectRegistryTypes";
import type { SnapFeedback } from "../../../CanvasTypes";
import { hasFrameKeyPoints } from "../../../../states/objects/base/FrameWithKeyPoints";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { updateAffectedGroupBounds } from "../../../ui/utils/updateAffectedGroupBounds";
import { buildSelectedIdsWithDescendants } from "../../../utils/buildSelectedIdsWithDescendants";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";

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
		multiSelectGroup = createMultiSelectGroup(
			selectedIds,
			canvasState.objects,
			canvasState.multiSelectGroup,
		);
	}

	return {
		...canvasState,
		selectedIds,
		multiSelectGroup,
		// コネクター選択を解除して排他を保証
		selectedConnectorId: null,
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

	// --- スナップ補正 ---
	let adjustedDelta = delta;
	let snapFeedback: SnapFeedback = { x: [], y: [] };

	const snapCandidates = canvasState.eventStartState?.snapCandidates;
	if (snapCandidates) {
		const snapSource =
			selectedIds.length > 1
				? canvasState.eventStartState?.multiSelectGroup
				: eventStartObjects[selectedIds[0]];

		if (snapSource && hasFrameKeyPoints(snapSource)) {
			const bbox = calcKeyPointsBoundingBox(snapSource.keyPoints);
			const selectedBBox = {
				left: bbox.left + delta.x,
				right: bbox.right + delta.x,
				top: bbox.top + delta.y,
				bottom: bbox.bottom + delta.y,
			};

			// 現在の selectedIds + 全子孫を除外（dragStart後の選択変更・グループ子図形も対応）
			// dragStart 時にキャッシュ済みの値を優先して使用し、フォールバックとして再計算する
			const excludeIds =
				canvasState.eventStartState?.selectedIdsWithDescendants
				?? buildSelectedIdsWithDescendants(selectedIds, eventStartObjects);
			const filteredCandidates = {
				x: snapCandidates.x.filter((c) => !excludeIds.has(c.objectId)),
				y: snapCandidates.y.filter((c) => !excludeIds.has(c.objectId)),
			};
			const zoom = canvasState.viewport.zoom;
			const result = findSnap(
				filteredCandidates,
				SNAP_THRESHOLD_PX / zoom,
				[selectedBBox.left, selectedBBox.right],
				[selectedBBox.top, selectedBBox.bottom],
			);
			adjustedDelta = {
				x: delta.x + result.delta.x,
				y: delta.y + result.delta.y,
			};
			const actualBBox = {
				left: selectedBBox.left + result.delta.x,
				right: selectedBBox.right + result.delta.x,
				top: selectedBBox.top + result.delta.y,
				bottom: selectedBBox.bottom + result.delta.y,
			};
			snapFeedback = buildSnapFeedback(actualBBox, result.xResult, result.yResult, filteredCandidates);
		}
	}

	// --- 全選択オブジェクトを adjustedDelta で移動 ---
	const updatedObjects = { ...eventStartObjects };

	for (const selectedId of selectedIds) {
		const selectedObject = eventStartObjects[selectedId];
		if (!selectedObject) continue;

		if (selectedObject.type === "group") {
			// Group: 再帰的に子も移動
			moveGroup(selectedId, eventStartObjects, updatedObjects, adjustedDelta);
		} else {
			// Registry経由で形状ごとのmoveByDeltaを取得
			const moveByDelta = objectRegistry.getMoveByDelta(selectedObject.type);
			if (moveByDelta) {
				updatedObjects[selectedId] = moveByDelta(selectedObject, adjustedDelta);
			}
		}
	}

	const nextState = {
		...canvasState,
		objects: updatedObjects,
		snapFeedback,
	};

	// multiSelectGroup も同期して移動
	const multiSelectGroup = canvasState.multiSelectGroup;
	const eventStartMultiSelectGroup =
		canvasState.eventStartState?.multiSelectGroup;
	if (multiSelectGroup && eventStartMultiSelectGroup) {
		nextState.multiSelectGroup = {
			...multiSelectGroup,
			cx: eventStartMultiSelectGroup.cx + adjustedDelta.x,
			cy: eventStartMultiSelectGroup.cy + adjustedDelta.y,
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
	let newMultiSelectGroup = canvasState.multiSelectGroup;
	// eventStartState に設定する multiSelectGroup:
	// - 選択済み: handleGesture.ts が計算した fresh keyPoints 付きの値をそのまま保持
	// - 新規選択: createMultiSelectGroup の結果（keyPoints付き）を使う
	let eventStartMultiSelectGroup = canvasState.eventStartState?.multiSelectGroup ?? null;

	if (isCurrentlySelected || isAncestorSelected) {
		// すでに選択済み: 現在の選択を維持
		selectedIds = canvasState.selectedIds;
	} else {
		// 未選択: 階層的選択ロジックを適用
		const newSelection = determineSelection(targetObject, canvasState, mods);
		selectedIds = newSelection ?? canvasState.selectedIds;

		// 選択中の図形が増えたのに伴い multiSelectGroup を作成・更新する
		const eventStartObjects =
			canvasState.eventStartState?.objects ?? canvasState.objects;
		newMultiSelectGroup =
			selectedIds.length > 1
				? createMultiSelectGroup(
						selectedIds,
						eventStartObjects,
						canvasState.multiSelectGroup,
					)
				: null;
		eventStartMultiSelectGroup = newMultiSelectGroup;
	}

	// dragStart 確定後の selectedIds で excludeIds をキャッシュする
	const selectedIdsWithDescendants = canvasState.eventStartState
		? buildSelectedIdsWithDescendants(
				selectedIds,
				canvasState.eventStartState.objects,
			)
		: null;

	// 選択状態を更新し、エッジスクロールを有効化
	const nextState = {
		...canvasState,
		selectedIds,
		multiSelectGroup: newMultiSelectGroup,
		edgeScrollEnabled: true,
		// コネクター選択を解除して排他を保証
		selectedConnectorId: null,
		// ドラッグ開始時にオブジェクトメニューのドロップダウンを閉じる
		objectMenuOpenId: null,
		eventStartState: canvasState.eventStartState
			? {
					...canvasState.eventStartState,
					multiSelectGroup: eventStartMultiSelectGroup,
					selectedIdsWithDescendants,
				}
			: null,
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
		if (event.type !== "doubleClick") {
			nextState = commitTextEditIfNeeded(state, event.time);
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
