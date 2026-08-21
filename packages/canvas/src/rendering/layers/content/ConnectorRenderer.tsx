import { memo, useMemo } from "react";

import { useResolvedConnectorPoints } from "./hooks/useResolvedConnectorPoints";
import { calcConnectorLabelAnchor } from "./utils/label/calcConnectorLabelAnchor";
import { isConnectorDrawnOrthogonal } from "../../../schemas/objects/connector/isConnectorDrawnOrthogonal";
import { isFreeEndpointRef } from "../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import {
	Connector,
	ConnectorSegmentMoveHitAreas,
	ConnectorSegmentSlideHitAreas,
} from "../../objects/connector/Connector";
import { ConnectorLabel } from "../../objects/connector/ConnectorLabel";

/** Renders a connector along with its optional static label. */
type ConnectorRendererProps = {
	connectorState: ConnectorState;
	/** Owner shape of the source endpoint. null if unreferenced (free endpoint) or not found. */
	sourceObj: ObjectState | null;
	/** Owner shape of the target endpoint. null if unreferenced (free endpoint) or not found. */
	targetObj: ObjectState | null;
	disablePointerEvents?: boolean;
	/**
	 * True while this connector's label is being text-edited; suppresses the
	 * static label, which ConnectorLabelEditor draws at the same position.
	 * Derived per connector (not the global edited id) so starting/ending an
	 * edit anywhere does not break the other connectors' memo.
	 */
	isEditing?: boolean;
};

const ConnectorRendererComponent: React.FC<ConnectorRendererProps> = ({
	connectorState,
	sourceObj,
	targetObj,
	disablePointerEvents = false,
	isEditing = false,
}) => {
	const resolved = useResolvedConnectorPoints(
		connectorState,
		sourceObj,
		targetObj,
	);

	const label = connectorState.label;
	// Memoized so the anchor Point keeps its identity across unrelated re-renders
	// and does not break ConnectorLabel's memo.
	const labelAnchor = useMemo(
		() =>
			resolved && label && label.text !== "" && !isEditing
				? calcConnectorLabelAnchor(
						resolved.points,
						label.position,
						label.offset,
					)
				: null,
		[resolved, label, isEditing],
	);

	// Skip rendering if endpoints cannot be resolved
	if (!resolved) {
		return null;
	}

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
			{/* Drawn between the line and the label, so the label keeps the pointer over itself. */}
			{isConnectorDrawnOrthogonal(connectorState) ? (
				<ConnectorSegmentSlideHitAreas
					id={connectorState.id}
					points={resolved.points}
					disablePointerEvents={disablePointerEvents}
				/>
			) : (
				<ConnectorSegmentMoveHitAreas
					id={connectorState.id}
					points={resolved.points}
					sourceIsFree={isFreeEndpointRef(connectorState.source)}
					targetIsFree={isFreeEndpointRef(connectorState.target)}
					disablePointerEvents={disablePointerEvents}
				/>
			)}
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

/**
 * Memoized with narrow props (connectorState / sourceObj / targetObj instead of the
 * whole objects map) so commits that touch unrelated objects skip this subtree entirely.
 */
export const ConnectorRenderer = memo(ConnectorRendererComponent);
