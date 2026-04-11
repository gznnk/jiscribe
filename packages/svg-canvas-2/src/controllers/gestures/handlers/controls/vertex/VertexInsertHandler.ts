import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import type { PolylineState } from "../../../../../states/objects/primitives/polyline/PolylineState";
import type { ControlStrategy } from "../ControlEventHandler";
import { updateGroupBoundsFromRoot } from "../transform/utils/updateGroupBoundsFromRoot";

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

	handle(state: CanvasState, event: CanvasEvent): CanvasState {
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
	 * 新しい頂点を追加し、eventStartStateを更新して次のdragイベントで参照できるようにする。
	 */
	private handleDragStart(
		state: CanvasState,
		event: CanvasEvent,
		objectId: string,
		segmentIndex: number,
	): CanvasState {
		const currentObject = state.objects[objectId];
		if (!currentObject || currentObject.type !== "polyline") {
			return state;
		}

		// ドラッグ開始位置に新しい頂点を追加
		const newPosition: Point = {
			x: roundToDecimal(event.last.x, PRECISION.COORDINATE),
			y: roundToDecimal(event.last.y, PRECISION.COORDINATE),
		};

		// 頂点を挿入（segmentIndex + 1の位置に追加）
		const polyline = currentObject as PolylineState;
		const newPoints = [...polyline.points];
		newPoints.splice(segmentIndex + 1, 0, newPosition);

		const updatedObject: PolylineState = {
			...polyline,
			points: newPoints,
		};

		// 更新されたobjectsを含む新しい状態を作成
		const updatedObjects = {
			...state.objects,
			[objectId]: updatedObject,
		};

		let nextState: CanvasState = {
			...state,
			objects: updatedObjects,
			edgeScrollEnabled: true,
		};

		// eventStartStateを更新して、dragイベントで新しい頂点を含む状態を参照できるようにする
		if (state.eventStartState) {
			nextState.eventStartState = {
				...state.eventStartState,
				objects: updatedObjects,
			};
		}

		// グループに所属している場合はグループの枠を更新する
		const parentId = updatedObject.parentId;
		if (parentId) {
			nextState = updateGroupBoundsFromRoot(nextState, parentId);
			// グループの枠を更新した後もeventStartStateを同期
			if (nextState.eventStartState) {
				nextState.eventStartState = {
					...nextState.eventStartState,
					objects: nextState.objects,
				};
			}
		}

		return nextState;
	}

	/**
	 * Vertex insert control でのドラッグを処理する。
	 * 新しく追加された頂点（segmentIndex + 1の位置）を移動する。
	 */
	private handleDrag(
		state: CanvasState,
		event: CanvasEvent,
		objectId: string,
		segmentIndex: number,
	): CanvasState {
		const eventStartState = state.eventStartState;
		if (!eventStartState) {
			return state;
		}

		// dragStartで更新されたeventStartStateから開始オブジェクトを取得
		// （新しく追加された頂点を含む状態）
		const startObject = eventStartState.objects[objectId];
		if (!startObject || startObject.type !== "polyline") {
			return state;
		}

		// 新しく追加された頂点のインデックスは segmentIndex + 1
		const newVertexIndex = segmentIndex + 1;

		// 新しい頂点位置を計算（カーソルの現在位置）
		const newPosition: Point = {
			x: roundToDecimal(event.last.x, PRECISION.COORDINATE),
			y: roundToDecimal(event.last.y, PRECISION.COORDINATE),
		};

		// 頂点位置を更新
		const polyline = startObject as PolylineState;
		const newPoints = [...polyline.points];
		newPoints[newVertexIndex] = newPosition;

		const updatedObject: PolylineState = {
			...polyline,
			points: newPoints,
		};

		let nextState: CanvasState = {
			...state,
			objects: {
				...state.objects,
				[objectId]: updatedObject,
			},
		};

		// グループに所属している場合はグループの枠を更新する
		const parentId = updatedObject.parentId;
		if (parentId) {
			nextState = updateGroupBoundsFromRoot(nextState, parentId);
		}

		return nextState;
	}

	/**
	 * Vertex insert control でのドラッグ終了を処理する。
	 * 最終位置を確定する。
	 */
	private handleDragEnd(
		state: CanvasState,
		event: CanvasEvent,
		objectId: string,
		segmentIndex: number,
	): CanvasState {
		// ドラッグ中の状態更新を適用して最終状態を計算
		const nextState = this.handleDrag(
			{ ...state },
			event,
			objectId,
			segmentIndex,
		);

		return {
			...nextState,
			edgeScrollEnabled: false,
		};
	}
}
