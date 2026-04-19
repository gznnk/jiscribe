import { calcVectorAngle } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { ConnectorElement, ConnectorHitArea } from "./ConnectorStyled";
import type { ArrowType } from "../../../../schemas/objects/types/ArrowType";
import type { StrokeDashType } from "../../../../schemas/objects/types/StrokeDashType";
import { Arrow } from "../../arrows";
import { getStrokeDasharray } from "../../utils/getStrokeDasharray";

type ConnectorProps = {
	id: string;
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	stroke?: string;
	strokeWidth?: number;
	strokeDashType?: StrokeDashType;
	startArrow?: ArrowType;
	endArrow?: ArrowType;
};

const ConnectorComponent: React.FC<ConnectorProps> = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	stroke = "black",
	strokeWidth = 1,
	strokeDashType,
	startArrow,
	endArrow,
}) => {
	// Simple straight line between source and target points
	const pointsAttr = `${sourceX},${sourceY} ${targetX},${targetY}`;

	// Calculate angles for arrows
	const startAngleRadians = calcVectorAngle(targetX, targetY, sourceX, sourceY);
	const endAngleRadians = calcVectorAngle(sourceX, sourceY, targetX, targetY);

	return (
		<>
			{/* Wide transparent hit area for easier clicking (same as Polyline pattern) */}
			<ConnectorHitArea
				data-kind="connector"
				data-id={id}
				points={pointsAttr}
			/>
			<ConnectorElement
				points={pointsAttr}
				stroke={stroke}
				strokeWidth={strokeWidth}
				strokeDasharray={getStrokeDasharray(strokeDashType, strokeWidth)}
			/>
			{startArrow && startArrow !== "None" && (
				<Arrow
					type={startArrow}
					x={sourceX}
					y={sourceY}
					color={stroke}
					radians={startAngleRadians}
					scale={strokeWidth}
				/>
			)}
			{endArrow && endArrow !== "None" && (
				<Arrow
					type={endArrow}
					x={targetX}
					y={targetY}
					color={stroke}
					radians={endAngleRadians}
					scale={strokeWidth}
				/>
			)}
		</>
	);
};

export const Connector = memo(ConnectorComponent);
