import { calcBoundingBox, isTransformedFrame } from "@workspace/geometry";
import { useMemo } from "react";

import type { CanvasState } from "../../../../states/canvas/CanvasState";

/** DiagramMenu とオブジェクト間の距離 (px) */
const DISTANCE_FROM_OBJECT = 8;

type DiagramMenuPosition = {
	/** メニューを表示すべきか */
	shouldRender: boolean;
	/** キャンバス座標系での x 座標（zoom 適用済み） */
	x: number;
	/** キャンバス座標系での y 座標（zoom 適用済み） */
	y: number;
};

/**
 * 選択中オブジェクトの下にメニューを配置するための座標を計算する。
 *
 * ScrollSyncedOverlay 内に配置されるため、座標はキャンバス座標に zoom を掛けた値。
 * オーバーレイ自体がスクロール追従するので viewport offset は不要。
 */
export function useDiagramMenuPosition(
	state: CanvasState,
): DiagramMenuPosition {
	const {
		selectedIds,
		objects,
		viewport,
		contextMenuPosition,
		areaSelection,
		eventStartState,
	} = state;

	return useMemo(() => {
		// メニューを表示しない条件
		if (selectedIds.length === 0) {
			return { shouldRender: false, x: 0, y: 0 };
		}
		// コンテキストメニュー表示中は非表示
		if (contextMenuPosition !== null) {
			return { shouldRender: false, x: 0, y: 0 };
		}
		// ドラッグ/リサイズ操作中は非表示
		if (eventStartState !== null) {
			return { shouldRender: false, x: 0, y: 0 };
		}
		// エリア選択中は非表示
		if (areaSelection !== null) {
			return { shouldRender: false, x: 0, y: 0 };
		}

		// 選択オブジェクト全体のバウンディングボックスを計算
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		let hasValidObject = false;

		for (const id of selectedIds) {
			const obj = objects[id];
			if (!obj || !isTransformedFrame(obj)) continue;

			const bbox = calcBoundingBox(obj);
			minX = Math.min(minX, bbox.left);
			minY = Math.min(minY, bbox.top);
			maxX = Math.max(maxX, bbox.right);
			maxY = Math.max(maxY, bbox.bottom);
			hasValidObject = true;
		}

		if (!hasValidObject) {
			return { shouldRender: false, x: 0, y: 0 };
		}

		const { zoom } = viewport;

		// 選択全体の中央 X、下端 Y（キャンバス座標 × zoom）
		const centerX = ((minX + maxX) / 2) * zoom;
		const bottomY = maxY * zoom;

		return {
			shouldRender: true,
			x: Math.round(centerX),
			y: Math.round(bottomY + DISTANCE_FROM_OBJECT),
		};
	}, [
		selectedIds,
		objects,
		viewport,
		contextMenuPosition,
		areaSelection,
		eventStartState,
	]);
}
