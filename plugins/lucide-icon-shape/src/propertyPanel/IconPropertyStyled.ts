import styled from "@emotion/styled";

/** The icon's name on the closed trigger; ellipsised rather than widening the row. */
export const IconPropertyTriggerLabel = styled.span`
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;
