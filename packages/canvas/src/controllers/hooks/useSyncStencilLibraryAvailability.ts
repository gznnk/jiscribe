import { type Dispatch, useLayoutEffect } from "react";

import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * Hands the reducer whether a shape library can be drawn
 * (`CanvasControllerState.hasStencilLibrary`), each time that answer changes.
 * A layout effect, so the mount's answer lands before the first paint and the
 * sidebars switch is never drawn from the initial `false`.
 *
 * @param hasStencilLibrary - Whether the host's `stencilLibrary.sections`
 *   resolved to at least one section
 * @param dispatch - The canvas reducer's dispatch
 */
export const useSyncStencilLibraryAvailability = (
	hasStencilLibrary: boolean,
	dispatch: Dispatch<CanvasAction>,
): void => {
	useLayoutEffect(() => {
		dispatch({ type: "SET_STENCIL_LIBRARY_AVAILABILITY", hasStencilLibrary });
	}, [hasStencilLibrary, dispatch]);
};
