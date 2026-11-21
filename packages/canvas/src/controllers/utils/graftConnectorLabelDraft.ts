import { readOpenTextEdit } from "./readOpenTextEdit";
import type { ConnectorLabelPlacement } from "../../rendering/objects/connector/geometry/label/calcConnectorLabelPlacement";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";

/** What the label backdrops are worked out from while a connector label may be open in the editor. */
export type ConnectorLabelDraftObjects = {
	/** `objects` with the edited connector's label placed where the editor sits, or `objects` itself when no label is open. */
	objects: Record<string, ObjectState>;
	/** The connector whose label is open in the editor; null when none is. */
	labelEditOwnerId: string | null;
};

/**
 * Where a connector label open in the editor sits: the pending placement of a
 * label being created, else the label's own. The one rule the editor's anchor
 * (TextEditorLayer), the point its backdrop is worked out at
 * ({@link graftConnectorLabelDraft}) and the picked label's outline
 * (ConnectorControls) all follow, so none of them can part from the others.
 *
 * @param connector - The connector whose label is edited; its `label` may be absent for a label being created
 * @param pendingPlacement - The draft's placement (`TextEditDraft.placement`), set only while a label is being created; it wins over leftovers of a deleted label
 * @returns `position` / `offset` as the label is drawn with them; either undefined means CONNECTOR_LABEL_DEFAULTS
 */
export const resolveLabelDraftPlacement = (
	connector: ConnectorState,
	pendingPlacement: ConnectorLabelPlacement | undefined,
): { position: number | undefined; offset: number | undefined } => ({
	position: pendingPlacement?.position ?? connector.label?.position,
	offset: pendingPlacement?.offset ?? connector.label?.offset,
});

/**
 * Prepares the connector label open in the editor for the label backdrops
 * alone (resolveLabelBackdrops), which judge a label by its anchor: the label
 * is given the placement the editor sits at (resolveLabelDraftPlacement, the
 * pending one of a label being created), and one being created gets a label to
 * be found by at all, empty until committed. The draft text is left out, the
 * backdrop not depending on it: what follows each keystroke is the editor's own
 * box width. Only the backdrop pass reads the result; the drawing, the menus
 * and hit testing keep the map graftTextEditDraft gives.
 *
 * @param state - The objects to graft onto (the text-edit draft map), with the
 *   editing session (`mode`) and the selection owning it
 * @returns The grafted map and the edited connector's id; a shape's text edit,
 *   or no edit, grafts nothing and hands `state.objects` back as it is
 */
export const graftConnectorLabelDraft = (
	state: Pick<CanvasControllerState, "objects" | "selection" | "mode">,
): ConnectorLabelDraftObjects => {
	const openEdit = readOpenTextEdit(state);
	if (openEdit?.kind !== "connectorLabel") {
		return { objects: state.objects, labelEditOwnerId: null };
	}
	const { connector, placement } = openEdit;
	const draftConnector: ConnectorState = {
		...connector,
		label: {
			...connector.label,
			text: connector.label?.text ?? "",
			...resolveLabelDraftPlacement(connector, placement),
		},
	};
	return {
		objects: { ...state.objects, [connector.id]: draftConnector },
		labelEditOwnerId: connector.id,
	};
};
