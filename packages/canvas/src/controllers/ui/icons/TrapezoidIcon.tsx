import { memo } from "react";

type TrapezoidIconProps = {
	width?: number;
	height?: number;
};

const TrapezoidIconComponent: React.FC<TrapezoidIconProps> = ({
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
				points="4,6 20,6 17,18 7,18"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const TrapezoidIcon = memo(TrapezoidIconComponent);
