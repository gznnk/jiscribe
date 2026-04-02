import {
	calcBoundingBox,
	isTransformedFrame,
	type BoundingBox,
} from "@workspace/geometry";
import { useMemo } from "react";

import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { GroupState } from "../../../../states/objects/primitives/GroupState";

/** ObjectMenu とオブジェクト間の距離 (px) */
const DISTANCE_FROM_OBJECT = 8;

/**
 * グループかどうかを判定する型ガード
 */
function isGroup(obj: unknown): obj is GroupState {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"type" in obj &&
		obj.type === "group" &&
		"childIds" in obj &&
		Array.isArray(obj.childIds)
	);
}

/**
 * グループの子要素を再帰的に走査してバウンディングボックスを計算する
 */
function calcGroupBoundingBox(
	group: GroupState,
	objects: Record<string, unknown>,
): BoundingBox | null {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let hasValidChild = false;

	for (const childId of group.childIds) {
		const child = objects[childId];
		if (!child) continue;

		let bbox;
		if (isTransformedFrame(child)) {
			bbox = calcBoundingBox(child);
		} else if (isGroup(child)) {
			bbox = calcGroupBoundingBox(child, objects);
			if (!bbox) continue;
		} else {
			continue;
		}

		minX = Math.min(minX, bbox.left);
		minY = Math.min(minY, bbox.top);
		maxX = Math.max(maxX, bbox.right);
		maxY = Math.max(maxY, bbox.bottom);
		hasValidChild = true;
	}

	if (!hasValidChild) {
		return null;
	}

	return { left: minX, top: minY, right: maxX, bottom: maxY };
}

type ObjectMenuPosition = {
	/** メニューを表示すべきか */
	shouldRender: boolean;
	/** キャンバス座標系での x 座標 */
	x: number;
	/** キャンバス座標系での y 座標 */
	y: number;
};

/**
 * 選択中オブジェクトの下にメニューを配置するための座標を計算する。
 *
 * ScrollSyncedOverlay 内に配置されるため、座標はキャンバス座標系のまま返す。
 * オーバーレイ自体がスクロール追従するので viewport offset は不要。
 */
export function useObjectMenuPosition(state: CanvasState): ObjectMenuPosition {
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
			if (!obj) continue;

			let bbox;
			if (isTransformedFrame(obj)) {
				// rect, ellipse など Frame を持つオブジェクト
				bbox = calcBoundingBox(obj);
			} else if (isGroup(obj)) {
				// グループの場合、子要素から再帰的にバウンディングボックスを計算
				bbox = calcGroupBoundingBox(obj, objects);
				if (!bbox) continue;
			} else {
				// Transform を持たないオブジェクト（connector など）はスキップ
				continue;
			}

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

		// 選択全体の中央 X、下端 Y を計算
		// ScrollSyncedOverlay の座標系に合わせるため、キャンバス座標に zoom を掛ける
		// （詳細は CanvasStyled.ts の ScrollSyncedOverlay のコメントを参照）
		const centerX = ((minX + maxX) / 2) * zoom;
		const bottomY = maxY * zoom + DISTANCE_FROM_OBJECT;

		return {
			shouldRender: true,
			x: Math.round(centerX),
			y: Math.round(bottomY),
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
