import { css } from "@emotion/react";

import { theme } from "./theme";

/**
 * Custom scrollbar styles for webkit-based browsers.
 * Apply to any styled component that has overflow: auto or overflow: scroll.
 *
 * Usage:
 *   import { scrollbarStyles } from "../../constants/scrollbarStyles";
 *
 *   const MyStyledDiv = styled.div`
 *     overflow-y: auto;
 *     ${scrollbarStyles}
 *   `;
 */
export const scrollbarStyles = css`
	&::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	&::-webkit-scrollbar-track {
		background: ${theme.scrollbarTrack};
	}

	&::-webkit-scrollbar-thumb {
		background-color: ${theme.scrollbarThumb};
		border-radius: 4px;
		/* Hosts may style ::-webkit-scrollbar-thumb globally (e.g. the landing
		   page adds a 2px border); pseudo-elements pierce component boundaries,
		   so reset every visual property the theme owns. */
		border: none;
		transition: background-color 0.3s;
	}

	&::-webkit-scrollbar-thumb:hover {
		background-color: ${theme.scrollbarThumbHover};
	}

	&::-webkit-scrollbar-corner {
		background-color: transparent;
	}
`;
