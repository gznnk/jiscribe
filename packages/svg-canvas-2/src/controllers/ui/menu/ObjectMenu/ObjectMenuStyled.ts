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
	height: 40px;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	font-size: 14px;
	padding: 4px 8px;
	background-color: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	pointer-events: auto;
	user-select: none;
`;

/**
 * メニュー内の区切り線。
 */
export const ObjectMenuDivider = styled.div`
	width: 1px;
	height: 16px;
	margin: 0 8px;
	background-color: #f3f4f6;
	align-self: center;
`;

/**
 * メニューボタン共通スタイル。
 */
export const ObjectMenuButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border-radius: 6px;
	border: 1px solid ${(props) => (props.isActive ? "#6b7280" : "transparent")};
	background: ${(props) => (props.isActive ? "#f9fafb" : "transparent")};
	cursor: pointer;
	user-select: none;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: #f3f4f6;
	}

	svg {
		color: #6b7280;
		transition: color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}

	&:hover svg {
		color: #374151;
	}

	&.active svg {
		color: #374151;
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
	top: 40px;
	transform: translateX(-50%);
	z-index: 1100;
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: flex-start;
	pointer-events: auto;
	gap: 8px;
`;

/**
 * ドロップダウンカラーパネル。DropdownPanel の幅広版。
 * カラーピッカーグリッドを表示するために使用する。
 */
export const DropdownColorPanel = styled.div`
	position: absolute;
	left: 50%;
	top: 40px;
	transform: translateX(-50%);
	z-index: 1100;
	pointer-events: auto;
`;
