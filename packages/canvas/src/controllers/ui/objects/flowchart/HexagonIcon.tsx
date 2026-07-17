import { memo } from "react";

type HexagonIconProps = {
	width?: number;
	height?: number;
};

const HexagonIconComponent: React.FC<HexagonIconProps> = ({
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
			<polygon
				points="7,5 17,5 21,12 17,19 7,19 3,12"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const HexagonIcon = memo(HexagonIconComponent);
