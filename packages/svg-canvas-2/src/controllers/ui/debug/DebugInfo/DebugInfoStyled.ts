import styled from "@emotion/styled";

/**
 * Container for debug information displayed in the top-right corner.
 */
export const DebugInfoContainer = styled.div`
	position: absolute;
	top: 10px;
	right: 10px;
	padding: 8px 12px;
	background-color: rgba(255, 255, 255, 0.9);
	border: 1px solid #e5e7eb;
	border-radius: 4px;
	font-family: monospace;
	font-size: 12px;
	line-height: 1.5;
	color: #111827;
	pointer-events: auto;
	user-select: text;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

	> div {
		white-space: nowrap;
	}
`;
