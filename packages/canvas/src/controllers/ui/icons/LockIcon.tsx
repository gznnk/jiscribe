import { memo } from "react";

type LockIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	locked?: boolean;
	title?: string;
};

/**
 * Lock/unlock icon.
 * Visually indicates the lockAspectRatio state.
 */
const LockIconComponent: React.FC<LockIconProps> = ({
	width = 20,
	height = 20,
	fill = "currentColor",
	locked = false,
	title,
}) => {
	const iconTitle = title ?? (locked ? "Locked" : "Unlocked");

	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
		>
			<title>{iconTitle}</title>
			{locked ? (
				<>
					{/* Locked: closed shackle */}
					<rect
						x="5"
						y="11"
						width="14"
						height="10"
						rx="2"
						fill={fill}
						opacity="0.15"
						stroke={fill}
						strokeWidth="2"
					/>
					<path
						d="M8 11V7a4 4 0 0 1 8 0v4"
						stroke={fill}
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</>
			) : (
				<>
					{/* Unlocked: open shackle */}
					<rect
						x="5"
						y="11"
						width="14"
						height="10"
						rx="2"
						fill="none"
						stroke={fill}
						strokeWidth="2"
					/>
					<path
						d="M8 11V7a4 4 0 0 1 8 0"
						stroke={fill}
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</>
			)}
		</svg>
	);
};

export const LockIcon = memo(LockIconComponent);
