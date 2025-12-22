import styled from "@emotion/styled";

export const Viewport = styled.div`
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
`;

/**
 * Styled wrapper element for the SVG canvas.
 */
export const Container = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	overflow: hidden;
	background-color: #ffffff;
`;

/**
 * Props for the SVG element for grab scroll functionality.
 */
type SvgProps = {
	isGrabbing?: boolean;
};

/**
 * Styled SVG element for rendering the diagram.
 */
export const Svg = styled.svg<SvgProps>`
	display: block;
	box-sizing: border-box;
	background-color: #ffffff;
	outline: none;
	cursor: ${(props) => {
		if (props.isGrabbing) return "grabbing";
		return "default";
	}};
	* {
		outline: none;
	}
`;

/**
 * Props for the wrapper element that contains HTML elements.
 */
type HTMLElementsContainerProps = {
	left: number;
	top: number;
	zoom?: number;
};

/**
 * Styled wrapper element for containing HTML elements.
 */
export const HTMLElementsContainer = styled.div<HTMLElementsContainerProps>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	transform: ${(props) => (props.zoom ? `scale(${props.zoom})` : "none")};
	transform-origin: top left;
	pointer-events: none;
`;

/**
 * Styled element for the viewport overlay.
 */
export const ViewportOverlay = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	overflow: hidden;
	pointer-events: none;
	user-select: none;
`;

/**
 * Props for the selection rectangle element.
 */
type SelectionRectProps = {
	x: number;
	y: number;
	width: number;
	height: number;
	visible: boolean;
};

/**
 * Styled selection rectangle for area selection.
 */
export const SelectionRect = styled.rect<SelectionRectProps>`
	fill: rgba(107, 114, 128, 0.06);
	stroke: #6b7280;
	stroke-width: 1.5;
	stroke-dasharray: 5, 3;
	pointer-events: none;
	visibility: ${(props) => (props.visible ? "visible" : "hidden")};
	rx: 2;
	ry: 2;
`;
