import { memo } from "react";

type QueueIconProps = {
	width?: number;
	height?: number;
};

const QueueIconComponent: React.FC<QueueIconProps> = ({
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
				d="M2 8 H22 V16 H2 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M7 8 V16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M12 8 V16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d="M17 8 V16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const QueueIcon = memo(QueueIconComponent);
