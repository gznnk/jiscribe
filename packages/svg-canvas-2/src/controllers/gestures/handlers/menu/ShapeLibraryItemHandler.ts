import type { BoundingBox } from "@workspace/geometry";

import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import { objectRegistry } from "../../../../registry/ObjectRegistry";
import { STICKY_DOC_DEFAULTS } from "../../../../schemas/objects/annotations/StickyDoc";
import { ELLIPSE_DOC_DEFAULTS } from "../../../../schemas/objects/primitives/EllipseDoc";
import { RECT_DOC_DEFAULTS } from "../../../../schemas/objects/primitives/RectDoc";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import { createObjectDoc } from "../../../../schemas/objects/utils/createObjectDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import {
	SNAP_THRESHOLD_PX,
	buildSnapFeedback,
	findSnap,
} from "../objects/utils/snap/findSnap";

/**
 * targetId から shapeType を抽出する。
 * フォーマット: "menu-item:<shapeType>"
 */
const parseShapeType = (targetId: string): ObjectType => {
	const parts = targetId.split(":");
	return parts[1] as ObjectType;
};

/**
 * 図形タイプから中央基準の半サイズを返す。
 * dragStart 時に一度だけ計算してキャッシュするためのヘルパー。
 */
const calcGhostHalfDimensions = (
	type: ObjectType,
): { halfWidth: number; halfHeight: number } => {
	switch (type) {
		case "rect":
			return {
				halfWidth: RECT_DOC_DEFAULTS.width / 2,
				halfHeight: RECT_DOC_DEFAULTS.height / 2,
			};
		case "ellipse":
			return {
				halfWidth: ELLIPSE_DOC_DEFAULTS.rx,
				halfHeight: ELLIPSE_DOC_DEFAULTS.ry,
			};
		case "sticky":
			return {
				halfWidth: STICKY_DOC_DEFAULTS.width / 2,
				halfHeight: STICKY_DOC_DEFAULTS.height / 2,
			};
		default:
			throw new Error(`Unsupported object type for menu: ${type}`);
	}
};

/**
 * 図形を state に追加し、新しい CanvasControllerState を返す。
 */
const addObjectToState = (
	state: CanvasControllerState,
	shapeType: ObjectType,
	position: { x: number; y: number },
): CanvasControllerState => {
	const doc = createObjectDoc(shapeType, position);
	const objectState = objectRegistry.toState(doc);

	return {
		...state,
		objects: {
			...state.objects,
			[objectState.id]: objectState,
		},
		rootIds: [...state.rootIds, objectState.id],
		selectedIds: [objectState.id],
	};
};

/**
 * ShapeLibrary アイテムのジェスチャーハンドラー。
 * ShapeLibrary からのドラッグ（エッジスクロール対応）と押下による中央配置を処理する。
 */
export const ShapeLibraryItemHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "menu-item";
	},

	handle(state, event) {
		if (!event.targetId) {
			return state;
		}

		const shapeType = parseShapeType(event.targetId);

		switch (event.type) {
			case "click": {
				// sticky はビューポート中央に配置、rect/ellipse は描画モードをトグル
				if (shapeType === "sticky") {
					const { minX, minY, width, height, zoom } = state.viewport;
					const centerX = minX + width / zoom / 2;
					const centerY = minY + height / zoom / 2;
					return addObjectToState(state, shapeType, {
						x: centerX,
						y: centerY,
					});
				}

				const nextTool =
					state.activeDrawingTool === shapeType ? null : shapeType;

				if (nextTool === null) {
					return { ...state, activeDrawingTool: null, drawingPreview: null };
				}

				// 描画モード ON: テキスト編集をコミットし、選択状態を解除する
				const nextState = commitTextEditIfNeeded(state, event.time);
				return {
					...nextState,
					activeDrawingTool: nextTool,
					drawingPreview: null,
					selectedIds: [],
					selectedConnectorId: null,
					multiSelectGroup: null,
					objectMenuOpenId: null,
				};
			}

			case "dragStart": {
				// テキスト編集をコミットし、選択状態を解除してからD&Dを開始する
				const nextState = commitTextEditIfNeeded(state, event.time);
				return {
					...nextState,
					selectedIds: [],
					selectedConnectorId: null,
					multiSelectGroup: null,
					objectMenuOpenId: null,
					pendingShapeType: shapeType,
					ghostPosition: event.last,
					ghostShapeDimensions: calcGhostHalfDimensions(shapeType),
					edgeScrollEnabled: true,
				};
			}

			case "drag": {
				const snapCandidates = state.eventStartSnapshot?.snapCandidates;
				const dims = state.ghostShapeDimensions;

				if (!snapCandidates || !dims) {
					return { ...state, ghostPosition: event.last };
				}

				const pos = event.last;
				const rawBBox: BoundingBox = {
					left: pos.x - dims.halfWidth,
					right: pos.x + dims.halfWidth,
					top: pos.y - dims.halfHeight,
					bottom: pos.y + dims.halfHeight,
				};

				const zoom = state.viewport.zoom;
				const result = findSnap(
					snapCandidates,
					SNAP_THRESHOLD_PX / zoom,
					[rawBBox.left, rawBBox.right],
					[rawBBox.top, rawBBox.bottom],
				);

				const snappedPos = {
					x: pos.x + result.delta.x,
					y: pos.y + result.delta.y,
				};

				const actualBBox: BoundingBox = {
					left: rawBBox.left + result.delta.x,
					right: rawBBox.right + result.delta.x,
					top: rawBBox.top + result.delta.y,
					bottom: rawBBox.bottom + result.delta.y,
				};

				return {
					...state,
					ghostPosition: snappedPos,
					snapFeedback: buildSnapFeedback(
						actualBBox,
						result.xResult,
						result.yResult,
						snapCandidates,
					),
				};
			}

			case "dragEnd": {
				// 最後にスナップ済みの ghostPosition を配置座標として使用する
				if (!state.pendingShapeType) {
					return state;
				}
				const position = state.ghostPosition ?? event.last;
				const nextState = addObjectToState(
					state,
					state.pendingShapeType,
					position,
				);
				return {
					...nextState,
					pendingShapeType: null,
					ghostPosition: null,
					ghostShapeDimensions: null,
					edgeScrollEnabled: false,
				};
			}

			default:
				return state;
		}
	},
};
