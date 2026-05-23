import styled from "@emotion/styled";

export const Label = styled.div<{ visible: boolean }>`
	position: absolute;
	bottom: 8px;
	right: 8px;
	font-size: 11px;
	font-weight: 500;
	color: #6b7280;
	background: rgba(255, 255, 255, 0.85);
	border: 1px solid #e5e7eb;
	border-radius: 4px;
	padding: 2px 6px;
	line-height: 1.5;
	pointer-events: none;
	opacity: ${(props) => (props.visible ? 1 : 0)};
	transition: opacity 0.3s ease;
`;
