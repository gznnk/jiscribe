import { memo } from "react";

type PolylineIconProps = {
	width?: number;
	height?: number;
};

const PolylineIconComponent: React.FC<PolylineIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<polyline
				points="3,18 9,6 15,14 21,6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const PolylineIcon = memo(PolylineIconComponent);
