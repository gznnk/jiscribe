import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import { isPoly } from "../../../../../schemas/objects/types/Poly";
import type {
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../objects/utils/snap/findSnap";
import type { ControlStrategy } from "../ControlEventHandler";

/**
 * コネクターの中間経由点（waypoint）をセグメントへ挿入する操作を処理する。
 *
 * Control ID フォーマット: "connector-vertex-insert:<connectorId>:<segmentIndex>"
 *
 * `segmentIndex` は描画パス `[source, ...waypoints, target]`（端点込み）のセグメント番号。
 * 端点は `points`（waypoints のみ）に含まれないため、挿入位置は polyline 用の
 * VertexInsertHandler（`splice(segmentIndex + 1)`）と 1 ずれ、`splice(segmentIndex)` になる。
 *
 * - segment 0 = source → waypoints[0]  → waypoints の先頭に挿入
 * - segment k = waypoints[k-1] → waypoints[k] → waypoints[k] の位置に挿入
 * - segment n = waypoints[n-1] → target → waypoints の末尾に追加
 *
 * これにより直線コネクター（waypoints が空、セグメント 1 本）にも最初の曲げ点を打てる。
 *
 * 動作:
 * - dragStart: 指定セグメントに新しい waypoint を挿入
 * - drag: 挿入した waypoint を移動（スナップ補正あり）
 * - dragEnd: 最終位置を確定
 */
export class ConnectorVertexInsertHandler implements ControlStrategy {
	readonly controlType = "connector-vertex-insert";

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}
		const targetId = event.targetId;
		return !!targetId && targetId.startsWith("connector-vertex-insert:");
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

		const parts = targetControlId.split(":");
		if (parts.length !== 3 || parts[0] !== "connector-vertex-insert") {
			return state;
		}

		const connectorId = parts[1];
		const segmentIndex = parseInt(parts[2], 10);
		if (isNaN(segmentIndex) || segmentIndex < 0) {
			return state;
		}

		if (event.type === "dragStart") {
			return this.handleDragStart(state, event, connectorId, segmentIndex);
		} else if (event.type === "drag") {
			return this.handleDrag(state, event, connectorId, segmentIndex);
		} else if (event.type === "dragEnd") {
			return this.handleDragEnd(state, event, connectorId, segmentIndex);
		}

		return state;
	}

	/**
	 * 指定セグメントの位置（segmentIndex）に新しい waypoint を挿入し、
	 * 後続の drag が新頂点を参照できるよう eventStartSnapshot も更新する。
	 */
	private handleDragStart(
		state: CanvasControllerState,
		event: CanvasEvent,
		connectorId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const connector = state.objects[connectorId];
		if (!isPoly(connector) || connector.type !== "connector") {
			return state;
		}

		const currentPoints = connector.points;
		// パスのセグメント数は waypoints.length + 1。範囲外は無視する。
		if (segmentIndex < 0 || segmentIndex > currentPoints.length) {
			return state;
		}

		const newPosition: Point = {
			x: roundToDecimal(event.last.x, PRECISION.COORDINATE),
			y: roundToDecimal(event.last.y, PRECISION.COORDINATE),
		};

		const newPoints = [...currentPoints];
		newPoints.splice(segmentIndex, 0, newPosition);

		const updatedConnector = { ...connector, points: newPoints };
		const updatedObjects = {
			...state.objects,
			[connectorId]: updatedConnector,
		};

		const nextState: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			selectedVertex: null,
			edgeScrollEnabled: true,
		};

		if (state.eventStartSnapshot) {
			nextState.eventStartSnapshot = {
				...state.eventStartSnapshot,
				objects: updatedObjects,
			};
		}

		return nextState;
	}

	/**
	 * 挿入した waypoint（インデックス = segmentIndex）を移動する。
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		connectorId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		// dragStart で挿入済みの waypoint を含む snapshot から開始状態を取得する。
		const startConnector = eventStartSnapshot.objects[connectorId];
		if (!isPoly(startConnector) || startConnector.type !== "connector") {
			return state;
		}

		const insertedIndex = segmentIndex;
		if (insertedIndex >= startConnector.points.length) {
			return state;
		}

		// --- オブジェクト間スナップ補正 ---
		let cursorX = event.last.x;
		let cursorY = event.last.y;
		const snapCandidates = eventStartSnapshot.snapCandidates;
		let snapFeedback: SnapFeedback = { x: [], y: [] };

		if (snapCandidates && !event.mods.ctrl) {
			const zoom = state.viewport.zoom;
			const result = findSnap(
				snapCandidates,
				SNAP_THRESHOLD_PX / zoom,
				[cursorX],
				[cursorY],
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

		const newPosition: Point = {
			x: roundToDecimal(cursorX, PRECISION.COORDINATE),
			y: roundToDecimal(cursorY, PRECISION.COORDINATE),
		};

		const newPoints = [...startConnector.points];
		newPoints[insertedIndex] = newPosition;

		const updatedConnector = { ...startConnector, points: newPoints };
		return {
			...state,
			objects: {
				...state.objects,
				[connectorId]: updatedConnector,
			},
			snapFeedback,
		};
	}

	/**
	 * 最終位置を確定する。
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
		connectorId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const nextState = this.handleDrag(
			{ ...state },
			event,
			connectorId,
			segmentIndex,
		);

		return {
			...nextState,
			edgeScrollEnabled: false,
		};
	}
}
