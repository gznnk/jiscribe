import styled from "@emotion/styled";

import { CONNECTOR_HIT_STROKE_WIDTH } from "../../../../constants/connectorHitArea";

export const ConnectorHitArea = styled.polyline<{
	disablePointerEvents?: boolean;
}>`
	pointer-events: ${({ disablePointerEvents }) =>
		disablePointerEvents ? "none" : "stroke"};
	cursor: grab;
	fill: none;
	stroke: transparent;
	stroke-width: ${CONNECTOR_HIT_STROKE_WIDTH};
	stroke-linecap: round;
	stroke-linejoin: round;
`;

type ConnectorElementProps = {
	/** Resolved stroke color (auto is already resolved to the theme foreground). */
	strokeColor: string;
};

export const ConnectorElement = styled.polyline<ConnectorElementProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	pointer-events: none;
	cursor: grab;
	fill: none;

	&:focus {
		outline: none;
	}
`;
