import { memo } from "react";

type MultiDocumentIconProps = {
	width?: number;
	height?: number;
};

const MultiDocumentIconComponent: React.FC<MultiDocumentIconProps> = ({
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
				d="M7 6 V4 H21 V13 H19 M5 8 V6 H19 V15 H17"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="M3 8 H17 V17.5 Q14.5 20.5 10 17.5 Q5.5 14.5 3 17.5 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const MultiDocumentIcon = memo(MultiDocumentIconComponent);
