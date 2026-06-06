import type { BoundingBox } from "@workspace/geometry";

import type { StickyDoc } from "../../../../schemas/objects/annotations/sticky/StickyDoc";
import type { EllipseDoc } from "../../../../schemas/objects/primitives/ellipse/EllipseDoc";
import type { RectDoc } from "../../../../schemas/objects/primitives/rect/RectDoc";
import { createObjectDoc } from "../../../../schemas/objects/utils/createObjectDoc";
import { objectMapperRegistry } from "../../../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ShapePreset } from "../../../ui/menu/ShapeLibrary/ShapePresets";
import { getShapePreset } from "../../../ui/menu/ShapeLibrary/ShapePresets";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import {
	SNAP_THRESHOLD_PX,
	buildSnapFeedback,
	findSnap,
} from "../objects/utils/snap/findSnap";

/**
 * targetId からプリセット ID を抽出する。
 * フォーマット: "menu-item:<presetId>"
 */
const parsePresetId = (targetId: string): string => targetId.split(":")[1];

/**
 * プリセットからゴースト図形の半サイズを返す。
 * createObjectDoc で overrides とデフォルト値をマージした doc から寸法を取得する。
 */
const calcShapeDimensions = (
	preset: ShapePreset,
): { halfWidth: number; halfHeight: number } => {
	const doc = createObjectDoc(
		preset.objectType,
		{ x: 0, y: 0 },
		preset.defaultOverrides,
	);
	switch (doc.type) {
		case "rect": {
			const { width, height } = doc as RectDoc;
			return { halfWidth: width / 2, halfHeight: height / 2 };
		}
		case "sticky": {
			const { width, height } = doc as StickyDoc;
			return { halfWidth: width / 2, halfHeight: height / 2 };
		}
		case "ellipse": {
			const { rx, ry } = doc as EllipseDoc;
			return { halfWidth: rx, halfHeight: ry };
		}
		case "polyline":
			return { halfWidth: 80, halfHeight: 0 };
		case "polygon":
			return { halfWidth: 60, halfHeight: 60 };
		default:
			throw new Error(`Unsupported object type for menu: ${preset.objectType}`);
	}
};

/**
 * プリセットに従って図形を state に追加し、新しい CanvasControllerState を返す。
 *
 * オブジェクト追加は常に doc を変更するため commitVersion を増分する。
 * これにより click 経由（中央配置）でも履歴記録・保存が行われる。
 * dragEnd 経由では handleGesture が同値で上書きするため二重増分にはならない。
 */
const addObjectToState = (
	state: CanvasControllerState,
	preset: ShapePreset,
	position: { x: number; y: number },
): CanvasControllerState => {
	const doc = createObjectDoc(
		preset.objectType,
		position,
		preset.defaultOverrides,
	);
	const objectState = objectMapperRegistry.toState(doc);

	return {
		...state,
		objects: {
			...state.objects,
			[objectState.id]: objectState,
		},
		rootIds: [...state.rootIds, objectState.id],
		selectedIds: [objectState.id],
		commitVersion: state.commitVersion + 1,
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

		const presetId = parsePresetId(event.targetId);
		const preset = getShapePreset(presetId);
		if (!preset) {
			return state;
		}

		switch (event.type) {
			case "click": {
				// sticky / polygon はビューポート中央に配置、rect/ellipse/polyline は描画モードをトグル
				if (preset.objectType === "sticky" || preset.objectType === "polygon") {
					const { minX, minY, width, height, zoom } = state.viewport;
					const centerX = minX + width / zoom / 2;
					const centerY = minY + height / zoom / 2;
					return addObjectToState(state, preset, { x: centerX, y: centerY });
				}

				const isActive = state.shapeDrawing?.preset.id === presetId;

				if (isActive) {
					return { ...state, shapeDrawing: null };
				}

				// 描画モード ON: テキスト編集をコミットし、選択状態を解除する
				const nextState = commitTextEditIfNeeded(state);
				return {
					...nextState,
					shapeDrawing: { preset, preview: null },
					selectedIds: [],
					selectedConnectorId: null,
					multiSelectGroup: null,
					objectMenuOpenId: null,
				};
			}

			case "dragStart": {
				// テキスト編集をコミットし、選択状態を解除してからD&Dを開始する
				const nextState = commitTextEditIfNeeded(state);
				return {
					...nextState,
					selectedIds: [],
					selectedConnectorId: null,
					multiSelectGroup: null,
					objectMenuOpenId: null,
					shapeLibraryDrag: {
						preset,
						ghostPosition: event.last,
						shapeDimensions: calcShapeDimensions(preset),
					},
					edgeScrollEnabled: true,
				};
			}

			case "drag": {
				const snapCandidates = state.eventStartSnapshot?.snapCandidates;
				const drag = state.shapeLibraryDrag;

				if (!snapCandidates || !drag || event.mods.ctrl) {
					return {
						...state,
						shapeLibraryDrag: drag
							? { ...drag, ghostPosition: event.last }
							: null,
						snapFeedback: null,
					};
				}

				const pos = event.last;
				const { halfWidth, halfHeight } = drag.shapeDimensions;
				const rawBBox: BoundingBox = {
					left: pos.x - halfWidth,
					right: pos.x + halfWidth,
					top: pos.y - halfHeight,
					bottom: pos.y + halfHeight,
				};

				const zoom = state.viewport.zoom;
				const result = findSnap(
					snapCandidates,
					SNAP_THRESHOLD_PX / zoom,
					[rawBBox.left, rawBBox.right],
					[rawBBox.top, rawBBox.bottom],
				);

				const actualBBox: BoundingBox = {
					left: rawBBox.left + result.delta.x,
					right: rawBBox.right + result.delta.x,
					top: rawBBox.top + result.delta.y,
					bottom: rawBBox.bottom + result.delta.y,
				};

				return {
					...state,
					shapeLibraryDrag: {
						...drag,
						ghostPosition: {
							x: pos.x + result.delta.x,
							y: pos.y + result.delta.y,
						},
					},
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
				const drag = state.shapeLibraryDrag;
				if (!drag) {
					return state;
				}
				const position = drag.ghostPosition ?? event.last;
				const nextState = addObjectToState(state, drag.preset, position);
				return {
					...nextState,
					shapeLibraryDrag: null,
					edgeScrollEnabled: false,
				};
			}

			default:
				return state;
		}
	},
};
