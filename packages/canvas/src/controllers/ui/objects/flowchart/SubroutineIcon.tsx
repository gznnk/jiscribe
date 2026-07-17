import { memo } from "react";

type SubroutineIconProps = {
	width?: number;
	height?: number;
};

const SubroutineIconComponent: React.FC<SubroutineIconProps> = ({
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
			<rect
				x="3"
				y="6"
				width="18"
				height="12"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="M7 6 V18 M17 6 V18"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			/>
		</svg>
	);
};

export const SubroutineIcon = memo(SubroutineIconComponent);
