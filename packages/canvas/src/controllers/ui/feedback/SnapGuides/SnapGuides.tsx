import { memo } from "react";

import type { SnapFeedback } from "../../../CanvasTypes";

type SnapGuidesProps = {
	snapFeedback: SnapFeedback | null;
	zoom: number;
};

const STROKE = "#3b82f6";
const STROKE_WIDTH = 1;
const STROKE_DASHARRAY = "4, 3";
/** Number of screen pixels to extend the guide line beyond each endpoint */
const EXTENSION_PX = 16;

const SnapGuidesComponent: React.FC<SnapGuidesProps> = ({
	snapFeedback,
	zoom,
}) => {
	if (!snapFeedback) {
		return null;
	}

	const ext = EXTENSION_PX / zoom;

	return (
		<>
			{/* X-axis snap: vertical guide lines (may appear for each of left/right/center) */}
			{/* The aligned X coordinate is held directly by the line's x1 (=x2). data-testid only enumerates the axis. */}
			{snapFeedback.x.map((guide) => (
				<line
					key={guide.coordinate}
					data-testid="snap-guide:x"
					x1={guide.coordinate}
					y1={guide.lineStart - ext}
					x2={guide.coordinate}
					y2={guide.lineEnd + ext}
					stroke={STROKE}
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={STROKE_DASHARRAY}
					pointerEvents="none"
				/>
			))}
			{/* Y-axis snap: horizontal guide lines (may appear for each of top/bottom/center) */}
			{snapFeedback.y.map((guide) => (
				<line
					key={guide.coordinate}
					data-testid="snap-guide:y"
					x1={guide.lineStart - ext}
					y1={guide.coordinate}
					x2={guide.lineEnd + ext}
					y2={guide.coordinate}
					stroke={STROKE}
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={STROKE_DASHARRAY}
					pointerEvents="none"
				/>
			))}
		</>
	);
};

export const SnapGuides = memo(SnapGuidesComponent);
