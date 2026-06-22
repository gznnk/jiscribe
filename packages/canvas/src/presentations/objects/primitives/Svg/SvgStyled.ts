import styled from "@emotion/styled";

/** 注入された SVG 内容を保持するグループ。中身はヒットテスト対象にしない。 */
export const SvgContentGroup = styled.g`
	pointer-events: none;
`;

/** ポインタイベントを受けるための透明な矩形。 */
export const SvgHitRect = styled.rect`
	fill: transparent;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
