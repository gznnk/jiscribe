import type React from "react";
import { memo } from "react";

import { ConnectorElement } from "./ConnectorStyled";
import type { ArrowType } from "../../../../schemas/objects/types/ArrowType";

type ConnectorProps = {
	id: string;
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	stroke?: string;
	strokeWidth?: number;
	startArrow?: ArrowType;
	endArrow?: ArrowType;
};

const ConnectorComponent: React.FC<ConnectorProps> = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	stroke,
	strokeWidth,
}) => {
	// Simple straight line between source and target points
	const pointsAttr = `${sourceX},${sourceY} ${targetX},${targetY}`;

	return (
		<ConnectorElement
			data-kind="connector"
			data-id={id}
			points={pointsAttr}
			stroke={stroke}
			strokeWidth={strokeWidth}
		/>
	);
};

export const Connector = memo(ConnectorComponent);
