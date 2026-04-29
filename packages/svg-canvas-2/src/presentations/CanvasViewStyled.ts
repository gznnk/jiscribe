import styled from "@emotion/styled";

/**
 * Styled SVG element for rendering the diagram.
 */
export const Svg = styled.svg`
	display: block;
	box-sizing: border-box;
	background-color: #ffffff;
	outline: none;
	* {
		outline: none;
	}
`;

type ContentGroupProps = {
	isDrawMode: boolean;
};

/**
 * SVG グループ要素。描画モード中は子孫の pointer-events を強制無効化する。
 * 各図形が明示的に pointer-events: auto/all を設定しているため !important が必要。
 */
export const ContentGroup = styled.g<ContentGroupProps>`
	${({ isDrawMode }) =>
		isDrawMode &&
		`
		* {
			pointer-events: none !important;
		}
	`}
`;
