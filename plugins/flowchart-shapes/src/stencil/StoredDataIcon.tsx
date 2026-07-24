import { memo } from "react";

type StoredDataIconProps = {
	width?: number;
	height?: number;
};

const StoredDataIconComponent: React.FC<StoredDataIconProps> = ({
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
				d="M8 5 H21 A3 7 0 0 0 21 19 H8 A3 7 0 0 1 8 5 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const StoredDataIcon = memo(StoredDataIconComponent);
