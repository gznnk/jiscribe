import { memo } from "react";

type TableInsertColumnRightIconProps = {
	width?: number;
	height?: number;
	title: string;
};

const TableInsertColumnRightIconComponent: React.FC<
	TableInsertColumnRightIconProps
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
		<rect x="4" y="3" width="8" height="18" rx="1.5" />
		<path d="M4 9h8M4 15h8" strokeWidth="1.5" />
		<path d="M18 9v6M15 12h6" />
	</svg>
);

export const TableInsertColumnRightIcon = memo(
	TableInsertColumnRightIconComponent,
);
