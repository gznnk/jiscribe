import type { BoundingBox } from "@workspace/geometry";

import type { ShapePreset } from "../../../../schemas/objects/types/ShapePreset";
import { createObjectDoc } from "../../../../schemas/objects/utils/createObjectDoc";
import { shapeFactoryRegistry } from "../../../../schemas/registry/ShapeFactoryRegistry";
import { objectMapperRegistry } from "../../../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { getShapePreset } from "../../../ui/menu/ShapeLibrary/ShapePresetRegistry";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import {
	SNAP_THRESHOLD_PX,
	buildSnapFeedback,
	findSnap,
} from "../../utils/snap/findSnap";

/**
 * targetId からプリセット ID を抽出する。
 * フォーマット: "menu-item:<presetId>"
 */
const parsePresetId = (targetId: string): string => targetId.split(":")[1];

/**
 * プリセットからゴースト図形の半サイズを返す。
 * 図形ごとの ShapeFactory に委譲する（型別の分岐を持たない）。
 */
const calcShapeDimensions = (
	preset: ShapePreset,
): { halfWidth: number; halfHeight: number } => {
	const factory = shapeFactoryRegistry.get(preset.objectType);
	if (!factory) {
		throw new Error(`Unsupported object type for menu: ${preset.objectType}`);
	}
	return factory.calcDimensions(preset.defaultOverrides);
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
		let nextState = state;

		// メニューアイテム上の押下でコンテキストメニューを閉じる（押下自体は配置・描画を行わない）
		if (event.type === "pressed") {
			if (event.button === 0) {
				nextState = { ...nextState, contextMenuPosition: null };
			}
		}

		if (!event.targetId) {
			return nextState;
		}

		const presetId = parsePresetId(event.targetId);
		const preset = getShapePreset(presetId);
		if (!preset) {
			return nextState;
		}

		switch (event.type) {
			case "click": {
				// bounds 描画に対応しない図形（sticky / polygon）はビューポート中央に配置、
				// 対応する図形（rect / ellipse / polyline）は描画モードをトグルする
				if (!shapeFactoryRegistry.supportsBoundsDrawing(preset.objectType)) {
					const { minX, minY, width, height, zoom } = state.viewport;
					const centerX = minX + width / zoom / 2;
					const centerY = minY + height / zoom / 2;
					const placed = addObjectToState(state, preset, {
						x: centerX,
						y: centerY,
					});
					// 描画モード中に描画非対応の図形を押下した場合は描画モードをクリアする
					return { ...placed, shapeDrawing: null };
				}

				const isActive = state.shapeDrawing?.preset.id === presetId;

				if (isActive) {
					return { ...state, shapeDrawing: null };
				}

				// 描画モード ON: テキスト編集をコミットし、選択状態を解除する
				const committed = commitTextEditIfNeeded(state);
				return {
					...committed,
					shapeDrawing: { preset, preview: null },
					selectedIds: [],
					selectedConnectorId: null,
					multiSelectGroup: null,
					objectMenuOpenId: null,
				};
			}

			case "dragStart": {
				// テキスト編集をコミットし、選択状態を解除してからD&Dを開始する
				// D&D 開始時は（図形の種類を問わず）描画モードをクリアする
				const committed = commitTextEditIfNeeded(state);
				return {
					...committed,
					shapeDrawing: null,
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
				// 中央（中点）もドラッグ側エッジ値に含め、中央↔中央 / 中央↔エッジ を吸着可能にする
				const rawCenterX = (rawBBox.left + rawBBox.right) / 2;
				const rawCenterY = (rawBBox.top + rawBBox.bottom) / 2;
				const result = findSnap(
					snapCandidates,
					SNAP_THRESHOLD_PX / zoom,
					[rawBBox.left, rawCenterX, rawBBox.right],
					[rawBBox.top, rawCenterY, rawBBox.bottom],
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
				const placed = addObjectToState(state, drag.preset, position);
				return {
					...placed,
					shapeLibraryDrag: null,
					edgeScrollEnabled: false,
				};
			}

			default:
				return nextState;
		}
	},
};
