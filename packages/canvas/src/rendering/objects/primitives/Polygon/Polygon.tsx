import type React from "react";
import { memo } from "react";

import { PolygonElement } from "./PolygonStyled";
import type { PolygonState } from "../../../../states/objects/primitives/polygon/PolygonState";
import { useObjectShapeStyleDefaultsRegistry } from "../../registry/ObjectShapeStyleDefaultsRegistryContext";
import { getStrokeDasharray } from "../../utils/getStrokeDasharray";
import { resolveAutoColor } from "../../utils/resolveAutoColor";

type PolygonProps = PolygonState;

const PolygonComponent: React.FC<PolygonProps> = ({
	id,
	type,
	points,
	fill,
	fillOpacity,
	stroke,
	strokeWidth,
	strokeDashType,
	strokeOpacity,
}) => {
	const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");
	const shapeStyle = useObjectShapeStyleDefaultsRegistry().resolveShapeStyle(
		type,
		{ stroke, strokeWidth, strokeDashType, strokeOpacity, fill, fillOpacity },
	);

	return (
		<PolygonElement
			data-kind="object"
			data-id={id}
			points={pointsAttr}
			strokeColor={resolveAutoColor(shapeStyle.stroke, "ink")}
			fillColor={resolveAutoColor(shapeStyle.fill, "surface")}
			strokeAlpha={shapeStyle.strokeOpacity}
			fillAlpha={shapeStyle.fillOpacity}
			strokeWidth={shapeStyle.strokeWidth}
			strokeDasharray={getStrokeDasharray(
				shapeStyle.strokeDashType,
				shapeStyle.strokeWidth,
			)}
		/>
	);
};

export const Polygon = memo(PolygonComponent);
