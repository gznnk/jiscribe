import { DB_CAP_RATIO } from "../../../../schemas/objects/flowchart/db/DbDoc";
import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

export const DbPreview: ShapePreviewRenderer = ({
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
	const rx = width / 2;
	const capRy = height * DB_CAP_RATIO;
	const topY = y + capRy;
	const bottomY = y + height - capRy;
	const arc = `${rx} ${capRy} 0 0`;
	const bodyPath =
		`M ${x} ${topY} A ${arc} 1 ${x + width} ${topY} ` +
		`L ${x + width} ${bottomY} A ${arc} 1 ${x} ${bottomY} Z`;
	const capEdgePath = `M ${x} ${topY} A ${arc} 0 ${x + width} ${topY}`;

	// Colors may include var(--jiscribe-*) (the resolved result of auto), so apply them via style rather than SVG attributes.
	return (
		<>
			<path
				d={bodyPath}
				style={{ fill, stroke }}
				strokeWidth={strokeWidth}
				pointerEvents="none"
			/>
			<path
				d={capEdgePath}
				style={{ fill: "none", stroke }}
				strokeWidth={strokeWidth}
				pointerEvents="none"
			/>
		</>
	);
};
