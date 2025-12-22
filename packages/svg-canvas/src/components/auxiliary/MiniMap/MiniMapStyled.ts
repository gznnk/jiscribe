import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../constants/styling/core/CommonStyling";

/**
 * Container for the MiniMap component
 */
export const MiniMapContainer = styled.div<{ width: number; height: number }>`
	width: ${(props) => props.width}px;
	height: ${(props) => props.height}px;
	background-color: #fafafa;
	border: 1px solid rgba(107, 114, 128, 0.15);
	border-radius: 8px;
	box-shadow: ${BOX_SHADOW};
	cursor: pointer;
	overflow: hidden;
	z-index: 1000;
	pointer-events: auto;

	&:hover {
		border-color: rgba(107, 114, 128, 0.3);
	}
`;

/**
 * SVG element for the MiniMap
 */
export const MiniMapSvg = styled.svg`
	width: 100%;
	height: 100%;
	display: block;
	pointer-events: auto;
	cursor: pointer;

	/* Override cursor for all child elements to prevent diagram-specific cursors */
	* {
		cursor: pointer !important;
		pointer-events: none !important;
	}
`;

/**
 * Background rectangle for the minimap
 */
export const MiniMapBackground = styled.rect`
	fill: #ffffff;
	stroke: rgba(107, 114, 128, 0.08);
	stroke-width: 0.5;
`;

/**
 * Viewport indicator rectangle
 */
export const ViewportIndicator = styled.rect`
	fill: rgba(107, 114, 128, 0.08);
	stroke: rgba(107, 114, 128, 0.8);
	stroke-width: 1.5;
	opacity: 0.9;
	cursor: grab !important;
	pointer-events: all !important;

	&:hover {
		fill: rgba(107, 114, 128, 0.12);
		stroke: rgba(107, 114, 128, 1);
		stroke-width: 2;
		opacity: 1;
		cursor: grab !important;
	}

	&:active {
		cursor: grabbing !important;
		fill: rgba(107, 114, 128, 0.15);
		stroke: rgba(107, 114, 128, 1);
		stroke-width: 2;
		opacity: 1;
	}
`;

/**
 * Item representation in the minimap
 */
export const MiniMapItem = styled.rect`
	fill: rgba(107, 114, 128, 0.6);
	opacity: 0.8;
`;
