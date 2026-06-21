import styled from "@emotion/styled";

import { cssSafeValue } from "../../utils/cssSafeValue";

type PolygonElementProps = {
	/** 解決済みの stroke 色（auto はテーマ前景へ解決済み）。 */
	strokeColor: string;
	/** 解決済みの fill 色（auto はテーマサーフェスへ解決済み）。 */
	fillColor: string;
};

export const PolygonElement = styled.polygon<PolygonElementProps>`
	stroke: ${({ strokeColor }) => cssSafeValue(strokeColor)};
	fill: ${({ fillColor }) => cssSafeValue(fillColor)};
	pointer-events: all;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
