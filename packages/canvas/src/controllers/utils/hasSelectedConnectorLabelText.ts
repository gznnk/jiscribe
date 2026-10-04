import { getSelectedConnectorLabel } from "./getSelectedConnectorLabel";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether the selected connector carries label text, which is what every row of
 * the sidebar's two label sections needs: without it they all draw nothing, and
 * the headings go with them rather than standing over an empty body.
 *
 * @param selection - The slice a section's `isShown` receives; a selection that is not a lone connector gives false
 */
export const hasSelectedConnectorLabelText = (
	selection: Pick<CanvasControllerState, "selectedIds" | "objects">,
): boolean => Boolean(getSelectedConnectorLabel(selection)?.text);
