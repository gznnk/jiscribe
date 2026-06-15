import { memo } from "react";

import { Arrow } from "../../../../../../presentations/objects/arrows/Arrow";
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

	const tipX = isStart ? 1 : 23;
	const radians = isStart ? Math.PI : 0;

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
				x1="2"
				y1="12"
				x2="22"
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
				scale={1.5}
			/>
		</svg>
	);
};

export const ArrowHeadIconPreview = memo(ArrowHeadIconPreviewComponent);
