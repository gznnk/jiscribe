import { memo } from "react";

type HelpIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * ヘルプ（はてなマーク）アイコン。
 * キーボードショートカット一覧を開くボタンなどに使う。
 */
const HelpIconComponent: React.FC<HelpIconProps> = ({
	width = 20,
	height = 20,
	fill = "#333333",
	title = "Help",
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
		>
			<title>{title}</title>
			<circle cx="12" cy="12" r="9" stroke={fill} strokeWidth="2" />
			<path
				d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.33c-.55.22-.9.77-.9 1.36V14"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<circle cx="12" cy="17" r="1" fill={fill} />
		</svg>
	);
};

export const HelpIcon = memo(HelpIconComponent);
