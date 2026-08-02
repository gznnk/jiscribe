import { memo } from "react";

type FolderIconProps = {
	width?: number;
	height?: number;
};

const FolderIconComponent: React.FC<FolderIconProps> = ({
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
				d="M3 5 H10 L12 8 H21 V19 H3 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const FolderIcon = memo(FolderIconComponent);
