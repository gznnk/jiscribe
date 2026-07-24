import { memo } from "react";

type DbIconProps = {
	width?: number;
	height?: number;
};

const DbIconComponent: React.FC<DbIconProps> = ({
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
				d="M4 6.5 A8 2.5 0 0 1 20 6.5 L20 17.5 A8 2.5 0 0 1 4 17.5 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="M4 6.5 A8 2.5 0 0 0 20 6.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			/>
		</svg>
	);
};

export const DbIcon = memo(DbIconComponent);
