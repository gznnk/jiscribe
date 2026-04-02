import styled from "@emotion/styled";

/**
 * ObjectMenu の外枠コンテナ。
 * ScrollSyncedOverlay 内でキャンバス座標に配置される。
 */
export const ObjectMenuWrapper = styled.div<{ left: number; top: number }>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	pointer-events: auto;
	display: flex;
	align-items: center;
`;

/**
 * ObjectMenu の内部コンテナ（角丸・影付き）。
 */
export const ObjectMenuContainer = styled.div`
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
export const ObjectMenuDivider = styled.div`
	width: 1px;
	height: 20px;
	background: #e0e0e0;
	margin: 0 2px;
`;

/**
 * メニューボタン共通スタイル。
 */
export const ObjectMenuButton = styled.button<{ isActive?: boolean }>`
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
 * メニューボタンの位置基準コンテナ（relative）。
 * ドロップダウンの基準位置になる。
 */
export const MenuItemPositioner = styled.div`
	position: relative;
`;

/**
 * ドロップダウンパネル。ボタンの下に中央揃えで表示される。
 */
export const DropdownPanel = styled.div`
	position: absolute;
	left: 50%;
	top: 36px;
	transform: translateX(-50%);
	z-index: 1100;
	display: flex;
	align-items: center;
	gap: 2px;
	padding: 4px;
	background: white;
	border: 1px solid #ddd;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	pointer-events: auto;
`;

/**
 * ドロップダウンカラーパネル。DropdownPanel の幅広版。
 * カラーピッカーグリッドを表示するために使用する。
 */
export const DropdownColorPanel = styled.div`
	position: absolute;
	left: 50%;
	top: 36px;
	transform: translateX(-50%);
	z-index: 1100;
	pointer-events: auto;
`;
