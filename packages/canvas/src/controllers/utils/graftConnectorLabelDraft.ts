import { readOpenTextEdit } from "./readOpenTextEdit";
import type { ConnectorLabelPlacement } from "../../rendering/objects/connector/geometry/label/calcConnectorLabelPlacement";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";

/** What the label backdrops are worked out from while a connector label may be open in the editor. */
export type ConnectorLabelDraftObjects = {
	/** `objects` with the edited connector's label replaced by the draft, or `objects` itself when no label is open. */
	objects: Record<string, ObjectState>;
	/** The connector whose label is open in the editor; null when none is. */
	labelEditOwnerId: string | null;
};

/**
 * Where a connector label open in the editor sits: the pending placement of a
 * label being created, else the label's own. The one rule the editor's anchor
 * (TextEditorLayer) and the box its backdrop is cut for
 * ({@link graftConnectorLabelDraft}) both follow, so the two cannot part.
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
 * Grafts the connector label being edited onto its connector, for the label
 * backdrops alone (resolveLabelBackdrops): the editor draws the draft's box,
 * placed where the label being created will go, so the backdrop under it is cut
 * for that box rather than the committed one. Only the backdrop pass reads the
 * result; the drawing, the menus and hit testing keep the map
 * graftTextEditDraft gives, which leaves a label's draft out.
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
	const { connector, text, placement } = openEdit;
	const draftConnector: ConnectorState = {
		...connector,
		label: {
			...connector.label,
			text,
			...resolveLabelDraftPlacement(connector, placement),
		},
	};
	return {
		objects: { ...state.objects, [connector.id]: draftConnector },
		labelEditOwnerId: connector.id,
	};
};
