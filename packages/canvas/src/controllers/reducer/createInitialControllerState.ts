import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";

import type { Viewport } from "../../rendering/Viewport";
import { canvasToState } from "../../states/canvas/CanvasMapper";
import type {
	Camera,
	CanvasControllerState,
	ScrollBoundsConfig,
} from "../CanvasTypes";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import { resetUiState } from "../utils/resetUiState";
import { createDocSnapshotFromDoc } from "../utils/resolveDocSnapshot";

/**
 * Viewport a canvas starts at, before anything has been measured or the host's
 * camera applied.
 *
 * Width/height are a placeholder that useContainerResize replaces with the
 * container's real size in a layout effect, ahead of the first paint. They are
 * non-zero because a framing computed from them (fit-all / fit-width) divides
 * by them.
 */
export const INITIAL_VIEWPORT: Viewport = {
	minX: 0,
	minY: 0,
	width: 1000,
	height: 800,
	zoom: 1,
};

/**
 * Builds the initial CanvasControllerState from a CanvasDoc.
 *
 * Both production (useCanvasReducer) and integration tests share this so the
 * default values of the initial state do not drift apart.
 *
 * The viewport starts at {@link INITIAL_VIEWPORT}; `initialCamera` seeds its
 * pan/zoom at construction so the first paint lands at the host's camera
 * instead of the origin. Width/height stay at the placeholder until
 * useContainerResize measures the container in a layout effect, before the
 * first paint.
 *
 * The seeded camera is left as given even when the wall limits scrolling: only a
 * view scroll of the user's own is limited, so wherever the host starts the view
 * is where it starts.
 */
export const createInitialControllerState = (
	initialDoc: CanvasDoc,
	registries: CanvasRegistries,
	initialCamera?: Camera,
	scrollBoundsConfig?: ScrollBoundsConfig,
): CanvasControllerState => {
	const baseState = canvasToState(
		initialDoc,
		registries.objectMapper,
		registries.objectContentResizer,
	);
	const viewport =
		initialCamera === undefined
			? { ...INITIAL_VIEWPORT }
			: {
					...INITIAL_VIEWPORT,
					minX: initialCamera.minX,
					minY: initialCamera.minY,
					zoom: initialCamera.zoom,
				};
	return {
		...baseState,
		viewport,
		// The rect is left unmeasured: nothing needs it until the first view
		// scroll, and limitViewScroll measures it there.
		scrollLimit: {
			hostConfig: scrollBoundsConfig ?? null,
			rect: null,
			measuredFrom: null,
			measuredView: undefined,
		},
		...resetUiState(),
		// Outside resetUiState: the two sidebars are persistent, so a doc swap must
		// not close them (see CanvasControllerState).
		stencilLibraryPanel: { isOpen: false, collapsedSectionIds: [] },
		propertyPanel: { isOpen: false, collapsedSectionIds: [] },
		activeModal: null,
		commitVersion: 0,
		saveRequest: { version: 0, nonce: "" },
		historyCoalesce: { recorded: null, pending: null },
		internalClipboard: null,
		history: {
			past: [],
			// The original doc is kept verbatim (no round-trip through canvasToDoc),
			// so the initial present compares byte-for-byte against the host's doc.
			present: createDocSnapshotFromDoc(initialDoc),
			future: [],
		},
	};
};
