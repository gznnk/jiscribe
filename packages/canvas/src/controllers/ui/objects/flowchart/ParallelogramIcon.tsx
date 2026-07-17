import { memo } from "react";

type ParallelogramIconProps = {
	width?: number;
	height?: number;
};

const ParallelogramIconComponent: React.FC<ParallelogramIconProps> = ({
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
				points="8,6 21,6 16,18 3,18"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const ParallelogramIcon = memo(ParallelogramIconComponent);
