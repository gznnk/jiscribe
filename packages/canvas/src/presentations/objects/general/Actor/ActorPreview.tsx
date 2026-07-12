import { buildActorFigure } from "./buildActorFigure";
import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

/** Preview renderer for an Actor shape while it is being drawn. */
export const ActorPreview: ShapePreviewRenderer = ({
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
	const { headCx, headCy, headR, limbsPath } = buildActorFigure(
		x,
		y,
		width,
		height,
	);
	// Colors may contain var(--jiscribe-*) (the resolved result of auto), so apply them via style rather than SVG attributes.
	return (
		<>
			<circle
				cx={headCx}
				cy={headCy}
				r={headR}
				style={{ fill, stroke }}
				strokeWidth={strokeWidth}
				pointerEvents="none"
			/>
			<path
				d={limbsPath}
				style={{ fill: "none", stroke }}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				pointerEvents="none"
			/>
		</>
	);
};
