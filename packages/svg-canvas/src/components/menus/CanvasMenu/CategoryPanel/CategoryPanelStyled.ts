import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../../constants/styling/core/CommonStyling";

export const CategoryPanelContainer = styled.div`
	min-width: 200px;
	max-width: 300px;
	background-color: #ffffff;
	border: 1px solid #d9d9d9;
	border-radius: 6px;
	box-shadow: ${BOX_SHADOW};
	padding: 12px;
	pointer-events: auto;
	user-select: none;
`;

export const CategoryPanelTitle = styled.div`
	font-size: 12px;
	font-weight: 600;
	color: #333;
	margin-bottom: 8px;
	padding: 0 4px;
`;

export const CategoryPanelItemsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
	gap: 4px;
`;
