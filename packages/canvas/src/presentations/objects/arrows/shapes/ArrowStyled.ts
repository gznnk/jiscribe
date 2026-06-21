import styled from "@emotion/styled";

import { cssSafeValue } from "../../utils/cssSafeValue";

/**
 * 矢印シェイプの色プロパティ。
 * 塗り矢印は `fillColor`、中空矢印は `strokeColor` を渡す（未指定側は `none`）。
 * 値は解決済み（auto はテーマ前景へ解決済み）で、emotion へ補間するため sink で無害化する。
 */
type ArrowColorProps = {
	fillColor?: string;
	strokeColor?: string;
};

const arrowColor = ({ fillColor, strokeColor }: ArrowColorProps): string => `
	fill: ${fillColor ? cssSafeValue(fillColor) : "none"};
	stroke: ${strokeColor ? cssSafeValue(strokeColor) : "none"};
`;

/**
 * Styled polygon element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowPolygon = styled.polygon<ArrowColorProps>`
	${arrowColor}
	pointer-events: auto;
	cursor: grab;
`;

/**
 * Styled polyline element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowPolyline = styled.polyline<ArrowColorProps>`
	${arrowColor}
	pointer-events: auto;
	cursor: grab;
`;

/**
 * Styled circle element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowCircle = styled.circle<ArrowColorProps>`
	${arrowColor}
	pointer-events: auto;
	cursor: grab;
`;
