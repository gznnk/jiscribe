import { memo } from "react";

type PolygonIconProps = {
	width?: number;
	height?: number;
};

// Vertex coordinates of a regular pentagon (viewBox 0 0 24 24, center 12,13, radius 9)
const POINTS = Array.from({ length: 5 }, (_, i) => {
	const angle = (2 * Math.PI * i) / 5 - Math.PI / 2;
	const x = 12 + 9 * Math.cos(angle);
	const y = 13 + 9 * Math.sin(angle);
	return `${x.toFixed(2)},${y.toFixed(2)}`;
}).join(" ");

const PolygonIconComponent: React.FC<PolygonIconProps> = ({
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
			<polygon
				points={POINTS}
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const PolygonIcon = memo(PolygonIconComponent);
