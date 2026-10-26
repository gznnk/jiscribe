import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { type Dispatch, useMemo, useReducer } from "react";

import type {
	Camera,
	CanvasControllerState,
	CanvasInitialSidebars,
	ScrollBoundsConfig,
} from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import { createCanvasReducer } from "../reducer/canvasReducer";
import { createInitialControllerState } from "../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../registries/CanvasRegistries";

/**
 * Custom hook that sets up the canvas state-management reducer, including
 * construction of the initial state.
 *
 * @param canvasDoc - The CanvasDoc used to build the initial state (only read at mount time)
 * @param registries - The per-canvas registry bundle. Closed over by the reducer
 *   (via `createCanvasReducer`) and used to build the initial state.
 * @param initialCamera - Seeds the initial viewport so the first paint lands at
 *   the host's pan/zoom instead of flashing the default (only read at mount time;
 *   later programmatic changes go through `ref.current.viewport.setViewport`).
 * @param scrollBoundsConfig - How far the view may be scrolled; omitted leaves
 *   it to whatever document is loaded (`view.scroll`). Only read at mount time —
 *   it goes into the initial state, which is what `limitViewScroll` reads it
 *   from; the document half is re-read there per scroll.
 * @param initialSidebars - How the two sidebars start out, with any key left out
 *   taking its default (closed, every section expanded). Only read at mount
 *   time — the panels belong to the user from then on, and their changes come
 *   back out through `onSidebarsChange`.
 * @param initialPinnedCategoryIds - The categories pinned to the rail at mount,
 *   in rail order; omitted, none. Only read at mount time, on the same terms as
 *   `initialSidebars` (changes come back through `onPinnedCategoriesChange`).
 * @param initialStencilLibraryCategoryIds - Ids of the sections the host's
 *   library resolves to at mount; only read at mount time, later changes
 *   arrive as SET_STENCIL_LIBRARY.
 */
export const useCanvasReducer = (
	canvasDoc: CanvasDoc,
	registries: CanvasRegistries,
	initialCamera?: Camera,
	scrollBoundsConfig?: ScrollBoundsConfig,
	initialSidebars?: CanvasInitialSidebars,
	initialPinnedCategoryIds?: readonly string[],
	initialStencilLibraryCategoryIds?: readonly string[],
): [CanvasControllerState, Dispatch<CanvasAction>] => {
	const reducer = useMemo(() => createCanvasReducer(registries), [registries]);
	return useReducer(reducer, undefined, () =>
		createInitialControllerState(
			canvasDoc,
			registries,
			initialCamera,
			scrollBoundsConfig,
			initialSidebars,
			initialPinnedCategoryIds,
			initialStencilLibraryCategoryIds,
		),
	);
};
