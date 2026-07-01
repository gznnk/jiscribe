import {
	calcFrameKeyPoints,
	calcKeyPointsBoundingBox,
	isTransformedFrame,
} from "@workspace/geometry";
import type {
	FrameKeyPoints,
	Point,
	TransformedFrame,
} from "@workspace/geometry";

import { determineSelection } from "./utils/determineSelection";
import { getAncestors } from "./utils/getAncestors";
import { ORIGIN_SNAP_PX } from "../../../../constants/axisLock";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import { objectMapperRegistry } from "../../../../states/registry/ObjectMapperRegistry";
import type {
	AxisLockFeedback,
	CanvasControllerState,
	SnapFeedback,
} from "../../../CanvasTypes";
import { buildSelectedIdsWithDescendants } from "../../../utils/buildSelectedIdsWithDescendants";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import { createMultiSelectGroup } from "../../../utils/createMultiSelectGroup";
import { moveSelection } from "../../../utils/moveSelection";
import { updateAffectedGroupBounds } from "../../../utils/updateAffectedGroupBounds";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import type { Mods } from "../../registry/ObjectBehaviorTypes";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../utils/snap/findSnap";

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
		// 頂点選択を解除
		selectedVertex: null,
		// 選択変化時にサブメニューを閉じる
		objectMenuOpenId: null,
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
	mods: Mods,
): CanvasControllerState {
	// Only handle left-click drag (button 0)
	if (button !== 0) {
		return canvasState;
	}

	const eventStartSnapshot = canvasState.eventStartSnapshot;
	if (!eventStartSnapshot) {
		return canvasState;
	}

	const eventStartObjects = eventStartSnapshot.objects;
	const selectedIds = canvasState.selectedIds;

	// --- Shift による軸固定 ---
	// Shift 押下中は移動を一方の軸へ固定する。固定する軸（lockedAxis）は累積 delta の
	// 絶対値が小さい方とし、絶対値が大きい方向にのみ動かす。累積量で判定するため、
	// ドラッグ中に大きい方が入れ替われば固定軸も追従する。
	const lockedAxis: "x" | "y" | null = mods.shift
		? Math.abs(delta.x) >= Math.abs(delta.y)
			? "y"
			: "x"
		: null;

	const zoom = canvasState.viewport.zoom;

	// 軸固定中、フリー軸（移動する側）の移動量がわずかなら開始位置へ吸着する。
	// 開始位置に揃っていることを両軸ガイドで示すため、後段で feedback を両軸に設定する。
	const freeAxisDelta = lockedAxis === "x" ? delta.y : delta.x;
	const snapToOrigin =
		lockedAxis !== null && Math.abs(freeAxisDelta) <= ORIGIN_SNAP_PX / zoom;

	const constrainedDelta: Point = snapToOrigin
		? { x: 0, y: 0 }
		: {
				x: lockedAxis === "x" ? 0 : delta.x,
				y: lockedAxis === "y" ? 0 : delta.y,
			};

	// --- スナップ補正 ---
	let adjustedDelta = constrainedDelta;
	let snapFeedback: SnapFeedback = { x: [], y: [] };

	// スナップ候補は dragStart 時にキャッシュ済みの全オブジェクト分を参照のみで使う。
	// 除外（選択中＋全子孫）は配列をフィルタせず、Set を findSnap に渡して内部で弾く。
	const snapCandidates = eventStartSnapshot.snapCandidates;
	const excludeIds = eventStartSnapshot.selectedIdsWithDescendants;
	const snapSourceId =
		selectedIds.length > 1
			? eventStartSnapshot.multiSelectGroup?.id
			: selectedIds[0];
	const snapSourceKeyPoints: FrameKeyPoints | undefined = snapSourceId
		? eventStartSnapshot.keyPoints[snapSourceId]
		: undefined;

	if (snapSourceKeyPoints && !mods.ctrl && !snapToOrigin) {
		const bbox = calcKeyPointsBoundingBox(snapSourceKeyPoints);
		const selectedBBox = {
			left: bbox.left + constrainedDelta.x,
			right: bbox.right + constrainedDelta.x,
			top: bbox.top + constrainedDelta.y,
			bottom: bbox.bottom + constrainedDelta.y,
		};

		// 中央（中点）もドラッグ側エッジ値に含め、中央↔中央 / 中央↔エッジ を吸着可能にする
		const selectedCenterX = (selectedBBox.left + selectedBBox.right) / 2;
		const selectedCenterY = (selectedBBox.top + selectedBBox.bottom) / 2;
		// 固定軸はスナップ補正でも動かさないよう、その軸のエッジ値を空にしてスキップする
		const result = findSnap(
			snapCandidates,
			SNAP_THRESHOLD_PX / zoom,
			lockedAxis === "x"
				? []
				: [selectedBBox.left, selectedCenterX, selectedBBox.right],
			lockedAxis === "y"
				? []
				: [selectedBBox.top, selectedCenterY, selectedBBox.bottom],
			excludeIds,
		);
		adjustedDelta = {
			x: constrainedDelta.x + result.delta.x,
			y: constrainedDelta.y + result.delta.y,
		};
		const actualBBox = {
			left: selectedBBox.left + result.delta.x,
			right: selectedBBox.right + result.delta.x,
			top: selectedBBox.top + result.delta.y,
			bottom: selectedBBox.bottom + result.delta.y,
		};
		snapFeedback = buildSnapFeedback(
			actualBBox,
			result.xResult,
			result.yResult,
			snapCandidates,
			excludeIds,
		);
	}

	// --- Shift 軸固定のフィードバック ---
	// 移動できる軸方向を示すガイド線（ビューポート全体に伸びる線）の位置を決める。
	// 通常は固定軸に応じて 1 本（縦移動=縦線 x / 横移動=横線 y）。
	// 原点スナップ中は開始位置に揃っていることを示すため両軸（x・y）を出す。
	// 実描画は専用コンポーネント AxisLockGuide が担う。
	let axisLockFeedback: AxisLockFeedback | null = null;
	if (lockedAxis && snapSourceKeyPoints) {
		const baseBBox = calcKeyPointsBoundingBox(snapSourceKeyPoints);
		const centerX = (baseBBox.left + baseBBox.right) / 2;
		const centerY = (baseBBox.top + baseBBox.bottom) / 2;
		if (snapToOrigin) {
			axisLockFeedback = { x: centerX, y: centerY };
		} else if (lockedAxis === "y") {
			// 横移動: 中心 Y を通る横線
			axisLockFeedback = { y: centerY };
		} else {
			// 縦移動: 中心 X を通る縦線
			axisLockFeedback = { x: centerX };
		}
	}

	// --- 全選択オブジェクトを adjustedDelta で移動（ナッジ移動と共有）---
	// ドラッグはドラッグ開始スナップショットを移動元にして累積 delta で移動する。
	// 親グループの境界更新は dragEnd でまとめて行うため、ここでは行わない。
	const eventStartMultiSelectGroup = eventStartSnapshot.multiSelectGroup;
	const { objects: updatedObjects, multiSelectGroup: movedMultiSelectGroup } =
		moveSelection({
			selectedIds,
			srcObjects: eventStartObjects,
			srcMultiSelectGroup: eventStartMultiSelectGroup,
			delta: adjustedDelta,
		});

	const nextState = {
		...canvasState,
		objects: updatedObjects,
		snapFeedback,
		axisLockFeedback,
	};

	// multiSelectGroup も同期して移動（ドラッグ中に複数選択が維持されている場合のみ）
	if (canvasState.multiSelectGroup && movedMultiSelectGroup) {
		nextState.multiSelectGroup = movedMultiSelectGroup;
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
	// eventStartSnapshot に設定する multiSelectGroup と keyPoints の更新分
	let eventStartMultiSelectGroup =
		canvasState.eventStartSnapshot?.multiSelectGroup ?? null;
	let keyPoints = canvasState.eventStartSnapshot?.keyPoints ?? {};

	if (isCurrentlySelected || isAncestorSelected) {
		// すでに選択済み: 現在の選択を維持
		selectedIds = canvasState.selectedIds;
	} else {
		// 未選択: 階層的選択ロジックを適用
		const newSelection = determineSelection(targetObject, canvasState, mods);
		selectedIds = newSelection ?? canvasState.selectedIds;

		// 選択中の図形が増えたのに伴い multiSelectGroup を作成・更新する
		const eventStartObjects =
			canvasState.eventStartSnapshot?.objects ?? canvasState.objects;
		newMultiSelectGroup =
			selectedIds.length > 1
				? createMultiSelectGroup(
						selectedIds,
						eventStartObjects,
						canvasState.multiSelectGroup,
					)
				: null;
		eventStartMultiSelectGroup = newMultiSelectGroup;

		// 新しい multiSelectGroup の keyPoints も追加する
		if (newMultiSelectGroup && isTransformedFrame(newMultiSelectGroup)) {
			keyPoints = {
				...keyPoints,
				[newMultiSelectGroup.id]: calcFrameKeyPoints(
					newMultiSelectGroup as TransformedFrame,
				),
			};
		}
	}

	// dragStart 確定後の selectedIds で除外集合を再キャッシュする
	// （handleGesture 構築時の選択から変わった場合に snapshot を最新化する）
	const selectedIdsWithDescendants = canvasState.eventStartSnapshot
		? buildSelectedIdsWithDescendants(
				selectedIds,
				canvasState.eventStartSnapshot.objects,
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
		// 頂点選択を解除
		selectedVertex: null,
		// ドラッグ開始時にオブジェクトメニューのドロップダウンを閉じる
		objectMenuOpenId: null,
		eventStartSnapshot: canvasState.eventStartSnapshot
			? {
					...canvasState.eventStartSnapshot,
					multiSelectGroup: eventStartMultiSelectGroup,
					keyPoints,
					...(selectedIdsWithDescendants && { selectedIdsWithDescendants }),
				}
			: null,
	};

	// ドラッグ処理を実行
	return handleObjectDrag(nextState, delta, button, mods);
}

/**
 * ドラッグ終了時の処理
 */
function handleObjectDragEnd(
	canvasState: CanvasControllerState,
	delta: Point,
	button: number,
	mods: Mods,
): CanvasControllerState {
	// エッジスクロールを無効化
	const nextState = {
		...canvasState,
		edgeScrollEnabled: false,
	};

	// 最終的なドラッグ処理
	const resultState = handleObjectDrag(nextState, delta, button, mods);

	// 親グループのバウンディングボックスを更新
	return updateAffectedGroupBounds(resultState, resultState.selectedIds);
}

/**
 * Handles events that occur on objects (not on canvas).
 * This is the main entry point for object-level event handling.
 *
 * Registry経由で各形状の処理を動的に解決するため、形状に依存しない。
 *
 * Note: eventStartSnapshot is managed by handleGesture(), not here.
 */
export const ObjectEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "object";
	},

	handle(state, event) {
		// 現在編集中のオブジェクト自身への doubleClick のみ commit をスキップ（編集継続のため）
		// それ以外（非テキストオブジェクトへの doubleClick を含む）は commit してクリアする
		let nextState = state;
		const isDoubleClickOnCurrentEditTarget =
			event.type === "doubleClick" &&
			state.textEditState?.objectId === event.targetId;
		if (!isDoubleClickOnCurrentEditTarget) {
			nextState = commitTextEditIfNeeded(state);
		}

		const targetObjectId = event.targetId;
		if (!targetObjectId) {
			return nextState;
		}

		const targetObject = nextState.objects[targetObjectId];
		if (!targetObject) {
			return nextState;
		}

		// Pointer Down の処理
		if (event.type === "pressed") {
			if (event.button === 0) {
				// 左クリック押下時はコンテキストメニューを閉じる
				nextState = {
					...nextState,
					contextMenuPosition: null,
				};
			}
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
			// テキストを持つ図形（features.text）のみテキスト編集を開始する。
			// isTextStyleState は「テキスト属性に矛盾が無いか」を見る緩いガードで、
			// テキストを一切持たない図形（svg / polyline / polygon など）も通してしまうため、
			// プロパティ更新側（isPropertySupported）と同じ features.text を正とする。
			const features = objectMapperRegistry.getFeatures(targetObject.type);
			if (features?.text === true && isTextStyleState(targetObject)) {
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
		const objectStartState =
			nextState.eventStartSnapshot?.objects[targetObjectId];
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
			return handleObjectDrag(nextState, event.delta, event.button, event.mods);
		} else if (event.type === "dragEnd") {
			return handleObjectDragEnd(
				nextState,
				event.delta,
				event.button,
				event.mods,
			);
		}

		return nextState;
	},
};
