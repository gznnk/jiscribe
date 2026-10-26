import { memo } from "react";

type PinIconProps = {
	width?: number;
	height?: number;
};

/** Push pin, the toggle pinning a library category to the stencil rail. */
const PinIconComponent: React.FC<PinIconProps> = ({
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
				d="M9 3h6l-1 7 3.5 3.5V15h-11v-1.5L10 10 9 3Z"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="M12 15v6"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const PinIcon = memo(PinIconComponent);
