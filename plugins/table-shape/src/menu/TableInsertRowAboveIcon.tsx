import { memo } from "react";

type TableInsertRowAboveIconProps = {
	width?: number;
	height?: number;
	title: string;
};

const TableInsertRowAboveIconComponent: React.FC<
	TableInsertRowAboveIconProps
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
		<rect x="3" y="12" width="18" height="8" rx="1.5" />
		<path d="M9 12v8M15 12v8" strokeWidth="1.5" />
		<path d="M12 3v6M9 6h6" />
	</svg>
);

export const TableInsertRowAboveIcon = memo(TableInsertRowAboveIconComponent);
