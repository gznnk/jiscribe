import type { Rect } from "@jiscribe/geometry";

import { MULTI_DOCUMENT_OFFSET_RATIO } from "../../schema/multiDocument/MultiDocumentDoc";

/**
 * Bounding boxes of the three stacked sheets (back → front) for a multi-document
 * whose overall bounding box has its top-left corner at (x, y). The front sheet
 * sits at the bottom-left; each back sheet steps one offset up and to the right.
 * The sheets overlap: the renderer clips each one to the area outside the
 * sheets in front of it (MultiDocument.tsx), and the connector outline takes
 * their union (calcMultiDocumentSilhouette).
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
