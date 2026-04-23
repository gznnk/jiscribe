import type React from "react";
import { memo } from "react";

import { PolygonElement } from "./PolygonStyled";
import type { PolygonState } from "../../../../states/objects/primitives/polygon/PolygonState";
import { getStrokeDasharray } from "../../utils/getStrokeDasharray";

type PolygonProps = PolygonState;

const PolygonComponent: React.FC<PolygonProps> = ({
	id,
	points,
	fill,
	stroke = "black",
	strokeWidth = 1,
	strokeDashType,
}) => {
	const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");

	return (
		<PolygonElement
			data-kind="object"
			data-id={id}
			points={pointsAttr}
			fill={fill ?? "transparent"}
			stroke={stroke}
			strokeWidth={strokeWidth}
			strokeDasharray={getStrokeDasharray(strokeDashType, strokeWidth)}
		/>
	);
};

export const Polygon = memo(PolygonComponent);
