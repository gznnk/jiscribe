import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../../../../constants/styling/core/CommonStyling";

export const ArrowHeadSelectorGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 4px;
	padding: 8px;
	background-color: #fff;
	border-radius: 4px;
	box-shadow: ${BOX_SHADOW};
	pointer-events: auto;
`;
