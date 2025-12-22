import styled from "@emotion/styled";

/**
 * Container for right-side panels (MiniMap, ZoomControls, AiChatPanel)
 * Manages vertical stacking layout in the right corner
 */
export const RightPanelContainerStyled = styled.div`
	position: absolute;
	top: 16px;
	right: 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	z-index: 1000;
	pointer-events: none;

	/* Allow pointer events on children */
	> * {
		pointer-events: auto;
	}
`;

/**
 * Container for bottom items (ZoomControls and AiChatPanel)
 * These are positioned at the bottom of the viewport
 */
export const BottomPanelContainerStyled = styled.div`
	position: absolute;
	bottom: 24px;
	right: 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: flex-end;
	z-index: 999;
	pointer-events: none;

	/* Allow pointer events on children */
	> * {
		pointer-events: auto;
	}
`;
