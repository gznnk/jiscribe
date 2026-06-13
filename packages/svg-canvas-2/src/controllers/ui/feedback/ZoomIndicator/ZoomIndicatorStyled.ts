import styled from "@emotion/styled";

export const Label = styled.div<{ visible: boolean }>`
	position: absolute;
	bottom: 8px;
	/* 右下のヘルプ（?）ボタン(32px + 余白)の左隣に配置する */
	right: 48px;
	font-size: 11px;
	font-weight: 500;
	color: #6b7280;
	border-radius: 4px;
	padding: 2px 6px;
	line-height: 1.5;
	pointer-events: none;
	opacity: ${(props) => (props.visible ? 1 : 0)};
	transition: opacity 0.3s ease;
`;
