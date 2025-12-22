import styled from "@emotion/styled";

import { DROP_OVERLAY_COLOR } from "../../../constants/styling/diagrams/CanvasFrameStyling";

/**
 * Props for the SVG canvas frame element.
 */
type CanvasFrameProps = {
	isTransparent?: boolean;
};

type CanvasFrameDropIndicatorProps = {
	isActive: boolean;
};

/**
 * Styled element that indicates when the frame can accept drops.
 */
export const CanvasFrameDropIndicator = styled.rect<CanvasFrameDropIndicatorProps>`
	pointer-events: none;
	fill: ${DROP_OVERLAY_COLOR};
	opacity: ${(props) => (props.isActive ? 1 : 0)};
	transition: opacity 120ms ease-in-out;
`;

/**
 * Styled canvas frame element for background.
 */
export const CanvasFrameElement = styled.rect<CanvasFrameProps>`
	opacity: ${(props) => (props.isTransparent ? 0 : 1)};
`;
