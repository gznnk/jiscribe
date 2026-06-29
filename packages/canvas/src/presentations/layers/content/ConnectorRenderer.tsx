import { useResolvedConnectorPoints } from "./hooks/useResolvedConnectorPoints";
import { calcConnectorLabelAnchor } from "./utils/label/calcConnectorLabelAnchor";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { Connector } from "../../objects/connections/Connector";
import { ConnectorLabel } from "../../objects/connections/ConnectorLabel";

type ConnectorRendererProps = {
	connectorState: ConnectorState;
	objects: CanvasState["objects"];
	disablePointerEvents?: boolean;
	/** テキスト編集中のオブジェクト id。自身が編集中ならラベル表示を抑止する。 */
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
	// 編集中は ConnectorLabelEditor が同じ位置に出るため静的ラベルは描かない。
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
					disablePointerEvents={disablePointerEvents}
				/>
			)}
		</>
	);
};
