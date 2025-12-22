import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../../../../constants/styling/core/CommonStyling";

export const StackOrderMenuWrapper = styled.div`
	display: flex;
	flex-direction: row;
	gap: 4px;
	padding: 4px;
	background-color: #fff;
	border-radius: 4px;
	box-shadow: ${BOX_SHADOW};
	pointer-events: auto;
`;
