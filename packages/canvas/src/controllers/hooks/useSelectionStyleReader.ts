import type { CanvasControllerState } from "../CanvasTypes";
import { useMemoAcrossMoveDrag } from "./useMemoAcrossMoveDrag";
import { useCanvasRegistries } from "../registries/CanvasRegistriesContext";
import { createSelectionStyleReader } from "../style/walk/readSelectionStyle";
import type { SelectionStyleReader } from "../ui/menu/SelectionStyleReaderContext";

/**
 * The reader a surface hands the rows it draws (SelectionStyleReaderContext):
 * `readSelectionStyle` bound to the state the surface renders for and the
 * canvas's registries. The rows a plugin draws are handed no controller state,
 * so this is how they read their value off the same state the built-in rows do.
 *
 * Bound to the fields the walk reads (SelectionStyleSource) rather than to the
 * whole state, so a pan or a zoom re-renders the rows without walking the
 * selection again; the walk runs once per reader however many rows ask
 * (createSelectionStyleReader). A move drag keeps the reader too
 * (useMemoAcrossMoveDrag): it changes no style, only where the objects are.
 *
 * @param canvasState - The state the surface is drawn for; only its SelectionStyleSource fields are read, and a new reader is made when one of them changes
 * @returns The reader, stable while those fields and the registries are, and through a move drag
 */
export const useSelectionStyleReader = (
	canvasState: CanvasControllerState,
): SelectionStyleReader => {
	const registries = useCanvasRegistries();
	const { objects, selection, mode } = canvasState;
	return useMemoAcrossMoveDrag(
		canvasState,
		() => createSelectionStyleReader({ objects, selection, mode }, registries),
		[selection, mode, registries],
	);
};
