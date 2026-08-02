import { memo } from "react";

type ActorIconProps = {
	width?: number;
	height?: number;
};

const ActorIconComponent: React.FC<ActorIconProps> = ({
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
				cy="5"
				r="3"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<path
				d="M12 8 V15 M5 11 H19 M12 15 L7 21 M12 15 L17 21"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const ActorIcon = memo(ActorIconComponent);
