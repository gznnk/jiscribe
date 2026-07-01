import styled from "@emotion/styled";

import { theme } from "../constants/theme";

/**
 * Styled SVG element for rendering the diagram.
 */
export const Svg = styled.svg`
	display: block;
	box-sizing: border-box;
	background-color: ${theme.canvasBg};
	outline: none;
	* {
		outline: none;
	}
`;

type ContentGroupProps = {
	isDrawMode: boolean;
};

/**
 * SVG group element. During draw mode it forcibly disables pointer-events on descendants.
 * !important is required because each shape explicitly sets pointer-events: auto/all.
 *
 * auto (theme-following) colors are resolved to role-specific theme tokens by
 * `resolveAutoColor` and applied via CSS, so there is no need here to pin `currentColor`
 * to the foreground (issue #38 / doc 08).
 */
export const ContentGroup = styled.g<ContentGroupProps>`
	${({ isDrawMode }) =>
		isDrawMode &&
		`
		* {
			pointer-events: none !important;
		}
	`}
`;
