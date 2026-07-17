import { memo } from "react";

type ManualInputIconProps = {
	width?: number;
	height?: number;
};

const ManualInputIconComponent: React.FC<ManualInputIconProps> = ({
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
				points="3,9 21,5 21,19 3,19"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const ManualInputIcon = memo(ManualInputIconComponent);
