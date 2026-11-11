import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";

import { theme } from "../../../../foundation/theme/themeTokens";
import { floatingBarStyles } from "../../menu/floatingBarStyles";

/** How long the indicator stays invisible, so a quick run shows nothing. */
const FADE_IN_DELAY_MS = 300;

const FADE_IN_DURATION_MS = 120;

const RING_TURN_DURATION_MS = 800;

const RING_SIZE = 14;

const fadeIn = keyframes`
	to {
		opacity: 1;
	}
`;

const ringTurn = keyframes`
	to {
		transform: rotate(360deg);
	}
`;

/**
 * The pill, centred over the viewport. The command blocks the main thread, so all
 * motion here has to run on the compositor: `opacity` and `transform` keyframes on
 * HTML elements with `will-change`, nothing driven by a timer or by SVG. The delay
 * replaces a timer for the same reason. The text is trimmed to its cap height and
 * baseline (`text-box`), so it centres on the ring by its letters rather than by
 * the font's line metrics, which sit Source Sans 3 and Noto Sans JP about 1px high.
 * Where `text-box` is unsupported, the even line height keeps the text and the ring
 * off half pixels.
 */
export const IndicatorPill = styled.div`
	${floatingBarStyles}
	position: absolute;
	left: 0;
	right: 0;
	width: fit-content;
	margin-inline: auto;
	gap: 8px;
	padding: 6px 12px;
	font-size: 12px;
	line-height: 16px;
	text-box: trim-both cap alphabetic;
	white-space: nowrap;
	color: ${theme.foreground};
	pointer-events: none;
	opacity: 0;
	will-change: opacity;
	animation: ${fadeIn} ${FADE_IN_DURATION_MS}ms linear ${FADE_IN_DELAY_MS}ms
		forwards;
`;

export const IndicatorRing = styled.div`
	flex: none;
	box-sizing: border-box;
	width: ${RING_SIZE}px;
	height: ${RING_SIZE}px;
	border: 2px solid ${theme.border};
	border-top-color: ${theme.accent};
	border-radius: 50%;
	will-change: transform;
	animation: ${ringTurn} ${RING_TURN_DURATION_MS}ms linear infinite;
`;
