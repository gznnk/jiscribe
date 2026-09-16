import type { BoundingBox } from "@jiscribe/geometry";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

import type { CaretTarget } from "../utils/measureCaretInSurface";
import { measureCaretInSurface } from "../utils/measureCaretInSurface";
import type { CaretLocalRect } from "../utils/readCaretLocalRect";
import { readCaretLocalRect } from "../utils/readCaretLocalRect";
import { scrollSurfaceToCaret } from "../utils/scrollSurfaceToCaret";

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

type UseCaretReporterParams<TSurface extends HTMLElement> = {
	/** Where the caret moved to, in world coordinates; omitted when nobody follows the caret, and then nothing is measured */
	onCaretMove?: (caretWorldBox: BoundingBox) => void;
	/** Converts a caret measured in the wrapper into world coordinates; the one part of the positioning model this hook leaves to the caller */
	calcCaretWorldBox: CalcCaretWorldBox;
	/** Puts the caret at the end of the text and takes the focus, run once on mount; a textarea and a contenteditable div address their selection differently */
	focusAtEnd: (surface: TSurface) => void;
	/** Reads where the caret is now off the focused surface; null while it cannot be told (nothing selected inside it) */
	readCaretTarget: (surface: TSurface) => CaretTarget | null;
};

type CaretReporter<TSurface extends HTMLElement> = {
	/** Pass as the `ref` prop of the element being edited; React fills it in on mount, before the effects here read it, and the hook then focuses that element */
	surfaceRef: RefObject<TSurface | null>;
	/** Pass as the `ref` prop of the wrapper the caret is measured against (the surface's offsetParent); filled in by React the same way */
	wrapperRef: RefObject<HTMLDivElement | null>;
	/** Reports the caret where it is now; the caller drives it from `useLayoutEffect` for every render, and from the events for the caret moves that render nothing */
	reportCaret: () => void;
};

/**
 * Focuses the surface an in-place editor overlays the canvas with, and turns its
 * caret into a world box for the caller to report.
 *
 * Revealing the caret is two moves, made here in order: the surface is scrolled
 * so the caret is inside its clip, then the caret's box is reported for the
 * camera to pan to. The first is not left to the browser because its own reveal
 * runs after the input event a report rides on, and never runs for a selection
 * set from script (the caret put at the end when editing starts), so a body
 * taller than a fixed-size region would be reported as if it were not clipped.
 *
 * Running `reportCaret` is left to the caller because it has to be measured
 * against a laid-out box: the caller's `useLayoutEffect(reportCaret)` belongs
 * after the effect that sizes the surface.
 *
 * @param params - The caret sink, the caller's local-to-world conversion, and the
 *   two operations that differ per editing surface
 * @returns The refs to attach plus `reportCaret`
 */
export const useCaretReporter = <TSurface extends HTMLElement>({
	onCaretMove,
	calcCaretWorldBox,
	focusAtEnd,
	readCaretTarget,
}: UseCaretReporterParams<TSurface>): CaretReporter<TSurface> => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const surfaceRef = useRef<TSurface>(null);

	// Read through a ref so the focus stays a mount-only effect: a caller that
	// rebuilds the callback per render must not refocus, which would drag the caret
	// back to the end of the text mid-edit.
	const focusAtEndRef = useRef(focusAtEnd);
	focusAtEndRef.current = focusAtEnd;
	useEffect(() => {
		const surface = surfaceRef.current;
		if (surface) {
			focusAtEndRef.current(surface);
		}
	}, []);

	const reportCaret = useCallback(() => {
		const surface = surfaceRef.current;
		const wrapper = wrapperRef.current;
		// Only the focused editor has a caret to report; before the focus lands the
		// surface holds no selection, and reporting one would reveal the wrong end of
		// the text.
		if (
			!surface ||
			!wrapper ||
			!onCaretMove ||
			surface !== surface.ownerDocument.activeElement
		) {
			return;
		}
		const target = readCaretTarget(surface);
		if (!target) {
			return;
		}
		const caret = measureCaretInSurface(surface, target);
		if (!caret) {
			return;
		}
		scrollSurfaceToCaret(surface, caret);
		const caretWorldBox = calcCaretWorldBox(
			readCaretLocalRect(surface, caret),
			wrapper,
		);
		if (caretWorldBox) {
			onCaretMove(caretWorldBox);
		}
	}, [onCaretMove, calcCaretWorldBox, readCaretTarget]);

	return { surfaceRef, wrapperRef, reportCaret };
};
