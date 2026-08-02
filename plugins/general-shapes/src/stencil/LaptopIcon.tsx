import { memo } from "react";

type LaptopIconProps = {
	width?: number;
	height?: number;
};

const LaptopIconComponent: React.FC<LaptopIconProps> = ({
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
			<path
				d="M5 4 H19 V15 H5 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M5 15 H19 L22 20 H2 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const LaptopIcon = memo(LaptopIconComponent);
