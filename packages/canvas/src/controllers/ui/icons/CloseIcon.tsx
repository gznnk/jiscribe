import { memo } from "react";

type CloseIconProps = {
	width?: number;
	height?: number;
};

/** Close (x) cross, inset from the box so it reads as a mark rather than a full-bleed X. */
const CloseIconComponent: React.FC<CloseIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M6 6 18 18"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M18 6 6 18"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const CloseIcon = memo(CloseIconComponent);
