import { memo } from "react";

type ServerIconProps = {
	width?: number;
	height?: number;
};

const ServerIconComponent: React.FC<ServerIconProps> = ({
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
				d="M5 3 H19 V21 H5 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M5 9 H19"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M5 15 H19"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M8 6 H8.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M8 12 H8.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M8 18 H8.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const ServerIcon = memo(ServerIconComponent);
