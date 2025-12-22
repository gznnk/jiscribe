import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../../../../constants/styling/core/CommonStyling";

export const LineStyleMenuWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px;
	background-color: #fff;
	border-radius: 4px;
	box-shadow: ${BOX_SHADOW};
	pointer-events: auto;
`;

export const LineStyleSection = styled.div`
	display: flex;
	gap: 4px;
	justify-content: center;
`;
