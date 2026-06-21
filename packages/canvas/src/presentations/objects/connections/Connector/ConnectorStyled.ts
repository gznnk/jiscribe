import styled from "@emotion/styled";

import { cssSafeValue } from "../../utils/cssSafeValue";

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
	/** 解決済みの stroke 色（auto はテーマ前景へ解決済み）。 */
	strokeColor: string;
};

export const ConnectorElement = styled.polyline<ConnectorElementProps>`
	stroke: ${({ strokeColor }) => cssSafeValue(strokeColor)};
	pointer-events: none;
	cursor: grab;
	fill: none;

	&:focus {
		outline: none;
	}
`;
