import { memo } from "react";

type CloudIconProps = {
	width?: number;
	height?: number;
};

/**
 * Glyph for the `general` category button. `cloud` itself is still a core shape
 * with its own copy of this icon; core exports no icon components, so the
 * category entry that lives here carries its own. The two copies merge when
 * cloud moves into this package.
 */
const CloudIconComponent: React.FC<CloudIconProps> = ({
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
				d="M6.5 18 A4 4 0 0 1 6.5 10 A5.5 5.5 0 0 1 17.2 10.6 A3.8 3.8 0 0 1 17.5 18 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const CloudIcon = memo(CloudIconComponent);
