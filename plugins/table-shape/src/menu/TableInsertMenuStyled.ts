import styled from "@emotion/styled";

/** The axes' button groups side by side: a cell's row pair and column pair. */
export const TableInsertMenuAxisGroups = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 6px;
`;

/** One axis's buttons, butted together like the built-in menu buttons. */
export const TableInsertMenuAxisGroup = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
`;
