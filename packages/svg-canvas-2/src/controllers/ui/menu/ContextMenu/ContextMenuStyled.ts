import styled from "@emotion/styled";

export const Menu = styled.div<{ left: number; top: number }>`
	position: fixed;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	background: white;
	border: 1px solid #ddd;
	border-radius: 4px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	min-width: 200px;
	padding: 4px 0;
	z-index: 1001;
	font-size: 14px;
	pointer-events: auto;
`;

export const MenuItem = styled.button<{ disabled?: boolean }>`
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 16px;
	border: none;
	background: ${(props) => (props.disabled ? "#f5f5f5" : "white")};
	color: ${(props) => (props.disabled ? "#999" : "#333")};
	cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
	text-align: left;
	transition: background-color 0.15s;

	&:hover {
		background: ${(props) => (props.disabled ? "#f5f5f5" : "#f0f0f0")};
	}

	&:active {
		background: ${(props) => (props.disabled ? "#f5f5f5" : "#e0e0e0")};
	}
`;

export const MenuItemLabel = styled.span`
	flex: 1;
`;

export const MenuItemShortcut = styled.span`
	margin-left: 24px;
	color: #999;
	font-size: 12px;
`;

export const MenuSeparator = styled.div`
	height: 1px;
	background: #e0e0e0;
	margin: 4px 0;
`;
