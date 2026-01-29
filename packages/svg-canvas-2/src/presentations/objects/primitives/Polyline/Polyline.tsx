import type React from "react";
import { memo } from "react";

import { PolylineElement } from "./PolylineStyled";
import type { PolylineState } from "../../../../states/objects/primitives/PolylineState";

type PolylineProps = PolylineState;

const PolylineComponent: React.FC<PolylineProps> = ({
	id,
	points,
	stroke,
	strokeWidth,
}) => {
	const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");

	return (
		<PolylineElement
			data-kind="object"
			data-id={id}
			points={pointsAttr}
			stroke={stroke}
			strokeWidth={strokeWidth}
		/>
	);
};

export const Polyline = memo(PolylineComponent);
