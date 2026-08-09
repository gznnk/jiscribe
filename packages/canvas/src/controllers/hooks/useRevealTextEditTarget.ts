import { type Dispatch, useLayoutEffect, useMemo, useRef } from "react";

import type { Viewport } from "../../states/canvas/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import { calcCameraToRevealBox } from "../utils/calcCameraToRevealBox";
import { resolveTextEditTargetBox } from "../utils/resolveTextEditTargetBox";

/** Margin kept between the revealed target and the viewport edge, in screen px. */
const REVEAL_PADDING = 24;

type RevealTextEditTargetParams = {
	/** The active editing session; null (not editing) reveals nothing. */
	textEditState: CanvasControllerState["textEditState"];
	/** Draft objects (`graftTextEditDraft`), so the box follows every keystroke. */
	draftObjects: Record<string, ObjectState>;
	/** Family the host draws unstyled text in (`docDefaults.fontFamily`). */
	fontFamily: string;
	/** The current viewport; its camera is read at reveal time, not reacted to. */
	viewport: Viewport;
	dispatch: Dispatch<CanvasAction>;
};

/**
 * Pans the camera so the object being text-edited stays visible, on the edit
 * starting and on every keystroke that grows its box past a viewport edge.
 *
 * The camera itself is deliberately not a dependency: re-running on it would
 * drag the view straight back the moment the user pans away mid-edit. A pan of
 * their own therefore stands until the next keystroke, which reveals from
 * wherever they left the view.
 *
 * @param params - See {@link RevealTextEditTargetParams}
 */
export const useRevealTextEditTarget = ({
	textEditState,
	draftObjects,
	fontFamily,
	viewport,
	dispatch,
}: RevealTextEditTargetParams): void => {
	const targetBox = useMemo(
		() => resolveTextEditTargetBox(textEditState, draftObjects, fontFamily),
		[textEditState, draftObjects, fontFamily],
	);

	const viewportRef = useRef(viewport);
	useLayoutEffect(() => {
		viewportRef.current = viewport;
	});

	// Layout timing so the pan lands in the same frame as the keystroke that
	// caused it, instead of painting one frame with the target out of view.
	useLayoutEffect(() => {
		if (!targetBox) {
			return;
		}
		const camera = calcCameraToRevealBox(
			viewportRef.current,
			targetBox,
			REVEAL_PADDING,
		);
		if (!camera) {
			return;
		}
		dispatch({ type: "SET_VIEWPORT", camera });
	}, [targetBox, dispatch]);
};
