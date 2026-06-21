import styled from "@emotion/styled";

import { theme } from "../constants/theme";

/**
 * Styled SVG element for rendering the diagram.
 */
export const Svg = styled.svg`
	display: block;
	box-sizing: border-box;
	background-color: ${theme.canvasBg};
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
 *
 * auto（テーマ追従）色は `resolveAutoColor` がロール別テーマトークンへ解決し CSS で
 * 当てるため、ここで `currentColor` を前景に固定する仕掛けは不要（issue #38 / doc 08）。
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
