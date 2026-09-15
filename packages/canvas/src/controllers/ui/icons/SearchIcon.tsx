import { memo } from "react";

type SearchIconProps = {
	width?: number;
	height?: number;
};

/** Magnifying glass, used as the adornment of a search input. */
const SearchIconComponent: React.FC<SearchIconProps> = ({
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
			<circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
			<path
				d="m20 20-3.5-3.5"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const SearchIcon = memo(SearchIconComponent);
