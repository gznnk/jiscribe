import { memo } from "react";

type DocumentIconProps = {
	width?: number;
	height?: number;
};

const DocumentIconComponent: React.FC<DocumentIconProps> = ({
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
				d="M4 4 H20 V16.5 Q17 20 12 16.5 Q7 13 4 16.5 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const DocumentIcon = memo(DocumentIconComponent);
