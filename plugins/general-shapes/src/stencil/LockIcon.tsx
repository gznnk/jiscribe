import { memo } from "react";

type LockIconProps = {
	width?: number;
	height?: number;
};

const LockIconComponent: React.FC<LockIconProps> = ({
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
				d="M6 11 H18 V21 H6 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M9 11 V8 A3 3 0 0 1 15 8 V11"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const LockIcon = memo(LockIconComponent);
