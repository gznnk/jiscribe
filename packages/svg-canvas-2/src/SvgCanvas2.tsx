import React from "react";

export interface SvgCanvas2Props {
	width?: number;
	height?: number;
	className?: string;
}

/**
 * SvgCanvas2 - 新しいバージョンのSVGキャンバスコンポーネント
 */
export const SvgCanvas2: React.FC<SvgCanvas2Props> = ({
	width = 800,
	height = 600,
	className,
}) => {
	return (
		<svg
			width={width}
			height={height}
			className={className}
			style={{ border: "1px solid #ccc" }}
		>
			<rect x={10} y={10} width={100} height={100} fill="#4CAF50" />
			<circle cx={200} cy={60} r={50} fill="#2196F3" />
			<text x={10} y={150} fontSize={16} fill="#333">
				SvgCanvas2 - 新バージョン
			</text>
		</svg>
	);
};
