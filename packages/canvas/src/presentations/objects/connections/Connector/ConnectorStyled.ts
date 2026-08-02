import styled from "@emotion/styled";

import { CONNECTOR_HIT_STROKE_WIDTH } from "../../../../constants/connectorHitArea";

/**
 * The whole-path band. It takes clicks (select, and double click to edit the label) but no drag —
 * the line as a whole cannot be moved, since where it runs is decided by the shapes it connects. So
 * the cursor is the clickable one and not the `grab` that shapes use, which here would promise a
 * drag that never happens (#229). The per-segment bands drawn over this one name their own cursor.
 */
export const ConnectorHitArea = styled.polyline<{
	disablePointerEvents?: boolean;
}>`
	pointer-events: ${({ disablePointerEvents }) =>
		disablePointerEvents ? "none" : "stroke"};
	cursor: pointer;
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
	fill: none;

	&:focus {
		outline: none;
	}
`;
