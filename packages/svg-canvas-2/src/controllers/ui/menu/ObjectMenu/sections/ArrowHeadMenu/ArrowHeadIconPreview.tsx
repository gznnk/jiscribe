import { memo } from "react";

import type { ArrowType } from "../../../../../../schemas/objects/types/ArrowType";

type ArrowHeadIconPreviewProps = {
	arrowType: ArrowType | undefined;
	direction: "start" | "end";
};

/**
 * 矢印タイプのプレビューアイコン。
 * SVG インラインで矢印形状を描画する（<defs> マーカー不使用）。
 * direction="start" の場合は左端、"end" の場合は右端に矢印を表示する。
 */
const ArrowHeadIconPreviewComponent: React.FC<ArrowHeadIconPreviewProps> = ({
	arrowType,
	direction,
}) => {
	const isStart = direction === "start";
	const type = arrowType ?? "None";

	// ライン描画（矢印があれば端を少し短くしてかぶりを防ぐ）
	const lineX1 = isStart ? (type !== "None" ? 9 : 2) : 2;
	const lineX2 = isStart ? 22 : type !== "None" ? 15 : 22;

	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* ライン */}
			<line
				x1={lineX1}
				y1="12"
				x2={lineX2}
				y2="12"
				stroke="#333333"
				strokeWidth="1.5"
			/>

			{/* 矢印形状 */}
			{type === "FilledTriangle" && isStart && (
				<polygon points="2,12 9,8 9,16" fill="#333333" />
			)}
			{type === "FilledTriangle" && !isStart && (
				<polygon points="22,12 15,8 15,16" fill="#333333" />
			)}

			{type === "ConcaveTriangle" && isStart && (
				<path d="M2,12 L9,8 L6,12 L9,16 Z" fill="#333333" />
			)}
			{type === "ConcaveTriangle" && !isStart && (
				<path d="M22,12 L15,8 L18,12 L15,16 Z" fill="#333333" />
			)}

			{type === "OpenArrow" && isStart && (
				<path
					d="M8,8 L2,12 L8,16"
					stroke="#333333"
					strokeWidth="1.5"
					fill="none"
					strokeLinejoin="round"
				/>
			)}
			{type === "OpenArrow" && !isStart && (
				<path
					d="M16,8 L22,12 L16,16"
					stroke="#333333"
					strokeWidth="1.5"
					fill="none"
					strokeLinejoin="round"
				/>
			)}

			{type === "HollowTriangle" && isStart && (
				<polygon
					points="2,12 9,8 9,16"
					fill="white"
					stroke="#333333"
					strokeWidth="1.2"
				/>
			)}
			{type === "HollowTriangle" && !isStart && (
				<polygon
					points="22,12 15,8 15,16"
					fill="white"
					stroke="#333333"
					strokeWidth="1.2"
				/>
			)}

			{type === "FilledDiamond" && isStart && (
				<polygon points="2,12 6,9 10,12 6,15" fill="#333333" />
			)}
			{type === "FilledDiamond" && !isStart && (
				<polygon points="22,12 18,9 14,12 18,15" fill="#333333" />
			)}

			{type === "HollowDiamond" && isStart && (
				<polygon
					points="2,12 6,9 10,12 6,15"
					fill="white"
					stroke="#333333"
					strokeWidth="1.2"
				/>
			)}
			{type === "HollowDiamond" && !isStart && (
				<polygon
					points="22,12 18,9 14,12 18,15"
					fill="white"
					stroke="#333333"
					strokeWidth="1.2"
				/>
			)}

			{type === "Circle" && isStart && (
				<circle
					cx="5"
					cy="12"
					r="3"
					fill="white"
					stroke="#333333"
					strokeWidth="1.2"
				/>
			)}
			{type === "Circle" && !isStart && (
				<circle
					cx="19"
					cy="12"
					r="3"
					fill="white"
					stroke="#333333"
					strokeWidth="1.2"
				/>
			)}

			{/* None: 端に小さな縦線を表示 */}
			{type === "None" && isStart && (
				<line x1="2" y1="9" x2="2" y2="15" stroke="#333333" strokeWidth="1.5" />
			)}
			{type === "None" && !isStart && (
				<line
					x1="22"
					y1="9"
					x2="22"
					y2="15"
					stroke="#333333"
					strokeWidth="1.5"
				/>
			)}
		</svg>
	);
};

export const ArrowHeadIconPreview = memo(ArrowHeadIconPreviewComponent);
