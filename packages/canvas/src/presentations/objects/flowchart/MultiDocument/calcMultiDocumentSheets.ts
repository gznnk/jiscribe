import type { Rect } from "@workspace/geometry";

import { MULTI_DOCUMENT_OFFSET_RATIO } from "../../../../schemas/objects/flowchart/multiDocument/MultiDocumentDoc";

/**
 * Bounding boxes of the three stacked sheets (back → front) for a multi-document
 * whose overall bounding box has its top-left corner at (x, y). The front sheet
 * sits at the bottom-left; each back sheet steps one offset up and to the right.
 * Single source shared by the renderer, the draw-drag preview, and the outline.
 */
export const calcMultiDocumentSheets = (
	x: number,
	y: number,
	width: number,
	height: number,
): Rect[] => {
	const offset = Math.min(width, height) * MULTI_DOCUMENT_OFFSET_RATIO;
	const sheetWidth = width - 2 * offset;
	const sheetHeight = height - 2 * offset;
	return [
		{ x: x + 2 * offset, y, width: sheetWidth, height: sheetHeight },
		{ x: x + offset, y: y + offset, width: sheetWidth, height: sheetHeight },
		{ x, y: y + 2 * offset, width: sheetWidth, height: sheetHeight },
	];
};
