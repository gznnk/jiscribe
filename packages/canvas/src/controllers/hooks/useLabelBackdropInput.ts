import { useMemo } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { graftConnectorLabelDraft } from "../utils/graftConnectorLabelDraft";
import type { ConnectorLabelDraftObjects } from "../utils/graftConnectorLabelDraft";

/**
 * What the label backdrops are worked out from (useLabelBackdropStore): the
 * drawn objects with a connector label open in the editor prepared for the
 * backdrop pass (graftConnectorLabelDraft).
 *
 * Keyed on what the graft reads of the editing session — whether a connector
 * label is open, and its pending placement — rather than on `mode`, which a
 * keystroke moves: typing in a label's editor hands back the same input, so the
 * pass does not run again for it.
 *
 * @param state - The objects as drawn (the text-edit draft map), the selection
 *   owning the session and the session itself (`mode`)
 * @returns The same object for as long as the objects, the selection, and the
 *   label edit's being open and its placement stand
 */
export const useLabelBackdropInput = (
	state: Pick<CanvasControllerState, "objects" | "selection" | "mode">,
): ConnectorLabelDraftObjects => {
	const { objects, selection, mode } = state;
	const labelEditDraft =
		mode.kind === "textEdit" && mode.draft.kind === "connectorLabel"
			? mode.draft
			: null;
	const isLabelEditOpen = labelEditDraft !== null;
	const labelEditPlacement = labelEditDraft?.placement;
	return useMemo(
		() => graftConnectorLabelDraft({ objects, selection, mode }),
		// `mode` is read for the open edit alone, whose part the graft uses is
		// listed instead.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[objects, selection, isLabelEditOpen, labelEditPlacement],
	);
};
