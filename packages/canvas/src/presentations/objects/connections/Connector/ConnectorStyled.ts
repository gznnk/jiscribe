import styled from "@emotion/styled";

export const ConnectorHitArea = styled.polyline<{
	disablePointerEvents?: boolean;
}>`
	pointer-events: ${({ disablePointerEvents }) =>
		disablePointerEvents ? "none" : "stroke"};
	cursor: grab;
	fill: none;
	stroke: transparent;
	stroke-width: 12;
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
