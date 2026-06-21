import styled from "@emotion/styled";

import { cssSafeValue } from "../../utils/cssSafeValue";

export const PolylineElement = styled.polyline<{ strokeColor: string }>`
	stroke: ${({ strokeColor }) => cssSafeValue(strokeColor)};
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
	stroke-width: 12;
	stroke-linecap: round;
	stroke-linejoin: round;
`;
