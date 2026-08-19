import type React from "react";
import { memo } from "react";

import { PolygonElement } from "./PolygonStyled";
import type { PolygonState } from "../../../../states/objects/primitives/polygon/PolygonState";
import { getStrokeDasharray } from "../../utils/getStrokeDasharray";
import { resolveAutoColor } from "../../utils/resolveAutoColor";

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
			strokeColor={resolveAutoColor(stroke, "ink")}
			fillColor={resolveAutoColor(fill, "surface")}
			strokeWidth={strokeWidth}
			strokeDasharray={getStrokeDasharray(strokeDashType, strokeWidth)}
		/>
	);
};

export const Polygon = memo(PolygonComponent);
