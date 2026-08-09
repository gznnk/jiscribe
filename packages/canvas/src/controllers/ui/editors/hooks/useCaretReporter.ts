import type { BoundingBox } from "@workspace/geometry";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

import type { CaretLocalRect } from "../utils/readCaretLocalRect";
import { readCaretLocalRect } from "../utils/readCaretLocalRect";

/**
 * Lifts a caret measured inside the wrapper into world coordinates.
 *
 * @param caret - The caret segment in the wrapper's local px (from readCaretLocalRect)
 * @param wrapper - The wrapper element, already laid out; its measured size is
 *   what an anchor-centered editor needs to find its top-left corner
 * @returns The caret's world box, or null when the local segment cannot be
 *   placed (a degenerate transform, say)
 */
type CalcCaretWorldBox = (
	caret: CaretLocalRect,
	wrapper: HTMLDivElement,
) => BoundingBox | null;

type UseCaretReporterParams = {
	/** Where the caret moved to, in world coordinates; omitted when nobody follows the caret, and then nothing is measured */
	onCaretMove?: (caretWorldBox: BoundingBox) => void;
	/** Converts a caret measured in the wrapper into world coordinates; the one part of the positioning model this hook leaves to the caller */
	calcCaretWorldBox: CalcCaretWorldBox;
};

type CaretReporter = {
	/** Ref for the textarea being edited; it is focused on mount */
	textAreaRef: RefObject<HTMLTextAreaElement | null>;
	/** Ref for the wrapper the caret is measured against */
	wrapperRef: RefObject<HTMLDivElement | null>;
	/** Reports the caret where it is now; the caller drives it from `useLayoutEffect` for every render, and from `onSelect` / `onFocus` for the caret moves that render nothing */
	reportCaret: () => void;
};

/**
 * Focuses the textarea an in-place editor overlays the canvas with, and turns
 * its caret into a world box for the caller to report.
 *
 * Running `reportCaret` is left to the caller because it has to be measured
 * against a laid-out box: the caller's `useLayoutEffect(reportCaret)` belongs
 * after the effect that fits the textarea's height.
 *
 * @param params - The caret sink and the caller's local-to-world conversion
 * @returns The refs to attach plus `reportCaret`
 */
export const useCaretReporter = ({
	onCaretMove,
	calcCaretWorldBox,
}: UseCaretReporterParams): CaretReporter => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const textAreaRef = useRef<HTMLTextAreaElement>(null);

	// Focus initially and place the caret at the end.
	useEffect(() => {
		const el = textAreaRef.current;
		if (!el) {
			return;
		}
		// The caret is placed before the focus so the reveal that rides on the focus
		// event (onCaretMove) already sees the end of the text.
		el.setSelectionRange(el.value.length, el.value.length);
		// preventScroll: the browser would otherwise reveal the textarea by
		// scrolling the overflow-hidden ancestors, an offset the canvas camera
		// knows nothing about. Revealing is useRevealTextEditCaret's job.
		el.focus({ preventScroll: true });
	}, []);

	const reportCaret = useCallback(() => {
		const el = textAreaRef.current;
		const wrapper = wrapperRef.current;
		// Only the focused editor has a caret to report; at mount the selection is
		// still at 0, which would reveal the wrong end of the text.
		if (!el || !wrapper || !onCaretMove || el !== document.activeElement) {
			return;
		}
		const caret = readCaretLocalRect(el);
		if (!caret) {
			return;
		}
		const caretWorldBox = calcCaretWorldBox(caret, wrapper);
		if (caretWorldBox) {
			onCaretMove(caretWorldBox);
		}
	}, [onCaretMove, calcCaretWorldBox]);

	return { textAreaRef, wrapperRef, reportCaret };
};
