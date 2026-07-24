import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { DOCUMENT_WAVE_RATIO } from "../../schema/document/DocumentDoc";
import { MULTI_DOCUMENT_OFFSET_RATIO } from "../../schema/multiDocument/MultiDocumentDoc";

/**
 * Confines text to the front sheet: insets the top/right by the two sheet
 * offsets and the bottom by the front sheet's wave band.
 */
export const calcMultiDocumentTextRegion = ({
	width,
	height,
}: Dimensions): Rect => {
	const offset = Math.min(width, height) * MULTI_DOCUMENT_OFFSET_RATIO;
	const sheetHeight = height - 2 * offset;
	return calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: (2 * offset) / height,
			right: (2 * offset) / width,
			bottom: (sheetHeight * DOCUMENT_WAVE_RATIO * 2) / height,
		},
	);
};
