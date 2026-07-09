import { DEFAULT_FONT_FAMILY } from "../../constants/defaultFontFamily";
import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { DocCreationDefaults } from "../../schemas/objects/types/DocCreationDefaults";
import { canvasToState } from "../../states/canvas/CanvasMapper";
import { createDocSnapshotFromDoc } from "../../states/canvas/DocSnapshot";
import type { Camera } from "../../states/canvas/Viewport";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasRegistries } from "../setup/CanvasRegistries";
import { resetUiState } from "../utils/resetUiState";

/**
 * Builds the initial CanvasControllerState from a CanvasDoc.
 *
 * Both production (useCanvasReducer) and integration tests share this so the
 * default values of the initial state do not drift apart.
 *
 * `initialCamera` seeds the viewport's pan/zoom at construction so the first
 * paint lands at the host's camera instead of the doc default (0,0). Width/height
 * stay at the mapper default and are corrected by the ResizeObserver.
 */
export const createInitialControllerState = (
	initialDoc: CanvasDoc,
	registries: CanvasRegistries,
	docDefaults: DocCreationDefaults = { fontFamily: DEFAULT_FONT_FAMILY },
	initialCamera?: Camera,
): CanvasControllerState => {
	const baseState = canvasToState(initialDoc, registries.objectMapper);
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
		...resetUiState(),
		docDefaults,
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
