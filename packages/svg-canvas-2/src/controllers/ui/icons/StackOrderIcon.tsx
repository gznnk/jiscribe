import { memo } from "react";

type ArrangeIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

const StackOrderIconComponent: React.FC<ArrangeIconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title = "Stack Order",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 16 16"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		stroke={fill}
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeWidth="1.3"
	>
		<title>{title}</title>
		<path d="m1.75 11 6.25 3.25 6.25-3.25m-12.5-3 6.25 3.25 6.25-3.25m-6.25-6.25-6.25 3.25 6.25 3.25 6.25-3.25z" />
	</svg>
);

export const StackOrderIcon = memo(StackOrderIconComponent);
