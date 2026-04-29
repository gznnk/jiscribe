import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import { createObjectDoc } from "../../../../schemas/objects/utils/createObjectDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";

/**
 * targetId から shapeType を抽出する。
 * フォーマット: "menu-item:<shapeType>"
 */
const parseShapeType = (targetId: string): ObjectType => {
	const parts = targetId.split(":");
	return parts[1] as ObjectType;
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
					edgeScrollEnabled: true,
				};
			}

			case "drag": {
				// ゴースト位置を現在のポインタ位置で更新する
				return {
					...state,
					ghostPosition: event.last,
				};
			}

			case "dragEnd": {
				// ドロップ位置に配置、pendingShapeType とゴーストをクリアする
				if (!state.pendingShapeType) {
					return state;
				}
				const nextState = addObjectToState(
					state,
					state.pendingShapeType,
					event.last,
				);
				return {
					...nextState,
					pendingShapeType: null,
					ghostPosition: null,
					edgeScrollEnabled: false,
				};
			}

			default:
				return state;
		}
	},
};
