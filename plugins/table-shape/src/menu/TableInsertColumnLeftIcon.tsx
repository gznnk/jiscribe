import { memo } from "react";

type TableInsertColumnLeftIconProps = {
	width?: number;
	height?: number;
	title: string;
};

const TableInsertColumnLeftIconComponent: React.FC<
	TableInsertColumnLeftIconProps
> = ({ width = 24, height = 24, title }) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>{title}</title>
		<rect x="12" y="3" width="8" height="18" rx="1.5" />
		<path d="M12 9h8M12 15h8" strokeWidth="1.5" />
		<path d="M6 9v6M3 12h6" />
	</svg>
);

export const TableInsertColumnLeftIcon = memo(
	TableInsertColumnLeftIconComponent,
);
