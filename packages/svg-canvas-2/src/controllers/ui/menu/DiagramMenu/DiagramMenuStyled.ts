import styled from "@emotion/styled";

/**
 * DiagramMenu の外枠コンテナ。
 * ScrollSyncedOverlay 内でキャンバス座標に配置される。
 */
export const DiagramMenuWrapper = styled.div<{ left: number; top: number }>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	pointer-events: auto;
	display: flex;
	align-items: center;
`;

/**
 * DiagramMenu の内部コンテナ（角丸・影付き）。
 */
export const DiagramMenuContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 2px;
	background: white;
	border: 1px solid #ddd;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	padding: 4px;
`;

/**
 * メニュー内の区切り線。
 */
export const DiagramMenuDivider = styled.div`
	width: 1px;
	height: 20px;
	background: #e0e0e0;
	margin: 0 2px;
`;

/**
 * メニューボタン共通スタイル。
 */
export const DiagramMenuButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: none;
	border-radius: 4px;
	background: ${(props) => (props.isActive ? "#e8e8e8" : "transparent")};
	cursor: pointer;
	transition: background-color 0.15s;

	&:hover {
		background: #f0f0f0;
	}

	&:active {
		background: #e0e0e0;
	}
`;

/**
 * サブメニュー（StackOrder 展開時など）のコンテナ。
 */
export const SubMenuContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 2px;
`;
