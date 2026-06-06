import styled from "@emotion/styled";

export const Toast = styled.div<{ visible: boolean }>`
	position: absolute;
	bottom: 8px;
	right: 8px;
	font-size: 11px;
	font-weight: 500;
	color: #fff;
	background-color: #dc2626;
	border-radius: 4px;
	padding: 4px 8px;
	line-height: 1.5;
	pointer-events: none;
	white-space: nowrap;
	opacity: ${(props) => (props.visible ? 1 : 0)};
	transition: opacity 0.3s ease;
`;
