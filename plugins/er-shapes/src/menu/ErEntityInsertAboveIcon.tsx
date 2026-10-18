import { memo } from "react";

type ErEntityInsertAboveIconProps = {
	width?: number;
	height?: number;
	title: string;
};

const ErEntityInsertAboveIconComponent: React.FC<
	ErEntityInsertAboveIconProps
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
		<path
			d="M3 15V12.5a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5V15Z"
			fill="currentColor"
		/>
		<rect x="3" y="11" width="18" height="10" rx="1.5" />
		<path d="M3 18h18" strokeWidth="1.5" />
		<path d="M12 2v6M9 5h6" />
	</svg>
);

export const ErEntityInsertAboveIcon = memo(ErEntityInsertAboveIconComponent);
