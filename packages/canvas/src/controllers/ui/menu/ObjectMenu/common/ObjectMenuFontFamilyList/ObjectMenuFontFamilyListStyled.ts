import styled from "@emotion/styled";

import { theme } from "../../../../../../constants/theme";

export const FontFamilyList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 6px;
	pointer-events: auto;
`;

/**
 * One selectable font. Wider than the icon-sized ObjectMenuButton because the
 * row is its own preview: the label is drawn in the font it selects, which is
 * also why nothing here may set font-family.
 */
export const FontFamilyListOption = styled.button<{ isActive?: boolean }>`
	display: flex;
	align-items: center;
	min-width: 132px;
	padding: 6px 10px;
	border-radius: ${theme.radius};
	border: 1px solid
		${(props) => (props.isActive ? theme.accent : "transparent")};
	background: ${(props) =>
		props.isActive ? theme.surfaceActive : "transparent"};
	color: ${theme.foreground};
	font-size: 15px;
	line-height: 1.4;
	text-align: left;
	white-space: nowrap;
	cursor: pointer;
	user-select: none;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
	}
`;
