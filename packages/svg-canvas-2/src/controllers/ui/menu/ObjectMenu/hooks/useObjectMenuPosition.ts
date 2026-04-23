import { calcBoundingBox, isTransformedFrame } from "@workspace/geometry";
import { type RefObject, useEffect, useMemo, useState } from "react";

import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import { isGroupState } from "../../../../../states/objects/primitives/group/GroupState";
import { calcGroupBoundingBox } from "../../../utils/calcGroupBoundingBox";

/** ObjectMenu とオブジェクト間の距離 (px) */
const DISTANCE_FROM_OBJECT = 40;

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
 *
 * Based on svg-canvas's useDiagramMenuDisplay but adapted for svg-canvas-2 architecture.
 * - Automatically positions menu above object if it would overflow bottom viewport boundary
 * - Adjusts horizontal position to fit within left/right viewport boundaries
 * - Measures actual menu dimensions from DOM for accurate positioning
 */
export function useObjectMenuPosition(
	state: CanvasState,
	menuRef: RefObject<HTMLDivElement | null>,
): ObjectMenuPosition {
	const {
		selectedIds,
		objects,
		viewport,
		contextMenuPosition,
		areaSelection,
		eventStartState,
		objectMenuOpenId,
	} = state;

	const [menuDimensions, setMenuDimensions] = useState({
		width: 0,
		height: 40,
	});

	// Measure menu dimensions from DOM when it renders or selection changes
	const selectedIdsString = selectedIds.slice().sort().join(",");
	const shouldRender = useMemo(() => {
		// メニューを表示しない条件
		if (selectedIds.length === 0) return false;
		if (contextMenuPosition !== null) return false;
		// eventStartState が null でない場合でも、objectMenuOpenId が null でない場合は表示を続ける
		// （スライダーのドラッグ中にメニューを表示し続けるため）
		if (eventStartState !== null && objectMenuOpenId === null) return false;
		if (areaSelection !== null) return false;
		return true;
	}, [
		selectedIds,
		contextMenuPosition,
		eventStartState,
		areaSelection,
		objectMenuOpenId,
	]);

	useEffect(() => {
		if (menuRef.current && shouldRender) {
			const rect = menuRef.current.getBoundingClientRect();
			setMenuDimensions({ width: rect.width, height: rect.height });
		}
	}, [menuRef, shouldRender, selectedIdsString]);

	return useMemo(() => {
		if (!shouldRender) {
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
			} else if (isGroupState(obj)) {
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

		const {
			zoom,
			width: viewportWidth,
			height: viewportHeight,
			minX: vpMinX,
			minY: vpMinY,
		} = viewport;

		// 選択全体の中央 X、下端 Y を計算
		// ScrollSyncedOverlay の座標系に合わせるため、キャンバス座標に zoom を掛ける
		// （詳細は CanvasStyled.ts の ScrollSyncedOverlay のコメントを参照）
		const objectCenterX = ((minX + maxX) / 2) * zoom;
		const objectBottomY = maxY * zoom;
		const objectTopY = minY * zoom;

		const menuWidth = menuDimensions.width;
		const menuHeight = menuDimensions.height;

		// Default position: below the object, centered
		let menuCenterX = objectCenterX;
		let menuY = objectBottomY + DISTANCE_FROM_OBJECT;

		// Calculate viewport boundaries in the same coordinate system (ScrollSyncedOverlay internal coordinates)
		const viewportMinX = vpMinX * zoom;
		const viewportMinY = vpMinY * zoom;
		const viewportMaxX = viewportMinX + viewportWidth;
		const viewportMaxY = viewportMinY + viewportHeight;

		// Check if menu overflows viewport vertically (bottom)
		const menuEffectiveBottom = menuY + menuHeight;
		if (menuEffectiveBottom > viewportMaxY) {
			// Position above the object
			menuY = objectTopY - DISTANCE_FROM_OBJECT - menuHeight;
		}

		// Ensure menu doesn't go above viewport
		if (menuY < viewportMinY) {
			menuY = viewportMinY;
		}

		// Horizontal boundary checks
		const menuHalfWidth = menuWidth / 2;
		if (menuCenterX + menuHalfWidth > viewportMaxX) {
			// Adjust to fit within right boundary
			menuCenterX = viewportMaxX - menuHalfWidth;
		}
		if (menuCenterX - menuHalfWidth < viewportMinX) {
			// Adjust to fit within left boundary
			menuCenterX = viewportMinX + menuHalfWidth;
		}

		// 左端座標を px で直接計算することで translateX(-50%) を不要にし、
		// サブピクセルレンダリングによるアイコンのぼやけを防ぐ
		const menuX = menuCenterX - menuHalfWidth;

		return {
			shouldRender: true,
			x: Math.round(menuX),
			y: Math.round(menuY),
		};
	}, [shouldRender, selectedIds, objects, viewport, menuDimensions]);
}
