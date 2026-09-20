import styled from "@emotion/styled";

import { LINE_HIT_STROKE_WIDTH } from "../../utils/hitStrokeWidth";
import type { StrokePaintProps } from "../../utils/shapePaint";
import { strokePaint } from "../../utils/shapePaint";

export const PolylineElement = styled.polyline<StrokePaintProps>`
	${strokePaint}
	pointer-events: none;
	cursor: grab;
	fill: none;

	&:focus {
		outline: none;
	}
`;

export const PolylineHitArea = styled.polyline`
	pointer-events: stroke;
	cursor: grab;
	fill: none;
	stroke: transparent;
	stroke-width: ${LINE_HIT_STROKE_WIDTH};
	stroke-linecap: round;
	stroke-linejoin: round;
`;
