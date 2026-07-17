import { memo } from "react";

type OffPageConnectorIconProps = {
	width?: number;
	height?: number;
};

const OffPageConnectorIconComponent: React.FC<OffPageConnectorIconProps> = ({
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
				points="4,4 20,4 20,15 12,21 4,15"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const OffPageConnectorIcon = memo(OffPageConnectorIconComponent);
