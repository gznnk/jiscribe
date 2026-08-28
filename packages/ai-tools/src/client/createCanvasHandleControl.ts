// Canvas の imperative ハンドルを AiHandleControl に写すアダプター。
// キャンバスを載せているホスト（studio / editor-shell）が同じ配線を書かずに
// 済むよう、ここ 1 か所に置く。

import type { CanvasHandle } from "@jiscribe/canvas";

import type { AiHandleControl } from "./types";

/**
 * 表示中の Canvas を、マウント済みキャンバスが要る AI ツールへつなぐ窓口を作る。
 *
 * @param getCanvas - 表示中の Canvas ハンドルを返す関数。キャンバスを出していない
 *   間は null を返すこと（AI にはその旨がツール結果として返る）
 * @returns パネルへ渡す窓口。返り値は毎回同じ実体ではないので、ホスト側で
 *   useMemo などに包んで固定すること
 */
export const createCanvasHandleControl = (
	getCanvas: () => CanvasHandle | null,
): AiHandleControl => ({
	isAvailable: () => getCanvas() !== null,

	selectObjects: (ids) => {
		const canvas = getCanvas();
		if (canvas === null) {
			return { selectedIds: [], ignoredIds: ids };
		}
		const { selectedIds, selectedConnectorId, ignoredIds } =
			canvas.selection.select(ids);
		// 選択チャンネルの分かれ方はキャンバス内部の都合なので、AI へは
		// 「選べた id」1 本に均して返す
		return {
			selectedIds:
				selectedConnectorId === null
					? selectedIds
					: [...selectedIds, selectedConnectorId],
			ignoredIds,
		};
	},

	getSelectedIds: () => getCanvas()?.selection.getSelectedIds() ?? [],

	centerView: (point, zoom) =>
		getCanvas()?.viewport.centerOn(point, { zoom }) ?? null,

	setView: (camera) => {
		const viewport = getCanvas()?.viewport;
		if (viewport === undefined) {
			return null;
		}
		viewport.setViewport(camera);
		// SET_CAMERA は渡したカメラをそのまま採るが、反映は次のレンダーなので
		// getViewport を読み直すと 1 フレーム前が返る。渡した値を適用結果とする
		return camera;
	},

	getView: () => {
		const viewport = getCanvas()?.viewport;
		if (viewport === undefined) {
			return null;
		}
		return {
			viewport: viewport.getViewport(),
			visibleWorldRect: viewport.getVisibleWorldRect(),
		};
	},

	fitView: (target) => {
		const viewport = getCanvas()?.viewport;
		if (viewport === undefined) {
			return null;
		}
		return target === "selection"
			? viewport.fitToSelection()
			: viewport.fitToContent();
	},

	fitViewToRect: (rect) => getCanvas()?.viewport.fitToRect(rect) ?? null,

	measureText: (id, slotId) =>
		getCanvas()?.measure.textSlot(id, slotId) ?? null,

	// キャンバスが無いときの [] は「重なり 0 件」と読めてしまうが、その手前で
	// isAvailable が false として弾かれる（applyHandleOp）
	findOverlaps: (ids) => getCanvas()?.measure.findOverlaps(ids) ?? [],

	measureConnectorPath: (id) => getCanvas()?.measure.connectorPath(id) ?? null,

	measureVisualBounds: (ids) => getCanvas()?.measure.visualBounds(ids) ?? null,

	// findOverlaps と同じく、キャンバスが無いときの [] は applyHandleOp の
	// isAvailable で先に弾かれる
	hitTest: (target, tolerance) =>
		getCanvas()?.measure.hitTest(target, { tolerance }) ?? [],

	// AI が読むのは描かれ方そのものなので、再編集用の .jis.json は埋めない
	// （埋めると文字数の大半が doc の写しになり、上限が先に来る）
	toSvgString: () =>
		getCanvas()?.export.toSvgString({ includeSource: false }) ?? null,

	getInteractionStatus: () => getCanvas()?.interaction.getStatus() ?? null,

	toWorld: (clientPoint) => getCanvas()?.viewport.toWorld(clientPoint) ?? null,

	toClient: (worldPoint) => getCanvas()?.viewport.toClient(worldPoint) ?? null,
});
