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
			{/*
				A serif T drawn as a skeleton at the stroke weight the other stencil
				icons use, spanning their 3..21 box. Without the drops at the crossbar
				ends the mark reads as an "I".
			*/}
			<path
				d="M3 7V4h18v3M12 4v16M9 20h6"
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
