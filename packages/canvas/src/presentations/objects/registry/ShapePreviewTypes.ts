import type { ReactNode } from "react";

/**
 * ドラッグ描画中のプレビュー要素を描くために必要な情報。
 * stroke / fill は呼び出し側で resolveAutoColor 済みの値が渡る。
 */
export type ShapePreviewProps = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	stroke: string;
	fill: string;
	strokeWidth: number;
};

/**
 * 図形種別ごとのプレビュー描画関数。
 * 「線か矩形か楕円か」という図形固有の描画だけを担う。
 */
export type ShapePreviewRenderer = (props: ShapePreviewProps) => ReactNode;
