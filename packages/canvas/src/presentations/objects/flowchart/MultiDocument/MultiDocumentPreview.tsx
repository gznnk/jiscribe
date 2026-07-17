import { calcMultiDocumentSheets } from "./calcMultiDocumentSheets";
import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";
import { buildDocumentPath } from "../Document/buildDocumentPath";

/** Preview renderer for a MultiDocument shape while it is being drawn. */
export const MultiDocumentPreview: ShapePreviewRenderer = ({
	startX,
	startY,
	endX,
	endY,
	stroke,
	fill,
	strokeWidth,
}) => {
	const x = Math.min(startX, endX);
	const y = Math.min(startY, endY);
	const width = Math.abs(endX - startX);
	const height = Math.abs(endY - startY);
	const sheets = calcMultiDocumentSheets(x, y, width, height);
	// Colors may contain var(--jiscribe-*) (the resolved result of auto), so apply them via style rather than SVG attributes.
	return (
		<g pointerEvents="none">
			{sheets.map((sheet, index) => (
				<path
					key={index}
					d={buildDocumentPath(sheet.x, sheet.y, sheet.width, sheet.height)}
					style={{ fill, stroke }}
					strokeWidth={strokeWidth}
				/>
			))}
		</g>
	);
};
