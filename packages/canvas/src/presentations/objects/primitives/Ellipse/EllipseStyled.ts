import styled from "@emotion/styled";

type EllipseElementProps = {
	/** 解決済みの stroke 色（auto はテーマ前景へ解決済み）。 */
	strokeColor: string;
	/** 解決済みの fill 色（auto はテーマサーフェスへ解決済み）。 */
	fillColor: string;
};

export const EllipseElement = styled.ellipse<EllipseElementProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: ${({ fillColor }) => fillColor};
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
