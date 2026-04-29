import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerRegistryTypes";
import type { PolygonState } from "../../../../../states/objects/primitives/polygon/PolygonState";
import type { PolylineState } from "../../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { updateGroupBoundsFromRoot } from "../../../../utils/updateGroupBoundsFromRoot";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../objects/utils/snap/findSnap";
import type { ControlStrategy } from "../ControlEventHandler";

type PolyState = PolylineState | PolygonState;

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

		if (isNaN(vertexIndex)) {
			return state;
		}

		// ジェスチャータイプに応じて適切なハンドラーにルーティング
		let nextState = state;

		if (event.type === "dragStart") {
			nextState = this.handleDragStart(nextState, event);
		} else if (event.type === "drag") {
			nextState = this.handleDrag(nextState, event, objectId, vertexIndex);
		} else if (event.type === "dragEnd") {
			nextState = this.handleDragEnd(nextState, event, objectId, vertexIndex);
		}

		return nextState;
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
		if (
			!startObject ||
			(startObject.type !== "polyline" && startObject.type !== "polygon")
		) {
			return state;
		}

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
		const poly = startObject as PolyState;
		const newPoints = [...poly.points];
		newPoints[vertexIndex] = newPosition;

		const updatedObject: PolyState = {
			...poly,
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
