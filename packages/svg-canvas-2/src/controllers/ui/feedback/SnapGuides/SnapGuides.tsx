import { memo } from "react";

import type { SnapFeedback } from "../../../CanvasTypes";

type SnapGuidesProps = {
	snapFeedback: SnapFeedback | null;
	zoom: number;
};

const STROKE = "#3b82f6";
const STROKE_WIDTH = 1;
const STROKE_DASHARRAY = "4, 3";
/** ガイド線を両端から伸ばすスクリーンピクセル数 */
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
			{/* x軸スナップ: 縦ガイド線（left/right/center 各々に出る場合あり）*/}
			{/* 整列X座標は line の x1(=x2) がそのまま保持する。data-testid は軸の列挙のみ担う */}
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
			{/* y軸スナップ: 横ガイド線（top/bottom/center 各々に出る場合あり）*/}
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
