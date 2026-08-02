import { memo } from "react";

type ShieldIconProps = {
	width?: number;
	height?: number;
};

const ShieldIconComponent: React.FC<ShieldIconProps> = ({
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
				d="M4 3 H20 V12 C20 17 16 20 12 22 C8 20 4 17 4 12 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const ShieldIcon = memo(ShieldIconComponent);
