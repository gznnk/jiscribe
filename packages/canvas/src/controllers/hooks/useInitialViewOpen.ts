import type { ViewDoc } from "@jiscribe/doc/model/canvas/ViewDoc";
import type { Dimensions } from "@jiscribe/geometry";
import { type Dispatch, type RefObject, useLayoutEffect, useRef } from "react";

import { ZOOM } from "../../constants/zoom";
import type { ObjectVisualBoundsRegistry } from "../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasAction } from "../reducer/CanvasActions";
import { calcContentBounds } from "../utils/calcContentBounds";
import { calcInitialCameraFromView } from "../utils/calcInitialCameraFromView";

type InitialViewOpenOptions = {
	/**
	 * The document's `view`, or undefined when the host passed
	 * `initialConfig.viewport` — its camera outranks the document's intent, so the
	 * caller withholds the declaration rather than this hook re-deciding.
	 */
	view: ViewDoc | undefined;
	/** The canvas area whose measured box the fit is computed against. */
	containerRef: RefObject<HTMLDivElement | null>;
	/**
	 * The viewport size the reducer currently holds. Not what the fit is measured
	 * against — the DOM box is, since at mount this is still the mapper's
	 * placeholder and nothing tells the two apart. It is here as the signal that
	 * the box may have changed, so a canvas that had no extent on the first pass
	 * (a hidden tab) tries again when its size arrives.
	 */
	viewportSize: Dimensions;
	/** The mapped objects whose extent is fitted. */
	objects: Record<string, ObjectState>;
	/** Per-canvas registry, so shapes drawing outside their geometry box are framed too. */
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get">;
	/** The Canvas reducer's dispatch. */
	dispatch: Dispatch<CanvasAction>;
};

/**
 * Applies the document's `view.open` as the canvas's starting camera, once per
 * document.
 *
 * A fit needs the container's real size, which nothing knows at mount — the
 * mapper seeds a placeholder and the ResizeObserver corrects it after the first
 * paint. So the box is measured here in a layout effect and dispatched together
 * with the camera (APPLY_INITIAL_VIEW), which puts both into the commit that
 * precedes the first paint instead of leaving the drawing to jump afterwards.
 *
 * "Once" is counted per document, not per canvas: loading another document
 * (SYNC_EXTERNAL) frames it the way *it* asked to be framed, the same reading of
 * `view` that moves the scroll wall with whatever document is loaded
 * (`resolveScrollWallPadding`). Editing the document does not re-frame it — the
 * `view` a document was mapped with is carried through edits, undo and redo by
 * reference, so its identity is what tells a new document from a changed one.
 * Every `view` ever answered stays answered (a set, not the latest one alone):
 * undo across a document load brings a *previously framed* `view` back, and
 * re-framing it would overwrite the camera the history restore deliberately
 * preserves. The camera moves only for a genuinely new arrival.
 *
 * A container with no extent yet (a hidden tab, a parent still resolving its
 * layout) is not guessed at: nothing is applied and nothing is marked done, so
 * the next size the canvas learns about runs this again. The camera is therefore
 * either the document's or the default — never a fit against a size that was not
 * real.
 *
 * @param options - The declaration to honor, what to measure, and what to fit;
 *   see {@link InitialViewOpenOptions}
 */
export const useInitialViewOpen = ({
	view,
	containerRef,
	viewportSize,
	objects,
	visualBounds,
	dispatch,
}: InitialViewOpenOptions): void => {
	// Every `view` whose intent was already answered — held weakly, so views
	// released with their history entries do not accumulate.
	const appliedViewsRef = useRef<WeakSet<ViewDoc>>(new WeakSet());

	useLayoutEffect(() => {
		const open = view?.open;
		if (
			view === undefined ||
			open === undefined ||
			appliedViewsRef.current.has(view)
		) {
			return;
		}
		const container = containerRef.current;
		if (!container) {
			return;
		}
		const { width, height } = container.getBoundingClientRect();
		if (width <= 0 || height <= 0) {
			return;
		}

		// Marked done even when there is nothing to fit (an empty document, a
		// degenerate extent): the declaration was read and answered with "keep the
		// default camera", and re-reading it on every later resize would turn a
		// document's intent into a standing override.
		appliedViewsRef.current.add(view);

		const bounds = calcContentBounds(objects, visualBounds);
		if (!bounds) {
			return;
		}
		const camera = calcInitialCameraFromView(
			bounds,
			view.padding,
			open,
			{ width, height },
			{ min: ZOOM.MIN, max: ZOOM.MAX },
		);
		if (!camera) {
			return;
		}
		dispatch({
			type: "APPLY_INITIAL_VIEW",
			viewport: { width, height, ...camera },
		});
		// viewportSize is a re-run trigger, not an input; see its option doc.
	}, [view, containerRef, viewportSize, objects, visualBounds, dispatch]);
};
