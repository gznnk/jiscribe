import { memo } from "react";

import type { SnapFeedback } from "../../../../states/canvas/SnapTypes";

type SnapGuidesProps = {
	snapFeedback: SnapFeedback | null;
	zoom: number;
};

const STROKE = "#3b82f6";
const STROKE_WIDTH = 1;
const STROKE_DASHARRAY = "4, 3";
/** ガイド線を両端から伸ばすスクリーンピクセル数 */
const EXTENSION_PX = 16;

const SnapGuidesComponent: React.FC<SnapGuidesProps> = ({ snapFeedback, zoom }) => {
	if (!snapFeedback) return null;

	const ext = EXTENSION_PX / zoom;

	return (
		<>
			{/* x軸スナップ: 縦ガイド線 */}
			{snapFeedback.x && (
				<line
					x1={snapFeedback.x.coordinate}
					y1={snapFeedback.x.lineStart - ext}
					x2={snapFeedback.x.coordinate}
					y2={snapFeedback.x.lineEnd + ext}
					stroke={STROKE}
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={STROKE_DASHARRAY}
					pointerEvents="none"
				/>
			)}
			{/* y軸スナップ: 横ガイド線 */}
			{snapFeedback.y && (
				<line
					x1={snapFeedback.y.lineStart - ext}
					y1={snapFeedback.y.coordinate}
					x2={snapFeedback.y.lineEnd + ext}
					y2={snapFeedback.y.coordinate}
					stroke={STROKE}
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={STROKE_DASHARRAY}
					pointerEvents="none"
				/>
			)}
		</>
	);
};

export const SnapGuides = memo(SnapGuidesComponent);
