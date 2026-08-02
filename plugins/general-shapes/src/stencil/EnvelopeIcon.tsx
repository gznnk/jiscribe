import { memo } from "react";

type EnvelopeIconProps = {
	width?: number;
	height?: number;
};

const EnvelopeIconComponent: React.FC<EnvelopeIconProps> = ({
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
				d="M3 6 H21 V18 H3 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M3 6 L12 13 L21 6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const EnvelopeIcon = memo(EnvelopeIconComponent);
