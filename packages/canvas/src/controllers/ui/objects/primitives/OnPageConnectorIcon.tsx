import { memo } from "react";

type OnPageConnectorIconProps = {
	width?: number;
	height?: number;
};

const OnPageConnectorIconComponent: React.FC<OnPageConnectorIconProps> = ({
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
			<circle
				cx="12"
				cy="12"
				r="8"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			/>
		</svg>
	);
};

export const OnPageConnectorIcon = memo(OnPageConnectorIconComponent);
