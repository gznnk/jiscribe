import { createObjectDoc } from "../../../../operations/menu/createObjectDoc";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import type { CanvasState } from "../../../../states/canvas/CanvasState";

/**
 * targetId から shapeType を抽出する。
 * フォーマット: "menu-item:<shapeType>"
 */
const parseShapeType = (targetId: string): ObjectType => {
	const parts = targetId.split(":");
	return parts[1] as ObjectType;
};

/**
 * 図形を state に追加し、新しい CanvasState を返す。
 */
const addObjectToState = (
	state: CanvasState,
	shapeType: ObjectType,
	position: { x: number; y: number },
): CanvasState => {
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
 * メニューアイテムのジェスチャーハンドラー。
 * シェイプメニューからのドラッグ（エッジスクロール対応）と押下による中央配置を処理する。
 */
export const MenuItemGestureHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "menu-item";
	},

	handle(state: CanvasState, event: CanvasEvent): CanvasState {
		if (!event.targetId) {
			return state;
		}

		const shapeType = parseShapeType(event.targetId);

		switch (event.type) {
			case "click": {
				// ビューポート中央に配置
				const { minX, minY, width, height, zoom } = state.viewport;
				const centerX = minX + width / zoom / 2;
				const centerY = minY + height / zoom / 2;
				return addObjectToState(state, shapeType, {
					x: centerX,
					y: centerY,
				});
			}

			case "dragStart": {
				// shapeType を保持し、エッジスクロールを有効にする
				return {
					...state,
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
