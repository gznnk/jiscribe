import { memo } from "react";

type CalloutIconProps = {
	width?: number;
	height?: number;
};

const CalloutIconComponent: React.FC<CalloutIconProps> = ({
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
				d="M4 5 H20 V15 H11 L7 20 L8 15 H4 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const CalloutIcon = memo(CalloutIconComponent);
