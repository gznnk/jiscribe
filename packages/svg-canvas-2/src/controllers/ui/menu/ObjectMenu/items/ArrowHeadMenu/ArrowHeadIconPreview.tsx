import { memo } from "react";

import { Arrow } from "../../../../../../presentations/objects/arrows/Arrow";
import { getArrowLineInset } from "../../../../../../presentations/objects/arrows/getArrowLineInset";
import type { ArrowType } from "../../../../../../schemas/objects/types/ArrowType";

type ArrowHeadIconPreviewProps = {
	arrowType: ArrowType | undefined;
	direction: "start" | "end";
};

const ArrowHeadIconPreviewComponent: React.FC<ArrowHeadIconPreviewProps> = ({
	arrowType,
	direction,
}) => {
	const isStart = direction === "start";
	const type = arrowType ?? "None";

	const scale = 1.5;
	const tipX = isStart ? 1 : 23;
	const radians = isStart ? Math.PI : 0;

	// 矢印の根元まで線を短縮し、中空部の貫通・先端からの線のはみ出しを防ぐ。
	const inset = getArrowLineInset(type) * scale;
	const lineX1 = isStart && inset > 0 ? tipX + inset : 2;
	const lineX2 = !isStart && inset > 0 ? tipX - inset : 22;

	return (
		<svg
			width="24"
			height="24"
			viewBox="0 6 24 12"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			style={{ pointerEvents: "none" }}
		>
			<line
				x1={lineX1}
				y1="12"
				x2={lineX2}
				y2="12"
				stroke="currentColor"
				strokeWidth="2"
			/>

			<Arrow
				type={type}
				x={tipX}
				y={12}
				color="currentColor"
				radians={radians}
				scale={scale}
			/>
		</svg>
	);
};

export const ArrowHeadIconPreview = memo(ArrowHeadIconPreviewComponent);
