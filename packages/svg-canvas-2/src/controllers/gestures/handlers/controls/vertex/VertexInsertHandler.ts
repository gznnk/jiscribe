import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { isPoly } from "../../../../../schemas/objects/types/Poly";
import { PRECISION } from "../../../../../constants/precision";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { updateGroupBoundsFromRoot } from "../../../../utils/updateGroupBoundsFromRoot";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../objects/utils/snap/findSnap";
import type { ControlStrategy } from "../ControlEventHandler";

/**
 * Vertex insert control の操作（セグメントへの頂点追加）を処理する。
 *
 * Control ID フォーマット: "vertex-insert:<objectId>:<segmentIndex>"
 * 例: "vertex-insert:poly-1:0" (points[0]とpoints[1]の間のセグメント)
 *
 * 動作:
 * - dragStart: 指定されたセグメントに新しい頂点を追加
 * - drag: 新しく追加された頂点を移動
 * - dragEnd: 最終位置を確定
 */
export class VertexInsertHandler implements ControlStrategy {
	readonly controlType = "vertex-insert";

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}

		const targetId = event.targetId;
		if (!targetId) {
			return false;
		}

		// vertex-insert かどうかをチェック
		return targetId.startsWith("vertex-insert:");
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Only handle left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		const targetControlId = event.targetId;
		if (!targetControlId) {
			return state;
		}

		// "vertex-insert:poly-1:0" からオブジェクトIDとセグメントインデックスをパース
		const parts = targetControlId.split(":");
		if (parts.length !== 3 || parts[0] !== "vertex-insert") {
			return state;
		}

		const objectId = parts[1];
		const segmentIndex = parseInt(parts[2], 10);

		if (isNaN(segmentIndex)) {
			return state;
		}

		// dragStart で頂点を追加し、drag/dragEnd でその頂点を移動する
		if (event.type === "dragStart") {
			return this.handleDragStart(state, event, objectId, segmentIndex);
		} else if (event.type === "drag") {
			return this.handleDrag(state, event, objectId, segmentIndex);
		} else if (event.type === "dragEnd") {
			return this.handleDragEnd(state, event, objectId, segmentIndex);
		}

		return state;
	}

	/**
	 * Vertex insert control でのドラッグ開始を処理する。
	 * 新しい頂点を追加し、eventStartSnapshotを更新して次のdragイベントで参照できるようにする。
	 */
	private handleDragStart(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const currentObject = state.objects[objectId];
		if (!isPoly(currentObject)) {
			return state;
		}

		// ドラッグ開始位置に新しい頂点を追加
		const newPosition: Point = {
			x: roundToDecimal(event.last.x, PRECISION.COORDINATE),
			y: roundToDecimal(event.last.y, PRECISION.COORDINATE),
		};

		// 頂点を挿入（segmentIndex + 1の位置に追加）
		const newPoints = [...currentObject.points];
		newPoints.splice(segmentIndex + 1, 0, newPosition);

		const updatedObject = {
			...currentObject,
			points: newPoints,
		};

		// 更新されたobjectsを含む新しい状態を作成
		const updatedObjects = {
			...state.objects,
			[objectId]: updatedObject,
		};

		const nextState: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			selectedVertex: null,
			edgeScrollEnabled: true,
		};

		// eventStartSnapshotを更新して、dragイベントで新しい頂点を含む状態を参照できるようにする
		if (state.eventStartSnapshot) {
			nextState.eventStartSnapshot = {
				...state.eventStartSnapshot,
				objects: updatedObjects,
			};
		}

		return nextState;
	}

	/**
	 * Vertex insert control でのドラッグを処理する。
	 * 新しく追加された頂点（segmentIndex + 1の位置）を移動する。
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		// dragStartで更新されたeventStartSnapshotから開始オブジェクトを取得
		// （新しく追加された頂点を含む状態）
		const startObject = eventStartSnapshot.objects[objectId];
		if (!isPoly(startObject)) {
			return state;
		}

		// 新しく追加された頂点のインデックスは segmentIndex + 1
		const newVertexIndex = segmentIndex + 1;

		// スナップ補正
		let cursorX = event.last.x;
		let cursorY = event.last.y;
		const snapCandidates = eventStartSnapshot.snapCandidates;
		let snapFeedback = state.snapFeedback ?? { x: [], y: [] };

		if (snapCandidates) {
			const zoom = state.viewport.zoom;
			const result = findSnap(
				snapCandidates,
				SNAP_THRESHOLD_PX / zoom,
				[cursorX],
				[cursorY],
			);
			cursorX += result.delta.x;
			cursorY += result.delta.y;
			const pointBBox = { left: cursorX, right: cursorX, top: cursorY, bottom: cursorY };
			snapFeedback = buildSnapFeedback(pointBBox, result.xResult, result.yResult, snapCandidates);
		}

		// 新しい頂点位置を計算
		const newPosition: Point = {
			x: roundToDecimal(cursorX, PRECISION.COORDINATE),
			y: roundToDecimal(cursorY, PRECISION.COORDINATE),
		};

		// 頂点位置を更新
		const newPoints = [...startObject.points];
		newPoints[newVertexIndex] = newPosition;

		const updatedObject = {
			...startObject,
			points: newPoints,
		};

		return {
			...state,
			objects: {
				...state.objects,
				[objectId]: updatedObject,
			},
			snapFeedback,
		};
	}

	/**
	 * Vertex insert control でのドラッグ終了を処理する。
	 * 最終位置を確定し、グループの枠を更新する。
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		segmentIndex: number,
	): CanvasControllerState {
		// ドラッグ中の状態更新を適用して最終状態を計算
		let nextState = this.handleDrag(
			{ ...state },
			event,
			objectId,
			segmentIndex,
		);

		// グループに所属している場合はグループの枠を更新する
		const updatedObject = nextState.objects[objectId];
		if (updatedObject?.parentId) {
			nextState = updateGroupBoundsFromRoot(nextState, updatedObject.parentId);
		}

		return {
			...nextState,
			edgeScrollEnabled: false,
		};
	}
}
