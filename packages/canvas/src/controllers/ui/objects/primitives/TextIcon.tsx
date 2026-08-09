import { memo } from "react";

type TextIconProps = {
	width?: number;
	height?: number;
};

const TextIconComponent: React.FC<TextIconProps> = ({
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
				d="M5 5h14M12 5v14M9 19h6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const TextIcon = memo(TextIconComponent);
