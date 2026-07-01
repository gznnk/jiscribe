import { useResolvedConnectorPoints } from "./hooks/useResolvedConnectorPoints";
import { calcConnectorLabelAnchor } from "./utils/label/calcConnectorLabelAnchor";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { Connector } from "../../objects/connections/Connector";
import { ConnectorLabel } from "../../objects/connections/ConnectorLabel";

/** Renders a connector along with its optional static label. */
type ConnectorRendererProps = {
	connectorState: ConnectorState;
	objects: CanvasState["objects"];
	disablePointerEvents?: boolean;
	/** Id of the object currently being text-edited. Suppresses the label if this connector is being edited. */
	textEditObjectId?: string | null;
};

export const ConnectorRenderer: React.FC<ConnectorRendererProps> = ({
	connectorState,
	objects,
	disablePointerEvents = false,
	textEditObjectId = null,
}) => {
	const resolved = useResolvedConnectorPoints(connectorState, objects);

	// Skip rendering if endpoints cannot be resolved
	if (!resolved) {
		return null;
	}

	const label = connectorState.label;
	// While editing, ConnectorLabelEditor appears at the same position, so don't draw the static label.
	const isEditing = textEditObjectId === connectorState.id;
	const labelAnchor =
		label && label.text !== "" && !isEditing
			? calcConnectorLabelAnchor(resolved.points, label.position, label.offset)
			: null;

	return (
		<>
			<Connector
				id={connectorState.id}
				points={resolved.points}
				stroke={connectorState.stroke}
				strokeWidth={connectorState.strokeWidth}
				strokeDashType={connectorState.strokeDashType}
				startArrow={connectorState.startArrow}
				endArrow={connectorState.endArrow}
				disablePointerEvents={disablePointerEvents}
			/>
			{label && labelAnchor && (
				<ConnectorLabel
					id={connectorState.id}
					anchor={labelAnchor}
					text={label.text}
					fontColor={label.fontColor}
					fontSize={label.fontSize}
					fontWeight={label.fontWeight}
					fill={label.fill}
					stroke={label.stroke}
					strokeWidth={label.strokeWidth}
					strokeDashType={label.strokeDashType}
					disablePointerEvents={disablePointerEvents}
				/>
			)}
		</>
	);
};
