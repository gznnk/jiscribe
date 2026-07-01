import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { ORIGIN_SNAP_PX } from "../../../../../constants/axisLock";
import { PRECISION } from "../../../../../constants/precision";
import { isPoly } from "../../../../../schemas/objects/types/Poly";
import type {
	AxisLockFeedback,
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import { updateGroupBoundsFromRoot } from "../../../../utils/updateGroupBoundsFromRoot";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../../utils/snap/findSnap";
import type { ControlStrategy } from "../ControlEventHandler";

/**
 * Vertex control の操作（頂点の移動）を処理する。
 *
 * Control ID フォーマット: "vertex-control:<objectId>:<vertexIndex>"
 * 例: "vertex-control:poly-1:0"
 */
export class VertexControlHandler implements ControlStrategy {
	readonly controlType = "vertex-control";

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}

		const targetId = event.targetId;
		if (!targetId) {
			return false;
		}

		// vertex-control かどうかをチェック
		return targetId.startsWith("vertex-control:");
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

		// "vertex-control:poly-1:0" からオブジェクトIDと頂点インデックスをパース
		const parts = targetControlId.split(":");
		if (parts.length !== 3 || parts[0] !== "vertex-control") {
			return state;
		}

		const objectId = parts[1];
		const vertexIndex = parseInt(parts[2], 10);

		if (isNaN(vertexIndex) || vertexIndex < 0) {
			return state;
		}

		// ジェスチャータイプに応じて適切なハンドラーにルーティング
		let nextState = state;

		if (event.type === "click") {
			nextState = this.handleClick(nextState, objectId, vertexIndex);
		} else if (event.type === "dragStart") {
			nextState = this.handleDragStart(nextState, event);
		} else if (event.type === "drag") {
			nextState = this.handleDrag(nextState, event, objectId, vertexIndex);
		} else if (event.type === "dragEnd") {
			nextState = this.handleDragEnd(nextState, event, objectId, vertexIndex);
		}

		return nextState;
	}

	/**
	 * Vertex control のクリックを処理する。クリックされた頂点を選択状態にする。
	 */
	private handleClick(
		state: CanvasControllerState,
		objectId: string,
		vertexIndex: number,
	): CanvasControllerState {
		const targetObject = state.objects[objectId];
		if (!isPoly(targetObject) || vertexIndex >= targetObject.points.length) {
			return state;
		}

		return {
			...state,
			selectedVertex: { objectId, vertexIndex },
			objectMenuOpenId: null,
		};
	}

	/**
	 * Vertex control でのドラッグ開始を処理する。
	 */
	private handleDragStart(
		state: CanvasControllerState,
		_event: CanvasEvent,
	): CanvasControllerState {
		return {
			...state,
			selectedVertex: null,
			edgeScrollEnabled: true,
			objectMenuOpenId: null,
		};
	}

	/**
	 * Vertex control でのドラッグを処理する。
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		vertexIndex: number,
	): CanvasControllerState {
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		const startObject = eventStartSnapshot.objects[objectId];
		if (!isPoly(startObject)) {
			return state;
		}

		// 範囲外の頂点インデックスへの書き込みを防ぐ
		if (vertexIndex >= startObject.points.length) {
			return state;
		}

		const startPoint = startObject.points[vertexIndex];
		const zoom = state.viewport.zoom;

		// --- Shift による軸固定 ---
		// 開始頂点位置を基準に、移動量の大きい軸方向へのみ動かす（小さい軸を固定）。
		// 累積量で判定するため、ドラッグ中に優位軸が入れ替われば固定軸も追従する。
		const dx = event.last.x - startPoint.x;
		const dy = event.last.y - startPoint.y;
		const lockedAxis: "x" | "y" | null = event.mods.shift
			? Math.abs(dx) >= Math.abs(dy)
				? "y"
				: "x"
			: null;

		// 軸固定中、フリー軸の移動量がわずかなら開始頂点へ吸着し、両軸ガイドを出す。
		const freeAxisDelta = lockedAxis === "x" ? dy : dx;
		const snapToOrigin =
			lockedAxis !== null && Math.abs(freeAxisDelta) <= ORIGIN_SNAP_PX / zoom;

		// 軸固定を反映したカーソル位置（固定軸・原点スナップは開始頂点座標に置き換える）
		let cursorX = event.last.x;
		let cursorY = event.last.y;
		if (lockedAxis === "x" || snapToOrigin) {
			cursorX = startPoint.x;
		}
		if (lockedAxis === "y" || snapToOrigin) {
			cursorY = startPoint.y;
		}

		// --- オブジェクト間スナップ補正（固定軸・原点スナップ中はスキップ）---
		const snapCandidates = eventStartSnapshot.snapCandidates;
		let snapFeedback: SnapFeedback = { x: [], y: [] };

		if (snapCandidates && !event.mods.ctrl && !snapToOrigin) {
			const result = findSnap(
				snapCandidates,
				SNAP_THRESHOLD_PX / zoom,
				lockedAxis === "x" ? [] : [cursorX],
				lockedAxis === "y" ? [] : [cursorY],
			);
			cursorX += result.delta.x;
			cursorY += result.delta.y;
			const pointBBox = {
				left: cursorX,
				right: cursorX,
				top: cursorY,
				bottom: cursorY,
			};
			snapFeedback = buildSnapFeedback(
				pointBBox,
				result.xResult,
				result.yResult,
				snapCandidates,
			);
		}

		// --- Shift 軸固定のフィードバック（ビューポート全体ガイド）---
		// 固定軸は開始頂点の座標を通る線。原点スナップ中は両軸（十字）を出す。
		let axisLockFeedback: AxisLockFeedback | null = null;
		if (lockedAxis) {
			if (snapToOrigin) {
				axisLockFeedback = { x: startPoint.x, y: startPoint.y };
			} else if (lockedAxis === "y") {
				axisLockFeedback = { y: startPoint.y };
			} else {
				axisLockFeedback = { x: startPoint.x };
			}
		}

		// 新しい頂点位置を計算
		const newPosition: Point = {
			x: roundToDecimal(cursorX, PRECISION.COORDINATE),
			y: roundToDecimal(cursorY, PRECISION.COORDINATE),
		};

		// 頂点位置を更新
		const newPoints = [...startObject.points];
		newPoints[vertexIndex] = newPosition;

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
			axisLockFeedback,
		};
	}

	/**
	 * Vertex control でのドラッグ終了を処理する。
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		vertexIndex: number,
	): CanvasControllerState {
		// ドラッグ中の状態更新を適用して最終状態を計算
		let nextState = this.handleDrag({ ...state }, event, objectId, vertexIndex);

		// グループに所属している場合はグループの枠を更新する
		const updatedObject = nextState.objects[objectId];
		if (updatedObject?.parentId) {
			nextState = updateGroupBoundsFromRoot(nextState, updatedObject.parentId);
		}

		return {
			...nextState,
			edgeScrollEnabled: false, // Disable edge scrolling on drag end
		};
	}
}
