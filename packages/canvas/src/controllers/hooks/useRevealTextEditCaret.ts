import type { BoundingBox } from "@jiscribe/geometry";
import { type Dispatch, useCallback, useLayoutEffect, useRef } from "react";

import type { Viewport } from "../../states/canvas/Viewport";
import type { CanvasAction } from "../reducer/CanvasActions";
import { calcCameraToRevealBox } from "../utils/calcCameraToRevealBox";

/** Margin kept between the revealed caret and the viewport edge, in screen px. */
const REVEAL_PADDING = 24;

type RevealTextEditCaretParams = {
	/** The current viewport; its camera is read at reveal time, not reacted to. */
	viewport: Viewport;
	dispatch: Dispatch<CanvasAction>;
};

/**
 * Builds the callback the text editors report their caret to, which pans the
 * camera whenever the caret would otherwise sit outside the visible rect.
 *
 * The caret rather than the edited box is what gets revealed: a line longer than
 * the visible rect has no position that shows the box, while the caret is always
 * small enough to show, so typing at either end of such a line keeps following.
 *
 * The camera is deliberately not a dependency of the callback: reacting to it
 * would drag the view straight back the moment the user pans away mid-edit. A
 * pan of their own therefore stands until the next caret report, which reveals
 * from wherever they left the view.
 *
 * @param params - See {@link RevealTextEditCaretParams}
 * @returns A stable callback taking the caret's world-coordinate box; it
 *   dispatches nothing while that box is already visible
 */
export const useRevealTextEditCaret = ({
	viewport,
	dispatch,
}: RevealTextEditCaretParams): ((caretWorldBox: BoundingBox) => void) => {
	const viewportRef = useRef(viewport);
	useLayoutEffect(() => {
		viewportRef.current = viewport;
	});

	return useCallback(
		(caretWorldBox: BoundingBox) => {
			const camera = calcCameraToRevealBox(
				viewportRef.current,
				caretWorldBox,
				REVEAL_PADDING,
			);
			if (!camera) {
				return;
			}
			dispatch({ type: "SET_VIEWPORT", camera });
		},
		[dispatch],
	);
};
