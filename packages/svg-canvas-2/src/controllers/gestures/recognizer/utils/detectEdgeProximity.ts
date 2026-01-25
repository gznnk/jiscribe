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
 * @param clientX - カーソルのX座標（クライアント座標）
 * @param clientY - カーソルのY座標（クライアント座標）
 * @returns エッジ近接情報
 */
export const detectEdgeProximity = (
	viewport: Viewport,
	clientX: number,
	clientY: number,
): EdgeProximity => {
	const { minX, minY, width, height } = viewport;

	// Calculate distances from each edge in client (screen) coordinates
	const distFromLeft = clientX - minX;
	const distFromTop = clientY - minY;
	const distFromRight = minX + width - clientX;
	const distFromBottom = minY + height - clientY;

	// Determine which edges the cursor is close to
	let horizontal: "left" | "right" | null = null;
	let vertical: "top" | "bottom" | null = null;

	// Check horizontal edges
	if (distFromLeft < AUTO_SCROLL_THRESHOLD && distFromLeft >= 0) {
		horizontal = "left";
	} else if (distFromRight < AUTO_SCROLL_THRESHOLD && distFromRight >= 0) {
		horizontal = "right";
	}

	// Check vertical edges
	if (distFromTop < AUTO_SCROLL_THRESHOLD && distFromTop >= 0) {
		vertical = "top";
	} else if (distFromBottom < AUTO_SCROLL_THRESHOLD && distFromBottom >= 0) {
		vertical = "bottom";
	}

	const isNearEdge = horizontal !== null || vertical !== null;

	return {
		isNearEdge,
		horizontal,
		vertical,
	};
};
