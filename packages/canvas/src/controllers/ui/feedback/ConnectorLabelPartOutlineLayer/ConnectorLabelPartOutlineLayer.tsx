import { memo } from "react";

import { useResolvedConnectorPoints } from "../../../../rendering/layers/content/hooks/useResolvedConnectorPoints";
import { resolveEndpointOwner } from "../../../../rendering/objects/connector/geometry/endpoints";
import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { isConnectorLabelPart } from "../../../selection/partKinds/connectorLabelPartKind";
import { getSelectedConnectorId } from "../../../selection/readers/getSelectedConnectorId";
import { resolveLabelDraftPlacement } from "../../../utils/graftConnectorLabelDraft";
import { readOpenTextEdit } from "../../../utils/readOpenTextEdit";
import { ConnectorLabelPartOutline } from "../ConnectorLabelPartOutline";

type ConnectorLabelPartOutlineLayerProps = Pick<
	CanvasControllerState,
	"selection" | "objects" | "mode"
>;

type PickedConnectorLabelOutlineProps = ConnectorLabelPartOutlineLayerProps & {
	/** The selected connector, whose label is the one picked. */
	connector: ConnectorState;
};

/** The outline of one connector's picked label, along the path the connector is drawn on. */
const PickedConnectorLabelOutline: React.FC<
	PickedConnectorLabelOutlineProps
> = ({ connector, selection, objects, mode }) => {
	const resolved = useResolvedConnectorPoints(
		connector,
		resolveEndpointOwner(objects, connector.source),
		resolveEndpointOwner(objects, connector.target),
	);
	if (!resolved) {
		return null;
	}

	// Open in the editor, the label is the draft: its text, where the editor sits.
	const openEdit = readOpenTextEdit({ mode, selection, objects });
	const isTextEditing = openEdit?.kind === "connectorLabel";
	const label = isTextEditing
		? {
				...connector.label,
				text: openEdit.text,
				...resolveLabelDraftPlacement(connector, openEdit.placement),
			}
		: connector.label;
	if (!label) {
		return null;
	}

	return (
		<ConnectorLabelPartOutline
			points={resolved.points}
			label={label}
			isTextEditing={isTextEditing}
		/>
	);
};

/**
 * Layer that outlines the picked label of the selected connector
 * (ConnectorLabelPartOutline); while the label is open in the editor, over the
 * draft as the editor lays it out.
 *
 * Unlike the other selection feedback it is not drawn inside the canvas SVG but
 * in the SVG laid over the text editors (WorldSvgOverlay): a label's editor is an
 * opaque box, where a shape's lets the outline under it show through.
 */
const ConnectorLabelPartOutlineLayerComponent: React.FC<
	ConnectorLabelPartOutlineLayerProps
> = ({ selection, objects, mode }) => {
	const connectorId = getSelectedConnectorId({ selection, objects });
	if (connectorId === null || !isConnectorLabelPart(selection.part)) {
		return null;
	}

	return (
		<PickedConnectorLabelOutline
			connector={objects[connectorId] as ConnectorState}
			selection={selection}
			objects={objects}
			mode={mode}
		/>
	);
};

export const ConnectorLabelPartOutlineLayer = memo(
	ConnectorLabelPartOutlineLayerComponent,
);
