import { getSelectedConnectorLabel } from "./getSelectedConnectorLabel";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Whether the selected connector carries label text, which is what every row of
 * the sidebar's two label sections needs: without it they all draw nothing, and
 * the headings go with them rather than standing over an empty body.
 *
 * @param selection - The slice a section's `isShown` receives; `selectedConnectorId` null (nothing selected, or a shape) gives false
 */
export const hasSelectedConnectorLabelText = (selection: {
	selectedConnectorId: string | null;
	objects: Record<string, ObjectState>;
}): boolean =>
	Boolean(
		getSelectedConnectorLabel(selection.selectedConnectorId, selection.objects)
			?.text,
	);
