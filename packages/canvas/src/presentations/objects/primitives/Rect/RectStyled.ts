import styled from "@emotion/styled";

import { cssSafeValue } from "../../utils/cssSafeValue";

type RectElementProps = {
	/** 解決済みの stroke 色（auto はテーマ前景へ解決済み）。 */
	strokeColor: string;
	/** 解決済みの fill 色（auto はテーマサーフェスへ解決済み）。 */
	fillColor: string;
};

export const RectElement = styled.rect<RectElementProps>`
	stroke: ${({ strokeColor }) => cssSafeValue(strokeColor)};
	fill: ${({ fillColor }) => cssSafeValue(fillColor)};
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
