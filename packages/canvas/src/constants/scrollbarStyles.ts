import { css } from "@emotion/react";

import { theme } from "./theme";

/**
 * Width (and height) of the custom webkit scrollbar in px. Consumers that
 * reserve layout space for the scrollbar (e.g. TextEditor's outside-the-shape
 * gutter) must use this same value.
 */
export const SCROLLBAR_WIDTH = 8;

/**
 * Custom scrollbar styles for webkit-based browsers.
 * Apply to any styled component that has overflow: auto or overflow: scroll.
 *
 * Published to plugins through `@jiscribe/canvas/unstable` (and so `@jiscribe/canvas-sdk`),
 * because a plugin panel that scrolls beside the canvas's own has no other way to wear the
 * same scrollbar.
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
	/* Hosts may set the standard scrollbar-color / scrollbar-width properties
	   (VSCode's webview default stylesheet puts scrollbar-color on html, and it
	   inherits). When either is non-auto, Chromium ignores every
	   ::-webkit-scrollbar-* custom style and falls back to its default-width
	   scrollbar, which also breaks layouts that reserve SCROLLBAR_WIDTH via
	   scrollbar-gutter. Reset both so the custom scrollbar stays in effect. */
	scrollbar-color: auto;
	scrollbar-width: auto;

	&::-webkit-scrollbar {
		width: ${SCROLLBAR_WIDTH}px;
		height: ${SCROLLBAR_WIDTH}px;
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
