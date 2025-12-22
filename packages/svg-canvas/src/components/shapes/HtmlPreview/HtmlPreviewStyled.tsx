import styled from "@emotion/styled";

/**
 * Styled foreignObject element for HtmlPreview
 */
export const HtmlPreviewForeignObject = styled.foreignObject`
	cursor: move;
	overflow: hidden;
`;

/**
 * Styled div element for HTML content container
 */
export const HtmlPreviewContentDiv = styled.div`
	width: 100%;
	height: 100%;
	overflow: hidden;
	pointer-events: none;
`;
