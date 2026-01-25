import type { Viewport } from "../../../../states/canvas/Viewport";
import { AUTO_SCROLL_THRESHOLD } from "../GestureRecognizerConstants";

/**
 * エッジ近接情報
 */
export type EdgeProximity = {
	isNearEdge: boolean;
	horizontal: "left" | "right" | null;
	vertical: "top" | "bottom" | null;
};

/**
 * カーソルがビューポートのエッジ近くにいるかを検出
 *
 * @param viewport - 現在のビューポート
 * @param svgX - カーソルのX座標（SVG座標）
 * @param svgY - カーソルのY座標（SVG座標）
 * @returns エッジ近接情報
 */
export const detectEdgeProximity = (
	viewport: Viewport,
	svgX: number,
	svgY: number,
): EdgeProximity => {
	const { minX, minY, width, height, zoom } = viewport;

	// AUTO_SCROLL_THRESHOLDはピクセル単位なので、SVG座標系に変換
	const thresholdInSvg = AUTO_SCROLL_THRESHOLD / zoom;

	// Calculate distances from each edge in SVG coordinates
	const distFromLeft = svgX - minX;
	const distFromTop = svgY - minY;
	const distFromRight = minX + width - svgX;
	const distFromBottom = minY + height - svgY;

	// Determine which edges the cursor is close to
	let horizontal: "left" | "right" | null = null;
	let vertical: "top" | "bottom" | null = null;

	// Check horizontal edges
	if (distFromLeft < thresholdInSvg) {
		horizontal = "left";
	} else if (distFromRight < thresholdInSvg) {
		horizontal = "right";
	}

	// Check vertical edges
	if (distFromTop < thresholdInSvg) {
		vertical = "top";
	} else if (distFromBottom < thresholdInSvg) {
		vertical = "bottom";
	}

	const isNearEdge = horizontal !== null || vertical !== null;

	return {
		isNearEdge,
		horizontal,
		vertical,
	};
};
