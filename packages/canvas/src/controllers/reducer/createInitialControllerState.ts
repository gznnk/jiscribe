import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";

import { canvasToState } from "../../states/canvas/CanvasMapper";
import type { Camera } from "../../states/canvas/Viewport";
import type { CanvasControllerState, ScrollBoundsConfig } from "../CanvasTypes";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import { resetUiState } from "../utils/resetUiState";
import { createDocSnapshotFromDoc } from "../utils/resolveDocSnapshot";

/**
 * Builds the initial CanvasControllerState from a CanvasDoc.
 *
 * Both production (useCanvasReducer) and integration tests share this so the
 * default values of the initial state do not drift apart.
 *
 * `initialCamera` seeds the viewport's pan/zoom at construction so the first
 * paint lands at the host's camera instead of the doc default (0,0). Width/height
 * stay at the mapper default and are corrected by the ResizeObserver.
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
			? baseState.viewport
			: {
					...baseState.viewport,
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
		activeModal: null,
		commitVersion: 0,
		saveVersion: 0,
		saveNonce: "",
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
