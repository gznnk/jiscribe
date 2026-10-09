import { useMemo } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { useCanvasRegistries } from "../registries/CanvasRegistriesContext";
import { readSelectionStyle } from "../style/readSelectionStyle";
import type { SelectionStyleReader } from "../style/SelectionStyleReaderContext";

/**
 * The reader a surface hands the rows it draws (SelectionStyleReaderContext):
 * `readSelectionStyle` bound to the state the surface renders for and the
 * canvas's registries. The rows a plugin draws are handed no controller state,
 * so this is how they read their value off the same state the built-in rows do.
 *
 * @param canvasState - The state the surface is drawn for; a new reader is made whenever it changes, so a row re-reads on every render the surface does
 * @returns The reader, stable while `canvasState` and the registries are
 */
export const useSelectionStyleReader = (
	canvasState: CanvasControllerState,
): SelectionStyleReader => {
	const registries = useCanvasRegistries();
	return useMemo(
		() =>
			<K extends string>(kind: K) =>
				readSelectionStyle(canvasState, kind, registries),
		[canvasState, registries],
	);
};
