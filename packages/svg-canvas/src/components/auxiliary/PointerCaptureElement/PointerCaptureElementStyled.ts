import styled from "@emotion/styled";

/**
 * Invisible dummy element for pointer capture during area selection
 * This element allows auto-scroll to work when pointer moves outside viewport
 */
export const CaptureElement = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	width: 1px;
	height: 1px;
	opacity: 0;
	pointer-events: auto;
	/* Ensure the element is invisible but still capturable */
	background: transparent;
	border: none;
	/* Prevent any visual interference */
	z-index: -1;
`;
