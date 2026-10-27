import styled from "@emotion/styled";

import { floatingBarStyles } from "../floatingBarStyles";

/**
 * The floating bar centred at the bottom of the viewport.
 *
 * Positioned inside the viewport rather than laid out beside it, so it covers
 * the canvas instead of shrinking it and centres over what the sidebars leave
 * (when it shows: see Canvas's `bottomToolbar` prop). A wheel over it reaches
 * the canvas, as it does over the ObjectMenu: the viewport's wheel listener
 * covers it.
 */
export const BottomToolbarContainer = styled.div`
	position: absolute;
	left: 50%;
	bottom: 16px;
	transform: translateX(-50%);
	${floatingBarStyles}
`;
